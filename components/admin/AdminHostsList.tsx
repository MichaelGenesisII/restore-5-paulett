"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AdminImageFrame } from "@/components/admin/AdminImageFrame";
import { useToast } from "@/components/toast/ToastProvider";
import { adminFetch } from "@/lib/admin-client";
import {
  readHostClientCache,
  writeHostClientCache,
} from "@/lib/host-client-cache";
import { formatWholeGbp } from "@/lib/money";
import { visitorSafeApiError, visitorSafeMessage } from "@/lib/visitor-safe";

type HostRow = {
  id: string;
  name: string;
  email: string;
  profileSlug: string | null;
  profilePublic: boolean;
  photoUrl: string | null;
  isAlumni: boolean;
  potCount: number;
  livePots: number;
  totalRaised: number;
  createdAt: string;
};

type AlumniFilter = "ALL" | "true" | "false";

type FilterCounts = {
  ALL: number;
  alumni: number;
  nonAlumni: number;
};

type HostsPayload = {
  hosts: HostRow[];
  page: number;
  totalPages: number;
  total: number;
  filterCounts: FilterCounts;
};

const PAGE_SIZES = [20, 40, 60] as const;
const HOSTS_CACHE_TTL_MS = 45_000;

const DEFAULT_COUNTS: FilterCounts = {
  ALL: 0,
  alumni: 0,
  nonAlumni: 0,
};

const ALUMNI_TABS: Array<{
  id: AlumniFilter;
  label: string;
  countKey: keyof FilterCounts;
}> = [
  { id: "ALL", label: "All", countKey: "ALL" },
  { id: "true", label: "Alumni", countKey: "alumni" },
  { id: "false", label: "Non-alumni", countKey: "nonAlumni" },
];

const selectClass =
  "min-h-9 w-full rounded-sm border border-pvn-navy/15 bg-white px-2.5 py-1.5 text-sm text-pvn-navy focus:border-pvn-gold focus:ring-2 focus:ring-pvn-gold/30 focus:outline-none sm:w-auto";

function hostsCacheKey(
  page: number,
  alumni: AlumniFilter,
  q: string,
  pageSize: number,
) {
  return `admin-hosts:${alumni}:${q.trim().toLowerCase()}:${page}:${pageSize}`;
}

function IconHostsEmpty({ className }: { className?: string }) {
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
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 19c0-3 2.5-5 6-5s6 2 6 5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M21 19c0-2.2-1.6-3.8-4-4.3" />
    </svg>
  );
}

function AdminHostsSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading hosts…</span>
      <div className="relative overflow-hidden rounded-sm bg-pvn-navy px-4 py-4 sm:px-6 sm:py-5">
        <div className="h-2.5 w-14 animate-pulse rounded-sm bg-pvn-cream/15" />
        <div className="mt-2 h-7 w-28 animate-pulse rounded-sm bg-pvn-cream/20" />
        <div className="mt-2 h-3.5 w-full max-w-md animate-pulse rounded-sm bg-pvn-cream/10" />
      </div>
      <div className="mt-6 flex gap-3 border-b border-pvn-navy/10 pb-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-4 w-16 animate-pulse rounded-sm bg-pvn-navy/10"
          />
        ))}
      </div>
      <div className="mt-5 space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center gap-3 border border-pvn-navy/10 bg-white/55 px-4 py-3"
          >
            <div className="h-10 w-10 shrink-0 animate-pulse rounded-sm bg-pvn-navy/10" />
            <div className="h-4 w-40 animate-pulse rounded-sm bg-pvn-navy/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Fundraisers list — Host-style hero, alumni tabs, clickable rows.
 */
export function AdminHostsList() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hosts, setHosts] = useState<HostRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(40);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [alumni, setAlumni] = useState<AlumniFilter>("ALL");
  const [draftQ, setDraftQ] = useState("");
  const [q, setQ] = useState("");
  const [filterCounts, setFilterCounts] =
    useState<FilterCounts>(DEFAULT_COUNTS);

  const applyPayload = useCallback((payload: HostsPayload) => {
    setHosts(payload.hosts);
    setPage(payload.page);
    setTotalPages(payload.totalPages);
    setTotal(payload.total);
    setFilterCounts(payload.filterCounts ?? DEFAULT_COUNTS);
  }, []);

  const load = useCallback(
    async (
      nextPage: number,
      nextAlumni: AlumniFilter,
      nextQ: string,
      nextSize: number,
      soft: boolean,
    ) => {
      const cacheKey = hostsCacheKey(nextPage, nextAlumni, nextQ, nextSize);
      const cached = readHostClientCache<HostsPayload>(
        cacheKey,
        HOSTS_CACHE_TTL_MS,
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
        page: String(nextPage),
        pageSize: String(nextSize),
      });
      if (nextAlumni !== "ALL") params.set("alumni", nextAlumni);
      if (nextQ.trim()) params.set("q", nextQ.trim());

      const response = await adminFetch(`/api/admin/hosts?${params}`);
      const json = (await response.json()) as HostsPayload & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(
          visitorSafeApiError(
            response.status,
            json.error,
            "We could not load hosts.",
          ),
        );
      }
      const payload: HostsPayload = {
        hosts: json.hosts ?? [],
        page: json.page ?? nextPage,
        totalPages: json.totalPages ?? 1,
        total: json.total ?? 0,
        filterCounts: json.filterCounts ?? DEFAULT_COUNTS,
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
        hostsCacheKey(1, alumni, q, pageSize),
        HOSTS_CACHE_TTL_MS,
      ),
    );
    // load() paints the sessionStorage cache before revalidating; that first
    // render from an external store is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(1, alumni, q, pageSize, soft).catch((err) => {
      if (cancelled) return;
      toast.error(
        "Hosts unavailable",
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
  }, [load, alumni, q, toast]);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    setQ(draftQ.trim());
  }

  function clearFilters() {
    setDraftQ("");
    setQ("");
    setAlumni("ALL");
  }

  function goPage(nextPage: number) {
    if (nextPage < 1 || nextPage > totalPages) return;
    void load(nextPage, alumni, q, pageSize, true).catch((err) => {
      toast.error(
        "Hosts unavailable",
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
    void load(1, alumni, q, size, true).catch((err) => {
      toast.error(
        "Hosts unavailable",
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Please try again.",
        ),
      );
      setRefreshing(false);
    });
  }

  const filtersActive = alumni !== "ALL" || q.trim() !== "";
  const alumniCount = filterCounts.alumni;

  if (loading && hosts.length === 0) {
    return <AdminHostsSkeleton />;
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
              People
            </p>
            <h1 className="font-display mt-0.5 text-xl font-semibold text-balance sm:text-2xl">
              Hosts
            </h1>
            <p className="mt-1 text-sm leading-snug text-pvn-cream/70">
              {total} {total === 1 ? "host" : "hosts"}
              {alumniCount > 0 ? (
                <>
                  <span className="text-pvn-cream/30"> · </span>
                  {alumniCount} alumni
                </>
              ) : null}
              {refreshing ? (
                <span className="ml-2 inline-block h-3 w-3 animate-spin rounded-full border border-pvn-gold border-t-transparent align-middle" />
              ) : null}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/pots"
              className="font-nav inline-flex min-h-9 items-center rounded-md bg-pvn-gold px-3.5 text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light"
            >
              Fundraisers
            </Link>
            <Link
              href="/admin"
              className="font-nav inline-flex min-h-9 items-center rounded-md border border-pvn-cream/30 px-3 text-[0.65rem] font-bold tracking-[0.12em] text-pvn-cream uppercase transition hover:border-pvn-gold hover:text-pvn-gold"
            >
              Overview
            </Link>
          </div>
        </div>
      </div>

      <nav
        className="mt-6 flex gap-1 overflow-x-auto border-b border-pvn-navy/10 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Host filter"
      >
        {ALUMNI_TABS.map((t) => {
          const active = alumni === t.id;
          const count = filterCounts[t.countKey] ?? 0;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setAlumni(t.id)}
              className={`font-nav relative -mb-px shrink-0 border-b-2 px-3.5 py-2.5 text-[0.7rem] font-bold tracking-[0.14em] uppercase transition sm:px-4 ${
                active
                  ? "border-pvn-gold text-pvn-navy"
                  : "border-transparent text-pvn-navy/45 hover:text-pvn-navy"
              }`}
            >
              {t.label}
              <span
                className={`ml-1.5 ${active ? "text-pvn-gold" : "text-pvn-navy/35"}`}
              >
                {count}
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
          placeholder="Search name, email, or profile…"
          className="w-full flex-1 rounded-sm border border-pvn-navy/15 bg-white px-3.5 py-2.5 text-sm text-pvn-navy placeholder:text-pvn-navy/40 focus:border-pvn-gold focus:ring-2 focus:ring-pvn-gold/30 focus:outline-none"
        />
        <button
          type="submit"
          className="font-nav inline-flex min-h-10 shrink-0 items-center justify-center rounded-md bg-pvn-navy px-4 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-cream uppercase transition hover:bg-pvn-navy/90 sm:px-5"
        >
          Search
        </button>
      </form>

      {hosts.length === 0 ? (
        <div className="mx-auto mt-8 flex min-h-[32vh] max-w-lg flex-col items-center justify-center border border-dashed border-pvn-navy/15 bg-gradient-to-b from-pvn-cream/80 to-white px-5 py-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-pvn-navy/[0.06] text-pvn-navy/45">
            <IconHostsEmpty className="h-7 w-7" />
          </span>
          {filtersActive ? (
            <>
              <h2 className="font-display mt-5 text-2xl font-semibold text-pvn-navy">
                No matching hosts
              </h2>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-pvn-navy/60">
                Nothing matches this filter or search.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="font-nav mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-pvn-navy px-5 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-cream uppercase"
              >
                Clear filters
              </button>
            </>
          ) : (
            <>
              <h2 className="font-display mt-5 text-2xl font-semibold text-pvn-navy">
                No hosts yet
              </h2>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-pvn-navy/60">
                Hosts appear here when someone creates a fundraiser.
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
              className="font-nav grid min-w-[44rem] grid-cols-[minmax(11rem,1.2fr)_minmax(10rem,1.1fr)_5rem_5.5rem_2rem] gap-3 border-b border-pvn-navy/10 bg-pvn-cream/60 px-3 py-2.5 text-[0.6rem] font-bold tracking-[0.14em] text-pvn-navy/50 uppercase sm:px-4"
              aria-hidden
            >
              <span>Name</span>
              <span>Email</span>
              <span className="min-w-0 truncate">Fundraisers</span>
              <span>Raised</span>
              <span className="sr-only">Open</span>
            </div>
            <ul className="min-w-[44rem] divide-y divide-pvn-navy/8">
              {hosts.map((h) => (
                <li key={h.id}>
                  <Link
                    href={`/admin/hosts/${h.id}`}
                    className="group grid grid-cols-[minmax(11rem,1.2fr)_minmax(10rem,1.1fr)_5rem_5.5rem_2rem] items-center gap-3 px-3 py-3 transition hover:bg-pvn-cream/50 sm:px-4"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <AdminImageFrame
                        src={h.photoUrl}
                        alt=""
                        variant="avatar"
                        size="sm"
                        label="No photo"
                      />
                      <span className="min-w-0 truncate text-sm font-medium text-pvn-navy">
                        {h.name}
                        {h.isAlumni ? (
                          <span className="ml-1.5 text-pvn-navy/40">
                            · Alumni
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <span className="truncate text-sm text-pvn-navy/65">
                      {h.email}
                    </span>
                    <span className="text-sm text-pvn-navy">{h.potCount}</span>
                    <span className="whitespace-nowrap text-sm text-pvn-navy">
                      {formatWholeGbp(h.totalRaised)}
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
