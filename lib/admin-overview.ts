import { unstable_cache, revalidateTag } from "next/cache";
import { DonationStatus, PotStatus } from "@prisma/client";
import { BUILDING_FUND_ID } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const ADMIN_OVERVIEW_CACHE_TAG = "admin-overview";

const RANGES = ["today", "7d", "30d", "all"] as const;
export type AdminOverviewRange = (typeof RANGES)[number];

const PENDING_STUCK_HOURS = 2;

export function parseAdminOverviewRange(
  value: string | null,
): AdminOverviewRange {
  if (value && (RANGES as readonly string[]).includes(value)) {
    return value as AdminOverviewRange;
  }
  return "7d";
}

function rangeStart(range: AdminOverviewRange): Date | null {
  const now = new Date();
  if (range === "all") return null;
  if (range === "today") {
    const start = new Date(now);
    start.setUTCHours(0, 0, 0, 0);
    return start;
  }
  const days = range === "7d" ? 7 : 30;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

async function loadAdminOverview(range: AdminOverviewRange) {
  const from = rangeStart(range);
  const createdAt = from ? { gte: from } : undefined;
  const stuckBefore = new Date(
    Date.now() - PENDING_STUCK_HOURS * 60 * 60 * 1000,
  );

  const succeededWhere = {
    status: DonationStatus.SUCCEEDED,
    ...(createdAt ? { createdAt } : {}),
  };

  const [
    succeededAgg,
    directAgg,
    potAgg,
    giftAidAgg,
    pendingCount,
    failedCount,
    potStatusGroups,
    unhandledContacts,
    buildingFund,
    stuckPending,
    pendingPots,
    recentSucceeded,
    recentFailed,
    recentUnhandledContacts,
  ] = await Promise.all([
    prisma.donation.aggregate({
      where: succeededWhere,
      _sum: { amount: true },
      _count: { _all: true },
      _avg: { amount: true },
    }),
    prisma.donation.aggregate({
      where: { ...succeededWhere, potId: null },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.donation.aggregate({
      where: { ...succeededWhere, potId: { not: null } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.donation.aggregate({
      where: { ...succeededWhere, giftAid: true },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.donation.count({
      where: {
        status: DonationStatus.PENDING,
        ...(createdAt ? { createdAt } : {}),
      },
    }),
    prisma.donation.count({
      where: {
        status: DonationStatus.FAILED,
        ...(createdAt ? { createdAt } : {}),
      },
    }),
    prisma.pot.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.contactMessage.count({ where: { handled: false } }),
    prisma.buildingFund.findUnique({
      where: { id: BUILDING_FUND_ID },
      select: { targetAmount: true, totalRaised: true },
    }),
    prisma.donation.findMany({
      where: {
        status: DonationStatus.PENDING,
        createdAt: { lte: stuckBefore },
      },
      orderBy: { createdAt: "asc" },
      take: 8,
      select: {
        id: true,
        amount: true,
        donorEmail: true,
        createdAt: true,
        pot: { select: { slug: true, title: true } },
      },
    }),
    prisma.pot.findMany({
      where: { status: PotStatus.PENDING },
      orderBy: { createdAt: "asc" },
      take: 6,
      select: {
        slug: true,
        title: true,
        createdAt: true,
        fundraiser: { select: { name: true, email: true } },
      },
    }),
    prisma.donation.findMany({
      where: { status: DonationStatus.SUCCEEDED },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        amount: true,
        donorName: true,
        donorEmail: true,
        isAnonymous: true,
        createdAt: true,
        pot: { select: { slug: true, title: true } },
      },
    }),
    prisma.donation.findMany({
      where: { status: DonationStatus.FAILED },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        amount: true,
        donorName: true,
        donorEmail: true,
        isAnonymous: true,
        createdAt: true,
        pot: { select: { slug: true, title: true } },
      },
    }),
    prisma.contactMessage.findMany({
      where: { handled: false },
      orderBy: { createdAt: "asc" },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        topic: true,
        createdAt: true,
      },
    }),
  ]);

  const potCounts: Record<string, number> = {};
  for (const row of potStatusGroups) {
    potCounts[row.status] = row._count._all;
  }

  const succeededCount = succeededAgg._count._all;
  const succeededPence = succeededAgg._sum.amount ?? 0;

  function mapGiftBrief<
    T extends {
      id: string;
      amount: number;
      donorEmail: string | null;
      createdAt: Date;
      pot: { slug: string; title: string } | null;
    },
  >(rows: T[]) {
    return rows.map((g) => ({
      id: g.id,
      amount: g.amount,
      donorEmail: g.donorEmail,
      createdAt: g.createdAt.toISOString(),
      destination: g.pot ? ("POT" as const) : ("DIRECT" as const),
      pot: g.pot,
    }));
  }

  function mapFeed(
    rows: Array<{
      id: string;
      amount: number;
      donorName: string | null;
      donorEmail: string | null;
      isAnonymous: boolean;
      createdAt: Date;
      pot: { slug: string; title: string } | null;
    }>,
  ) {
    return rows.map((g) => ({
      id: g.id,
      amount: g.amount,
      donorName: g.donorName,
      donorEmail: g.donorEmail,
      isAnonymous: g.isAnonymous,
      createdAt: g.createdAt.toISOString(),
      destination: g.pot ? ("POT" as const) : ("DIRECT" as const),
      pot: g.pot,
    }));
  }

  return {
    range,
    pendingStuckHours: PENDING_STUCK_HOURS,
    kpis: {
      succeededPence,
      succeededCount,
      averagePence:
        succeededCount > 0 ? Math.round(succeededAgg._avg.amount ?? 0) : 0,
      pendingCount,
      failedCount,
      direct: {
        pence: directAgg._sum.amount ?? 0,
        count: directAgg._count._all,
      },
      pot: {
        pence: potAgg._sum.amount ?? 0,
        count: potAgg._count._all,
      },
      giftAid: {
        pence: giftAidAgg._sum.amount ?? 0,
        count: giftAidAgg._count._all,
      },
      pots: {
        pending: potCounts[PotStatus.PENDING] ?? 0,
        active: potCounts[PotStatus.ACTIVE] ?? 0,
        paused: potCounts[PotStatus.PAUSED] ?? 0,
        disabled: potCounts[PotStatus.DISABLED] ?? 0,
        closed: potCounts[PotStatus.CLOSED] ?? 0,
      },
      unhandledContacts,
      buildingFund: {
        targetPence: buildingFund?.targetAmount ?? 0,
        raisedPence: buildingFund?.totalRaised ?? 0,
      },
    },
    attention: {
      stuckPending: mapGiftBrief(stuckPending),
      unseededPots: pendingPots.map((p) => ({
        slug: p.slug,
        title: p.title,
        createdAt: p.createdAt.toISOString(),
        hostName: p.fundraiser.name,
        hostEmail: p.fundraiser.email,
      })),
      unhandledContacts: recentUnhandledContacts.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        topic: c.topic,
        createdAt: c.createdAt.toISOString(),
      })),
    },
    recent: {
      succeeded: mapFeed(recentSucceeded),
      failed: mapFeed(recentFailed),
    },
  };
}

/** Short TTL — ops needs fresher numbers than public pages. */
export function getAdminOverviewCached(range: AdminOverviewRange) {
  return unstable_cache(
    () => loadAdminOverview(range),
    ["admin-overview-v1", range],
    { revalidate: 30, tags: [ADMIN_OVERVIEW_CACHE_TAG] },
  )();
}

export function revalidateAdminOverview() {
  revalidateTag(ADMIN_OVERVIEW_CACHE_TAG, "max");
}
