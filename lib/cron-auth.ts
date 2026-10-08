import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

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
 * Cron routes accept only `Authorization: Bearer $CRON_SECRET`
 * (Vercel Cron sends this automatically when CRON_SECRET is set).
 * Returns a response to send back when the request is not allowed.
 */
export function rejectUnlessCron(request: Request): NextResponse | null {
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
  return null;
}
