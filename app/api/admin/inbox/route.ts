import { NextResponse } from "next/server";
import {
  isAdminAuthFailure,
  requireAdmin,
} from "@/lib/auth/require-admin";
import {
  getAdminInboxCached,
  parseAdminInboxQuery,
} from "@/lib/admin-inbox";

export const runtime = "nodejs";

/** Admin contact inbox — unhandled first; optional topic + search + pagination. */
export async function GET(request: Request) {
  const session = await requireAdmin(request);
  if (isAdminAuthFailure(session)) return session;

  const query = parseAdminInboxQuery(new URL(request.url));
  const payload = await getAdminInboxCached(query);
  return NextResponse.json(payload);
}
