import { type Donation, type Pot, DonationStatus } from "@prisma/client";
import {
  checkoutCancelledEmail,
  checkoutCouldNotStartEmail,
  giftRefundedEmail,
  giftThankYouEmail,
  hostPotGiftReceivedEmail,
  monthlyRenewalEmail,
  orgDirectGiftReceivedEmail,
  paymentFailedEmail,
  type GivingEmailContext,
} from "@/lib/email/giving-templates";
import { sendEmail } from "@/lib/email/send";
import { getEnvAdminEmails } from "@/lib/admin-emails";
import { prisma } from "@/lib/prisma";

type DonationWithPot = Donation & {
  pot:
    | (Pick<Pot, "title" | "slug"> & {
        fundraiser: { email: string; name: string } | null;
      })
    | null;
};

function toContext(
  donation: DonationWithPot,
  extras?: { isSeedGift?: boolean },
): GivingEmailContext | null {
  const email = donation.donorEmail?.trim();
  if (!email) return null;

  return {
    donorName: donation.donorName,
    donorEmail: email,
    amountPence: donation.amount,
    giftAid: donation.giftAid,
    isRecurring: donation.isRecurring,
    potTitle: donation.pot?.title ?? null,
    potSlug: donation.pot?.slug ?? null,
    message: donation.message,
    isSeedGift: extras?.isSeedGift === true,
  };
}

function donorLabel(donation: DonationWithPot) {
  if (donation.isAnonymous) return "Anonymous";
  const name = donation.donorName?.trim();
  return name || "Someone";
}

async function loadDonation(donationId: string): Promise<DonationWithPot | null> {
  return prisma.donation.findUnique({
    where: { id: donationId },
    include: {
      pot: {
        select: {
          title: true,
          slug: true,
          fundraiser: { select: { email: true, name: true } },
        },
      },
    },
  });
}

/** First succeeded gift on a pot = the seed that opened it. */
async function isSeedGiftFor(donation: DonationWithPot): Promise<boolean> {
  if (!donation.potId) return false;
  const earlier = await prisma.donation.count({
    where: {
      potId: donation.potId,
      status: DonationStatus.SUCCEEDED,
      createdAt: { lt: donation.createdAt },
    },
  });
  return earlier === 0;
}

async function notifyHostOrOrgOfGift(
  donation: DonationWithPot,
  isSeedGift: boolean,
) {
  // Seed gift: the host is the giver — they already get the thank-you receipt.
  if (isSeedGift) return;

  const label = donorLabel(donation);

  if (donation.pot?.fundraiser?.email && donation.pot.slug) {
    const hostEmail = donation.pot.fundraiser.email.trim().toLowerCase();
    const donorEmail = donation.donorEmail?.trim().toLowerCase() ?? "";
    if (hostEmail && hostEmail !== donorEmail) {
      const payload = hostPotGiftReceivedEmail({
        hostName: donation.pot.fundraiser.name,
        amountPence: donation.amount,
        potTitle: donation.pot.title,
        potSlug: donation.pot.slug,
        donorLabel: label,
        message: donation.message,
      });
      await sendEmail({
        to: donation.pot.fundraiser.email.trim(),
        subject: payload.subject,
        html: payload.html,
        idempotencyKey: `host-gift-received/${donation.id}`,
        tags: [
          { name: "kind", value: "host_gift_received" },
          { name: "donation_id", value: donation.id.slice(0, 48) },
        ],
      });
    }
    return;
  }

  // Direct /give gift — notify ADMIN_EMAILS (env bootstrap) only.
  // Settings → Admins (DB allowlist) deliberately do not get these notices,
  // so ops-only staff are not flooded with every general gift. Contact-form
  // pings use the same env list. Change only if product wants all admins notified.
  const admins = getEnvAdminEmails();
  if (admins.length === 0) return;

  const donorEmail = donation.donorEmail?.trim().toLowerCase() ?? "";
  const payload = orgDirectGiftReceivedEmail({
    amountPence: donation.amount,
    donorLabel: label,
    message: donation.message,
  });

  await Promise.all(
    admins
      .filter((email) => email.toLowerCase() !== donorEmail)
      .map((email) =>
        sendEmail({
          to: email,
          subject: payload.subject,
          html: payload.html,
          idempotencyKey: `org-direct-gift/${donation.id}/${email.toLowerCase()}`,
          tags: [
            { name: "kind", value: "org_direct_gift" },
            { name: "donation_id", value: donation.id.slice(0, 48) },
          ],
        }),
      ),
  );
}

/**
 * Giver lifecycle emails for payments only — never pot-creation notices.
 * Safe to call after webhook/reconcile; failures are logged, never thrown.
 */
export async function notifyGiftSucceeded(donationId: string) {
  const donation = await loadDonation(donationId);
  if (!donation) return;
  const isSeedGift = await isSeedGiftFor(donation);
  const ctx = toContext(donation, { isSeedGift });
  if (!ctx) return;

  const payload = giftThankYouEmail(ctx);

  await sendEmail({
    to: ctx.donorEmail,
    subject: payload.subject,
    html: payload.html,
    idempotencyKey: `gift-thank-you/${donationId}`,
    tags: [
      { name: "kind", value: "gift_thank_you" },
      { name: "donation_id", value: donationId.slice(0, 48) },
    ],
  });

  try {
    await notifyHostOrOrgOfGift(donation, isSeedGift);
  } catch (err) {
    console.error("Host/org gift notice failed", err);
  }
}

export async function notifyMonthlyRenewal(donationId: string) {
  const donation = await loadDonation(donationId);
  if (!donation) return;
  const ctx = toContext(donation);
  if (!ctx) return;

  const payload = monthlyRenewalEmail(ctx);
  await sendEmail({
    to: ctx.donorEmail,
    subject: payload.subject,
    html: payload.html,
    idempotencyKey: `monthly-renewal/${donationId}`,
    tags: [
      { name: "kind", value: "monthly_renewal" },
      { name: "donation_id", value: donationId.slice(0, 48) },
    ],
  });

  try {
    await notifyHostOrOrgOfGift(donation, false);
  } catch (err) {
    console.error("Host/org gift notice failed", err);
  }
}

export async function notifyPaymentFailed(
  donationId: string,
  options?: { renewal?: boolean; invoiceId?: string },
) {
  const donation = await loadDonation(donationId);
  if (!donation) return;
  const ctx = toContext(donation);
  if (!ctx) return;

  const renewal = options?.renewal === true;
  const payload = paymentFailedEmail(ctx, { renewal });
  const stamp = options?.invoiceId?.slice(0, 48) ?? "na";
  await sendEmail({
    to: ctx.donorEmail,
    subject: payload.subject,
    html: payload.html,
    idempotencyKey: renewal
      ? `payment-failed-renewal/${donationId}/${stamp}`
      : `payment-failed/${donationId}`,
    tags: [
      {
        name: "kind",
        value: renewal ? "payment_failed_renewal" : "payment_failed",
      },
      { name: "donation_id", value: donationId.slice(0, 48) },
    ],
  });
}

export async function notifyGiftRefunded(donationId: string) {
  const donation = await loadDonation(donationId);
  if (!donation) return;
  const ctx = toContext(donation);
  if (!ctx) return;

  const payload = giftRefundedEmail(ctx);
  await sendEmail({
    to: ctx.donorEmail,
    subject: payload.subject,
    html: payload.html,
    idempotencyKey: `gift-refunded/${donationId}`,
    tags: [
      { name: "kind", value: "gift_refunded" },
      { name: "donation_id", value: donationId.slice(0, 48) },
    ],
  });
}

export async function notifyCheckoutCouldNotStart(input: {
  donorEmail: string | null | undefined;
  donorName: string | null | undefined;
  amountPence: number;
  potTitle: string | null;
  potSlug: string | null;
}) {
  const email = input.donorEmail?.trim();
  if (!email) return;

  const payload = checkoutCouldNotStartEmail({
    donorEmail: email,
    donorName: input.donorName ?? null,
    amountPence: input.amountPence,
    potTitle: input.potTitle,
    potSlug: input.potSlug,
  });

  const stamp = `${email}-${input.amountPence}-${input.potSlug ?? "general"}`;
  await sendEmail({
    to: email,
    subject: payload.subject,
    html: payload.html,
    idempotencyKey: `checkout-could-not-start/${stamp}`.slice(0, 256),
    tags: [{ name: "kind", value: "checkout_could_not_start" }],
  });
}

export async function notifyCheckoutCancelled(donationId: string) {
  const donation = await loadDonation(donationId);
  if (!donation) return;
  const ctx = toContext(donation);
  if (!ctx) return;

  const payload = checkoutCancelledEmail(ctx);
  await sendEmail({
    to: ctx.donorEmail,
    subject: payload.subject,
    html: payload.html,
    idempotencyKey: `checkout-cancelled/${donationId}`,
    tags: [
      { name: "kind", value: "checkout_cancelled" },
      { name: "donation_id", value: donationId.slice(0, 48) },
    ],
  });
}
