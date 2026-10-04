import { NextResponse } from "next/server";
import {
  isAdminAuthFailure,
  requireAdmin,
} from "@/lib/auth/require-admin";
import {
  getAdminPotsCached,
  parseAdminPotsQuery,
} from "@/lib/admin-pots";

export const runtime = "nodejs";

/** All pots across hosts. */
export async function GET(request: Request) {
  const session = await requireAdmin(request);
  if (isAdminAuthFailure(session)) return session;

  const query = parseAdminPotsQuery(new URL(request.url));
  const payload = await getAdminPotsCached(query);
  return NextResponse.json(payload);
}
