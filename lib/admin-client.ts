"use client";

import { getSupabaseBrowser } from "@/lib/supabase-browser";

/** Bearer token for admin API calls, or null if signed out. */
export async function adminAccessToken(): Promise<string | null> {
  const supabase = getSupabaseBrowser();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function adminFetch(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = await adminAccessToken();
  if (!token) {
    throw new Error("Please sign in again.");
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (
    init.body &&
    !headers.has("Content-Type") &&
    !(init.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(input, { ...init, headers });
}
