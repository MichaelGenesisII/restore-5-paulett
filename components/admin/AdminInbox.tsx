"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useToast } from "@/components/toast/ToastProvider";
import { adminFetch } from "@/lib/admin-client";
import { CONTACT_TOPIC_LABELS } from "@/lib/contact-topics";
import {
  readHostClientCache,
  writeHostClientCache,
} from "@/lib/host-client-cache";
import { visitorSafeApiError, visitorSafeMessage } from "@/lib/visitor-safe";

type InboxMessage = {
  id: string;
  topic: string;
  topicLabel: string;
  name: string;
  email: string;
  preview: string;
  handled: boolean;
  createdAt: string;
};

type Filter = "open" | "done" | "all";

type InboxPayload = {
  messages: InboxMessage[];
  openCount: number;
  doneCount: number;
  page: number;
  totalPages: number;
  total: number;
};

const PAGE_SIZES = [20, 40, 60] as const;
const INBOX_CACHE_TTL_MS = 45_000;

const selectClass =
  "min-h-9 w-full rounded-sm border border-pvn-navy/15 bg-white px-2.5 py-1.5 text-sm text-pvn-navy focus:border-pvn-gold focus:ring-2 focus:ring-pvn-gold/30 focus:outline-none sm:w-auto";

function inboxCacheKey(
  page: number,
  filter: Filter,
  topic: string,
  q: string,
  pageSize: number,
) {
  return `admin-inbox:${filter}:${topic}:${q.trim().toLowerCase()}:${page}:${pageSize}`;
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function IconInboxEmpty({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 6h16v12H4z" />
      <path d="M4 10l8 5 8-5" />
    </svg>
  );
}

function AdminInboxSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading inbox…</span>
      <div className="relative overflow-hidden rounded-sm bg-pvn-navy px-4 py-4 sm:px-6 sm:py-5">
        <div className="h-2.5 w-14 animate-pulse rounded-sm bg-pvn-cream/15" />
        <div className="mt-2 h-7 w-24 animate-pulse rounded-sm bg-pvn-cream/20" />
        <div className="mt-2 h-3.5 w-full max-w-md animate-pulse rounded-sm bg-pvn-cream/10" />
        <div className="mt-4 flex gap-2">
          <div className="h-9 w-28 animate-pulse rounded-md bg-pvn-gold/40" />
          <div className="h-9 w-24 animate-pulse rounded-md bg-pvn-cream/10" />
        </div>
      </div>
      <div className="mt-6 flex gap-3 border-b border-pvn-navy/10 pb-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-4 w-16 animate-pulse rounded-sm bg-pvn-navy/10"
          />
        ))}
      </div>
      <ul className="mt-5 grid gap-2">
        {[0, 1, 2, 3].map((i) => (
          <li
            key={i}
            className="border border-pvn-navy/10 bg-white/55 px-4 py-3.5"
          >
            <div className="h-3 w-20 animate-pulse rounded-sm bg-pvn-navy/10" />
            <div className="mt-2 h-5 w-40 animate-pulse rounded-sm bg-pvn-navy/10" />
            <div className="mt-2 h-8 w-full animate-pulse rounded-sm bg-pvn-navy/6" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Contact form queue — Host-style hero, status tabs, clickable rows.
 */
export function AdminInbox() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [doneCount, setDoneCount] = useState(0);
  const [filter, setFilter] = useState<Filter>("open");
  const [topic, setTopic] = useState("ALL");
  const [draftQ, setDraftQ] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(40);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const applyPayload = useCallback((payload: InboxPayload) => {
    setMessages(payload.messages);
    setOpenCount(payload.openCount);
    setDoneCount(payload.doneCount);
    setPage(payload.page);
    setTotalPages(payload.totalPages);
    setTotal(payload.total);
  }, []);

  const load = useCallback(
    async (
      nextPage: number,
      nextFilter: Filter,
      nextTopic: string,
      nextQ: string,
      nextSize: number,
      soft: boolean,
    ) => {
      const cacheKey = inboxCacheKey(
        nextPage,
        nextFilter,
        nextTopic,
        nextQ,
        nextSize,
      );
      const cached = readHostClientCache<InboxPayload>(
        cacheKey,
        INBOX_CACHE_TTL_MS,
      );
      if (cached) {
        applyPayload(cached);
        setLoading(false);
        setRefreshing(true);
      } else if (soft) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const params = new URLSearchParams({
        filter: nextFilter,
        page: String(nextPage),
        pageSize: String(nextSize),
      });
      if (nextTopic !== "ALL") params.set("topic", nextTopic);
      if (nextQ.trim()) params.set("q", nextQ.trim());

      const response = await adminFetch(`/api/admin/inbox?${params}`);
      const json = (await response.json()) as InboxPayload & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(
          visitorSafeApiError(
            response.status,
            json.error,
            "We could not load the inbox.",
          ),
        );
      }
      const payload: InboxPayload = {
        messages: json.messages ?? [],
        openCount: json.openCount ?? 0,
        doneCount: json.doneCount ?? 0,
        page: json.page ?? nextPage,
        totalPages: json.totalPages ?? 1,
        total: json.total ?? 0,
      };
      applyPayload(payload);
      writeHostClientCache(cacheKey, payload);
      setLoading(false);
      setRefreshing(false);
    },
    [applyPayload],
  );

  useEffect(() => {
    let cancelled = false;
    const soft = Boolean(
      readHostClientCache(
        inboxCacheKey(1, filter, topic, q, pageSize),
        INBOX_CACHE_TTL_MS,
      ),
    );
    // load() paints the sessionStorage cache before revalidating; that first
    // render from an external store is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(1, filter, topic, q, pageSize, soft).catch((err) => {
      if (cancelled) return;
      toast.error(
        "Inbox unavailable",
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Please try again.",
        ),
      );
      setLoading(false);
      setRefreshing(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pageSize via changePageSize
  }, [filter, topic, q, load, toast]);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    setQ(draftQ.trim());
  }

  function clearSearchAndFilters() {
    setDraftQ("");
    setQ("");
    setTopic("ALL");
    setFilter("open");
  }

  function goPage(nextPage: number) {
    if (nextPage < 1 || nextPage > totalPages) return;
    void load(nextPage, filter, topic, q, pageSize, true).catch((err) => {
      toast.error(
        "Inbox unavailable",
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Please try again.",
        ),
      );
      setRefreshing(false);
    });
  }

  function changePageSize(size: number) {
    setPageSize(size);
    void load(1, filter, topic, q, size, true).catch((err) => {
      toast.error(
        "Inbox unavailable",
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Please try again.",
        ),
      );
      setRefreshing(false);
    });
  }

  const tabs: Array<{ id: Filter; label: string; count: number }> = [
    { id: "open", label: "Open", count: openCount },
    { id: "done", label: "Done", count: doneCount },
    { id: "all", label: "All", count: openCount + doneCount },
  ];

  const hasQueryOrTopic = q.trim() !== "" || topic !== "ALL";
  const showOldestOpen =
    openCount > 0 && filter === "open" && Boolean(messages[0]);

  if (loading && messages.length === 0) {
    return <AdminInboxSkeleton />;
  }

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

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 max-w-xl">
            <p className="font-nav text-[0.6rem] font-bold tracking-[0.18em] text-pvn-gold uppercase">
              Inbox
            </p>
            <h1 className="font-display mt-0.5 text-xl font-semibold text-balance sm:text-2xl">
              {openCount > 0 ? "Needs a reply" : "Caught up"}
            </h1>
            <p className="mt-1 text-sm leading-snug text-pvn-cream/70">
              {openCount > 0
                ? `${openCount} open ${openCount === 1 ? "message" : "messages"} — reply by email, then mark done.`
                : "No open contact messages. New forms land here."}
              {refreshing ? (
                <span className="ml-2 inline-block h-3 w-3 animate-spin rounded-full border border-pvn-gold border-t-transparent align-middle" />
              ) : null}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {showOldestOpen ? (
              <Link
                href={`/admin/inbox/${messages[0]!.id}`}
                className="font-nav inline-flex min-h-9 items-center rounded-md bg-pvn-gold px-3.5 text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light"
              >
                Oldest open →
              </Link>
            ) : openCount > 0 ? (
              <button
                type="button"
                onClick={() => setFilter("open")}
                className="font-nav inline-flex min-h-9 items-center rounded-md bg-pvn-gold px-3.5 text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light"
              >
                Show open · {openCount}
              </button>
            ) : (
              <Link
                href="/admin"
                className="font-nav inline-flex min-h-9 items-center rounded-md bg-pvn-gold px-3.5 text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light"
              >
                Overview
              </Link>
            )}
            {openCount > 0 ? (
              <Link
                href="/admin"
                className="font-nav inline-flex min-h-9 items-center rounded-md border border-pvn-cream/30 px-3 text-[0.65rem] font-bold tracking-[0.12em] text-pvn-cream uppercase transition hover:border-pvn-gold hover:text-pvn-gold"
              >
                Overview
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <nav
        className="mt-6 flex gap-1 overflow-x-auto border-b border-pvn-navy/10 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Inbox status"
      >
        {tabs.map((tab) => {
          const active = filter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`font-nav relative -mb-px shrink-0 border-b-2 px-3.5 py-2.5 text-[0.7rem] font-bold tracking-[0.14em] uppercase transition sm:px-4 ${
                active
                  ? "border-pvn-gold text-pvn-navy"
                  : "border-transparent text-pvn-navy/45 hover:text-pvn-navy"
              }`}
            >
              {tab.label}
              <span
                className={`ml-1.5 ${active ? "text-pvn-gold" : "text-pvn-navy/35"}`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </nav>

      <form
        onSubmit={onSearch}
        className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center"
      >
        <input
          type="search"
          value={draftQ}
          onChange={(e) => setDraftQ(e.target.value)}
          placeholder="Search name, email, or message…"
          className="w-full flex-1 rounded-sm border border-pvn-navy/15 bg-white px-3.5 py-2.5 text-sm text-pvn-navy placeholder:text-pvn-navy/40 focus:border-pvn-gold focus:ring-2 focus:ring-pvn-gold/30 focus:outline-none"
        />
        <div className="flex gap-2">
          <select
            className="min-h-10 min-w-0 flex-1 rounded-sm border border-pvn-navy/15 bg-white px-2.5 py-2 text-sm text-pvn-navy focus:border-pvn-gold focus:ring-2 focus:ring-pvn-gold/30 focus:outline-none sm:w-48 sm:flex-none"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            aria-label="Topic"
          >
            <option value="ALL">All topics</option>
            {Object.entries(CONTACT_TOPIC_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="font-nav inline-flex min-h-10 shrink-0 items-center justify-center rounded-md bg-pvn-navy px-4 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-cream uppercase transition hover:bg-pvn-navy/90 sm:px-5"
          >
            Search
          </button>
        </div>
      </form>

      {messages.length === 0 ? (
        <div className="mx-auto mt-8 flex min-h-[32vh] max-w-lg flex-col items-center justify-center border border-dashed border-pvn-navy/15 bg-gradient-to-b from-pvn-cream/80 to-white px-5 py-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-pvn-navy/[0.06] text-pvn-navy/45">
            <IconInboxEmpty className="h-7 w-7" />
          </span>
          {hasQueryOrTopic || filter !== "open" ? (
            <>
              <h2 className="font-display mt-5 text-2xl font-semibold text-pvn-navy">
                No messages here
              </h2>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-pvn-navy/60">
                Nothing matches this view. Try another status, topic, or clear
                search.
              </p>
              <button
                type="button"
                onClick={clearSearchAndFilters}
                className="font-nav mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-pvn-navy px-5 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-cream uppercase"
              >
                Show open messages
              </button>
            </>
          ) : (
            <>
              <h2 className="font-display mt-5 text-2xl font-semibold text-pvn-navy">
                You’re caught up
              </h2>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-pvn-navy/60">
                No open contact messages. New submissions from the public
                contact form will appear here.
              </p>
              <Link
                href="/admin"
                className="font-nav mt-6 inline-flex min-h-11 items-center justify-center rounded-md border border-pvn-navy/15 bg-white px-5 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-navy uppercase"
              >
                Back to overview
              </Link>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="mt-6 overflow-x-auto border border-pvn-navy/10 bg-white">
            <div
              className="font-nav grid min-w-[40rem] grid-cols-[8.5rem_9rem_minmax(7rem,0.9fr)_minmax(10rem,1.2fr)_2rem] gap-3 border-b border-pvn-navy/10 bg-pvn-cream/60 px-3 py-2.5 text-[0.6rem] font-bold tracking-[0.14em] text-pvn-navy/50 uppercase sm:px-4"
              aria-hidden
            >
              <span>When</span>
              <span>Topic</span>
              <span>From</span>
              <span>Email</span>
              <span className="sr-only">Open</span>
            </div>
            <ul className="min-w-[40rem] divide-y divide-pvn-navy/8">
              {messages.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/admin/inbox/${m.id}`}
                    className={`group grid grid-cols-[8.5rem_9rem_minmax(7rem,0.9fr)_minmax(10rem,1.2fr)_2rem] items-center gap-3 px-3 py-3 transition hover:bg-pvn-cream/50 sm:px-4 ${
                      m.handled ? "opacity-70" : ""
                    }`}
                  >
                    <span className="truncate text-sm text-pvn-navy/70">
                      {formatWhen(m.createdAt)}
                      {m.handled ? (
                        <span className="mt-0.5 block text-[0.65rem] text-pvn-navy/35">
                          Done
                        </span>
                      ) : null}
                    </span>
                    <span className="font-nav truncate text-[0.6rem] font-bold tracking-[0.1em] text-pvn-gold uppercase">
                      {m.topicLabel}
                    </span>
                    <span className="truncate text-sm font-medium text-pvn-navy">
                      {m.name}
                    </span>
                    <span className="truncate text-sm text-pvn-navy/65">
                      {m.email}
                    </span>
                    <span
                      className="font-nav text-[0.6rem] font-bold tracking-[0.1em] text-pvn-gold uppercase opacity-0 transition group-hover:opacity-100"
                      aria-hidden
                    >
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-pvn-navy/10 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || refreshing}
                onClick={() => goPage(page - 1)}
                className="font-nav min-h-9 rounded-md border border-pvn-navy/15 bg-white px-3 text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy uppercase disabled:opacity-35"
              >
                ← Prev
              </button>
              <p className="font-nav text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy/50 uppercase">
                Page {page} of {totalPages}
                <span className="text-pvn-navy/35"> · {total} total</span>
              </p>
              <button
                type="button"
                disabled={page >= totalPages || refreshing}
                onClick={() => goPage(page + 1)}
                className="font-nav min-h-9 rounded-md border border-pvn-navy/15 bg-white px-3 text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy uppercase disabled:opacity-35"
              >
                Next →
              </button>
            </div>
            <label className="flex items-center gap-2 text-sm text-pvn-navy/60">
              <span className="font-nav text-[0.6rem] font-bold tracking-[0.12em] uppercase">
                Per page
              </span>
              <select
                className={selectClass}
                value={pageSize}
                onChange={(e) => changePageSize(Number(e.target.value))}
                aria-label="Rows per page"
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </>
      )}
    </div>
  );
}
