import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed, expiring link token for "set your password" emails. Our own token
 * rather than a Supabase recovery link so it can live for days, not the
 * project's one-hour OTP window. Single use is enforced by
 * Fundraiser.mustSetPassword flipping to false once a password is chosen.
 */

const TTL_MS = 7 * 24 * 60 * 60 * 1000;

function signingKey(): Buffer {
  const secret =
    process.env.SET_PASSWORD_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret) {
    throw new Error("No signing secret for set-password links");
  }
  return createHmac("sha256", "pvn-set-password").update(secret).digest();
}

function sign(payload: string): string {
  return createHmac("sha256", signingKey()).update(payload).digest("base64url");
}

export function createSetPasswordToken(authUserId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ u: authUserId, e: Date.now() + TTL_MS }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/** Returns the Auth user id when the token is genuine and unexpired. */
export function verifySetPasswordToken(token: string): string | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return null;
  }

  try {
    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { u?: unknown; e?: unknown };
    if (typeof data.u !== "string" || typeof data.e !== "number") return null;
    if (data.e < Date.now()) return null;
    return data.u;
  } catch {
    return null;
  }
}
