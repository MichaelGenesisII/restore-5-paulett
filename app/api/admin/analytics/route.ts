import { NextResponse } from "next/server";
import {
  isAdminAuthFailure,
  requireAdmin,
} from "@/lib/auth/require-admin";
import {
  getAdminAnalyticsCached,
  parseAdminAnalyticsRange,
} from "@/lib/admin-analytics";

export const runtime = "nodejs";

/** House-wide analytics for /admin/analytics. */
export async function GET(request: Request) {
  const session = await requireAdmin(request);
  if (isAdminAuthFailure(session)) return session;

  const range = parseAdminAnalyticsRange(
    new URL(request.url).searchParams.get("range"),
  );
  const payload = await getAdminAnalyticsCached(range);
  return NextResponse.json(payload);
}
