import { NextResponse } from "next/server";
import {
  isAuthFailure,
  requireHost,
} from "@/lib/auth/require-host";
import { passwordSignIn } from "@/lib/auth/password-session";
import { revalidateHostMe } from "@/lib/host-me";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

/**
 * Signed-in creator changes their password.
 * Verifies the current password (skipped for a host who has never chosen
 * one), then updates via Auth admin.
 */
export async function POST(request: Request) {
  const session = await requireHost(request);
  if (isAuthFailure(session)) return session;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const currentPassword =
    typeof (body as { currentPassword?: unknown }).currentPassword === "string"
      ? (body as { currentPassword: string }).currentPassword
      : "";
  const newPassword =
    typeof (body as { newPassword?: unknown }).newPassword === "string"
      ? (body as { newPassword: string }).newPassword
      : "";

  const firstPassword = session.fundraiser?.mustSetPassword === true;

  if (!newPassword || (!firstPassword && !currentPassword)) {
    return NextResponse.json(
      {
        error: firstPassword
          ? "Enter a password."
          : "Enter your current password and a new one.",
      },
      { status: 400 },
    );
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "Use at least 8 characters for the new password." },
      { status: 400 },
    );
  }

  if (newPassword.length > 72) {
    return NextResponse.json(
      { error: "Keep the new password under 72 characters." },
      { status: 400 },
    );
  }

  if (!firstPassword) {
    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: "Choose a new password that is different from the current one." },
        { status: 400 },
      );
    }

    const verified = await passwordSignIn(session.email, currentPassword);
    if (!verified) {
      return NextResponse.json(
        { error: "That current password is not correct." },
        { status: 400 },
      );
    }
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.auth.admin.updateUserById(session.authUserId, {
    password: newPassword,
  });

  if (error) {
    console.error("Creator password update failed", error);
    return NextResponse.json(
      { error: "We could not update your password. Please try again." },
      { status: 500 },
    );
  }

  if (firstPassword && session.fundraiser) {
    await prisma.fundraiser.update({
      where: { id: session.fundraiser.id },
      data: { mustSetPassword: false },
    });
    revalidateHostMe();
  }

  return NextResponse.json({ ok: true });
}
