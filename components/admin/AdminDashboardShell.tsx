"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { AdminGate } from "@/components/admin/AdminGate";
import { AdminTabBar } from "@/components/admin/AdminTabBar";
import {
  clearHostClientCache,
  readHostClientCache,
  writeHostClientCache,
} from "@/lib/host-client-cache";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { visitorSafeMessage } from "@/lib/visitor-safe";

export type AdminMe = {
  user: {
    email: string;
  };
  /** Absent until /api/admin/me answers (session-only placeholder). */
  unhandledContacts?: number;
};

const ADMIN_ME_CACHE_TTL_MS = 5 * 60_000;

function adminMeCacheKey(email: string) {
  return `admin-me:${email}`;
}

const nav = [
  { href: "/admin", label: "Overview", match: (p: string) => p === "/admin" },
  {
    href: "/admin/gifts",
    label: "Gifts",
    match: (p: string) => p.startsWith("/admin/gifts"),
  },
  {
    href: "/admin/inbox",
    label: "Inbox",
    match: (p: string) => p.startsWith("/admin/inbox"),
  },
  {
    href: "/admin/analytics",
    label: "Analytics",
    match: (p: string) => p.startsWith("/admin/analytics"),
  },
  {
    href: "/admin/pots",
    label: "Pots",
    match: (p: string) => p.startsWith("/admin/pots"),
  },
  {
    href: "/admin/hosts",
    label: "Hosts",
    match: (p: string) => p.startsWith("/admin/hosts"),
  },
  {
    href: "/admin/building-fund",
    label: "Fund",
    match: (p: string) => p.startsWith("/admin/building-fund"),
  },
  {
    href: "/admin/exports",
    label: "Exports",
    match: (p: string) => p.startsWith("/admin/exports"),
  },
  {
    href: "/admin/settings",
    label: "Settings",
    match: (p: string) => p.startsWith("/admin/settings"),
  },
] as const;

type AdminDashboardContextValue = {
  data: AdminMe | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  signOut: () => void;
  /** Keep the Inbox badge in step when a message is marked done/reopened. */
  adjustUnhandled: (delta: number) => void;
};

const AdminDashboardContext =
  createContext<AdminDashboardContextValue | null>(null);

export function useAdminDashboard() {
  const ctx = useContext(AdminDashboardContext);
  if (!ctx) {
    throw new Error("useAdminDashboard must be used inside the shell");
  }
  return ctx;
}

function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-8 flex flex-col gap-0.5" aria-label="Admin">
      {nav.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`font-nav relative border-l-2 px-3 py-2.5 text-[0.7rem] font-bold tracking-[0.14em] uppercase transition ${
              active
                ? "border-pvn-gold bg-pvn-cream/10 text-pvn-gold"
                : "border-transparent text-pvn-cream/55 hover:border-pvn-cream/25 hover:bg-pvn-cream/[0.04] hover:text-pvn-cream"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Admin dashboard chrome: rail on desktop, bottom tab bar + left menu on mobile.
 * Access = Supabase session + ADMIN_EMAILS allowlist via /api/admin/me.
 */
export function AdminDashboardShell({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AdminMe | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const refresh = useCallback(async () => {
    // Match Host: read local session directly (no getBrowserSession lock wait).
    const supabase = getSupabaseBrowser();
    const sessionResult = await Promise.race([
      supabase.auth.getSession(),
      new Promise<"timeout">((resolve) => {
        setTimeout(() => resolve("timeout"), 2_500);
      }),
    ]);

    if (sessionResult === "timeout") {
      setData(null);
      setForbidden(false);
      setError("Sign-in check timed out. Refresh the page and try again.");
      setLoading(false);
      return;
    }

    const session = sessionResult.data.session;
    const token = session?.access_token;
    if (!token || !session.user.email) {
      setData(null);
      setError(null);
      setForbidden(false);
      setLoading(false);
      return;
    }

    const email = session.user.email.toLowerCase();
    const cached = readHostClientCache<AdminMe>(
      adminMeCacheKey(email),
      ADMIN_ME_CACHE_TTL_MS,
    );

    // Paint immediately (cache or session email) — never block the shell on Auth.
    if (cached) {
      setData(cached);
    } else {
      setData({ user: { email } });
    }
    setForbidden(false);
    setLoading(false);

    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), 6_000);
    try {
      const response = await fetch("/api/admin/me", {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      const json = (await response.json()) as AdminMe & { error?: string };
      if (response.status === 403) {
        clearHostClientCache(adminMeCacheKey(email));
        setForbidden(true);
        setData(null);
        setError(
          json.error ??
            "This account is signed in but not on the admin allowlist.",
        );
        return;
      }
      if (response.status === 401) {
        clearHostClientCache(adminMeCacheKey(email));
        setData(null);
        setError(json.error ?? "Please sign in again.");
        return;
      }
      // Auth upstream timed out — keep optimistic shell, don't bounce to gate.
      if (response.status === 503) {
        return;
      }
      if (!response.ok) {
        throw new Error(json.error ?? "Could not verify admin access.");
      }
      setForbidden(false);
      setData(json);
      writeHostClientCache(adminMeCacheKey(email), json);
      setError(null);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // Keep optimistic / cached shell; allowlist check will retry next visit.
        return;
      }
      throw err;
    } finally {
      clearTimeout(abortTimer);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    // refresh() awaits the Supabase session before any setState, so nothing
    // updates synchronously inside this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh().catch((err) => {
      if (cancelled) return;
      setError(
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Please sign in again.",
        ),
      );
      setData(null);
      setForbidden(false);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  async function performSignOut() {
    setSigningOut(true);
    try {
      const email = data?.user.email;
      if (email) clearHostClientCache(adminMeCacheKey(email));
      await getSupabaseBrowser().auth.signOut();
      // Full reload (not router.push) so no signed-in data survives in memory;
      // replace() also keeps the dashboard out of the back-button history.
      window.location.replace("/admin");
    } catch {
      setSigningOut(false);
    }
  }

  const adjustUnhandled = useCallback((delta: number) => {
    setData((current) => {
      if (!current || current.unhandledContacts === undefined) return current;
      const next = {
        ...current,
        unhandledContacts: Math.max(0, current.unhandledContacts + delta),
      };
      writeHostClientCache(adminMeCacheKey(current.user.email), next);
      return next;
    });
  }, []);

  const value: AdminDashboardContextValue = {
    data,
    loading,
    error,
    refresh,
    signOut: () => void performSignOut(),
    adjustUnhandled,
  };

  if (loading && !data && !forbidden) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
        <span
          className="h-8 w-8 animate-spin rounded-full border-2 border-pvn-gold border-t-transparent"
          aria-hidden
        />
        <p className="font-nav text-xs font-bold tracking-[0.16em] text-pvn-navy/55 uppercase">
          Checking admin access…
        </p>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="rounded-sm border border-pvn-navy/10 bg-white px-6 py-10 text-center sm:px-10">
        <p className="font-nav text-[0.65rem] font-bold tracking-[0.2em] text-pvn-gold uppercase">
          Admin
        </p>
        <h1 className="font-display mt-3 text-2xl font-semibold text-pvn-navy">
          Not authorised
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-pvn-navy/65">
          {error ??
            "You are signed in, but this email is not on the admin allowlist. Ask an existing admin to add you under Settings → Admins, or set ADMIN_EMAILS."}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => void performSignOut()}
            disabled={signingOut}
            className="font-nav inline-flex min-h-10 items-center justify-center rounded-md bg-pvn-navy px-5 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-cream uppercase transition hover:bg-pvn-navy/90 disabled:opacity-50"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
          <Link
            href="/host"
            className="font-nav text-[0.65rem] font-bold tracking-[0.14em] text-pvn-gold uppercase"
          >
            Host home →
          </Link>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <AdminGate
        error={error}
        onSignedIn={async () => {
          try {
            await refresh();
          } catch (err) {
            setError(
              visitorSafeMessage(
                err instanceof Error ? err.message : null,
                "Please sign in again.",
              ),
            );
            throw err;
          }
        }}
      />
    );
  }

  return (
    <AdminDashboardContext.Provider value={value}>
      {/* Mobile: navigation and sign out live in the bottom bar's menu */}
      <div className="mb-6 lg:hidden">
        <p className="font-nav text-[0.6rem] font-bold tracking-[0.2em] text-pvn-gold uppercase">
          Admin
        </p>
        <p className="mt-1 truncate font-display text-xl font-semibold text-pvn-navy">
          Operations
        </p>
      </div>

      <div className="lg:grid lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-0 xl:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 -ml-2 flex min-h-[32rem] flex-col overflow-hidden rounded-sm bg-pvn-navy text-pvn-cream shadow-[0_20px_50px_-28px_rgba(12,27,51,0.55)] xl:-ml-3">
            <div
              className="h-1 shrink-0 bg-gradient-to-r from-pvn-gold via-pvn-gold-light to-pvn-gold/40"
              aria-hidden
            />
            <div className="flex flex-1 flex-col px-5 py-7 xl:px-6 xl:py-8">
              <p className="font-nav text-[0.6rem] font-bold tracking-[0.2em] text-pvn-gold uppercase">
                Admin
              </p>
              <p className="font-display mt-2 text-2xl leading-tight font-semibold text-pvn-cream">
                Operations
              </p>
              <p className="mt-1.5 truncate text-xs text-pvn-cream/50">
                {data.user.email}
              </p>

              <DesktopNav />

              <div className="mt-auto space-y-3 border-t border-pvn-cream/12 pt-6">
                <button
                  type="button"
                  onClick={() => void performSignOut()}
                  disabled={signingOut}
                  className="font-nav inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-pvn-cream/35 bg-pvn-cream/[0.08] px-3 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-cream uppercase transition hover:border-pvn-gold hover:bg-pvn-gold/15 hover:text-pvn-gold disabled:opacity-50"
                >
                  {signingOut ? "Signing out…" : "Sign out"}
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile bottom padding clears the fixed tab bar */}
        <div className="min-w-0 pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0 lg:pl-10 xl:pl-12">
          {children}
        </div>
      </div>

      <AdminTabBar
        email={data.user.email}
        unhandledContacts={data.unhandledContacts ?? 0}
        onSignOut={() => void performSignOut()}
        signingOut={signingOut}
      />
    </AdminDashboardContext.Provider>
  );
}
