/**
 * THE ONLY MODULE ALLOWED TO CHANGE Pot.totalRaised, Pot.donorCount,
 * or BuildingFund.totalRaised. Call from the Stripe webhook route, or from
 * the donations status reconcile path when Checkout is already paid but the
 * webhook has not landed yet. Nowhere else — not checkout, not the frontend,
 * not admin.
 *
 * Uses atomic updateMany / increment — not interactive $transaction — so it
 * works with Supabase’s transaction pooler (DATABASE_URL :6543 / pgbouncer).
 * Interactive transactions on that pooler raise P2028 (“Transaction not found”).
 *
 * Status claim and totals bump are split with `totalsApplied` so a crash
 * between the two can be retried without double-counting.
 */
import {
  DonationStatus,
  PaymentMethod,
  PotStatus,
  Prisma,
  type RestorationCategory,
} from "@prisma/client";
import { BUILDING_FUND_ID, DEFAULT_BUILDING_FUND_TARGET_PENCE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

type CreditInput = {
  donationId: string;
  amount: number;
  stripePaymentIntentId?: string | null;
  stripeSubscriptionId?: string | null;
  stripeInvoiceId?: string | null;
};

type RenewalInput = {
  amount: number;
  potId: string | null;
  restorationCategory: RestorationCategory;
  donorName: string | null;
  donorEmail: string | null;
  isAnonymous: boolean;
  giftAid: boolean;
  donorAddressLine1: string | null;
  donorCity: string | null;
  donorPostcode: string | null;
  paymentMethod: PaymentMethod;
  stripePaymentIntentId: string;
  stripeSubscriptionId: string | null;
  stripeInvoiceId: string;
};

async function bumpTotals(amount: number, potId: string | null, direction: 1 | -1) {
  if (potId) {
    if (direction === 1) {
      await prisma.pot.update({
        where: { id: potId },
        data: {
          totalRaised: { increment: amount },
          donorCount: { increment: 1 },
        },
      });
    } else {
      // Clamp at zero — Prisma decrement alone can go negative.
      await prisma.$executeRaw`
        UPDATE "Pot"
        SET
          "totalRaised" = GREATEST(0, "totalRaised" - ${amount}),
          "donorCount" = GREATEST(0, "donorCount" - 1)
        WHERE id = ${potId}
      `;
    }
  }

  const fund = await prisma.buildingFund.findUnique({
    where: { id: BUILDING_FUND_ID },
  });

  if (!fund) {
    await prisma.buildingFund.create({
      data: {
        id: BUILDING_FUND_ID,
        targetAmount: DEFAULT_BUILDING_FUND_TARGET_PENCE,
        totalRaised: Math.max(0, amount * direction),
      },
    });
    return;
  }

  if (direction === 1) {
    await prisma.buildingFund.update({
      where: { id: BUILDING_FUND_ID },
      data: { totalRaised: { increment: amount } },
    });
  } else {
    await prisma.$executeRaw`
      UPDATE "BuildingFund"
      SET "totalRaised" = GREATEST(0, "totalRaised" - ${amount})
      WHERE id = ${BUILDING_FUND_ID}
    `;
  }
}

/** Claim wall-total bump once per donation (idempotent across retries). */
async function applyTotalsOnce(
  donationId: string,
  amount: number,
  potId: string | null,
): Promise<boolean> {
  const claimed = await prisma.donation.updateMany({
    where: { id: donationId, totalsApplied: false },
    data: { totalsApplied: true },
  });
  if (claimed.count === 0) {
    return false;
  }

  try {
    await bumpTotals(amount, potId, 1);
  } catch (error) {
    // Allow webhook/reconcile retry to bump again.
    await prisma.donation.updateMany({
      where: { id: donationId, totalsApplied: true },
      data: { totalsApplied: false },
    });
    throw error;
  }

  const { revalidateHomePots } = await import("@/lib/home-pots");
  revalidateHomePots();

  if (potId) {
    await prisma.pot.updateMany({
      where: { id: potId, status: PotStatus.PENDING },
      data: { status: PotStatus.ACTIVE },
    });
  }

  return true;
}

export type CreditResult = {
  /** True when this call newly moved the row to SUCCEEDED (receipt should send). */
  didCredit: boolean;
  donationId: string;
};

export type RenewalResult = {
  didCreate: boolean;
  donationId: string | null;
};

export type FailResult = {
  didFail: boolean;
  donationId: string;
};

export type RefundResult = {
  didRefund: boolean;
  donationId: string | null;
};

/**
 * Claim PENDING or FAILED → SUCCEEDED, then bump totals (idempotent).
 * FAILED is included so a later Stripe success after an earlier fail still credits.
 */
export async function creditSucceededDonation(
  input: CreditInput,
): Promise<CreditResult> {
  const donation = await prisma.donation.findUnique({
    where: { id: input.donationId },
  });
  if (!donation) {
    throw new Error(`Donation ${input.donationId} not found`);
  }
  if (donation.status === DonationStatus.REFUNDED) {
    return { didCredit: false, donationId: donation.id };
  }
  if (donation.amount !== input.amount) {
    throw new Error(
      `Stripe amount ${input.amount} does not match donation ${donation.amount}`,
    );
  }

  let didCredit = false;

  if (
    donation.status === DonationStatus.PENDING ||
    donation.status === DonationStatus.FAILED
  ) {
    const updated = await prisma.donation.updateMany({
      where: {
        id: donation.id,
        status: { in: [DonationStatus.PENDING, DonationStatus.FAILED] },
      },
      data: {
        status: DonationStatus.SUCCEEDED,
        stripePaymentIntentId:
          input.stripePaymentIntentId ?? donation.stripePaymentIntentId,
        stripeSubscriptionId:
          input.stripeSubscriptionId ?? donation.stripeSubscriptionId,
        stripeInvoiceId: input.stripeInvoiceId ?? donation.stripeInvoiceId,
      },
    });
    didCredit = updated.count > 0;
  } else if (
    donation.status === DonationStatus.SUCCEEDED &&
    (input.stripePaymentIntentId ||
      input.stripeSubscriptionId ||
      input.stripeInvoiceId)
  ) {
    // Fill Stripe ids if an earlier claim left them empty.
    await prisma.donation.updateMany({
      where: { id: donation.id, status: DonationStatus.SUCCEEDED },
      data: {
        ...(input.stripePaymentIntentId && !donation.stripePaymentIntentId
          ? { stripePaymentIntentId: input.stripePaymentIntentId }
          : {}),
        ...(input.stripeSubscriptionId && !donation.stripeSubscriptionId
          ? { stripeSubscriptionId: input.stripeSubscriptionId }
          : {}),
        ...(input.stripeInvoiceId && !donation.stripeInvoiceId
          ? { stripeInvoiceId: input.stripeInvoiceId }
          : {}),
      },
    });
  }

  const fresh = await prisma.donation.findUnique({ where: { id: donation.id } });
  if (!fresh || fresh.status !== DonationStatus.SUCCEEDED) {
    return { didCredit: false, donationId: donation.id };
  }

  await applyTotalsOnce(fresh.id, fresh.amount, fresh.potId);

  return { didCredit, donationId: fresh.id };
}

export async function creditRenewalDonation(
  input: RenewalInput,
): Promise<RenewalResult> {
  const existingPi = await prisma.donation.findUnique({
    where: { stripePaymentIntentId: input.stripePaymentIntentId },
  });
  if (existingPi) {
    if (existingPi.status === DonationStatus.SUCCEEDED) {
      await applyTotalsOnce(
        existingPi.id,
        existingPi.amount,
        existingPi.potId,
      );
      return { didCreate: false, donationId: existingPi.id };
    }
  }
  const existingInvoice = await prisma.donation.findUnique({
    where: { stripeInvoiceId: input.stripeInvoiceId },
  });
  if (existingInvoice?.status === DonationStatus.SUCCEEDED) {
    await applyTotalsOnce(
      existingInvoice.id,
      existingInvoice.amount,
      existingInvoice.potId,
    );
    return { didCreate: false, donationId: existingInvoice.id };
  }

  try {
    const donation = await prisma.donation.create({
      data: {
        amount: input.amount,
        status: DonationStatus.SUCCEEDED,
        totalsApplied: false,
        potId: input.potId,
        restorationCategory: input.restorationCategory,
        donorName: input.donorName,
        donorEmail: input.donorEmail,
        isAnonymous: input.isAnonymous,
        isRecurring: true,
        paymentMethod: input.paymentMethod,
        giftAid: input.giftAid,
        donorAddressLine1: input.donorAddressLine1,
        donorCity: input.donorCity,
        donorPostcode: input.donorPostcode,
        stripePaymentIntentId: input.stripePaymentIntentId,
        stripeSubscriptionId: input.stripeSubscriptionId,
        stripeInvoiceId: input.stripeInvoiceId,
      },
    });

    await applyTotalsOnce(donation.id, donation.amount, donation.potId);
    return { didCreate: true, donationId: donation.id };
  } catch (error) {
    // Unique PI / invoice race with a concurrent webhook.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const again =
        (await prisma.donation.findUnique({
          where: { stripePaymentIntentId: input.stripePaymentIntentId },
        })) ??
        (await prisma.donation.findUnique({
          where: { stripeInvoiceId: input.stripeInvoiceId },
        }));
      if (again?.status === DonationStatus.SUCCEEDED) {
        await applyTotalsOnce(again.id, again.amount, again.potId);
        return { didCreate: false, donationId: again.id };
      }
    }
    throw error;
  }
}

export async function failPendingDonation(
  donationId: string,
): Promise<FailResult> {
  const updated = await prisma.donation.updateMany({
    where: { id: donationId, status: DonationStatus.PENDING },
    data: { status: DonationStatus.FAILED },
  });
  return { didFail: updated.count > 0, donationId };
}

/**
 * Mark gifts on this Stripe subscription as cancelled (no wall-total change).
 */
export async function markSubscriptionCancelled(
  stripeSubscriptionId: string,
  cancelledAt: Date = new Date(),
): Promise<number> {
  const result = await prisma.donation.updateMany({
    where: {
      stripeSubscriptionId,
      subscriptionCancelledAt: null,
    },
    data: { subscriptionCancelledAt: cancelledAt },
  });
  return result.count;
}

export async function reverseRefundedDonation(
  stripePaymentIntentId: string,
): Promise<RefundResult> {
  const donation = await prisma.donation.findUnique({
    where: { stripePaymentIntentId },
  });
  if (!donation) {
    return { didRefund: false, donationId: null };
  }
  if (donation.status === DonationStatus.REFUNDED) {
    return { didRefund: false, donationId: donation.id };
  }

  if (donation.status !== DonationStatus.SUCCEEDED) {
    await prisma.donation.update({
      where: { id: donation.id },
      data: { status: DonationStatus.REFUNDED },
    });
    return { didRefund: true, donationId: donation.id };
  }

  const claimed = await prisma.donation.updateMany({
    where: { id: donation.id, status: DonationStatus.SUCCEEDED },
    data: { status: DonationStatus.REFUNDED },
  });
  if (claimed.count === 0) {
    return { didRefund: false, donationId: donation.id };
  }

  if (donation.totalsApplied) {
    await bumpTotals(donation.amount, donation.potId, -1);
    const { revalidateHomePots } = await import("@/lib/home-pots");
    revalidateHomePots();
  }
  return { didRefund: true, donationId: donation.id };
}
