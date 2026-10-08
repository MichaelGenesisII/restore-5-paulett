export const BUILDING_FUND_ID = 1;

export const GBP = "gbp";

/**
 * Default target (phase one, £750,000 in pence) when the BuildingFund row is
 * first created (seed / first gift). Live target is BuildingFund.targetAmount
 * — edited in /admin/building-fund.
 */
export const DEFAULT_BUILDING_FUND_TARGET_PENCE = 75_000_000;

/** @deprecated Prefer DB `BuildingFund.targetAmount` via getOrCreateBuildingFund. */
export function getBuildingFundTargetPence(): number {
  return DEFAULT_BUILDING_FUND_TARGET_PENCE;
}
