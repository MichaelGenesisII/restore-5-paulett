import { NextResponse } from "next/server";
import {
  getEnvAdminEmails,
  invalidateAdminEmailCache,
  listDbAdmins,
} from "@/lib/admin-emails";
import { ensureAdminAuthAccount } from "@/lib/auth/admin-account";
import {
  isAdminAuthFailure,
  requireAdmin,
} from "@/lib/auth/require-admin";
import { notifyAdminInvite } from "@/lib/email/admin-notify";
import { prisma } from "@/lib/prisma";
import { VisitorError } from "@/lib/visitor-safe";

export const runtime = "nodejs";

function normaliseEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

/** List env + DB admins. */
export async function GET(request: Request) {
  const session = await requireAdmin(request);
  if (isAdminAuthFailure(session)) return session;

  const envEmails = getEnvAdminEmails();
  const dbRows = await listDbAdmins();

  return NextResponse.json({
    envEmails,
    dbAdmins: dbRows.map((row) => ({
      id: row.id,
      email: row.email,
      addedBy: row.addedBy,
      createdAt: row.createdAt.toISOString(),
      source: "database" as const,
    })),
    signedInAs: session.email,
  });
}

/**
 * Add an email to the DB allowlist, ensure a Supabase login exists,
 * and email an invite (with temporary password when the account is new).
 */
export async function POST(request: Request) {
  const session = await requireAdmin(request);
  if (isAdminAuthFailure(session)) return session;

  let body: { email?: unknown };
  try {
    body = (await request.json()) as { email?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = normaliseEmail(body.email);
  if (!email) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  }

  if (getEnvAdminEmails().includes(email)) {
    return NextResponse.json(
      {
        error:
          "That email is already on ADMIN_EMAILS (env). No need to add it again.",
      },
      { status: 400 },
    );
  }

  const existing = await prisma.adminUser.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: "That email is already an admin." },
      { status: 400 },
    );
  }

  let authResult: Awaited<ReturnType<typeof ensureAdminAuthAccount>>;
  try {
    authResult = await ensureAdminAuthAccount({
      email,
      invitedBy: session.email,
    });
  } catch (error) {
    const message =
      error instanceof VisitorError
        ? error.message
        : "We could not set up that admin login. Please try again.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const row = await prisma.adminUser.create({
    data: {
      email,
      addedBy: session.email,
    },
    select: {
      id: true,
      email: true,
      addedBy: true,
      createdAt: true,
    },
  });

  invalidateAdminEmailCache();
  const inviteSent = await notifyAdminInvite({
    email,
    invitedBy: session.email,
    temporaryPassword: authResult.temporaryPassword,
  });

  return NextResponse.json({
    admin: {
      ...row,
      createdAt: row.createdAt.toISOString(),
      source: "database" as const,
    },
    accountCreated: authResult.isNewAccount,
    inviteSent,
    /**
     * Only when the invite email failed and we just created the Auth user —
     * so the inviting admin can copy the temp password once. Never emailed
     * elsewhere in the JSON on success.
     */
    temporaryPassword:
      !inviteSent && authResult.temporaryPassword
        ? authResult.temporaryPassword
        : null,
  });
}
