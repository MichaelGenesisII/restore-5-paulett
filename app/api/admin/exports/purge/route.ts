import { NextResponse } from "next/server";
import {
  countRecentUnfinishedDonations,
  countStaleDonations,
  purgeStaleDonations,
  STALE_DONATION_DAYS,
  staleDonationCutoff,
} from "@/lib/admin-purge";
import { revalidateAdminGifts } from "@/lib/admin-gifts";
import { revalidateAdminOverview } from "@/lib/admin-overview";
import {
  isAdminAuthFailure,
  requireAdmin,
} from "@/lib/auth/require-admin";

export const runtime = "nodejs";

/** Preview how many PENDING/FAILED rows are past / still inside the retention window. */
export async function GET(request: Request) {
  const session = await requireAdmin(request);
  if (isAdminAuthFailure(session)) return session;

  const cutoff = staleDonationCutoff();
  const [eligible, recentUnfinished] = await Promise.all([
    countStaleDonations(cutoff),
    countRecentUnfinishedDonations(cutoff),
  ]);

  return NextResponse.json({
    olderThanDays: STALE_DONATION_DAYS,
    cutoff: cutoff.toISOString(),
    eligible,
    recentUnfinished,
  });
}

/** Delete PENDING / FAILED donations older than 90 days. */
export async function POST(request: Request) {
  const session = await requireAdmin(request);
  if (isAdminAuthFailure(session)) return session;

  const result = await purgeStaleDonations();
  revalidateAdminGifts();
  revalidateAdminOverview();
  return NextResponse.json({ ok: true, ...result });
}
