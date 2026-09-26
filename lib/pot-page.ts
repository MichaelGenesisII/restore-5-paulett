import { PotStatus, type PotType } from "@prisma/client";
import { unstable_cache, revalidateTag } from "next/cache";
import type { PotRollTileData } from "@/components/pots/PotRollTile";
import { prisma } from "@/lib/prisma";

export const POT_DETAIL_CACHE_TAG = "pot-detail";
export const POT_COMMENTS_CACHE_TAG = "pot-comments";

const COMMENTS_PER_PAGE = 10;

export type PublicPot = {
  id: string;
  slug: string;
  title: string;
  story: string | null;
  founderStory: string | null;
  photoUrl: string | null;
  type: PotType;
  status: string;
  targetAmount: number;
  totalRaised: number;
  donorCount: number;
  fundraiser: {
    name: string;
    bio: string | null;
    photoUrl: string | null;
    profileSlug: string | null;
    profilePublic: boolean;
  };
};

export type PotCommentRow = {
  id: string;
  donorName: string | null;
  amount: number;
  message: string | null;
  creatorReply: string | null;
};

export type PotCommentsPage = {
  comments: PotCommentRow[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  creatorName: string;
};

async function loadPublicPot(slug: string): Promise<PublicPot | null> {
  return prisma.pot.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      story: true,
      founderStory: true,
      photoUrl: true,
      type: true,
      status: true,
      targetAmount: true,
      totalRaised: true,
      donorCount: true,
      fundraiser: {
        select: {
          name: true,
          bio: true,
          photoUrl: true,
          profileSlug: true,
          profilePublic: true,
        },
      },
    },
  });
}

/** Core pot for the hero/story/form — no comments payload. */
export function getPublicPotCached(slug: string) {
  return unstable_cache(
    () => loadPublicPot(slug),
    ["pot-public-v1", slug],
    {
      revalidate: 30,
      tags: [POT_DETAIL_CACHE_TAG, `pot:${slug}`],
    },
  )();
}

async function loadPotCommentsPage(
  slug: string,
  page: number,
): Promise<PotCommentsPage | null> {
  const pot = await prisma.pot.findUnique({
    where: { slug },
    select: {
      fundraiser: { select: { name: true } },
      donations: {
        where: {
          status: "SUCCEEDED",
          isAnonymous: false,
          message: { not: null },
          commentHidden: false,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * COMMENTS_PER_PAGE,
        take: COMMENTS_PER_PAGE,
        select: {
          id: true,
          donorName: true,
          amount: true,
          message: true,
          creatorReply: true,
        },
      },
      _count: {
        select: {
          donations: {
            where: {
              status: "SUCCEEDED",
              isAnonymous: false,
              message: { not: null },
              commentHidden: false,
            },
          },
        },
      },
    },
  });

  if (!pot) return null;

  const totalCount = pot._count.donations;
  const totalPages = Math.max(1, Math.ceil(totalCount / COMMENTS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);

  return {
    comments: pot.donations,
    totalCount,
    totalPages,
    currentPage,
    creatorName: pot.fundraiser.name,
  };
}

export function getPotCommentsCached(slug: string, page: number) {
  const safePage = page > 0 ? page : 1;
  return unstable_cache(
    () => loadPotCommentsPage(slug, safePage),
    ["pot-comments-v1", slug, String(safePage)],
    {
      revalidate: 30,
      tags: [POT_COMMENTS_CACHE_TAG, `pot-comments:${slug}`],
    },
  )();
}

async function loadOtherPots(excludeSlug: string): Promise<PotRollTileData[]> {
  const rows = await prisma.pot.findMany({
    where: {
      status: PotStatus.ACTIVE,
      slug: { not: excludeSlug },
    },
    orderBy: [{ totalRaised: "desc" }, { updatedAt: "desc" }],
    take: 12,
    select: {
      slug: true,
      title: true,
      photoUrl: true,
      type: true,
      targetAmount: true,
      totalRaised: true,
      donorCount: true,
      fundraiser: { select: { name: true } },
    },
  });

  return rows.map((row) => ({
    slug: row.slug,
    title: row.title,
    photoUrl: row.photoUrl,
    type: row.type,
    targetAmount: row.targetAmount,
    totalRaised: row.totalRaised,
    donorCount: row.donorCount,
    fundraiserName: row.fundraiser.name,
  }));
}

export function getOtherPotsCached(excludeSlug: string) {
  return unstable_cache(
    () => loadOtherPots(excludeSlug),
    ["pot-others-v1", excludeSlug],
    {
      revalidate: 60,
      tags: [POT_DETAIL_CACHE_TAG],
    },
  )();
}

/** Follow old-slug redirects without caching (rare path). */
export async function findPotSlugRedirect(oldSlug: string) {
  const row = await prisma.potSlugRedirect.findUnique({
    where: { oldSlug },
    select: { pot: { select: { slug: true } } },
  });
  return row?.pot.slug ?? null;
}

export function revalidatePotDetailCaches() {
  revalidateTag(POT_DETAIL_CACHE_TAG, "max");
  revalidateTag(POT_COMMENTS_CACHE_TAG, "max");
}
