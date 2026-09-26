import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let admin: SupabaseClient | null = null;

/** Server-only client. Uses the service role so pot covers can be stored without a user session. */
export function getSupabaseAdmin(): SupabaseClient {
  if (admin) return admin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Storage and creator accounts are not configured.");
  }

  admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}

export const POT_COVER_BUCKET = "pot-covers";
export const POT_COVER_MAX_BYTES = 5 * 1024 * 1024;
export const POT_COVER_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
