import { NextResponse } from "next/server";
import {
  isAdminAuthFailure,
  requireAdmin,
} from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** Confirms the signed-in user is on the admin allowlist. */
export async function GET(request: Request) {
  const session = await requireAdmin(request);
  if (isAdminAuthFailure(session)) return session;

  // Feeds the mobile Inbox badge; a failed count must not block access.
  const unhandledContacts = await prisma.contactMessage
    .count({ where: { handled: false } })
    .catch(() => 0);

  return NextResponse.json({
    user: {
      email: session.email,
    },
    unhandledContacts,
  });
}
