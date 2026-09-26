import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin-emails";
import { bearerToken } from "@/lib/auth/require-host";
import { verifyAccessToken } from "@/lib/auth/verify-access-token";

export type AdminSession = {
  authUserId: string;
  email: string;
};

/**
 * Validates the Bearer access token and ensures the email is allowlisted
 * (ADMIN_EMAILS env and/or AdminUser table).
 */
export async function requireAdmin(
  request: Request,
): Promise<AdminSession | NextResponse> {
  const token = bearerToken(request);
  if (!token) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const verified = await verifyAccessToken(token);
  if (!verified.ok) {
    if (verified.reason === "timeout") {
      return NextResponse.json(
        { error: "Auth check timed out. Retry shortly." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  if (!(await isAdminEmail(verified.user.email))) {
    return NextResponse.json(
      { error: "This account is not authorised for admin." },
      { status: 403 },
    );
  }

  return {
    authUserId: verified.user.id,
    email: verified.user.email,
  };
}

export function isAdminAuthFailure(
  value: AdminSession | NextResponse,
): value is NextResponse {
  return value instanceof NextResponse;
}
