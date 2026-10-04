import { unstable_cache, revalidateTag } from "next/cache";
import {
  computeGiftAnalytics,
  computeTrafficAnalytics,
} from "@/lib/pot-analytics";
import { loadPotPageViews } from "@/lib/pot-page-views";
import { prisma } from "@/lib/prisma";

export const HOST_POT_ANALYTICS_CACHE_TAG = "host-pot-analytics";

async function loadHostPotAnalytics(potId: string) {
  const pot = await prisma.pot.findUnique({
    where: { id: potId },
    select: {
      slug: true,
      status: true,
      targetAmount: true,
      totalRaised: true,
      donorCount: true,
      createdAt: true,
      donations: {
        where: { status: "SUCCEEDED" },
        orderBy: { createdAt: "asc" },
        select: {
          amount: true,
          createdAt: true,
          donorEmail: true,
          giftAid: true,
          isRecurring: true,
          message: true,
          commentHidden: true,
          creatorReply: true,
        },
      },
    },
  });

  if (!pot) return null;

  const gifts = computeGiftAnalytics({
    slug: pot.slug,
    targetPence: pot.targetAmount,
    raisedPence: pot.totalRaised,
    giftCount: pot.donorCount,
    status: pot.status,
    createdAt: pot.createdAt,
    gifts: pot.donations,
  });

  let traffic = null;
  try {
    const views = await loadPotPageViews(potId, 90);
    traffic = computeTrafficAnalytics(
      views,
      gifts.giftsLast7,
      gifts.giftsLast30,
    );
  } catch (error) {
    console.error("traffic analytics failed", error);
  }

  return {
    ...gifts,
    traffic,
  };
}

/** Host pot analytics — 60s Data Cache per pot. */
export function getHostPotAnalyticsCached(potId: string) {
  return unstable_cache(
    () => loadHostPotAnalytics(potId),
    ["host-pot-analytics-v1", potId],
    {
      revalidate: 60,
      tags: [HOST_POT_ANALYTICS_CACHE_TAG, `host-pot-analytics:${potId}`],
    },
  )();
}

export function revalidateHostPotAnalytics() {
  revalidateTag(HOST_POT_ANALYTICS_CACHE_TAG, "max");
}
