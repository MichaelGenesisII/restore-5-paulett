import { NextResponse } from "next/server";
import {
  getEnvAdminEmails,
  invalidateAdminEmailCache,
} from "@/lib/admin-emails";
import {
  isAdminAuthFailure,
  requireAdmin,
} from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** Remove a DB allowlist admin. Env ADMIN_EMAILS cannot be removed here. */
export async function DELETE(request: Request, context: RouteContext) {
  const session = await requireAdmin(request);
  if (isAdminAuthFailure(session)) return session;

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const row = await prisma.adminUser.findUnique({
    where: { id: id.trim() },
    select: { id: true, email: true },
  });
  if (!row) {
    return NextResponse.json({ error: "Admin not found" }, { status: 404 });
  }

  if (row.email.toLowerCase() === session.email.toLowerCase()) {
    return NextResponse.json(
      { error: "You cannot remove your own admin access." },
      { status: 400 },
    );
  }

  const remainingDb = await prisma.adminUser.count({
    where: { id: { not: row.id } },
  });
  const envCount = getEnvAdminEmails().length;
  if (remainingDb === 0 && envCount === 0) {
    return NextResponse.json(
      {
        error:
          "Cannot remove the last admin. Add ADMIN_EMAILS in env or another admin first.",
      },
      { status: 400 },
    );
  }

  await prisma.adminUser.delete({ where: { id: row.id } });
  // Clear the whole memo — not only this email — so allowlist checks are fresh.
  invalidateAdminEmailCache();
  return NextResponse.json({ ok: true, id: row.id });
}
