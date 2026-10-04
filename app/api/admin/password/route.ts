import { NextResponse } from "next/server";
import {
  isAdminAuthFailure,
  requireAdmin,
} from "@/lib/auth/require-admin";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

/**
 * Signed-in admin changes their password.
 * Verifies the current password, then updates via Auth admin.
 */
export async function POST(request: Request) {
  const session = await requireAdmin(request);
  if (isAdminAuthFailure(session)) return session;

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

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Enter your current password and a new one." },
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

  if (currentPassword === newPassword) {
    return NextResponse.json(
      { error: "Choose a new password that is different from the current one." },
      { status: 400 },
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.json(
      { error: "We could not update your password right now. Please try again." },
      { status: 500 },
    );
  }

  const { createClient } = await import("@supabase/supabase-js");
  const verifier = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: signInError } = await verifier.auth.signInWithPassword({
    email: session.email,
    password: currentPassword,
  });

  if (signInError) {
    return NextResponse.json(
      { error: "That current password is not correct." },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.auth.admin.updateUserById(session.authUserId, {
    password: newPassword,
  });

  if (error) {
    console.error("Admin password update failed", error);
    return NextResponse.json(
      { error: "We could not update your password. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
