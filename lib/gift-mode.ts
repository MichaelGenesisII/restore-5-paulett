export type GiftMode = "card_once" | "card_monthly";

export function parseGiftMode(body: {
  giftMode?: unknown;
  isRecurring?: unknown;
}): GiftMode {
  if (body.giftMode === "card_monthly") return "card_monthly";
  if (body.giftMode === "card_once") return "card_once";
  if (body.isRecurring === true) return "card_monthly";
  return "card_once";
}

export function isSubscription(mode: GiftMode): boolean {
  return mode === "card_monthly";
}
