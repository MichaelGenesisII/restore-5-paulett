import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";

/**
 * One-off gifts may leave name and email to Stripe Checkout. Copy whatever
 * Stripe collected onto the donation, without overwriting what the giver
 * typed on our form. Run before the receipt is sent so it has an address.
 */
export async function backfillDonorFromCheckout(
  donationId: string,
  session: Stripe.Checkout.Session,
) {
  const email = session.customer_details?.email?.trim().toLowerCase() || null;
  const name = session.customer_details?.name?.trim().slice(0, 120) || null;

  if (email) {
    await prisma.donation.updateMany({
      where: { id: donationId, donorEmail: null },
      data: { donorEmail: email },
    });
  }
  if (name) {
    await prisma.donation.updateMany({
      where: { id: donationId, donorName: null },
      data: { donorName: name },
    });
  }
}
