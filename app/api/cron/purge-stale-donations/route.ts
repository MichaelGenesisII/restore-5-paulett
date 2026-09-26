import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  purgeStaleDonations,
  STALE_DONATION_DAYS,
} from "@/lib/admin-purge";

export const runtime = "nodejs";

function bearerMatches(secret: string, header: string | null): boolean {
  if (!header?.startsWith("Bearer ")) return false;
  const token = header.slice("Bearer ".length).trim();
  if (!token || token.length !== secret.length) return false;
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(secret));
  } catch {
    return false;
  }
}

/**
 * Daily cleanup of abandoned / failed checkout rows.
 * Secure with CRON_SECRET via Authorization: Bearer … only
 * (Vercel Cron sends this automatically when CRON_SECRET is set).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 503 },
    );
  }

  if (!bearerMatches(secret, request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await purgeStaleDonations();
  console.info(
    `purge-stale-donations: deleted ${result.deleted} rows older than ${STALE_DONATION_DAYS}d`,
  );
  return NextResponse.json({ ok: true, ...result });
}
