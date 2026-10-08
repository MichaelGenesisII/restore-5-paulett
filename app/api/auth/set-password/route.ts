import { NextResponse } from "next/server";
import { passwordSignIn } from "@/lib/auth/password-session";
import { verifySetPasswordToken } from "@/lib/auth/set-password-token";
import { prisma } from "@/lib/prisma";
import { rateLimitConsume, requestClientIp } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const LIMIT = 10;
const WINDOW_MS = 15 * 60 * 1000;

/**
 * First password for a host who was signed in straight after creating a
 * fundraiser. Works once (mustSetPassword) and signs out every other session,
 * so whoever typed the email cannot keep the account from its real owner.
 */
export async function POST(request: Request) {
  const limited = rateLimitConsume(
    `set-password:${requestClientIp(request)}`,
    LIMIT,
    WINDOW_MS,
  );
  if (!limited.ok) {
    return NextResponse.json(
      {
        error: `Too many attempts. Try again in about ${limited.retryAfterSec} seconds.`,
      },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  let body: { token?: unknown; password?: unknown };
  try {
    body = (await request.json()) as { token?: unknown; password?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Use at least 8 characters." },
      { status: 400 },
    );
  }
  if (password.length > 72) {
    return NextResponse.json(
      { error: "Keep the password under 72 characters." },
      { status: 400 },
    );
  }

  const authUserId = token ? verifySetPasswordToken(token) : null;
  if (!authUserId) {
    return NextResponse.json(
      {
        error:
          "This link has expired. Use “Forgot password?” on the Host sign-in screen instead.",
      },
      { status: 410 },
    );
  }

  const fundraiser = await prisma.fundraiser.findUnique({
    where: { authUserId },
    select: { id: true, email: true, mustSetPassword: true },
  });
  if (!fundraiser?.mustSetPassword) {
    return NextResponse.json(
      {
        error:
          "A password is already set for this account. Sign in, or use “Forgot password?”.",
      },
      { status: 410 },
    );
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.auth.admin.updateUserById(authUserId, {
    password,
  });
  if (error) {
    console.error("Set password failed", error);
    return NextResponse.json(
      { error: "We could not save that password. Please try again." },
      { status: 500 },
    );
  }

  await prisma.fundraiser.update({
    where: { id: fundraiser.id },
    data: { mustSetPassword: false },
  });

  const session = await passwordSignIn(fundraiser.email, password);
  if (session) {
    const { error: signOutError } = await admin.auth.admin.signOut(
      session.access_token,
      "others",
    );
    if (signOutError) {
      console.error("Set password: revoking other sessions failed", signOutError);
    }
  }

  return NextResponse.json({ ok: true, email: fundraiser.email, session });
}
