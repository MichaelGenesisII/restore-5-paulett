"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { AdminDonationStatusChip } from "@/components/admin/AdminDonationStatusChip";
import { ResultModal } from "@/components/ResultModal";
import { useToast } from "@/components/toast/ToastProvider";
import { adminFetch } from "@/lib/admin-client";
import {
  clearHostClientCache,
  readHostClientCache,
  writeHostClientCache,
} from "@/lib/host-client-cache";
import { formatTidyGbp } from "@/lib/money";
import { visitorSafeApiError, visitorSafeMessage } from "@/lib/visitor-safe";

type GiftRow = {
  id: string;
  amount: number;
  status: string;
  donorName: string | null;
  donorEmail: string | null;
  isAnonymous: boolean;
  message: string | null;
  isRecurring: boolean;
  giftAid: boolean;
  paymentMethod: string;
  createdAt: string;
  destination: "POT" | "DIRECT";
  pot: { slug: string; title: string } | null;
};

type StatusCounts = {
  ALL: number;
  PENDING: number;
  SUCCEEDED: number;
  FAILED: number;
  REFUNDED: number;
};

type Filters = {
  status: string;
  destination: string;
  paymentMethod: string;
  giftAid: string;
  recurring: string;
  q: string;
};

type GiftsPayload = {
  gifts: GiftRow[];
  page: number;
  totalPages: number;
  total: number;
  statusCounts: StatusCounts;
};

const DEFAULT_FILTERS: Filters = {
  status: "ALL",
  destination: "ALL",
  paymentMethod: "ALL",
  giftAid: "ALL",
  recurring: "ALL",
  q: "",
};

const DEFAULT_COUNTS: StatusCounts = {
  ALL: 0,
  PENDING: 0,
  SUCCEEDED: 0,
  FAILED: 0,
  REFUNDED: 0,
};

const PAGE_SIZES = [20, 40, 60] as const;
const GIFTS_CACHE_TTL_MS = 45_000;

const STATUS_TABS: Array<{ id: string; label: string }> = [
  { id: "ALL", label: "All" },
  { id: "SUCCEEDED", label: "Succeeded" },
  { id: "PENDING", label: "Pending" },
  { id: "FAILED", label: "Failed" },
  { id: "REFUNDED", label: "Refunded" },
];

function filtersAreActive(f: Filters) {
  return (
    f.status !== "ALL" ||
    f.destination !== "ALL" ||
    f.paymentMethod !== "ALL" ||
    f.giftAid !== "ALL" ||
    f.recurring !== "ALL" ||
    f.q.trim() !== ""
  );
}

function secondaryFiltersActive(f: Filters) {
  return (
    f.destination !== "ALL" ||
    f.paymentMethod !== "ALL" ||
    f.giftAid !== "ALL" ||
    f.recurring !== "ALL"
  );
}

function filtersFromParams(params: URLSearchParams): Filters {
  const pick = (key: keyof Filters, allowed?: string[]) => {
    const raw = params.get(key);
    if (!raw) return DEFAULT_FILTERS[key];
    if (allowed && !allowed.includes(raw) && raw !== "ALL") {
      return DEFAULT_FILTERS[key];
    }
    return raw;
  };
  return {
    status: pick("status", [
      "PENDING",
      "SUCCEEDED",
      "FAILED",
      "REFUNDED",
      "ALL",
    ]),
    destination: pick("destination", ["DIRECT", "POT", "ALL"]),
    paymentMethod: pick("paymentMethod", ["CARD", "BACS_DEBIT", "ALL"]),
    giftAid: pick("giftAid", ["true", "false", "ALL"]),
    recurring: pick("recurring", ["true", "false", "ALL"]),
    q: params.get("q")?.trim() ?? "",
  };
}

function giftsCacheKey(
  nextPage: number,
  nextFilters: Filters,
  nextSize: number,
) {
  return `admin-gifts:${nextPage}:${nextSize}:${nextFilters.status}:${nextFilters.destination}:${nextFilters.paymentMethod}:${nextFilters.giftAid}:${nextFilters.recurring}:${nextFilters.q.trim().toLowerCase()}`;
}

const selectClass =
  "min-h-9 w-full rounded-sm border border-pvn-navy/15 bg-white px-2.5 py-1.5 text-sm text-pvn-navy focus:border-pvn-gold focus:ring-2 focus:ring-pvn-gold/30 focus:outline-none sm:w-auto";

function IconTrash({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function IconGiftEmpty({ className }: { className?: string }) {
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
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5C9.5 3 12 8 12 8s2.5-5 4.5-5a2.5 2.5 0 0 1 0 5" />
    </svg>
  );
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatWhenShort(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function methodLabel(method: string, recurring: boolean) {
  if (method === "BACS_DEBIT") return "Bacs";
  return recurring ? "Card · monthly" : "Card";
}

function donorDisplay(row: GiftRow) {
  const name =
    row.isAnonymous || !row.donorName?.trim()
      ? row.isAnonymous
        ? "Anonymous"
        : "—"
      : row.donorName.trim();
  return { name, email: row.donorEmail?.trim() || null };
}

function canDeleteGift(status: string) {
  return status === "PENDING" || status === "FAILED";
}

function AdminGiftsSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading gifts…</span>
      <div className="relative overflow-hidden rounded-sm bg-pvn-navy px-4 py-4 sm:px-6 sm:py-5">
        <div className="h-2.5 w-14 animate-pulse rounded-sm bg-pvn-cream/15" />
        <div className="mt-2 h-7 w-28 animate-pulse rounded-sm bg-pvn-cream/20" />
        <div className="mt-2 h-3.5 w-full max-w-md animate-pulse rounded-sm bg-pvn-cream/10" />
        <div className="mt-4 flex gap-2">
          <div className="h-9 w-28 animate-pulse rounded-md bg-pvn-gold/40" />
          <div className="h-9 w-24 animate-pulse rounded-md bg-pvn-cream/10" />
        </div>
      </div>
      <div className="mt-6 flex gap-3 border-b border-pvn-navy/10 pb-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-4 w-16 animate-pulse rounded-sm bg-pvn-navy/10"
          />
        ))}
      </div>
      <ul className="mt-5 grid gap-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <li
            key={i}
            className="border border-pvn-navy/10 bg-white/55 px-4 py-3.5"
          >
            <div className="flex justify-between gap-3">
              <div className="h-5 w-24 animate-pulse rounded-sm bg-pvn-navy/10" />
              <div className="h-5 w-16 animate-pulse rounded-sm bg-pvn-navy/8" />
            </div>
            <div className="mt-2 h-3.5 w-2/3 animate-pulse rounded-sm bg-pvn-navy/8" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * House-wide gift attempts — Host-style hero, status tabs, clickable rows.
 */
export function AdminGiftsList() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [gifts, setGifts] = useState<GiftRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(40);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] =
    useState<StatusCounts>(DEFAULT_COUNTS);
  const [filters, setFilters] = useState<Filters>(() =>
    filtersFromParams(new URLSearchParams(searchParams.toString())),
  );
  const [draftQ, setDraftQ] = useState(
    () => searchParams.get("q")?.trim() ?? "",
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const applyPayload = useCallback((payload: GiftsPayload) => {
    setGifts(payload.gifts);
    setPage(payload.page);
    setTotalPages(payload.totalPages);
    setTotal(payload.total);
    setStatusCounts(payload.statusCounts ?? DEFAULT_COUNTS);
  }, []);

  const load = useCallback(
    async (
      nextPage: number,
      nextFilters: Filters,
      nextSize: number,
      soft: boolean,
    ) => {
      const cacheKey = giftsCacheKey(nextPage, nextFilters, nextSize);
      const cached = readHostClientCache<GiftsPayload>(
        cacheKey,
        GIFTS_CACHE_TTL_MS,
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

      const params = new URLSearchParams();
      params.set("page", String(nextPage));
      params.set("pageSize", String(nextSize));
      if (nextFilters.status !== "ALL") params.set("status", nextFilters.status);
      if (nextFilters.destination !== "ALL") {
        params.set("destination", nextFilters.destination);
      }
      if (nextFilters.paymentMethod !== "ALL") {
        params.set("paymentMethod", nextFilters.paymentMethod);
      }
      if (nextFilters.giftAid !== "ALL") {
        params.set("giftAid", nextFilters.giftAid);
      }
      if (nextFilters.recurring !== "ALL") {
        params.set("recurring", nextFilters.recurring);
      }
      if (nextFilters.q.trim()) params.set("q", nextFilters.q.trim());

      const response = await adminFetch(`/api/admin/gifts?${params}`);
      const json = (await response.json()) as GiftsPayload & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(
          visitorSafeApiError(
            response.status,
            json.error,
            "We could not load gifts.",
          ),
        );
      }
      const payload: GiftsPayload = {
        gifts: json.gifts ?? [],
        page: json.page ?? nextPage,
        totalPages: json.totalPages ?? 1,
        total: json.total ?? 0,
        statusCounts: json.statusCounts ?? DEFAULT_COUNTS,
      };
      applyPayload(payload);
      writeHostClientCache(cacheKey, payload);
      setLoading(false);
      setRefreshing(false);
    },
    [applyPayload],
  );

  useEffect(() => {
    const next = filtersFromParams(
      new URLSearchParams(searchParams.toString()),
    );
    setFilters(next);
    setDraftQ(next.q);
    if (secondaryFiltersActive(next)) setFiltersOpen(true);
    let cancelled = false;
    const soft = Boolean(
      readHostClientCache(
        giftsCacheKey(1, next, pageSize),
        GIFTS_CACHE_TTL_MS,
      ),
    );
    void load(1, next, pageSize, soft).catch((err) => {
      if (cancelled) return;
      toast.error(
        "Gifts unavailable",
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- URL filters drive remount load
  }, [load, searchParams, toast]);

  function applyFilter(patch: Partial<Filters>, soft = false) {
    const next = { ...filters, ...patch };
    setFilters(next);
    void load(1, next, pageSize, soft || gifts.length > 0).catch((err) => {
      toast.error(
        "Gifts unavailable",
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Please try again.",
        ),
      );
      setLoading(false);
      setRefreshing(false);
    });
  }

  function clearFilters() {
    setDraftQ("");
    setFiltersOpen(false);
    applyFilter({ ...DEFAULT_FILTERS }, true);
  }

  function onSearch(event: FormEvent) {
    event.preventDefault();
    applyFilter({ q: draftQ }, true);
  }

  function goPage(nextPage: number) {
    if (nextPage < 1 || nextPage > totalPages) return;
    void load(nextPage, filters, pageSize, true).catch((err) => {
      toast.error(
        "Gifts unavailable",
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
    void load(1, filters, size, true).catch((err) => {
      toast.error(
        "Gifts unavailable",
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Please try again.",
        ),
      );
      setRefreshing(false);
    });
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const response = await adminFetch(
        `/api/admin/gifts/${encodeURIComponent(deleteId)}`,
        { method: "DELETE" },
      );
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(
          visitorSafeApiError(
            response.status,
            json.error,
            "Could not delete gift.",
          ),
        );
      }
      toast.success("Gift deleted");
      clearHostClientCache(giftsCacheKey(page, filters, pageSize));
      setDeleteId(null);
      await load(page, filters, pageSize, true);
    } catch (err) {
      toast.error(
        "Could not delete",
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Please try again.",
        ),
      );
    } finally {
      setDeleting(false);
    }
  }

  const pendingCount = statusCounts.PENDING;
  const failedCount = statusCounts.FAILED;

  if (loading && gifts.length === 0) {
    return <AdminGiftsSkeleton />;
  }

  return (
    <div className="w-full">
      {/* Hero */}
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
              Gifts
            </p>
            <h1 className="font-display mt-0.5 text-xl font-semibold text-balance sm:text-2xl">
              Checkout attempts
            </h1>
            <p className="mt-1 text-sm leading-snug text-pvn-cream/70">
              {total} {total === 1 ? "gift" : "gifts"}
              {pendingCount > 0 ? (
                <>
                  <span className="text-pvn-cream/30"> · </span>
                  {pendingCount} pending
                </>
              ) : null}
              {failedCount > 0 ? (
                <>
                  <span className="text-pvn-cream/30"> · </span>
                  {failedCount} failed
                </>
              ) : null}
              {refreshing ? (
                <span className="ml-2 inline-block h-3 w-3 animate-spin rounded-full border border-pvn-gold border-t-transparent align-middle" />
              ) : null}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/exports"
              className="font-nav inline-flex min-h-9 items-center rounded-md bg-pvn-gold px-3.5 text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light"
            >
              Exports
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

      {/* Status tabs */}
      <nav
        className="mt-6 flex gap-1 overflow-x-auto border-b border-pvn-navy/10 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Gift status"
      >
        {STATUS_TABS.map((tab) => {
          const active = filters.status === tab.id;
          const count =
            statusCounts[tab.id as keyof StatusCounts] ?? 0;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => applyFilter({ status: tab.id }, true)}
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
                {count}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Search + secondary filters */}
      <form
        onSubmit={onSearch}
        className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <input
          type="search"
          value={draftQ}
          onChange={(e) => setDraftQ(e.target.value)}
          placeholder="Search email, name, pot, Stripe id…"
          className="w-full flex-1 rounded-sm border border-pvn-navy/15 bg-white px-3.5 py-2.5 text-sm text-pvn-navy placeholder:text-pvn-navy/40 focus:border-pvn-gold focus:ring-2 focus:ring-pvn-gold/30 focus:outline-none"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            className="font-nav inline-flex min-h-10 flex-1 items-center justify-center rounded-md bg-pvn-navy px-5 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-cream uppercase transition hover:bg-pvn-navy/90 sm:flex-none"
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            className={`font-nav inline-flex min-h-10 items-center justify-center rounded-md border px-3 text-[0.65rem] font-bold tracking-[0.12em] uppercase transition ${
              secondaryFiltersActive(filters) || filtersOpen
                ? "border-pvn-gold text-pvn-navy"
                : "border-pvn-navy/15 text-pvn-navy/55 hover:border-pvn-navy/30 hover:text-pvn-navy"
            }`}
            aria-expanded={filtersOpen}
          >
            Filters
            {secondaryFiltersActive(filters) ? " ·" : ""}
          </button>
        </div>
      </form>

      {filtersOpen ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <select
            className={selectClass}
            value={filters.destination}
            onChange={(e) =>
              applyFilter({ destination: e.target.value }, true)
            }
            aria-label="Destination"
          >
            <option value="ALL">Pot + direct</option>
            <option value="POT">Pot gifts</option>
            <option value="DIRECT">Direct /give</option>
          </select>
          <select
            className={selectClass}
            value={filters.paymentMethod}
            onChange={(e) =>
              applyFilter({ paymentMethod: e.target.value }, true)
            }
            aria-label="Payment method"
          >
            <option value="ALL">All methods</option>
            <option value="CARD">Card</option>
            <option value="BACS_DEBIT">Bacs</option>
          </select>
          <select
            className={selectClass}
            value={filters.giftAid}
            onChange={(e) => applyFilter({ giftAid: e.target.value }, true)}
            aria-label="Gift Aid"
          >
            <option value="ALL">Gift Aid: any</option>
            <option value="true">Gift Aid: yes</option>
            <option value="false">Gift Aid: no</option>
          </select>
          <select
            className={selectClass}
            value={filters.recurring}
            onChange={(e) =>
              applyFilter({ recurring: e.target.value }, true)
            }
            aria-label="Recurring"
          >
            <option value="ALL">One-off + monthly</option>
            <option value="true">Monthly</option>
            <option value="false">One-off</option>
          </select>
          {filtersAreActive(filters) ? (
            <button
              type="button"
              onClick={clearFilters}
              className="font-nav col-span-2 min-h-9 text-[0.65rem] font-bold tracking-[0.12em] text-pvn-gold uppercase sm:col-span-1"
            >
              Clear all
            </button>
          ) : null}
        </div>
      ) : null}

      {gifts.length === 0 ? (
        <div className="mt-8 mx-auto flex min-h-[32vh] max-w-lg flex-col items-center justify-center border border-dashed border-pvn-navy/15 bg-gradient-to-b from-pvn-cream/80 to-white px-5 py-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-pvn-navy/[0.06] text-pvn-navy/45">
            <IconGiftEmpty className="h-7 w-7" />
          </span>
          {filtersAreActive(filters) ? (
            <>
              <h2 className="font-display mt-5 text-2xl font-semibold text-pvn-navy">
                No matching gifts
              </h2>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-pvn-navy/60">
                Nothing matches your search or filters.
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
                No gifts yet
              </h2>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-pvn-navy/60">
                Checkout attempts from /give and pot pages will show up here.
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
          {/* Mobile — clickable rows */}
          <ul className="mt-6 space-y-2 lg:hidden">
            {gifts.map((row) => {
              const donor = donorDisplay(row);
              return (
                <li key={row.id} className="group relative">
                  <Link
                    href={`/admin/gifts/${row.id}`}
                    className="block border border-pvn-navy/10 bg-white px-3.5 py-3.5 transition hover:border-pvn-gold/45"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-display text-lg font-semibold text-pvn-navy">
                          {formatTidyGbp(row.amount)}
                        </p>
                        <p className="mt-0.5 text-[0.75rem] text-pvn-navy/50">
                          {formatWhenShort(row.createdAt)}
                        </p>
                      </div>
                      <AdminDonationStatusChip status={row.status} />
                    </div>
                    <p className="mt-2 text-sm text-pvn-navy/75">
                      {row.pot ? row.pot.title : "/give"} ·{" "}
                      {methodLabel(row.paymentMethod, row.isRecurring)}
                      {row.giftAid ? " · Gift Aid" : ""}
                    </p>
                    <p className="mt-1 text-sm text-pvn-navy">
                      {donor.name}
                      {donor.email ? (
                        <span className="block break-all text-[0.75rem] text-pvn-navy/50">
                          {donor.email}
                        </span>
                      ) : null}
                    </p>
                  </Link>
                  {canDeleteGift(row.status) ? (
                    <button
                      type="button"
                      className="absolute right-3 bottom-3 inline-flex h-8 w-8 items-center justify-center rounded-md border border-pvn-navy/10 bg-white text-red-800/70 transition hover:border-red-800/35 hover:text-red-900"
                      aria-label="Delete gift"
                      onClick={(e) => {
                        e.preventDefault();
                        setDeleteId(row.id);
                      }}
                    >
                      <IconTrash className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>

          {/* Desktop — clickable rows */}
          <ul className="mt-6 hidden divide-y divide-pvn-navy/8 border border-pvn-navy/10 bg-white lg:block">
            {gifts.map((row) => {
              const donor = donorDisplay(row);
              return (
                <li key={row.id} className="group relative">
                  <Link
                    href={`/admin/gifts/${row.id}`}
                    className="grid grid-cols-[7.5rem_5.5rem_6.5rem_minmax(0,1.2fr)_minmax(0,1fr)_2.5rem] items-center gap-3 px-4 py-3.5 transition hover:bg-pvn-cream/50"
                  >
                    <div>
                      <p className="text-sm font-medium text-pvn-navy">
                        {formatWhenShort(row.createdAt)}
                      </p>
                      <p className="mt-0.5 text-[0.7rem] text-pvn-navy/40">
                        {methodLabel(row.paymentMethod, row.isRecurring)}
                        {row.giftAid ? " · GA" : ""}
                      </p>
                    </div>
                    <p className="font-display text-base font-semibold text-pvn-navy">
                      {formatTidyGbp(row.amount)}
                    </p>
                    <AdminDonationStatusChip status={row.status} />
                    <p className="truncate text-sm text-pvn-navy/75">
                      {row.pot ? row.pot.title : "/give"}
                    </p>
                    <div className="min-w-0">
                      <p className="truncate text-sm text-pvn-navy">
                        {donor.name}
                      </p>
                      {donor.email ? (
                        <p className="truncate text-[0.75rem] text-pvn-navy/45">
                          {donor.email}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className="font-nav text-[0.6rem] font-bold tracking-[0.1em] text-pvn-gold uppercase opacity-0 transition group-hover:opacity-100"
                      aria-hidden
                    >
                      →
                    </span>
                  </Link>
                  {canDeleteGift(row.status) ? (
                    <button
                      type="button"
                      className="absolute top-1/2 right-3 z-10 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-pvn-navy/30 opacity-0 transition hover:bg-red-50 hover:text-red-800 group-hover:opacity-100"
                      aria-label="Delete gift"
                      title="Delete"
                      onClick={() => setDeleteId(row.id)}
                    >
                      <IconTrash className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>

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

      <ResultModal
        open={deleteId !== null}
        variant="confirm"
        title="Delete this gift attempt?"
        body="This permanently removes a pending or failed checkout row. Succeeded gifts cannot be deleted this way."
        confirmLabel="Delete"
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onClose={() => {
          if (!deleting) setDeleteId(null);
        }}
      />
    </div>
  );
}
