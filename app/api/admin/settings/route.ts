import { NextResponse } from "next/server";
import { DonationStatus } from "@prisma/client";
import {
  getEnvAdminEmails,
  listAdminEmails,
} from "@/lib/admin-emails";
import {
  isAdminAuthFailure,
  requireAdmin,
} from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function stripeModeFromKey(
  key: string | undefined,
): "test" | "live" | "unknown" | "missing" {
  const trimmed = key?.trim() ?? "";
  if (!trimmed) return "missing";
  if (trimmed.startsWith("sk_test_")) return "test";
  if (trimmed.startsWith("sk_live_")) return "live";
  return "unknown";
}

/** Read-only ops health for /admin/settings. Never returns secret values. */
export async function GET(request: Request) {
  const session = await requireAdmin(request);
  if (isAdminAuthFailure(session)) return session;

  const envAdmins = getEnvAdminEmails();
  const allAdmins = await listAdminEmails();
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const stripeMode = stripeModeFromKey(stripeKey);

  const adminAllowlistConfigured = allAdmins.length > 0;
  const cronSecretConfigured = Boolean(process.env.CRON_SECRET?.trim());
  const stripeSecretConfigured = stripeMode !== "missing";
  const stripeWebhookConfigured = Boolean(
    process.env.STRIPE_WEBHOOK_SECRET?.trim(),
  );
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
  const resendConfigured = Boolean(process.env.RESEND_API_KEY?.trim());
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || null;

  const latestSucceeded = await prisma.donation.findFirst({
    where: { status: DonationStatus.SUCCEEDED },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  const issues: string[] = [];
  if (!adminAllowlistConfigured) {
    issues.push(
      "No admin emails configured — set ADMIN_EMAILS or add staff under Settings → Admins.",
    );
  }
  if (!stripeSecretConfigured) {
    issues.push("STRIPE_SECRET_KEY is missing.");
  }
  if (!stripeWebhookConfigured) {
    issues.push(
      "STRIPE_WEBHOOK_SECRET is missing — gifts may stay pending.",
    );
  }
  if (!cronSecretConfigured) {
    issues.push(
      "CRON_SECRET is missing — 90-day pending/failed purge will not run on Vercel.",
    );
  }
  if (!supabaseConfigured) {
    issues.push("Supabase URL / anon / service role is incomplete.");
  }
  if (!appUrl) {
    issues.push(
      "NEXT_PUBLIC_APP_URL is not set — checkout return URLs may break.",
    );
  }
  if (!resendConfigured) {
    issues.push("RESEND_API_KEY is missing — giving emails will not send.");
  }

  return NextResponse.json({
    signedInAs: session.email,
    adminAllowlistConfigured,
    adminAllowlistCount: allAdmins.length,
    envAdminCount: envAdmins.length,
    cronSecretConfigured,
    stripeSecretConfigured,
    stripeWebhookConfigured,
    stripeMode,
    supabaseConfigured,
    resendConfigured,
    appUrl,
    latestSucceededAt: latestSucceeded?.createdAt.toISOString() ?? null,
    issues,
    healthy: issues.length === 0,
  });
}
