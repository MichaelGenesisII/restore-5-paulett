import { createHash } from "crypto";
import { giftAidBonusPence, percentOf } from "@/lib/money";

export type GiftRow = {
  amount: number;
  createdAt: Date;
  donorEmail: string | null;
  giftAid: boolean;
  isRecurring: boolean;
  message: string | null;
  commentHidden: boolean;
  creatorReply: string | null;
};

export type TrafficRow = {
  viewedAt: Date;
  day: Date;
  visitorKey: string;
  country: string | null;
  referrerHost: string | null;
  device: string;
  src: string | null;
};

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function daysBetween(from: Date, to: Date): number {
  const a = startOfUtcDay(from).getTime();
  const b = startOfUtcDay(to).getTime();
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
  }
  return sorted[mid]!;
}

function topCounts(
  values: Array<string | null | undefined>,
  limit: number,
): Array<{ key: string; count: number }> {
  const map = new Map<string, number>();
  for (const value of values) {
    const key = (value ?? "").trim();
    if (!key) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

export function hashVisitorId(visitorId: string): string {
  return createHash("sha256").update(`pvn-vid:${visitorId}`).digest("hex");
}

export function computeGiftAnalytics(input: {
  slug: string;
  targetPence: number;
  raisedPence: number;
  giftCount: number;
  status: string;
  createdAt: Date;
  gifts: GiftRow[];
}) {
  const now = new Date();
  const day7 = new Date(now.getTime() - 7 * 86_400_000);
  const day30 = new Date(now.getTime() - 30 * 86_400_000);

  const amounts = input.gifts.map((g) => g.amount).sort((a, b) => a - b);
  const sum = amounts.reduce((s, n) => s + n, 0);

  const last7 = input.gifts.filter((g) => g.createdAt >= day7);
  const last30 = input.gifts.filter((g) => g.createdAt >= day30);

  const emailOrder = [...input.gifts]
    .filter((g) => g.donorEmail?.trim())
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const seen = new Set<string>();
  let newDonorGifts = 0;
  let returningDonorGifts = 0;
  for (const g of emailOrder) {
    const email = g.donorEmail!.trim().toLowerCase();
    if (seen.has(email)) returningDonorGifts += 1;
    else {
      seen.add(email);
      newDonorGifts += 1;
    }
  }
  const approxUniqueDonors = seen.size;

  const withMessage = input.gifts.filter((g) => Boolean(g.message?.trim()));
  const messagesUnreplied = withMessage.filter((g) => !g.creatorReply).length;
  const messagesHidden = withMessage.filter((g) => g.commentHidden).length;
  const replied = withMessage.filter((g) => Boolean(g.creatorReply)).length;
  const replyRatePct =
    withMessage.length > 0
      ? Math.round((replied / withMessage.length) * 100)
      : 0;

  const giftAidGifts = input.gifts.filter((g) => g.giftAid);
  const giftAidEstimatePence = giftAidGifts.reduce(
    (s, g) => s + giftAidBonusPence(g.amount),
    0,
  );

  const lastGift = input.gifts[0]
    ? [...input.gifts].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      )[0]
    : null;

  const firstGift = input.gifts.length
    ? [...input.gifts].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      )[0]!
    : null;

  const daysLive =
    input.status === "PENDING"
      ? null
      : daysBetween(firstGift?.createdAt ?? input.createdAt, now);

  const seriesStart = startOfUtcDay(
    new Date(now.getTime() - 29 * 86_400_000),
  );
  const seriesMap = new Map<string, { raisedPence: number; gifts: number }>();
  for (let i = 0; i < 30; i += 1) {
    const d = new Date(seriesStart.getTime() + i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    seriesMap.set(key, { raisedPence: 0, gifts: 0 });
  }
  for (const g of input.gifts) {
    if (g.createdAt < seriesStart) continue;
    const key = startOfUtcDay(g.createdAt).toISOString().slice(0, 10);
    const row = seriesMap.get(key);
    if (!row) continue;
    row.raisedPence += g.amount;
    row.gifts += 1;
  }

  return {
    slug: input.slug,
    raisedPence: input.raisedPence || sum,
    targetPence: input.targetPence,
    progressPct: percentOf(input.raisedPence || sum, input.targetPence),
    giftCount: input.giftCount || input.gifts.length,
    approxUniqueDonors,
    averageGiftPence:
      amounts.length > 0 ? Math.round(sum / amounts.length) : 0,
    medianGiftPence: median(amounts),
    largestGiftPence: amounts.length ? amounts[amounts.length - 1]! : 0,
    raisedLast7Pence: last7.reduce((s, g) => s + g.amount, 0),
    raisedLast30Pence: last30.reduce((s, g) => s + g.amount, 0),
    giftsLast7: last7.length,
    giftsLast30: last30.length,
    newDonorCount: newDonorGifts,
    returningDonorCount: returningDonorGifts,
    giftAidCount: giftAidGifts.length,
    giftAidEstimatePence,
    oneOffCount: input.gifts.filter((g) => !g.isRecurring).length,
    recurringCount: input.gifts.filter((g) => g.isRecurring).length,
    messagesTotal: withMessage.length,
    messagesUnreplied,
    messagesHidden,
    replyRatePct,
    daysSinceLastGift: lastGift
      ? daysBetween(lastGift.createdAt, now)
      : null,
    daysLive,
    seriesDaily: [...seriesMap.entries()].map(([date, row]) => ({
      date,
      raisedPence: row.raisedPence,
      gifts: row.gifts,
    })),
  };
}

export function computeTrafficAnalytics(
  views: TrafficRow[],
  giftsLast7: number,
  giftsLast30: number,
) {
  if (views.length === 0) {
    return {
      pageViews7: 0,
      pageViews30: 0,
      pageViewsAll: 0,
      uniqueVisitors7: 0,
      uniqueVisitors30: 0,
      conversionPct7: null as number | null,
      conversionPct30: null as number | null,
      topCountries: [] as Array<{ country: string; views: number }>,
      topReferrers: [] as Array<{ host: string; views: number }>,
      deviceSplit: { mobile: 0, desktop: 0, other: 0 },
      shareSources: [] as Array<{ src: string; views: number }>,
      seriesDaily: [] as Array<{ date: string; views: number; uniques: number }>,
      viewsWithZeroGifts7: true,
    };
  }

  const now = new Date();
  const day7 = new Date(now.getTime() - 7 * 86_400_000);
  const day30 = new Date(now.getTime() - 30 * 86_400_000);
  const views7 = views.filter((v) => v.viewedAt >= day7);
  const views30 = views.filter((v) => v.viewedAt >= day30);

  const unique = (rows: TrafficRow[]) =>
    new Set(rows.map((r) => r.visitorKey)).size;

  const unique7 = unique(views7);
  const unique30 = unique(views30);

  const deviceSplit = { mobile: 0, desktop: 0, other: 0 };
  for (const v of views30) {
    if (v.device === "mobile") deviceSplit.mobile += 1;
    else if (v.device === "desktop") deviceSplit.desktop += 1;
    else deviceSplit.other += 1;
  }

  const seriesStart = startOfUtcDay(
    new Date(now.getTime() - 29 * 86_400_000),
  );
  const seriesMap = new Map<
    string,
    { views: number; visitors: Set<string> }
  >();
  for (let i = 0; i < 30; i += 1) {
    const d = new Date(seriesStart.getTime() + i * 86_400_000);
    seriesMap.set(d.toISOString().slice(0, 10), {
      views: 0,
      visitors: new Set(),
    });
  }
  for (const v of views) {
    if (v.viewedAt < seriesStart) continue;
    const key = startOfUtcDay(v.day).toISOString().slice(0, 10);
    const row = seriesMap.get(key);
    if (!row) continue;
    row.views += 1;
    row.visitors.add(v.visitorKey);
  }

  return {
    pageViews7: views7.length,
    pageViews30: views30.length,
    pageViewsAll: views.length,
    uniqueVisitors7: unique7,
    uniqueVisitors30: unique30,
    conversionPct7:
      unique7 > 0 ? Math.round((giftsLast7 / unique7) * 1000) / 10 : null,
    conversionPct30:
      unique30 > 0 ? Math.round((giftsLast30 / unique30) * 1000) / 10 : null,
    topCountries: topCounts(
      views30.map((v) => v.country),
      8,
    ).map(({ key, count }) => ({ country: key, views: count })),
    topReferrers: topCounts(
      views30.map((v) => v.referrerHost),
      8,
    ).map(({ key, count }) => ({ host: key, views: count })),
    deviceSplit,
    shareSources: topCounts(
      views30.map((v) => v.src),
      8,
    ).map(({ key, count }) => ({ src: key, views: count })),
    seriesDaily: [...seriesMap.entries()].map(([date, row]) => ({
      date,
      views: row.views,
      uniques: row.visitors.size,
    })),
    viewsWithZeroGifts7: views7.length > 0 && giftsLast7 === 0,
  };
}

export function parseDevice(userAgent: string | null): string {
  if (!userAgent) return "other";
  if (/mobile|android|iphone|ipad|ipod/i.test(userAgent)) return "mobile";
  if (/windows|macintosh|linux|cros/i.test(userAgent)) return "desktop";
  return "other";
}

export function parseReferrerHost(referrer: string | null): string | null {
  if (!referrer?.trim()) return null;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    return host || null;
  } catch {
    return null;
  }
}

export function parseShareSrc(
  src: string | null,
  utmSource: string | null,
): string | null {
  const raw = (src ?? utmSource ?? "").trim().toLowerCase().slice(0, 64);
  if (!raw) return null;
  if (!/^[a-z0-9_-]+$/.test(raw)) return null;
  return raw;
}
