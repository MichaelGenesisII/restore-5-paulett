"use client";

import { useEffect } from "react";

/**
 * When Stripe returns the giver with ?checkout=cancelled&donation_id=…,
 * mark the attempt failed and send one soft “unfinished gift” email.
 * sessionStorage prevents repeats on refresh.
 */
export function CheckoutCancelNotifier({
  donationId,
}: {
  donationId: string | null | undefined;
}) {
  useEffect(() => {
    const id = donationId?.trim();
    if (!id) return;

    const key = `pvn-cancel-mail:${id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* private mode — still attempt once this mount */
    }

    void fetch("/api/donations/cancelled", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ donationId: id }),
    }).catch(() => {
      /* non-blocking */
    });
  }, [donationId]);

  return null;
}
