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
import { ResultModal } from "@/components/ResultModal";
import { HostGate } from "@/components/host/HostGate";
import { HostTabBar } from "@/components/host/HostTabBar";
import { hostFetch } from "@/lib/host-client";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { visitorSafeMessage } from "@/lib/visitor-safe";

export type HostMe = {
  user: {
    email: string;
    name: string | null;
    bio: string | null;
    photoUrl: string | null;
    profileSlug: string | null;
    profilePublic: boolean;
    /** Signed in straight after creating a fundraiser; no password chosen yet. */
    mustSetPassword?: boolean;
  };
  pots: Array<{
    slug: string;
    title: string;
    status: string;
    totalRaised: number;
    targetAmount: number;
    donorCount: number;
    photoUrl?: string | null;
    createdAt: string;
    /** Succeeded gifts with a message and no host reply yet. */
    unrepliedCount: number;
  }>;
};

const HOST_ME_CACHE_PREFIX = "pvn-host-me:";
const HOST_ME_CACHE_TTL_MS = 60_000;

function readHostMeCache(email: string): HostMe | null {
  try {
    const raw = sessionStorage.getItem(`${HOST_ME_CACHE_PREFIX}${email}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; data: HostMe };
    if (Date.now() - parsed.at > HOST_ME_CACHE_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeHostMeCache(email: string, data: HostMe) {
  try {
    sessionStorage.setItem(
      `${HOST_ME_CACHE_PREFIX}${email}`,
      JSON.stringify({ at: Date.now(), data }),
    );
  } catch {
    // Private mode / quota — ignore.
  }
}

function clearHostMeCache(email: string) {
  try {
    sessionStorage.removeItem(`${HOST_ME_CACHE_PREFIX}${email}`);
  } catch {
    // ignore
  }
}

const nav = [
  { href: "/host", label: "Overview", match: (p: string) => p === "/host" },
  {
    href: "/host/pots",
    label: "Your fundraisers",
    match: (p: string) =>
      p.startsWith("/host/pots") && !p.startsWith("/host/pots/new"),
  },
  {
    href: "/host/inbox",
    label: "Inbox",
    match: (p: string) => p.startsWith("/host/inbox"),
  },
  {
    href: "/host/account",
    label: "Account",
    match: (p: string) => p.startsWith("/host/account"),
  },
] as const;

type HostDashboardContextValue = {
  data: HostMe | null;
  loading: boolean;
  /** True after sessionStorage or a successful /api/host/me response. */
  meReady: boolean;
  /** Background refetch while stale data (or a shell placeholder) is shown. */
  refreshing: boolean;
  error: string | null;
  refresh: (opts?: { bypassClientCache?: boolean }) => Promise<void>;
  /** Patch dashboard data immediately (e.g. after avatar/cover upload). */
  applyMe: (updater: (prev: HostMe) => HostMe) => void;
  signOut: () => void;
  /** Mark unsaved edits so sign-out can confirm (F3). */
  setFormDirty: (dirty: boolean) => void;
  formDirty: boolean;
};

const HostDashboardContext =
  createContext<HostDashboardContextValue | null>(null);

export function useHostDashboard() {
  const ctx = useContext(HostDashboardContext);
  if (!ctx) {
    throw new Error("useHostDashboard must be used inside the shell");
  }
  return ctx;
}

function DesktopNav({ unrepliedTotal }: { unrepliedTotal: number }) {
  const pathname = usePathname();

  return (
    <nav className="mt-8 flex flex-col gap-0.5" aria-label="Host">
      {nav.map((item) => {
        const active = item.match(pathname);
        const showBadge = item.href === "/host/inbox" && unrepliedTotal > 0;
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
            <span className="inline-flex items-center gap-2">
              {item.label}
              {showBadge ? (
                <span className="rounded-sm bg-pvn-gold/20 px-1.5 py-0.5 text-[0.55rem] text-pvn-gold">
                  {unrepliedTotal}
                </span>
              ) : null}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Host dashboard chrome: rail on desktop, bottom tab bar + left menu on mobile.
 */
export function HostDashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [meReady, setMeReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<HostMe | null>(null);
  const [formDirty, setFormDirty] = useState(false);
  const [signOutConfirm, setSignOutConfirm] = useState(false);

  const refresh = useCallback(async (opts?: { bypassClientCache?: boolean }) => {
    const supabase = getSupabaseBrowser();
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    const token = session?.access_token;
    if (!token || !session.user.email) {
      setData(null);
      setMeReady(false);
      setRefreshing(false);
      setError(null);
      setLoading(false);
      return;
    }

    const email = session.user.email.toLowerCase();
    if (opts?.bypassClientCache) {
      clearHostMeCache(email);
    }
    const cached = opts?.bypassClientCache ? null : readHostMeCache(email);

    // Stale-while-revalidate: paint cache or keep current data; otherwise a
    // session placeholder so chrome can render while /api/host/me loads.
    if (cached) {
      setData((current) => current ?? cached);
      setMeReady(true);
      setLoading(false);
    } else if (!opts?.bypassClientCache) {
      setData((current) =>
        current ?? {
          user: {
            email,
            name:
              typeof session.user.user_metadata?.name === "string"
                ? session.user.user_metadata.name
                : null,
            bio: null,
            photoUrl: null,
            profileSlug: null,
            profilePublic: false,
          },
          pots: [],
        },
      );
      setLoading(false);
    }

    setRefreshing(true);
    try {
      const response = await hostFetch("/api/host/me");
      const json = (await response.json()) as HostMe & { error?: string };
      if (!response.ok) {
        throw new Error(json.error ?? "Could not load your account.");
      }
      setData(json);
      writeHostMeCache(email, json);
      setMeReady(true);
      setError(null);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  const applyMe = useCallback((updater: (prev: HostMe) => HostMe) => {
    setData((current) => {
      if (!current) return current;
      const next = updater(current);
      writeHostMeCache(current.user.email.toLowerCase(), next);
      return next;
    });
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
      setMeReady(false);
      setRefreshing(false);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  async function performSignOut() {
    setSigningOut(true);
    setSignOutConfirm(false);
    try {
      setFormDirty(false);
      const email = data?.user.email;
      if (email) clearHostMeCache(email);
      await getSupabaseBrowser().auth.signOut();
      // Full reload (not router.push) so no signed-in data survives in memory;
      // replace() also keeps the dashboard out of the back-button history.
      window.location.replace("/host");
    } catch {
      setSigningOut(false);
    }
  }

  function requestSignOut() {
    if (formDirty) {
      setSignOutConfirm(true);
      return;
    }
    void performSignOut();
  }

  const value: HostDashboardContextValue = {
    data,
    loading,
    meReady,
    refreshing,
    error,
    refresh,
    applyMe,
    signOut: requestSignOut,
    setFormDirty,
    formDirty,
  };

  if (loading && !data) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
        <span
          className="h-8 w-8 animate-spin rounded-full border-2 border-pvn-gold border-t-transparent"
          aria-hidden
        />
        <p className="font-nav text-xs font-bold tracking-[0.16em] text-pvn-navy/55 uppercase">
          Checking your session…
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <HostGate
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

  const firstName = data.user.name?.split(/\s+/)[0] ?? null;
  const unrepliedTotal = data.pots.reduce(
    (sum, pot) => sum + (pot.unrepliedCount ?? 0),
    0,
  );

  return (
    <HostDashboardContext.Provider value={value}>
      {/* Mobile: navigation and sign out live in the bottom bar's menu */}
      <div className="mb-6 lg:hidden">
        <p className="font-nav text-[0.6rem] font-bold tracking-[0.2em] text-pvn-gold uppercase">
          Host
        </p>
        <p className="mt-1 truncate font-display text-xl font-semibold text-pvn-navy">
          {firstName ? `Hello, ${firstName}` : "Your dashboard"}
        </p>
      </div>

      <div className="lg:grid lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-0 xl:grid-cols-[15rem_minmax(0,1fr)]">
        {/* Desktop rail — distinct panel so it reads as the tab strip */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 -ml-2 flex min-h-[32rem] flex-col overflow-hidden rounded-sm bg-pvn-navy text-pvn-cream shadow-[0_20px_50px_-28px_rgba(12,27,51,0.55)] xl:-ml-3">
            <div
              className="h-1 shrink-0 bg-gradient-to-r from-pvn-gold via-pvn-gold-light to-pvn-gold/40"
              aria-hidden
            />
            <div className="flex flex-1 flex-col px-5 py-7 xl:px-6 xl:py-8">
              <p className="font-nav text-[0.6rem] font-bold tracking-[0.2em] text-pvn-gold uppercase">
                Host
              </p>
              <p className="font-display mt-2 text-2xl leading-tight font-semibold text-pvn-cream">
                {firstName ? `Hello, ${firstName}` : "Welcome"}
              </p>
              <p className="mt-1.5 truncate text-xs text-pvn-cream/50">
                {data.user.email}
              </p>

              <DesktopNav unrepliedTotal={unrepliedTotal} />

              <div className="mt-auto space-y-3 border-t border-pvn-cream/12 pt-6">
                <Link
                  href="/host/pots/new"
                  className="font-nav inline-flex min-h-10 w-full items-center justify-center rounded-md bg-pvn-gold/95 px-3 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:bg-pvn-gold"
                >
                  Start a fundraiser
                </Link>
                <button
                  type="button"
                  onClick={() => requestSignOut()}
                  disabled={signingOut}
                  className="font-nav inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-pvn-cream/35 bg-pvn-cream/[0.08] px-3 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-cream uppercase transition hover:border-pvn-gold hover:bg-pvn-gold/15 hover:text-pvn-gold disabled:opacity-50"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  {signingOut ? "Signing out…" : "Sign out"}
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile bottom padding clears the fixed tab bar */}
        <div className="min-w-0 pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0 lg:pl-10 xl:pl-12">
          {data.user.mustSetPassword && !pathname.startsWith("/host/account") ? (
            <div className="mb-6 flex flex-col gap-3 rounded-sm border border-pvn-gold/40 bg-pvn-gold/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm leading-relaxed text-pvn-navy/80">
                <span className="font-semibold text-pvn-navy">
                  Set a password
                </span>{" "}
                so you can sign in on other devices.
              </p>
              <Link
                href="/host/account?tab=password"
                className="font-nav inline-flex min-h-9 shrink-0 items-center justify-center rounded-md bg-pvn-navy px-4 text-[0.6rem] font-bold tracking-[0.14em] text-pvn-cream uppercase transition hover:bg-pvn-navy/90"
              >
                Set password
              </Link>
            </div>
          ) : null}
          {children}
        </div>
      </div>

      <HostTabBar
        user={data.user}
        unrepliedTotal={unrepliedTotal}
        onSignOut={requestSignOut}
        signingOut={signingOut}
      />

      <ResultModal
        open={signOutConfirm}
        variant="confirm"
        title="Sign out with unsaved changes?"
        body="You have edits that have not been saved. Sign out anyway, or stay and finish saving."
        confirmLabel="Sign out"
        busy={signingOut}
        onConfirm={() => void performSignOut()}
        onClose={() => {
          if (!signingOut) setSignOutConfirm(false);
        }}
      />
    </HostDashboardContext.Provider>
  );
}
