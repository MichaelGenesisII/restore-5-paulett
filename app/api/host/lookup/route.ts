import { NextResponse } from "next/server";
import { isExistingCreatorEmail } from "@/lib/auth/host-account";
import { rateLimitConsume, requestClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const LOOKUP_LIMIT = 20;
const LOOKUP_WINDOW_MS = 15 * 60 * 1000;

/**
 * Public lookup: has this email already got a host login / pot?
 * Used by the create wizard to sharpen the confirm copy.
 * Rate-limited — do not use for enumeration / account discovery.
 */
export async function GET(request: Request) {
  const limited = rateLimitConsume(
    `host-lookup:${requestClientIp(request)}`,
    LOOKUP_LIMIT,
    LOOKUP_WINDOW_MS,
  );
  if (!limited.ok) {
    // Same shape as “unknown” so we do not confirm rate-limit vs missing email.
    return NextResponse.json(
      { returning: false },
      {
        status: 200,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  const email = new URL(request.url).searchParams.get("email")?.trim() ?? "";
  if (
    !email ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return NextResponse.json({ returning: false });
  }

  try {
    const returning = await isExistingCreatorEmail(email);
    return NextResponse.json({ returning });
  } catch (error) {
    console.error("Creator lookup failed", error);
    // Fail open as first-time — create flow still handles real auth correctly.
    return NextResponse.json({ returning: false });
  }
}
