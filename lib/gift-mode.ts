import { PaymentMethod } from "@prisma/client";

export type GiftMode = "card_once" | "card_monthly" | "bacs_standing_order";

export function parseGiftMode(body: {
  giftMode?: unknown;
  isRecurring?: unknown;
}): GiftMode {
  if (body.giftMode === "bacs_standing_order") return "bacs_standing_order";
  if (body.giftMode === "card_monthly") return "card_monthly";
  if (body.giftMode === "card_once") return "card_once";
  if (body.isRecurring === true) return "card_monthly";
  return "card_once";
}

export function prismaPaymentMethod(mode: GiftMode): PaymentMethod {
  return mode === "bacs_standing_order"
    ? PaymentMethod.BACS_DEBIT
    : PaymentMethod.CARD;
}

export function isStandingOrder(mode: GiftMode): boolean {
  return mode === "bacs_standing_order";
}

export function isSubscription(mode: GiftMode): boolean {
  return mode === "card_monthly" || mode === "bacs_standing_order";
}
