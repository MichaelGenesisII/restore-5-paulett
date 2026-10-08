import { createClient } from "@supabase/supabase-js";

export type IssuedSession = {
  access_token: string;
  refresh_token: string;
};

/**
 * One-off password sign-in on the server (anon key, nothing persisted).
 * Lets us hand the browser session tokens instead of a password.
 */
export async function passwordSignIn(
  email: string,
  password: string,
): Promise<IssuedSession | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;

  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.session) return null;
  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  };
}
