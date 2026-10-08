import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin-emails";
import { resetCreatorTemporaryPassword } from "@/lib/auth/creator-account";
import { notifyAdminPasswordReset } from "@/lib/email/admin-notify";
import { notifyCreatorPasswordReset } from "@/lib/email/creator-notify";
import { prisma } from "@/lib/prisma";
import { rateLimitConsume, requestClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const FORGOT_LIMIT = 5;
const FORGOT_WINDOW_MS = 15 * 60 * 1000;

/**
 * Issues a new temporary password and emails it.
 * Admin allowlist → Operations Desk template; otherwise Host template.
 * Response is always generic so we do not leak whether the email exists.
 */
export async function POST(request: Request) {
  let body: { email?: unknown; audience?: unknown };
  try {
    body = (await request.json()) as { email?: unknown; audience?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  }

  const limited = rateLimitConsume(
    `forgot:${requestClientIp(request)}:${email}`,
    FORGOT_LIMIT,
    FORGOT_WINDOW_MS,
  );
  if (!limited.ok) {
    return NextResponse.json(
      {
        error: `Too many reset requests. Try again in about ${limited.retryAfterSec} seconds.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  const audienceHint =
    body.audience === "admin" || body.audience === "host"
      ? body.audience
      : null;

  try {
    const reset = await resetCreatorTemporaryPassword(email);
    if (reset) {
      await prisma.fundraiser.updateMany({
        where: { email, mustSetPassword: true },
        data: { mustSetPassword: false },
      });
      const preferAdmin =
        audienceHint === "admin" ||
        (audienceHint !== "host" && (await isAdminEmail(email)));

      if (preferAdmin) {
        void notifyAdminPasswordReset({
          email,
          temporaryPassword: reset.temporaryPassword,
        });
      } else {
        const fundraiser = await prisma.fundraiser.findUnique({
          where: { email },
          select: { name: true },
        });
        void notifyCreatorPasswordReset({
          email,
          name: fundraiser?.name ?? null,
          temporaryPassword: reset.temporaryPassword,
        });
      }
    }
  } catch (error) {
    console.error("Forgot password failed", error);
    return NextResponse.json(
      { error: "We could not reset that password right now. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    message:
      "If that email has an account, a new temporary password is on its way.",
  });
}
