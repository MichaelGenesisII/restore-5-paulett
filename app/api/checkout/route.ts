import { NextResponse } from "next/server";
import {
  DonationStatus,
  PaymentMethod,
  PotStatus,
  RestorationCategory,
} from "@prisma/client";
import { GBP } from "@/lib/constants";
import { isSubscription, parseGiftMode } from "@/lib/gift-mode";
import { assertDonationPence, formatWholeGbp, MIN_POT_SEED_PENCE } from "@/lib/money";
import { acceptsGifts } from "@/lib/pot-lifecycle";
import { prisma } from "@/lib/prisma";
import { rateLimitConsume, requestClientIp } from "@/lib/rate-limit";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

type CheckoutBody = {
  amountPence?: unknown;
  potSlug?: unknown;
  giftMode?: unknown;
  isRecurring?: unknown;
  isAnonymous?: unknown;
  donorName?: unknown;
  donorEmail?: unknown;
  message?: unknown;
  giftAid?: unknown;
  donorAddressLine1?: unknown;
  donorCity?: unknown;
  donorPostcode?: unknown;
};

const CHECKOUT_IP_LIMIT = 8;
const CHECKOUT_IP_WINDOW_MS = 10 * 60 * 1000;
/** Reuse an open Checkout session if the giver double-clicks within this window. */
const DUPLICATE_WINDOW_MS = 15 * 60 * 1000;

function optionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function optionalBool(value: unknown): boolean {
  return value === true;
}

/**
 * Prefer NEXT_PUBLIC_APP_URL. In production it is required so success/cancel
 * URLs never trust a forged Origin header.
 */
function appOrigin(request: Request): string | NextResponse {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;

  const isProd =
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production";
  if (isProd) {
    console.error("NEXT_PUBLIC_APP_URL is required in production for checkout");
    return NextResponse.json(
      {
        error:
          "Checkout is not configured (missing app URL). Please try again later.",
      },
      { status: 503 },
    );
  }

  return (
    request.headers.get("origin") ?? new URL(request.url).origin
  );
}

export async function POST(request: Request) {
  const ip = requestClientIp(request);
  const limited = rateLimitConsume(
    `checkout:${ip}`,
    CHECKOUT_IP_LIMIT,
    CHECKOUT_IP_WINDOW_MS,
  );
  if (!limited.ok) {
    return NextResponse.json(
      {
        error: `Too many checkout attempts. Try again in about ${limited.retryAfterSec} seconds.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  let body: CheckoutBody;
  try {
    body = (await request.json()) as CheckoutBody;
  } catch {
    return NextResponse.json(
      { error: "Something went wrong with that request. Please try again." },
      { status: 400 },
    );
  }

  let amount: number;
  try {
    amount = assertDonationPence(body.amountPence);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Enter a valid gift amount.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const giftMode = parseGiftMode(body);
  const potSlug = optionalString(body.potSlug);
  const isAnonymous = optionalBool(body.isAnonymous);
  const giftAid = optionalBool(body.giftAid);
  const donorName = optionalString(body.donorName);
  const donorEmail = optionalString(body.donorEmail)?.toLowerCase() ?? null;
  const message = optionalString(body.message);
  const donorAddressLine1 = optionalString(body.donorAddressLine1);
  const donorCity = optionalString(body.donorCity);
  const donorPostcode = optionalString(body.donorPostcode);

  if (isSubscription(giftMode) && !donorEmail) {
    return NextResponse.json(
      {
        error:
          "Email is required for monthly card gifts so we can send receipts.",
      },
      { status: 400 },
    );
  }

  if (giftAid && (!donorName || !donorAddressLine1 || !donorCity || !donorPostcode)) {
    return NextResponse.json(
      { error: "Gift Aid requires name, address, town or city, and postcode." },
      { status: 400 },
    );
  }

  const pot = potSlug
    ? await prisma.pot.findUnique({ where: { slug: potSlug } })
    : null;

  if (potSlug && !pot) {
    return NextResponse.json({ error: "Fundraiser not found" }, { status: 404 });
  }
  if (pot && !acceptsGifts(pot.status)) {
    return NextResponse.json(
      {
        error:
          pot.status === "PAUSED"
            ? "This fundraiser is paused and is not accepting gifts."
            : pot.status === "CLOSED"
              ? "This fundraiser is closed and is not accepting gifts."
              : "This fundraiser is not accepting gifts.",
      },
      { status: 400 },
    );
  }
  if (
    pot &&
    pot.status === PotStatus.PENDING &&
    amount < MIN_POT_SEED_PENCE
  ) {
    return NextResponse.json(
      {
        error: `The first gift that opens this fundraiser must be at least ${formatWholeGbp(MIN_POT_SEED_PENCE)}.`,
      },
      { status: 400 },
    );
  }

  const originOrError = appOrigin(request);
  if (originOrError instanceof NextResponse) return originOrError;
  const origin = originOrError;

  const restorationCategory =
    pot?.restorationCategory ?? RestorationCategory.GENERAL;
  const successPath = pot ? `/pots/${pot.slug}` : "/give";
  const cancelPath = successPath;
  const paymentMethod = PaymentMethod.CARD;
  const recurring = isSubscription(giftMode);

  // Double-submit: reuse a still-open Checkout session for the same gift.
  if (donorEmail) {
    const recent = await prisma.donation.findFirst({
      where: {
        donorEmail,
        amount,
        potId: pot?.id ?? null,
        status: DonationStatus.PENDING,
        isRecurring: recurring,
        paymentMethod,
        createdAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
        stripeCheckoutSessionId: { not: null },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, stripeCheckoutSessionId: true },
    });

    if (recent?.stripeCheckoutSessionId) {
      try {
        const existing = await getStripe().checkout.sessions.retrieve(
          recent.stripeCheckoutSessionId,
        );
        if (
          existing.status === "open" &&
          typeof existing.url === "string" &&
          existing.url.length > 0
        ) {
          return NextResponse.json({ url: existing.url });
        }
      } catch (error) {
        console.warn("Could not reuse checkout session", error);
      }
    }
  }

  const donation = await prisma.donation.create({
    data: {
      amount,
      status: DonationStatus.PENDING,
      potId: pot?.id ?? null,
      restorationCategory,
      donorName,
      donorEmail,
      isAnonymous,
      message,
      isRecurring: recurring,
      paymentMethod,
      giftAid,
      donorAddressLine1,
      donorCity,
      donorPostcode,
    },
  });

  const metadata: Record<string, string> = {
    donationId: donation.id,
    potId: pot?.id ?? "",
    giftMode,
    isAnonymous: isAnonymous ? "true" : "false",
    giftAid: giftAid ? "true" : "false",
    donorName: donorName ?? "",
    restorationCategory,
  };

  const productName = pot
    ? `5 Paulett — ${pot.title}`
    : "5 Paulett restoration";

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: recurring ? "subscription" : "payment",
      currency: GBP,
      customer_email: donorEmail ?? undefined,
      // Card only (Apple Pay / Google Pay ride on card); keeps Dashboard-enabled
      // delayed methods such as Bacs out of Checkout.
      payment_method_types: ["card"],
      success_url: `${origin}${successPath}?checkout=processing&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${cancelPath}?checkout=cancelled&donation_id=${donation.id}`,
      metadata,
      ...(recurring ? { subscription_data: { metadata } } : {}),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: GBP,
            unit_amount: amount,
            product_data: { name: productName },
            ...(recurring
              ? { recurring: { interval: "month" as const } }
              : {}),
          },
        },
      ],
    });

    if (!session.url) {
      throw new Error("Stripe session missing URL");
    }

    await prisma.donation.update({
      where: { id: donation.id },
      data: { stripeCheckoutSessionId: session.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout session failed", error);
    await prisma.donation.update({
      where: { id: donation.id },
      data: { status: DonationStatus.FAILED },
    });

    const { notifyCheckoutCouldNotStart } = await import(
      "@/lib/email/giving-notify"
    );
    void notifyCheckoutCouldNotStart({
      donorEmail,
      donorName,
      amountPence: amount,
      potTitle: pot?.title ?? null,
      potSlug: pot?.slug ?? null,
    });

    return NextResponse.json(
      { error: "We could not start checkout. Please try again." },
      { status: 500 },
    );
  }
}
