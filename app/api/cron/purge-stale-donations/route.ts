import { NextResponse } from "next/server";
import {
  purgeStaleDonations,
  STALE_DONATION_DAYS,
} from "@/lib/admin-purge";
import { rejectUnlessCron } from "@/lib/cron-auth";

export const runtime = "nodejs";

/** Daily cleanup of abandoned / failed checkout rows. */
export async function GET(request: Request) {
  const rejected = rejectUnlessCron(request);
  if (rejected) return rejected;

  const result = await purgeStaleDonations();
  console.info(
    `purge-stale-donations: deleted ${result.deleted} rows older than ${STALE_DONATION_DAYS}d`,
  );
  return NextResponse.json({ ok: true, ...result });
}
