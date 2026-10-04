import { prisma } from "@/lib/prisma";

/**
 * Env bootstrap allowlist — comma-separated ADMIN_EMAILS.
 * Staff can also be added in /admin/settings (AdminUser table).
 */
export function getEnvAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS?.trim() ?? "";
  if (!raw) return [];

  const seen = new Set<string>();
  const emails: string[] = [];

  for (const part of raw.split(/[,;\s]+/)) {
    const email = part.trim().toLowerCase();
    if (!email || !email.includes("@") || seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
  }

  return emails;
}

/** @deprecated Prefer getEnvAdminEmails or listAdminEmails. */
export function getAdminEmails(): string[] {
  return getEnvAdminEmails();
}

function normaliseEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const normalised = email.trim().toLowerCase();
  if (!normalised || !normalised.includes("@")) return null;
  return normalised;
}

/** Env allowlist only (sync) — used when DB is unavailable. */
export function isEnvAdminEmail(email: string | null | undefined): boolean {
  const normalised = normaliseEmail(email);
  if (!normalised) return false;
  return getEnvAdminEmails().includes(normalised);
}

const DB_ADMIN_TTL_MS = 15_000;
const dbAdminCache = new Map<string, { at: number; ok: boolean }>();

/**
 * True if email is on ADMIN_EMAILS or in AdminUser.
 * Prefer this for access checks.
 */
export async function isAdminEmail(
  email: string | null | undefined,
): Promise<boolean> {
  const normalised = normaliseEmail(email);
  if (!normalised) return false;
  if (getEnvAdminEmails().includes(normalised)) return true;

  const now = Date.now();
  const cached = dbAdminCache.get(normalised);
  if (cached && now - cached.at < DB_ADMIN_TTL_MS) {
    return cached.ok;
  }

  const row = await prisma.adminUser.findUnique({
    where: { email: normalised },
    select: { id: true },
  });
  const ok = Boolean(row);
  dbAdminCache.set(normalised, { at: now, ok });
  return ok;
}

/** Clear DB allowlist memo after Settings → Admins changes. */
export function invalidateAdminEmailCache(email?: string) {
  if (email) {
    const normalised = normaliseEmail(email);
    if (normalised) dbAdminCache.delete(normalised);
    return;
  }
  dbAdminCache.clear();
}

/** Merged env + DB emails for notifications (deduped, lowercased). */
export async function listAdminEmails(): Promise<string[]> {
  const env = getEnvAdminEmails();
  const seen = new Set(env);
  const emails = [...env];

  const rows = await prisma.adminUser.findMany({
    select: { email: true },
    orderBy: { createdAt: "asc" },
  });
  for (const row of rows) {
    const email = row.email.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
  }
  return emails;
}

export async function listDbAdmins() {
  return prisma.adminUser.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      addedBy: true,
      createdAt: true,
    },
  });
}
