import { createHmac, timingSafeEqual } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type VerifiedUser = {
  id: string;
  email: string;
};

export type VerifyAccessTokenResult =
  | { ok: true; user: VerifiedUser }
  | { ok: false; reason: "invalid" | "timeout" };

type CacheEntry = {
  at: number;
  user: VerifiedUser;
};

/** Short in-process memo — avoids a Supabase Auth round-trip on every API call. */
const TOKEN_TTL_MS = 60_000;
const GET_USER_TIMEOUT_MS = 4_000;
const tokenCache = new Map<string, CacheEntry>();

function pruneTokenCache(now: number) {
  if (tokenCache.size < 64) return;
  for (const [key, entry] of tokenCache) {
    if (now - entry.at > TOKEN_TTL_MS) tokenCache.delete(key);
  }
}

function base64UrlToBuffer(value: string): Buffer {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64");
}

/**
 * Local HS256 verify using SUPABASE_JWT_SECRET (Dashboard → API → JWT Secret).
 * Instant — no Auth HTTP round-trip.
 */
function verifyJwtLocally(token: string): VerifiedUser | null {
  const secret = process.env.SUPABASE_JWT_SECRET?.trim();
  if (!secret) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;
  if (!headerB64 || !payloadB64 || !signatureB64) return null;

  try {
    const header = JSON.parse(
      base64UrlToBuffer(headerB64).toString("utf8"),
    ) as { alg?: string };
    if (header.alg !== "HS256") return null;

    const expected = createHmac("sha256", secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest();
    const actual = base64UrlToBuffer(signatureB64);
    if (
      expected.length !== actual.length ||
      !timingSafeEqual(expected, actual)
    ) {
      return null;
    }

    const payload = JSON.parse(
      base64UrlToBuffer(payloadB64).toString("utf8"),
    ) as {
      sub?: string;
      email?: string;
      exp?: number;
      role?: string;
    };

    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    if (!payload.sub || !payload.email) return null;
    // Reject service-role / anon keys pasted as Bearer tokens.
    if (payload.role === "service_role" || payload.role === "anon") {
      return null;
    }

    return {
      id: payload.sub,
      email: payload.email.toLowerCase(),
    };
  } catch {
    return null;
  }
}

async function verifyViaSupabaseAuth(
  token: string,
): Promise<VerifyAccessTokenResult> {
  const admin = getSupabaseAdmin();
  const result = await Promise.race([
    admin.auth.getUser(token),
    new Promise<"timeout">((resolve) => {
      setTimeout(() => resolve("timeout"), GET_USER_TIMEOUT_MS);
    }),
  ]);

  if (result === "timeout") {
    console.error(
      "verifyAccessToken: supabase.auth.getUser timed out after",
      GET_USER_TIMEOUT_MS,
      "ms — set SUPABASE_JWT_SECRET for instant local verify",
    );
    return { ok: false, reason: "timeout" };
  }

  const { data, error } = result;
  if (error || !data.user?.email || !data.user.id) {
    return { ok: false, reason: "invalid" };
  }

  return {
    ok: true,
    user: {
      id: data.user.id,
      email: data.user.email.toLowerCase(),
    },
  };
}

/**
 * Validates a Supabase access token and returns the user id + email.
 * Prefers local JWT verify (SUPABASE_JWT_SECRET); falls back to Auth getUser
 * with a hard timeout. Results are memoised for 60s per token.
 */
export async function verifyAccessToken(
  token: string,
): Promise<VerifyAccessTokenResult> {
  const now = Date.now();
  const cached = tokenCache.get(token);
  if (cached && now - cached.at < TOKEN_TTL_MS) {
    return { ok: true, user: cached.user };
  }

  const local = verifyJwtLocally(token);
  if (local) {
    tokenCache.set(token, { at: now, user: local });
    pruneTokenCache(now);
    return { ok: true, user: local };
  }

  // Local verify unavailable (no secret / non-HS256) — ask Supabase Auth.
  const remote = await verifyViaSupabaseAuth(token);
  if (!remote.ok) {
    if (remote.reason === "invalid") tokenCache.delete(token);
    return remote;
  }

  tokenCache.set(token, { at: now, user: remote.user });
  pruneTokenCache(now);
  return remote;
}

/** Drop a token from the memo (e.g. after sign-out). */
export function invalidateAccessToken(token: string) {
  tokenCache.delete(token);
}
