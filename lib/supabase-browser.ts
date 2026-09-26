import {
  createClient,
  type Session,
  type SupabaseClient,
} from "@supabase/supabase-js";

let browser: SupabaseClient | null = null;

/** Browser client for pot-creator / admin sign-in. Needs the anon key. */
export function getSupabaseBrowser(): SupabaseClient {
  if (browser) return browser;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Sign-in is not available right now. Please try again later.",
    );
  }

  browser = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return browser;
}

/**
 * getSession can hang indefinitely when Supabase’s auth lock / token refresh
 * deadlocks (multi-tab, Strict Mode, near-expiry refresh). Never wait forever.
 */
export async function getBrowserSession(timeoutMs = 8_000): Promise<{
  session: Session | null;
  timedOut: boolean;
}> {
  const supabase = getSupabaseBrowser();
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    const result = await Promise.race([
      supabase.auth.getSession().then((res) => ({
        session: res.data.session,
        timedOut: false as const,
      })),
      new Promise<{ session: null; timedOut: true }>((resolve) => {
        timer = setTimeout(
          () => resolve({ session: null, timedOut: true }),
          timeoutMs,
        );
      }),
    ]);
    return result;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
