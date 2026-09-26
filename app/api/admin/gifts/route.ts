import { NextResponse } from "next/server";
import {
  isAdminAuthFailure,
  requireAdmin,
} from "@/lib/auth/require-admin";
import {
  getAdminGiftsCached,
  parseAdminGiftsQuery,
} from "@/lib/admin-gifts";

export const runtime = "nodejs";

/** Admin gift attempts — all statuses. */
export async function GET(request: Request) {
  const session = await requireAdmin(request);
  if (isAdminAuthFailure(session)) return session;

  const query = parseAdminGiftsQuery(new URL(request.url));
  const payload = await getAdminGiftsCached(query);
  return NextResponse.json(payload);
}
