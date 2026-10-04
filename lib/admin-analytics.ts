import { unstable_cache, revalidateTag } from "next/cache";
import { DonationStatus } from "@prisma/client";
import { BUILDING_FUND_ID } from "@/lib/constants";
import { giftAidBonusPence, percentOf } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const ADMIN_ANALYTICS_CACHE_TAG = "admin-analytics";

const RANGES = ["7d", "30d", "90d", "all"] as const;
export type AdminAnalyticsRange = (typeof RANGES)[number];

export function parseAdminAnalyticsRange(
  value: string | null,
): AdminAnalyticsRange {
  if (value && (RANGES as readonly string[]).includes(value)) {
    return value as AdminAnalyticsRange;
  }
  return "30d";
}

function rangeStart(range: AdminAnalyticsRange): Date | null {
  if (range === "all") return null;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return new Date(Date.now() - days * 86_400_000);
}

function startOfUtcDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

function dayKey(d: Date): string {
  return startOfUtcDay(d).toISOString().slice(0, 10);
}

async function loadAdminAnalytics(range: AdminAnalyticsRange) {
  const from = rangeStart(range);

  const [donations, pots, buildingFund, attemptCounts] = await Promise.all([
    prisma.donation.findMany({
      where: from ? { createdAt: { gte: from } } : undefined,
      select: {
        amount: true,
        status: true,
        potId: true,
        giftAid: true,
        isRecurring: true,
        createdAt: true,
        pot: { select: { slug: true, title: true } },
      },
    }),
    prisma.pot.findMany({
      select: {
        id: true,
        slug: true,
        title: true,
        totalRaised: true,
        donorCount: true,
        status: true,
      },
      orderBy: { totalRaised: "desc" },
      take: 15,
    }),
    prisma.buildingFund.findUnique({
      where: { id: BUILDING_FUND_ID },
      select: { targetAmount: true, totalRaised: true },
    }),
    prisma.donation.groupBy({
      by: ["status"],
      where: from ? { createdAt: { gte: from } } : undefined,
      _count: { _all: true },
    }),
  ]);

  const statusCounts: Record<string, number> = {};
  for (const row of attemptCounts) {
    statusCounts[row.status] = row._count._all;
  }

  const succeeded = donations.filter(
    (d) => d.status === DonationStatus.SUCCEEDED,
  );
  const succeededPence = succeeded.reduce((s, d) => s + d.amount, 0);
  const succeededCount = succeeded.length;

  const direct = succeeded.filter((d) => !d.potId);
  const potGifts = succeeded.filter((d) => Boolean(d.potId));

  let cardOneOff = 0;
  let cardMonthly = 0;
  for (const d of succeeded) {
    if (d.isRecurring) cardMonthly += 1;
    else cardOneOff += 1;
  }

  const giftAidGifts = succeeded.filter((d) => d.giftAid);
  const giftAidPence = giftAidGifts.reduce((s, d) => s + d.amount, 0);
  const giftAidReclaimPence = giftAidGifts.reduce(
    (s, d) => s + giftAidBonusPence(d.amount),
    0,
  );

  const potMap = new Map<
    string,
    { slug: string; title: string; pence: number; count: number }
  >();
  for (const d of potGifts) {
    if (!d.pot) continue;
    const row = potMap.get(d.pot.slug) ?? {
      slug: d.pot.slug,
      title: d.pot.title,
      pence: 0,
      count: 0,
    };
    row.pence += d.amount;
    row.count += 1;
    potMap.set(d.pot.slug, row);
  }
  const topPotsByRaised = [...potMap.values()]
    .sort((a, b) => b.pence - a.pence)
    .slice(0, 10);
  const topPotsByCount = [...potMap.values()]
    .sort((a, b) => b.count - a.count || b.pence - a.pence)
    .slice(0, 10);

  const seriesMap = new Map<
    string,
    { raisedPence: number; gifts: number; attempts: number }
  >();
  const seriesFrom =
    from ?? startOfUtcDay(new Date(Date.now() - 89 * 86_400_000));
  const seriesTo = startOfUtcDay(new Date());
  for (
    let t = seriesFrom.getTime();
    t <= seriesTo.getTime();
    t += 86_400_000
  ) {
    const key = dayKey(new Date(t));
    seriesMap.set(key, { raisedPence: 0, gifts: 0, attempts: 0 });
  }
  for (const d of donations) {
    const key = dayKey(d.createdAt);
    const row = seriesMap.get(key);
    if (!row) continue;
    row.attempts += 1;
    if (d.status === DonationStatus.SUCCEEDED) {
      row.raisedPence += d.amount;
      row.gifts += 1;
    }
  }
  const seriesDaily = [...seriesMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));

  const attemptsTotal = donations.length;
  const conversionPct =
    attemptsTotal > 0
      ? Math.round((succeededCount / attemptsTotal) * 100)
      : null;

  const targetPence = buildingFund?.targetAmount ?? 0;
  const raisedPence = buildingFund?.totalRaised ?? 0;

  return {
    range,
    seriesNote:
      range === "all"
        ? "Totals are all-time; chart shows the last 90 days."
        : null,
    totals: {
      succeededPence,
      succeededCount,
      averagePence:
        succeededCount > 0 ? Math.round(succeededPence / succeededCount) : 0,
      direct: {
        pence: direct.reduce((s, d) => s + d.amount, 0),
        count: direct.length,
      },
      pot: {
        pence: potGifts.reduce((s, d) => s + d.amount, 0),
        count: potGifts.length,
      },
      methods: {
        cardOneOff,
        cardMonthly,
      },
      giftAid: {
        count: giftAidGifts.length,
        pence: giftAidPence,
        reclaimPence: giftAidReclaimPence,
      },
      funnel: {
        attempts: attemptsTotal,
        succeeded: succeededCount,
        pending: statusCounts[DonationStatus.PENDING] ?? 0,
        failed: statusCounts[DonationStatus.FAILED] ?? 0,
        refunded: statusCounts[DonationStatus.REFUNDED] ?? 0,
        conversionPct,
      },
    },
    buildingFund: {
      targetPence,
      raisedPence,
      progressPct: percentOf(raisedPence, targetPence),
    },
    topPotsByRaised,
    topPotsByCount,
    lifetimeTopPots: pots.map((p) => ({
      slug: p.slug,
      title: p.title,
      pence: p.totalRaised,
      count: p.donorCount,
      status: p.status,
    })),
    seriesDaily,
  };
}

export function getAdminAnalyticsCached(range: AdminAnalyticsRange) {
  return unstable_cache(
    () => loadAdminAnalytics(range),
    ["admin-analytics-v1", range],
    { revalidate: 30, tags: [ADMIN_ANALYTICS_CACHE_TAG] },
  )();
}

export function revalidateAdminAnalytics() {
  revalidateTag(ADMIN_ANALYTICS_CACHE_TAG, "max");
}
