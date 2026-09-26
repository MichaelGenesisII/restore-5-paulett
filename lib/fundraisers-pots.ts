import { PotStatus, PotType, type Prisma } from "@prisma/client";
import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";

export const FUNDRAISERS_POTS_CACHE_TAG = "fundraisers-pots";

export const POTS_PER_PAGE = 12;

export type FundraiserPotCard = {
  slug: string;
  title: string;
  story: string | null;
  photoUrl: string | null;
  type: PotType;
  targetAmount: number;
  totalRaised: number;
  donorCount: number;
  fundraiser: { name: string };
};

export type FundraisersPageData = {
  pots: FundraiserPotCard[];
  total: number;
  totalPages: number;
  currentPage: number;
  rangeStart: number;
  rangeEnd: number;
};

function buildWhere(
  type: PotType | undefined,
  search: string,
): Prisma.PotWhereInput {
  return {
    status: PotStatus.ACTIVE,
    ...(type ? { type } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" as const } },
            { story: { contains: search, mode: "insensitive" as const } },
            {
              fundraiser: {
                name: { contains: search, mode: "insensitive" as const },
              },
            },
          ],
        }
      : {}),
  };
}

async function loadFundraisersPage(
  typeKey: string,
  search: string,
  page: number,
): Promise<FundraisersPageData> {
  const type =
    typeKey && Object.values(PotType).includes(typeKey as PotType)
      ? (typeKey as PotType)
      : undefined;
  const where = buildWhere(type, search);

  const total = await prisma.pot.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / POTS_PER_PAGE));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const pots = await prisma.pot.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    skip: (currentPage - 1) * POTS_PER_PAGE,
    take: POTS_PER_PAGE,
    select: {
      slug: true,
      title: true,
      story: true,
      photoUrl: true,
      type: true,
      targetAmount: true,
      totalRaised: true,
      donorCount: true,
      fundraiser: { select: { name: true } },
    },
  });

  return {
    pots,
    total,
    totalPages,
    currentPage,
    rangeStart: total === 0 ? 0 : (currentPage - 1) * POTS_PER_PAGE + 1,
    rangeEnd: Math.min(currentPage * POTS_PER_PAGE, total),
  };
}

/**
 * Cached fundraisers grid — keyed by filters/page so the hero can paint
 * without waiting on Prisma. Tag-invalidated when pot totals change.
 */
export function getFundraisersPageCached(opts: {
  type?: string;
  search?: string;
  page?: number;
}) {
  const typeKey = opts.type?.trim() ?? "";
  const search = opts.search?.trim() ?? "";
  const page = opts.page && opts.page > 0 ? opts.page : 1;

  return unstable_cache(
    () => loadFundraisersPage(typeKey, search, page),
    ["fundraisers-pots-v1", typeKey, search, String(page)],
    { revalidate: 60, tags: [FUNDRAISERS_POTS_CACHE_TAG] },
  )();
}

export function revalidateFundraisersPots() {
  revalidateTag(FUNDRAISERS_POTS_CACHE_TAG, "max");
}
