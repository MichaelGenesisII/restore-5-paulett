import { BUILDING_FUND_ID, DEFAULT_BUILDING_FUND_TARGET_PENCE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

/**
 * Load the singleton BuildingFund row. Creates it with the code default
 * target if missing. Never reads BUILDING_FUND_TARGET_PENCE from env —
 * admin edits targetAmount in the DB.
 */
export async function getOrCreateBuildingFund() {
  const existing = await prisma.buildingFund.findUnique({
    where: { id: BUILDING_FUND_ID },
  });
  if (existing) return existing;

  return prisma.buildingFund.create({
    data: {
      id: BUILDING_FUND_ID,
      targetAmount: DEFAULT_BUILDING_FUND_TARGET_PENCE,
      totalRaised: 0,
    },
  });
}
