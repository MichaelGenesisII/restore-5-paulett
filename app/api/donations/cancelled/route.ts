import { NextResponse } from "next/server";
import { DonationStatus } from "@prisma/client";
import { notifyCheckoutCancelled } from "@/lib/email/giving-notify";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * Giver abandoned Stripe Checkout (`?checkout=cancelled`).
 * Marks the still-PENDING row FAILED (nothing was taken) and optionally
 * emails a soft “unfinished gift” nudge when an email is on file.
 */
export async function POST(request: Request) {
  let body: { donationId?: unknown };
  try {
    body = (await request.json()) as { donationId?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const donationId =
    typeof body.donationId === "string" ? body.donationId.trim() : "";
  if (!donationId) {
    return NextResponse.json({ error: "donationId required" }, { status: 400 });
  }

  const claimed = await prisma.donation.updateMany({
    where: { id: donationId, status: DonationStatus.PENDING },
    data: { status: DonationStatus.FAILED },
  });

  if (claimed.count === 0) {
    return NextResponse.json({ ok: true, sent: false, marked: false });
  }

  const donation = await prisma.donation.findUnique({
    where: { id: donationId },
    select: { id: true, donorEmail: true },
  });

  if (!donation?.donorEmail) {
    return NextResponse.json({ ok: true, sent: false, marked: true });
  }

  void notifyCheckoutCancelled(donation.id);
  return NextResponse.json({ ok: true, sent: true, marked: true });
}
