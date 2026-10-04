import { DonationStatus, Prisma } from "@prisma/client";
import { unstable_cache, revalidateTag } from "next/cache";
import { BUILDING_FUND_ID } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const WALL_CACHE_TAG = "the-wall";

export const MESSAGES_PER_PAGE = 12;
const RECENT_POT_STONES = 36;

const publicMessageFilter = {
  status: DonationStatus.SUCCEEDED,
  commentHidden: false,
  message: { not: null },
  NOT: { message: "" },
} satisfies Prisma.DonationWhereInput;

export type WallStone = {
  id: string;
  amount: number;
  message: string;
  donorName: string | null;
  isAnonymous: boolean;
  /** ISO string — Data Cache serializes Dates. */
  createdAt: string;
  source: "direct" | "pot";
  pot: { slug: string; title: string } | null;
};

export type WallMetrics = {
  totalCount: number;
  directGifts: number;
  houseRaised: number;
};

export type WallPageData = {
  stones: WallStone[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
};

type WallBundle = {
  feed: WallStone[];
  directGifts: number;
  houseRaised: number;
};

async function loadWallBundle(): Promise<WallBundle> {
  const [directRows, potRows, directAgg, fund] = await Promise.all([
    prisma.donation.findMany({
      where: { ...publicMessageFilter, potId: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        amount: true,
        message: true,
        donorName: true,
        isAnonymous: true,
        createdAt: true,
      },
    }),
    prisma.donation.findMany({
      where: {
        ...publicMessageFilter,
        potId: { not: null },
        isAnonymous: false,
      },
      orderBy: { createdAt: "desc" },
      take: RECENT_POT_STONES,
      select: {
        id: true,
        amount: true,
        message: true,
        donorName: true,
        isAnonymous: true,
        createdAt: true,
        pot: { select: { slug: true, title: true } },
      },
    }),
    prisma.donation.aggregate({
      where: { status: DonationStatus.SUCCEEDED, potId: null },
      _count: { _all: true },
    }),
    prisma.buildingFund.findUnique({
      where: { id: BUILDING_FUND_ID },
      select: { totalRaised: true },
    }),
  ]);

  const directStones: WallStone[] = directRows
    .filter((row) => Boolean(row.message?.trim()))
    .map((row) => ({
      id: row.id,
      amount: row.amount,
      message: row.message!.trim(),
      donorName: row.donorName,
      isAnonymous: row.isAnonymous,
      createdAt: row.createdAt.toISOString(),
      source: "direct" as const,
      pot: null,
    }));

  const potStones: WallStone[] = potRows
    .filter((row) => Boolean(row.message?.trim()) && row.pot)
    .map((row) => ({
      id: row.id,
      amount: row.amount,
      message: row.message!.trim(),
      donorName: row.donorName,
      isAnonymous: row.isAnonymous,
      createdAt: row.createdAt.toISOString(),
      source: "pot" as const,
      pot: row.pot,
    }));

  return {
    feed: [...directStones, ...potStones],
    directGifts: directAgg._count._all,
    houseRaised: fund?.totalRaised ?? 0,
  };
}

const getWallBundleCached = unstable_cache(loadWallBundle, ["wall-bundle-v1"], {
  revalidate: 60,
  tags: [WALL_CACHE_TAG],
});

export async function getWallMetricsCached(): Promise<WallMetrics> {
  const bundle = await getWallBundleCached();
  return {
    totalCount: bundle.feed.length,
    directGifts: bundle.directGifts,
    houseRaised: bundle.houseRaised,
  };
}

/** Paginated slice of the cached wall feed. */
export async function getWallPageCached(page: number): Promise<WallPageData> {
  const bundle = await getWallBundleCached();
  const totalCount = bundle.feed.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / MESSAGES_PER_PAGE));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * MESSAGES_PER_PAGE;

  return {
    stones: bundle.feed.slice(start, start + MESSAGES_PER_PAGE),
    totalCount,
    totalPages,
    currentPage,
  };
}

export function revalidateWall() {
  revalidateTag(WALL_CACHE_TAG, "max");
}
