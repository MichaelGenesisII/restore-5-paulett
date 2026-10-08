/** All stored money is integer pence. Never persist a float. */

export const MIN_DONATION_PENCE = 100;
/** First gift that opens a new pot — the founder’s seed. */
export const MIN_POT_SEED_PENCE = 2500;
export const MAX_DONATION_PENCE = 25_000_00;

export function isPositivePence(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

export function assertDonationPence(value: unknown): number {
  if (!isPositivePence(value)) {
    throw new Error("Enter a valid gift amount.");
  }
  if (value < MIN_DONATION_PENCE || value > MAX_DONATION_PENCE) {
    throw new Error("Choose an amount between £1 and £25,000.");
  }
  return value;
}

export function formatGbp(pence: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(pence / 100);
}

/** Headline totals drop the pence — £2,000,000, not £2,000,000.00. */
export function formatWholeGbp(pence: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(pence / 100);
}

/** Shows pence only when there are any, so £62.50 and £50 both read cleanly. */
export function formatTidyGbp(pence: number): string {
  return pence % 100 === 0 ? formatWholeGbp(pence) : formatGbp(pence);
}

export function percentOf(raised: number, target: number): number {
  return target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;
}

/**
 * Gift Aid adds 25p per £1 for UK taxpayers, because the charity reclaims the
 * basic rate tax already paid on the gift.
 */
export const GIFT_AID_RATE = 0.25;

export function giftAidBonusPence(pence: number): number {
  return Math.floor(pence * GIFT_AID_RATE);
}

/**
 * Turns typed pounds into integer pence. Returns null for anything that is not
 * a clean positive amount, so callers can tell "empty" from "zero".
 */
export function poundsToPence(input: string): number | null {
  const trimmed = input.trim().replace(/^£/, "").replace(/,/g, "");
  if (trimmed === "") return null;

  const value = Number(trimmed);
  if (!Number.isFinite(value) || value <= 0) return null;

  return Math.round(value * 100);
}

/**
 * Pot targets carry no business cap. This is only the ceiling of the Int
 * column they are stored in (~£21.4m), rounded down.
 */
export const MAX_POT_TARGET_PENCE = 21_000_000_00;

export function isValidPotTargetPence(value: number | null): value is number {
  return (
    value !== null &&
    Number.isInteger(value) &&
    value >= MIN_DONATION_PENCE &&
    value <= MAX_POT_TARGET_PENCE
  );
}

export function assertPotTargetPence(value: unknown): number {
  if (!isPositivePence(value)) {
    throw new Error("Enter a valid target amount.");
  }
  if (value < MIN_DONATION_PENCE) {
    throw new Error("The smallest target is £1.");
  }
  if (value > MAX_POT_TARGET_PENCE) {
    throw new Error("That target is larger than we can hold.");
  }
  return value;
}

/** Building fund campaign target — higher ceiling than a single gift. */
export const MIN_BUILDING_FUND_TARGET_PENCE = 1_00; // £1
/** BuildingFund.targetAmount is a 32-bit int column — keep well under 2^31 pence. */
export const MAX_BUILDING_FUND_TARGET_PENCE = 20_000_000_00; // £20m

export function assertBuildingFundTargetPence(value: unknown): number {
  if (!isPositivePence(value)) {
    throw new Error("Enter a valid target amount.");
  }
  if (
    value < MIN_BUILDING_FUND_TARGET_PENCE ||
    value > MAX_BUILDING_FUND_TARGET_PENCE
  ) {
    throw new Error("Choose a target between £1 and £20,000,000.");
  }
  return value;
}
