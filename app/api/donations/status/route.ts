import { NextResponse, after } from "next/server";
import { DonationStatus } from "@prisma/client";
import { creditSucceededDonation } from "@/app/api/webhooks/stripe/apply-totals";
import { prisma } from "@/lib/prisma";
import { getStripe, stripeId } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * When the donation is still PENDING or FAILED, ask Stripe whether this Checkout
 * session is already paid. Covers local dev without `stripe listen`, production
 * when the webhook is late, and card retries after an earlier FAILED mark.
 * Idempotent with the webhook — creditSucceededDonation no-ops safely.
 * We never treat the redirect alone as proof of payment.
 */
async function reconcileFromStripe(sessionId: string, donationId: string) {
  const session = await getStripe().checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== "paid") {
    return;
  }

  const amount = session.amount_total;
  if (typeof amount !== "number") {
    return;
  }

  const result = await creditSucceededDonation({
    donationId,
    amount,
    stripePaymentIntentId: stripeId(session.payment_intent),
    stripeSubscriptionId: stripeId(session.subscription),
    stripeInvoiceId: stripeId(session.invoice),
  });

  // Resend idempotency key dedupes with the webhook path.
  after(() => {
    void import("@/lib/email/giving-notify")
      .then(({ notifyGiftSucceeded }) =>
        notifyGiftSucceeded(result.donationId),
      )
      .catch((err) => console.error("Reconcile email failed", err));
  });
}

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "session_id required" }, { status: 400 });
  }

  let donation = await prisma.donation.findUnique({
    where: { stripeCheckoutSessionId: sessionId },
    include: {
      pot: {
        select: {
          slug: true,
          totalRaised: true,
          donorCount: true,
          status: true,
        },
      },
    },
  });

  if (!donation) {
    return NextResponse.json({ status: "unknown" });
  }

  if (
    donation.status === DonationStatus.PENDING ||
    donation.status === DonationStatus.FAILED
  ) {
    try {
      await reconcileFromStripe(sessionId, donation.id);
      donation = await prisma.donation.findUnique({
        where: { id: donation.id },
        include: {
          pot: {
            select: {
              slug: true,
              totalRaised: true,
              donorCount: true,
              status: true,
            },
          },
        },
      });
    } catch (error) {
      console.error("Donation status reconcile failed", error);
    }
  } else if (donation.status === DonationStatus.SUCCEEDED) {
    // Cover a credited gift whose thank-you `after()` never ran (process death).
    after(() => {
      void import("@/lib/email/giving-notify")
        .then(({ notifyGiftSucceeded }) =>
          notifyGiftSucceeded(donation!.id),
        )
        .catch((err) => console.error("Status receipt retry failed", err));
    });
  }

  if (!donation) {
    return NextResponse.json({ status: "unknown" });
  }

  const fund = await prisma.buildingFund.findUnique({ where: { id: 1 } });

  /** First succeeded gift on a pot = the seed that opened it. */
  let isSeedGift = false;
  if (
    donation.potId &&
    donation.status === DonationStatus.SUCCEEDED
  ) {
    const earlier = await prisma.donation.count({
      where: {
        potId: donation.potId,
        status: DonationStatus.SUCCEEDED,
        createdAt: { lt: donation.createdAt },
      },
    });
    isSeedGift = earlier === 0;
  }

  return NextResponse.json({
    status: donation.status,
    amount: donation.amount,
    potSlug: donation.pot?.slug ?? null,
    potTotalRaised: donation.pot?.totalRaised ?? null,
    buildingFundTotalRaised: fund?.totalRaised ?? 0,
    isSeedGift,
  });
}
