import { NextResponse } from "next/server";
import { DonationStatus } from "@prisma/client";
import { revalidateAdminAnalytics } from "@/lib/admin-analytics";
import { revalidateAdminGifts } from "@/lib/admin-gifts";
import { revalidateAdminOverview } from "@/lib/admin-overview";
import { revalidateHostPotAnalytics } from "@/lib/host-pot-analytics";
import { prisma } from "@/lib/prisma";
import { rateLimitConsume, requestClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** The thank-you screen is the moment; after that, write to us instead. */
const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/**
 * Gift Aid declared after paying. HMRC allows a declaration to cover a gift
 * already made, so the giver can skip this before checkout. The Checkout
 * session id (from the return URL) proves it is their gift.
 */
export async function POST(request: Request) {
  const limited = rateLimitConsume(
    `gift-aid-after:${requestClientIp(request)}`,
    10,
    15 * 60 * 1000,
  );
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in about ${limited.retryAfterSec} seconds.` },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const sessionId = text(body.sessionId, 255);
  const name = text(body.name, 120);
  const line1 = text(body.addressLine1, 200);
  const city = text(body.city, 120);
  const postcode = text(body.postcode, 12).toUpperCase();

  if (!sessionId) {
    return NextResponse.json({ error: "Missing gift reference." }, { status: 400 });
  }
  if (!name || name.split(/\s+/).length < 2) {
    return NextResponse.json(
      { error: "Gift Aid needs your first name and surname." },
      { status: 400 },
    );
  }
  if (!line1 || !city || !postcode) {
    return NextResponse.json(
      { error: "Gift Aid needs your home address, town or city, and postcode." },
      { status: 400 },
    );
  }
  if (body.declaration !== true) {
    return NextResponse.json(
      { error: "Please confirm you are a UK taxpayer." },
      { status: 400 },
    );
  }

  const donation = await prisma.donation.findUnique({
    where: { stripeCheckoutSessionId: sessionId },
    select: {
      id: true,
      status: true,
      giftAid: true,
      createdAt: true,
      pot: { select: { id: true } },
    },
  });

  if (!donation || donation.status !== DonationStatus.SUCCEEDED) {
    return NextResponse.json(
      { error: "We could not find a completed gift to add Gift Aid to." },
      { status: 404 },
    );
  }
  if (donation.giftAid) {
    return NextResponse.json({ ok: true, alreadyAdded: true });
  }
  if (Date.now() - donation.createdAt.getTime() > WINDOW_MS) {
    return NextResponse.json(
      {
        error:
          "This link has expired. Write to us from the Contact page and we will add Gift Aid for you.",
      },
      { status: 410 },
    );
  }

  await prisma.donation.update({
    where: { id: donation.id },
    data: {
      giftAid: true,
      donorName: name,
      donorAddressLine1: line1,
      donorCity: city,
      donorPostcode: postcode,
    },
  });

  revalidateAdminGifts();
  revalidateAdminOverview();
  revalidateAdminAnalytics();
  if (donation.pot) revalidateHostPotAnalytics();

  return NextResponse.json({ ok: true });
}
