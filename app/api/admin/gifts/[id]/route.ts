import { NextResponse } from "next/server";
import { DonationStatus } from "@prisma/client";
import {
  isAdminAuthFailure,
  requireAdmin,
} from "@/lib/auth/require-admin";
import { revalidateAdminAnalytics } from "@/lib/admin-analytics";
import { revalidateAdminGifts } from "@/lib/admin-gifts";
import { revalidateAdminOverview } from "@/lib/admin-overview";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const giftSelect = {
  id: true,
  amount: true,
  status: true,
  potId: true,
  restorationCategory: true,
  donorName: true,
  donorEmail: true,
  isAnonymous: true,
  message: true,
  messageOriginal: true,
  commentHidden: true,
  creatorReply: true,
  creatorReplyAt: true,
  isRecurring: true,
  giftAid: true,
  donorAddressLine1: true,
  donorCity: true,
  donorPostcode: true,
  stripePaymentIntentId: true,
  stripeCheckoutSessionId: true,
  stripeSubscriptionId: true,
  stripeInvoiceId: true,
  totalsApplied: true,
  subscriptionCancelledAt: true,
  paymentMethod: true,
  createdAt: true,
  pot: {
    select: {
      slug: true,
      title: true,
      status: true,
      fundraiser: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  },
} as const;

function serializeGift<
  T extends {
    potId: string | null;
    createdAt: Date;
    creatorReplyAt: Date | null;
  },
>(gift: T) {
  return {
    ...gift,
    createdAt: gift.createdAt.toISOString(),
    creatorReplyAt: gift.creatorReplyAt?.toISOString() ?? null,
    destination: gift.potId ? ("POT" as const) : ("DIRECT" as const),
  };
}

/** Single gift attempt — full PII for ops. */
export async function GET(request: Request, context: RouteContext) {
  const session = await requireAdmin(request);
  if (isAdminAuthFailure(session)) return session;

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Gift id required" }, { status: 400 });
  }

  const gift = await prisma.donation.findUnique({
    where: { id: id.trim() },
    select: giftSelect,
  });

  if (!gift) {
    return NextResponse.json({ error: "Gift not found" }, { status: 404 });
  }

  return NextResponse.json({ gift: serializeGift(gift) });
}

/**
 * Delete a non-succeeded attempt. Succeeded gifts must stay for totals /
 * Gift Aid — use Stripe refunds, not delete.
 */
export async function DELETE(request: Request, context: RouteContext) {
  const session = await requireAdmin(request);
  if (isAdminAuthFailure(session)) return session;

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Gift id required" }, { status: 400 });
  }

  const existing = await prisma.donation.findUnique({
    where: { id: id.trim() },
    select: { id: true, status: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Gift not found" }, { status: 404 });
  }

  if (
    existing.status === DonationStatus.SUCCEEDED ||
    existing.status === DonationStatus.REFUNDED
  ) {
    return NextResponse.json(
      {
        error:
          "Succeeded or refunded gifts cannot be deleted (totals and claims). Remove pending or failed attempts only.",
      },
      { status: 400 },
    );
  }

  await prisma.donation.delete({ where: { id: existing.id } });
  revalidateAdminGifts();
  revalidateAdminOverview();
  revalidateAdminAnalytics();
  return NextResponse.json({ ok: true, id: existing.id });
}
