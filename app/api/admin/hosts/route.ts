import { NextResponse } from "next/server";
import {
  isAdminAuthFailure,
  requireAdmin,
} from "@/lib/auth/require-admin";
import {
  getAdminHostsCached,
  parseAdminHostsQuery,
} from "@/lib/admin-hosts";

export const runtime = "nodejs";

/** All hosts / fundraisers. */
export async function GET(request: Request) {
  const session = await requireAdmin(request);
  if (isAdminAuthFailure(session)) return session;

  const query = parseAdminHostsQuery(new URL(request.url));
  const payload = await getAdminHostsCached(query);
  return NextResponse.json(payload);
}
