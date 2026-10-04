import {
  isAdminAuthFailure,
  requireAdmin,
} from "@/lib/auth/require-admin";
import {
  getAdminOverviewCached,
  parseAdminOverviewRange,
} from "@/lib/admin-overview";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Ops dashboard snapshot for /admin. */
export async function GET(request: Request) {
  const session = await requireAdmin(request);
  if (isAdminAuthFailure(session)) return session;

  const url = new URL(request.url);
  const range = parseAdminOverviewRange(url.searchParams.get("range"));
  const payload = await getAdminOverviewCached(range);
  return NextResponse.json(payload);
}
