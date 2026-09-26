import { NextResponse } from "next/server";
import {
  isAdminAuthFailure,
  requireAdmin,
} from "@/lib/auth/require-admin";

export const runtime = "nodejs";

/** Confirms the signed-in user is on the admin allowlist. */
export async function GET(request: Request) {
  const session = await requireAdmin(request);
  if (isAdminAuthFailure(session)) return session;

  return NextResponse.json({
    user: {
      email: session.email,
    },
  });
}
