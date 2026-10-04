"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { HostEmptyState } from "@/components/host/HostEmptyState";
import { HostPotStatusChip } from "@/components/host/HostPotStatusChip";
import { useHostDashboard } from "@/components/host/HostDashboardShell";
import { useToast } from "@/components/toast/ToastProvider";
import { hostFetch } from "@/lib/host-client";
import {
  readHostClientCache,
  writeHostClientCache,
} from "@/lib/host-client-cache";
import { formatWholeGbp } from "@/lib/money";
import { visitorSafeApiError, visitorSafeMessage } from "@/lib/visitor-safe";

type InboxMessage = {
  id: string;
  potSlug: string;
  potTitle: string;
  potStatus: string;
  donorName: string | null;
  amount: number;
  message: string | null;
  commentHidden: boolean;
  isAnonymous: boolean;
  createdAt: string;
};

type Filter = "all" | "hidden" | string;

const INBOX_CACHE_TTL_MS = 60_000;

function inboxCacheKey(email: string) {
  return `inbox:${email}`;
}

function donorLabel(item: InboxMessage) {
  if (item.isAnonymous || !item.donorName?.trim()) return "Anonymous";
  return item.donorName.trim();
}

function donorInitial(item: InboxMessage) {
  const name = donorLabel(item);
  if (name === "Anonymous") return "A";
  return name.charAt(0).toUpperCase();
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function clipMessage(text: string, max = 160) {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trimEnd()}…`;
}

function HostInboxSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading inbox…</span>
      <div className="relative overflow-hidden rounded-sm bg-pvn-navy px-4 py-4 sm:px-6 sm:py-5">
        <div className="h-2.5 w-14 animate-pulse rounded-sm bg-pvn-cream/15" />
        <div className="mt-2 h-7 w-28 animate-pulse rounded-sm bg-pvn-cream/20" />
        <div className="mt-2 h-3.5 w-full max-w-md animate-pulse rounded-sm bg-pvn-cream/10" />
      </div>
      <div className="mt-6 flex gap-3 border-b border-pvn-navy/10 pb-3">
        <div className="h-4 w-12 animate-pulse rounded-sm bg-pvn-navy/10" />
        <div className="h-4 w-24 animate-pulse rounded-sm bg-pvn-navy/10" />
        <div className="h-4 w-20 animate-pulse rounded-sm bg-pvn-navy/10" />
      </div>
      <ul className="mt-5 grid gap-2">
        {[0, 1, 2].map((i) => (
          <li
            key={i}
            className="flex gap-3 border border-pvn-navy/10 bg-white/55 p-3 sm:gap-4 sm:p-3.5"
          >
            <div className="h-10 w-10 shrink-0 animate-pulse rounded-sm bg-pvn-navy/10" />
            <div className="min-w-0 flex-1">
              <div className="h-5 w-36 animate-pulse rounded-sm bg-pvn-navy/10" />
              <div className="mt-2 h-3.5 w-28 animate-pulse rounded-sm bg-pvn-navy/8" />
              <div className="mt-2.5 h-8 w-full animate-pulse rounded-sm bg-pvn-navy/6" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Cross-pot thank-you queue — unreplied gift messages, oldest first.
 */
export function HostInbox() {
  const toast = useToast();
  const { data: dashboard, meReady } = useHostDashboard();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [ready, setReady] = useState(false);

  const unrepliedFromMe = useMemo(
    () =>
      dashboard?.pots.reduce((sum, pot) => sum + (pot.unrepliedCount ?? 0), 0) ??
      null,
    [dashboard],
  );

  const load = useCallback(async () => {
    const email = dashboard?.user.email?.toLowerCase();
    if (!email || !meReady) return;

    // Instant empty when Overview already says nothing is waiting.
    if (unrepliedFromMe === 0) {
      setMessages([]);
      writeHostClientCache(inboxCacheKey(email), [] as InboxMessage[]);
      setLoading(false);
      setReady(true);
      return;
    }

    const cached = readHostClientCache<InboxMessage[]>(
      inboxCacheKey(email),
      INBOX_CACHE_TTL_MS,
    );
    if (cached) {
      setMessages(cached);
      setLoading(false);
      setReady(true);
    }

    const response = await hostFetch("/api/host/inbox");
    const json = (await response.json()) as {
      messages?: InboxMessage[];
      error?: string;
    };
    if (!response.ok) {
      throw new Error(
        visitorSafeApiError(
          response.status,
          json.error,
          "We could not load your inbox.",
        ),
      );
    }
    const next = json.messages ?? [];
    setMessages(next);
    writeHostClientCache(inboxCacheKey(email), next);
    setLoading(false);
    setReady(true);
  }, [dashboard?.user.email, meReady, unrepliedFromMe]);

  useEffect(() => {
    if (!meReady) return;
    let cancelled = false;
    // load() paints the sessionStorage cache (or a known-empty inbox) before
    // revalidating; that first render from an external store is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().catch((err) => {
      if (cancelled) return;
      toast.error(
        "Inbox unavailable",
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Please try again.",
        ),
      );
      setLoading(false);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [load, meReady, toast]);

  const potFilters = useMemo(() => {
    const map = new Map<string, { slug: string; title: string; count: number }>();
    for (const m of messages) {
      const row = map.get(m.potSlug);
      if (row) row.count += 1;
      else map.set(m.potSlug, { slug: m.potSlug, title: m.potTitle, count: 1 });
    }
    return [...map.values()];
  }, [messages]);

  const hiddenCount = useMemo(
    () => messages.filter((m) => m.commentHidden).length,
    [messages],
  );

  const visible = useMemo(() => {
    if (filter === "all") return messages;
    if (filter === "hidden") return messages.filter((m) => m.commentHidden);
    return messages.filter((m) => m.potSlug === filter);
  }, [filter, messages]);

  const filters: Array<{ id: Filter; label: string; count: number }> = [
    { id: "all", label: "All", count: messages.length },
    ...potFilters.map((p) => ({
      id: p.slug as Filter,
      label: p.title,
      count: p.count,
    })),
    ...(hiddenCount > 0
      ? [{ id: "hidden" as Filter, label: "Hidden", count: hiddenCount }]
      : []),
  ];

  if (!meReady || (loading && !ready && messages.length === 0)) {
    return <HostInboxSkeleton />;
  }

  const waiting = messages.length;

  return (
    <div className="w-full">
      <div className="relative overflow-hidden rounded-sm bg-pvn-navy px-4 py-4 text-pvn-cream sm:px-6 sm:py-5">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          aria-hidden
          style={{
            backgroundImage: `
              linear-gradient(335deg, #c9a84c 16px, transparent 16px),
              linear-gradient(155deg, #c9a84c 16px, transparent 16px)
            `,
            backgroundSize: "44px 44px",
            backgroundPosition: "0 0, 22px 0",
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pvn-gold/70 to-transparent"
          aria-hidden
        />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 max-w-xl">
            <p className="font-nav text-[0.6rem] font-bold tracking-[0.18em] text-pvn-gold uppercase">
              Inbox
            </p>
            <h1 className="font-display mt-0.5 text-xl font-semibold sm:text-2xl">
              {waiting === 0
                ? "All caught up"
                : waiting === 1
                  ? "1 thank-you waiting"
                  : `${waiting} thank-yous waiting`}
            </h1>
            <p className="mt-1 text-sm leading-snug text-pvn-cream/70">
              Oldest unreplied gift messages first. Tap a card to reply on the
              fundraiser.
            </p>
          </div>
          {waiting > 0 ? (
            <p className="font-nav w-fit rounded-sm border border-pvn-gold/45 bg-pvn-gold/15 px-3 py-1.5 text-[0.6rem] font-bold tracking-[0.14em] text-pvn-gold uppercase">
              {waiting} waiting
            </p>
          ) : null}
        </div>
      </div>

      {waiting === 0 ? (
        <HostEmptyState
          title="Nothing in the queue"
          body="When someone leaves words with a gift, they land here — oldest first."
          actionHref="/host/pots"
          actionLabel="View your fundraisers"
        />
      ) : (
        <>
          <nav
            className="mt-6 flex gap-0 overflow-x-auto overscroll-x-contain border-b border-pvn-navy/10 [-ms-overflow-style:none] [scrollbar-width:none] sm:mt-8 sm:gap-1 [&::-webkit-scrollbar]:hidden"
            aria-label="Filter inbox"
          >
            {filters.map((item) => {
              const active = filter === item.id;
              return (
                <button
                  key={String(item.id)}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  className={`font-nav relative -mb-px min-h-10 shrink-0 border-b-2 px-3 py-2 text-[0.65rem] font-bold tracking-[0.12em] uppercase transition sm:px-3.5 ${
                    active
                      ? "border-pvn-gold text-pvn-navy"
                      : "border-transparent text-pvn-navy/45 hover:text-pvn-navy"
                  }`}
                >
                  <span className="max-w-[9rem] truncate sm:max-w-none">
                    {item.label}
                  </span>
                  <span
                    className={`ml-1.5 ${active ? "text-pvn-gold" : "text-pvn-navy/35"}`}
                  >
                    {item.count}
                  </span>
                </button>
              );
            })}
          </nav>

          {visible.length === 0 ? (
            <p className="mt-8 text-sm text-pvn-navy/55">
              Nothing in this filter.
            </p>
          ) : (
            <ul className="mt-5 grid gap-2">
              {visible.map((item, index) => {
                const name = donorLabel(item);
                const when = formatWhen(item.createdAt);
                const initial = donorInitial(item);

                return (
                  <li
                    key={item.id}
                    className="animate-[pvn-rise_0.45s_ease-out_both]"
                    style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                  >
                    <Link
                      href={`/host/pots/${item.potSlug}#messages`}
                      className="group relative flex gap-3 overflow-hidden border border-pvn-navy/10 bg-white/55 p-3 transition duration-300 ease-out hover:-translate-y-0.5 hover:border-pvn-gold/45 hover:bg-white hover:shadow-[0_14px_28px_-18px_rgba(12,27,51,0.45)] sm:gap-4 sm:p-3.5"
                    >
                      <span
                        className="pointer-events-none absolute inset-y-0 left-0 w-0.5 origin-top scale-y-0 bg-pvn-gold transition duration-300 ease-out group-hover:scale-y-100"
                        aria-hidden
                      />
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-pvn-navy text-sm font-semibold text-pvn-cream"
                        aria-hidden
                      >
                        {initial}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-display truncate text-lg font-semibold text-pvn-navy transition duration-300 group-hover:text-pvn-gold">
                              {name}
                            </p>
                            <p className="mt-0.5 text-sm text-pvn-navy/50">
                              {formatWholeGbp(item.amount)}
                              <span className="text-pvn-navy/30"> · </span>
                              {when}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                            <HostPotStatusChip status={item.potStatus} />
                            {item.commentHidden ? (
                              <span className="font-nav text-[0.55rem] font-bold tracking-[0.12em] text-amber-800/80 uppercase">
                                Hidden
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <p className="font-nav mt-1.5 truncate text-[0.55rem] font-bold tracking-[0.12em] text-pvn-navy/40 uppercase">
                          {item.potTitle}
                        </p>

                        {item.message ? (
                          <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-pvn-navy/70">
                            {clipMessage(item.message)}
                          </p>
                        ) : null}

                        <p className="font-nav mt-2 text-[0.6rem] font-bold tracking-[0.12em] text-pvn-gold uppercase opacity-0 transition duration-300 group-hover:opacity-100">
                          Reply on fundraiser →
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
