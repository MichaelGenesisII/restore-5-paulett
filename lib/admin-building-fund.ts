import { unstable_cache, revalidateTag } from "next/cache";
import { DonationStatus, type RestorationCategory } from "@prisma/client";
import { getOrCreateBuildingFund } from "@/lib/building-fund";
import { restorationLabel } from "@/lib/pots";
import { prisma } from "@/lib/prisma";

export const ADMIN_BUILDING_FUND_CACHE_TAG = "admin-building-fund";

async function loadAdminBuildingFund() {
  const [fund, categoryGroups, succeededCount] = await Promise.all([
    getOrCreateBuildingFund(),
    prisma.donation.groupBy({
      by: ["restorationCategory"],
      where: { status: DonationStatus.SUCCEEDED },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.donation.count({
      where: { status: DonationStatus.SUCCEEDED },
    }),
  ]);

  const categories = categoryGroups
    .map((row) => ({
      category: row.restorationCategory,
      label: restorationLabel(row.restorationCategory as RestorationCategory),
      pence: row._sum.amount ?? 0,
      count: row._count._all,
    }))
    .filter((row) => row.pence > 0 || row.count > 0)
    .sort((a, b) => b.pence - a.pence);

  return {
    targetAmount: fund.targetAmount,
    totalRaised: fund.totalRaised,
    remainingPence: Math.max(0, fund.targetAmount - fund.totalRaised),
    succeededGiftCount: succeededCount,
    updatedAt: fund.updatedAt.toISOString(),
    categories,
  };
}

export function getAdminBuildingFundCached() {
  return unstable_cache(loadAdminBuildingFund, ["admin-building-fund-v1"], {
    revalidate: 30,
    tags: [ADMIN_BUILDING_FUND_CACHE_TAG],
  })();
}

export function revalidateAdminBuildingFund() {
  revalidateTag(ADMIN_BUILDING_FUND_CACHE_TAG, "max");
}
