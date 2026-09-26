import { PotStatus } from "@prisma/client";
import { unstable_cache, revalidateTag } from "next/cache";
import type { HomePotTile } from "@/components/home/HomePots";
import { FUNDRAISERS_POTS_CACHE_TAG } from "@/lib/fundraisers-pots";
import {
  POT_COMMENTS_CACHE_TAG,
  POT_DETAIL_CACHE_TAG,
} from "@/lib/pot-page";
import { WALL_CACHE_TAG } from "@/lib/wall";
import { ALUMNI_POTS_CACHE_TAG } from "@/lib/alumni-pots";
import { revalidateHostMe } from "@/lib/host-me";
import { prisma } from "@/lib/prisma";

/** Data-cache tag — invalidate when pots are created or totals change. */
export const HOME_POTS_CACHE_TAG = "home-pots";

async function loadHomePots(): Promise<HomePotTile[]> {
  const potRows = await prisma.pot.findMany({
    where: { status: PotStatus.ACTIVE },
    orderBy: [{ totalRaised: "desc" }, { updatedAt: "desc" }],
    take: 24,
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

  return potRows.map((pot) => ({
    slug: pot.slug,
    title: pot.title,
    photoUrl: pot.photoUrl,
    type: pot.type,
    targetAmount: pot.targetAmount,
    totalRaised: pot.totalRaised,
    donorCount: pot.donorCount,
    fundraiserName: pot.fundraiser.name,
  }));
}

/**
 * Home pots roll — Data Cache, 60s revalidate + tag invalidation.
 * Keeps the home shell fast; Suspense streams this section separately.
 */
export const getHomePotsCached = unstable_cache(loadHomePots, ["home-pots-v1"], {
  revalidate: 60,
  tags: [HOME_POTS_CACHE_TAG],
});

export function revalidateHomePots() {
  revalidateTag(HOME_POTS_CACHE_TAG, "max");
  revalidateTag(FUNDRAISERS_POTS_CACHE_TAG, "max");
  revalidateTag(POT_DETAIL_CACHE_TAG, "max");
  revalidateTag(POT_COMMENTS_CACHE_TAG, "max");
  revalidateTag(WALL_CACHE_TAG, "max");
  revalidateTag(ALUMNI_POTS_CACHE_TAG, "max");
  revalidateHostMe();
}
