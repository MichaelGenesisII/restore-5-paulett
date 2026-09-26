import { NextResponse, after } from "next/server";
import type Stripe from "stripe";
import { DonationStatus, PaymentMethod, RestorationCategory } from "@prisma/client";
import {
  creditRenewalDonation,
  creditSucceededDonation,
  failPendingDonation,
  markSubscriptionCancelled,
} from "@/app/api/webhooks/stripe/apply-totals";
import {
  notifyGiftSucceeded,
  notifyMonthlyRenewal,
  notifyPaymentFailed,
  notifyStandingOrderSetup,
} from "@/lib/email/giving-notify";
import { prisma } from "@/lib/prisma";
import { getStripe, stripeId } from "@/lib/stripe";

export const runtime = "nodejs";

/** Keep the function alive for Resend without delaying Stripe’s 200. */
function scheduleNotify(task: () => Promise<unknown>) {
  after(() => {
    void task().catch((err) => {
      console.error("Post-webhook email failed", err);
    });
  });
}

function meta(source: Stripe.Metadata | null | undefined, key: string) {
  const value = source?.[key];
  return value && value.length > 0 ? value : null;
}

function asCategory(value: string | null): RestorationCategory {
  if (
    value &&
    Object.values(RestorationCategory).includes(value as RestorationCategory)
  ) {
    return value as RestorationCategory;
  }
  return RestorationCategory.GENERAL;
}

async function creditCheckoutSession(session: Stripe.Checkout.Session) {
  const donationId = meta(session.metadata, "donationId");
  if (!donationId) {
    console.warn("checkout session without donationId — skipping");
    return;
  }

  const donation = await prisma.donation.findUnique({
    where: { id: donationId },
  });
  if (!donation) {
    throw new Error(`Donation ${donationId} missing for checkout session`);
  }

  const amount = session.amount_total;
  if (typeof amount !== "number") {
    throw new Error("Checkout session has no amount_total");
  }

  await creditSucceededDonation({
    donationId: donation.id,
    amount,
    stripePaymentIntentId: stripeId(session.payment_intent),
    stripeSubscriptionId: stripeId(session.subscription),
    stripeInvoiceId: stripeId(session.invoice),
  });

  // Receipt uses a Resend idempotency key — safe on webhook retries / lost `after()`.
  const fresh = await prisma.donation.findUnique({
    where: { id: donation.id },
    select: { status: true },
  });
  if (fresh?.status === DonationStatus.SUCCEEDED) {
    scheduleNotify(() => notifyGiftSucceeded(donation.id));
  }
}

async function onCheckoutCompleted(session: Stripe.Checkout.Session) {
  // Bacs standing orders: mandate is set up here but payment is still processing.
  // Totals are credited on async_payment_succeeded or invoice.payment_succeeded.
  if (session.payment_status && session.payment_status !== "paid") {
    const donationId = meta(session.metadata, "donationId");
    if (donationId) {
      scheduleNotify(() => notifyStandingOrderSetup(donationId));
    }
    return;
  }

  await creditCheckoutSession(session);
}

async function onCheckoutAsyncPaymentSucceeded(
  session: Stripe.Checkout.Session,
) {
  await creditCheckoutSession(session);
}

async function onCheckoutAsyncPaymentFailed(session: Stripe.Checkout.Session) {
  const donationId = meta(session.metadata, "donationId");
  if (!donationId) return;
  const result = await failPendingDonation(donationId);
  if (result.didFail) {
    scheduleNotify(() => notifyPaymentFailed(result.donationId));
  }
}

async function invoicePaymentIntentId(
  invoice: Stripe.Invoice,
): Promise<string | null> {
  const embedded = invoice.payments?.data ?? [];
  for (const payment of embedded) {
    const id = stripeId(payment.payment?.payment_intent);
    if (id) return id;
  }
  const listed = await getStripe().invoicePayments.list({
    invoice: invoice.id,
    limit: 10,
  });
  for (const payment of listed.data) {
    if (payment.status !== "paid") continue;
    const id = stripeId(payment.payment?.payment_intent);
    if (id) return id;
  }
  return null;
}

async function subscriptionMetadata(
  invoice: Stripe.Invoice,
): Promise<Stripe.Metadata | null> {
  const subscriptionDetails = invoice.parent?.subscription_details ?? null;
  let metadata: Stripe.Metadata | null = subscriptionDetails?.metadata ?? null;
  const subscriptionId = stripeId(subscriptionDetails?.subscription);

  if (
    subscriptionId &&
    !meta(metadata, "potId") &&
    !meta(metadata, "donationId")
  ) {
    const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
    metadata = subscription.metadata;
  }

  return metadata;
}

async function onInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const paymentIntentId = await invoicePaymentIntentId(invoice);
  const invoiceId = invoice.id;
  if (!paymentIntentId || !invoiceId) {
    throw new Error("invoice.payment_succeeded missing payment_intent or id");
  }

  const metadata = await subscriptionMetadata(invoice);
  const subscriptionId = stripeId(
    invoice.parent?.subscription_details?.subscription,
  );

  const firstDonationId = meta(metadata, "donationId");
  const first = firstDonationId
    ? await prisma.donation.findUnique({ where: { id: firstDonationId } })
    : null;

  const amount = invoice.total;
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("invoice.payment_succeeded has invalid total");
  }

  if (invoice.billing_reason === "subscription_create") {
    // Bacs first payment is credited via checkout.session.async_payment_succeeded.
    // Stripe also sends invoice.payment_succeeded — skip to avoid a race.
    if (meta(metadata, "giftMode") === "bacs_standing_order") {
      return;
    }

    const fresh = firstDonationId
      ? await prisma.donation.findUnique({ where: { id: firstDonationId } })
      : null;
    if (
      fresh?.status === DonationStatus.PENDING ||
      fresh?.status === DonationStatus.FAILED ||
      fresh?.status === DonationStatus.SUCCEEDED
    ) {
      await creditSucceededDonation({
        donationId: fresh.id,
        amount,
        stripePaymentIntentId: paymentIntentId,
        stripeSubscriptionId: subscriptionId,
        stripeInvoiceId: invoiceId,
      });
      const afterCredit = await prisma.donation.findUnique({
        where: { id: fresh.id },
        select: { status: true },
      });
      if (afterCredit?.status === DonationStatus.SUCCEEDED) {
        scheduleNotify(() => notifyGiftSucceeded(fresh.id));
      }
    }
    return;
  }

  const renewal = await creditRenewalDonation({
    amount,
    potId: first?.potId ?? meta(metadata, "potId"),
    restorationCategory:
      first?.restorationCategory ??
      asCategory(meta(metadata, "restorationCategory")),
    donorName: first?.donorName ?? meta(metadata, "donorName"),
    donorEmail: first?.donorEmail ?? invoice.customer_email ?? null,
    isAnonymous: first?.isAnonymous ?? meta(metadata, "isAnonymous") === "true",
    giftAid: first?.giftAid ?? meta(metadata, "giftAid") === "true",
    donorAddressLine1: first?.donorAddressLine1 ?? null,
    donorCity: first?.donorCity ?? null,
    donorPostcode: first?.donorPostcode ?? null,
    paymentMethod: first?.paymentMethod ?? PaymentMethod.CARD,
    stripePaymentIntentId: paymentIntentId,
    stripeSubscriptionId: subscriptionId,
    stripeInvoiceId: invoiceId,
  });

  if (renewal.didCreate && renewal.donationId) {
    const id = renewal.donationId;
    scheduleNotify(() => notifyMonthlyRenewal(id));
  }
}

async function onInvoicePaymentFailed(invoice: Stripe.Invoice) {
  if (invoice.billing_reason !== "subscription_create") {
    // Later renewals failing — notify using the original donor donation.
    const metadata = await subscriptionMetadata(invoice);
    const donationId = meta(metadata, "donationId");
    if (donationId) {
      scheduleNotify(() =>
        notifyPaymentFailed(donationId, {
          renewal: true,
          invoiceId: invoice.id,
        }),
      );
    }
    return;
  }

  const metadata = await subscriptionMetadata(invoice);
  const donationId = meta(metadata, "donationId");
  if (!donationId) {
    return;
  }

  const result = await failPendingDonation(donationId);
  if (result.didFail) {
    scheduleNotify(() => notifyPaymentFailed(result.donationId));
  }
}

/**
 * Product policy: gifts are not refunded in the normal course.
 * If staff refund in Stripe Dashboard, we acknowledge the event but do not
 * reverse wall totals or email donors — handle rare cases manually.
 */
async function onChargeRefunded(charge: Stripe.Charge) {
  const paymentIntentId = stripeId(charge.payment_intent);
  console.info(
    "charge.refunded ignored (no auto-refund sync)",
    paymentIntentId ?? charge.id,
  );
}

async function onSubscriptionDeleted(subscription: Stripe.Subscription) {
  const marked = await markSubscriptionCancelled(subscription.id);
  console.info(
    "subscription cancelled",
    subscription.id,
    "donations marked:",
    marked,
  );
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Missing STRIPE_WEBHOOK_SECRET" },
      { status: 500 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature" },
      { status: 400 },
    );
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await onCheckoutCompleted(event.data.object);
        break;
      case "checkout.session.async_payment_succeeded":
        await onCheckoutAsyncPaymentSucceeded(event.data.object);
        break;
      case "checkout.session.async_payment_failed":
        await onCheckoutAsyncPaymentFailed(event.data.object);
        break;
      case "invoice.payment_succeeded":
        await onInvoicePaymentSucceeded(event.data.object);
        break;
      case "invoice.payment_failed":
        await onInvoicePaymentFailed(event.data.object);
        break;
      case "customer.subscription.deleted":
        await onSubscriptionDeleted(event.data.object);
        break;
      case "charge.refunded":
        await onChargeRefunded(event.data.object);
        break;
      default:
        break;
    }
  } catch (error) {
    console.error("Stripe webhook handler failed", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
