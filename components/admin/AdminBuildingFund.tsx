"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ResultModal } from "@/components/ResultModal";
import { useToast } from "@/components/toast/ToastProvider";
import { adminFetch } from "@/lib/admin-client";
import {
  clearHostClientCache,
  readHostClientCache,
  writeHostClientCache,
} from "@/lib/host-client-cache";
import {
  formatTidyGbp,
  formatWholeGbp,
  percentOf,
  poundsToPence,
} from "@/lib/money";
import { visitorSafeApiError, visitorSafeMessage } from "@/lib/visitor-safe";

type CategoryRow = {
  category: string;
  label: string;
  pence: number;
  count: number;
};

type FundPayload = {
  targetAmount: number;
  totalRaised: number;
  remainingPence: number;
  succeededGiftCount: number;
  updatedAt: string;
  categories: CategoryRow[];
};

type Tab = "overview" | "categories" | "target";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "categories", label: "Categories" },
  { id: "target", label: "Target" },
];

const FUND_CACHE_KEY = "admin-building-fund";
const FUND_CACHE_TTL_MS = 60_000;

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function KpiCell({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-white px-3 py-3.5 sm:px-4">
      <p className="font-nav text-[0.55rem] font-bold tracking-[0.14em] text-pvn-navy/40 uppercase">
        {label}
      </p>
      <p className="font-display mt-1.5 text-xl font-semibold text-pvn-navy sm:text-2xl">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-[0.7rem] leading-snug text-pvn-navy/45">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function AdminFundSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading fund…</span>
      <div className="relative overflow-hidden rounded-sm bg-pvn-navy px-4 py-4 sm:px-6 sm:py-5">
        <div className="h-2.5 w-14 animate-pulse rounded-sm bg-pvn-cream/15" />
        <div className="mt-2 h-7 w-40 animate-pulse rounded-sm bg-pvn-cream/20" />
        <div className="mt-2 h-3.5 w-full max-w-md animate-pulse rounded-sm bg-pvn-cream/10" />
        <div className="mt-5 border-t border-pvn-cream/12 pt-4">
          <div className="h-9 w-36 animate-pulse rounded-sm bg-pvn-cream/20" />
          <div className="mt-3 h-1.5 w-full animate-pulse rounded-sm bg-pvn-cream/15" />
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
    </div>
  );
}

/**
 * Building fund — progress, category split, editable target (with confirm).
 */
export function AdminBuildingFund() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fund, setFund] = useState<FundPayload | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [targetPounds, setTargetPounds] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingPence, setPendingPence] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const applyFund = useCallback((json: FundPayload) => {
    setFund({
      ...json,
      remainingPence:
        json.remainingPence ??
        Math.max(0, json.targetAmount - json.totalRaised),
      succeededGiftCount: json.succeededGiftCount ?? 0,
      categories: json.categories ?? [],
    });
    setTargetPounds(String(json.targetAmount / 100));
  }, []);

  const load = useCallback(
    async (soft: boolean) => {
      const cached = readHostClientCache<FundPayload>(
        FUND_CACHE_KEY,
        FUND_CACHE_TTL_MS,
      );
      if (cached) {
        applyFund(cached);
        setLoading(false);
        setRefreshing(true);
      } else if (soft) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await adminFetch("/api/admin/building-fund");
      const json = (await response.json()) as FundPayload & { error?: string };
      if (!response.ok) {
        throw new Error(
          visitorSafeApiError(
            response.status,
            json.error,
            "Could not load building fund.",
          ),
        );
      }
      applyFund(json);
      writeHostClientCache(FUND_CACHE_KEY, json);
      setLoading(false);
      setRefreshing(false);
    },
    [applyFund],
  );

  useEffect(() => {
    let cancelled = false;
    const soft = Boolean(
      readHostClientCache(FUND_CACHE_KEY, FUND_CACHE_TTL_MS),
    );
    void load(soft).catch((err) => {
      if (cancelled) return;
      toast.error(
        "Building fund unavailable",
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
  }, [load, toast]);

  function onSubmitTarget(event: FormEvent) {
    event.preventDefault();
    const pence = poundsToPence(targetPounds);
    if (pence === null) {
      toast.error("Invalid amount", "Enter a whole pounds amount.");
      return;
    }
    if (fund && pence === fund.targetAmount) {
      toast.success("Target unchanged");
      return;
    }
    setPendingPence(pence);
    setConfirmOpen(true);
  }

  async function confirmSave() {
    if (pendingPence === null) return;
    setSaving(true);
    try {
      const response = await adminFetch("/api/admin/building-fund", {
        method: "PATCH",
        body: JSON.stringify({ targetAmountPence: pendingPence }),
      });
      const json = (await response.json()) as Partial<FundPayload> & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(
          visitorSafeApiError(
            response.status,
            json.error,
            "Could not save target.",
          ),
        );
      }
      toast.success("Target updated");
      setConfirmOpen(false);
      setPendingPence(null);
      clearHostClientCache(FUND_CACHE_KEY);
      await load(true);
    } catch (err) {
      toast.error(
        "Could not save",
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Please try again.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading && !fund) return <AdminFundSkeleton />;

  if (!fund) {
    return (
      <div className="mx-auto flex min-h-[36vh] max-w-lg flex-col items-center justify-center border border-dashed border-pvn-navy/15 px-5 py-12 text-center">
        <h1 className="font-display text-2xl font-semibold text-pvn-navy">
          Fund unavailable
        </h1>
        <p className="mt-2 text-sm text-pvn-navy/60">
          We could not load the building fund. Try again from overview.
        </p>
        <Link
          href="/admin"
          className="font-nav mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-pvn-navy px-5 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-cream uppercase"
        >
          Back to overview
        </Link>
      </div>
    );
  }

  const pct = percentOf(fund.totalRaised, fund.targetAmount);
  const categoryMax = Math.max(...fund.categories.map((c) => c.pence), 1);
  const dirty =
    poundsToPence(targetPounds) !== null &&
    poundsToPence(targetPounds) !== fund.targetAmount;

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
              Fund
            </p>
            <h1 className="font-display mt-0.5 text-xl font-semibold text-balance sm:text-2xl">
              Building fund
            </h1>
            <p className="mt-1 text-sm leading-snug text-pvn-cream/70">
              {pct}% of target · {formatWholeGbp(fund.remainingPence)} to go
              {refreshing ? (
                <span className="ml-2 inline-block h-3 w-3 animate-spin rounded-full border border-pvn-gold border-t-transparent align-middle" />
              ) : null}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setTab("target")}
              className="font-nav inline-flex min-h-9 items-center rounded-md bg-pvn-gold px-3.5 text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light"
            >
              Edit target
            </button>
            <Link
              href="/admin/analytics"
              className="font-nav inline-flex min-h-9 items-center rounded-md border border-pvn-cream/30 px-3 text-[0.65rem] font-bold tracking-[0.12em] text-pvn-cream uppercase transition hover:border-pvn-gold hover:text-pvn-gold"
            >
              Analytics
            </Link>
          </div>
        </div>

        <div className="relative mt-5 border-t border-pvn-cream/12 pt-4">
          <p className="font-nav text-[0.55rem] font-bold tracking-[0.16em] text-pvn-cream/45 uppercase">
            Raised · Stripe-owned
          </p>
          <p className="font-display mt-0.5 text-3xl font-semibold tracking-tight text-pvn-cream sm:text-4xl">
            {formatWholeGbp(fund.totalRaised)}
            <span className="text-lg font-normal text-pvn-cream/40">
              {" "}
              / {formatWholeGbp(fund.targetAmount)}
            </span>
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-sm bg-pvn-cream/15">
            <div
              className="h-full rounded-sm bg-pvn-gold transition-[width] duration-500"
              style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
            />
          </div>
          <p className="mt-2 text-[0.75rem] text-pvn-cream/45">
            {fund.succeededGiftCount} succeeded{" "}
            {fund.succeededGiftCount === 1 ? "gift" : "gifts"} · updated{" "}
            {formatWhen(fund.updatedAt)}
          </p>
        </div>
      </div>

      <nav
        className="mt-6 flex gap-1 overflow-x-auto border-b border-pvn-navy/10 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Fund sections"
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`font-nav relative -mb-px shrink-0 border-b-2 px-3.5 py-2.5 text-[0.7rem] font-bold tracking-[0.14em] uppercase transition sm:px-4 ${
                active
                  ? "border-pvn-gold text-pvn-navy"
                  : "border-transparent text-pvn-navy/45 hover:text-pvn-navy"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-6">
        {tab === "overview" ? (
          <div className="space-y-6">
            <div className="grid gap-px overflow-hidden rounded-sm border border-pvn-navy/10 bg-pvn-navy/10 sm:grid-cols-3">
              <KpiCell
                label="Target"
                value={formatWholeGbp(fund.targetAmount)}
                hint="Editable in Target"
              />
              <KpiCell
                label="Remaining"
                value={formatWholeGbp(fund.remainingPence)}
                hint={pct >= 100 ? "Target reached" : "Still to raise"}
              />
              <KpiCell
                label="Succeeded gifts"
                value={String(fund.succeededGiftCount)}
                hint="All-time credited"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTab("categories")}
                className="font-nav text-[0.65rem] font-bold tracking-[0.12em] text-pvn-gold uppercase"
              >
                View categories →
              </button>
              <Link
                href="/admin/gifts?status=SUCCEEDED"
                className="font-nav text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy/45 uppercase hover:text-pvn-navy"
              >
                Succeeded gifts →
              </Link>
            </div>
          </div>
        ) : null}

        {tab === "categories" ? (
          <section className="border border-pvn-navy/10 bg-white px-4 py-5 sm:px-5">
            <h2 className="font-nav text-[0.65rem] font-bold tracking-[0.16em] text-pvn-gold uppercase">
              Allocation by category
            </h2>
            <p className="mt-1 text-[0.75rem] text-pvn-navy/50">
              Succeeded gifts grouped by restoration category.
            </p>
            {fund.categories.length === 0 ? (
              <div className="mt-8 border border-dashed border-pvn-navy/15 bg-pvn-cream/40 px-4 py-10 text-center">
                <p className="font-display text-xl font-semibold text-pvn-navy">
                  No succeeded gifts yet
                </p>
                <p className="mt-2 text-sm text-pvn-navy/55">
                  Category totals will appear here once gifts succeed.
                </p>
              </div>
            ) : (
              <ul className="mt-5 space-y-3">
                {fund.categories.map((row) => (
                  <li key={row.category}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate text-pvn-navy/80">
                        {row.label}
                      </span>
                      <span className="font-nav shrink-0 text-[0.65rem] font-bold tracking-[0.08em] text-pvn-navy/45 uppercase">
                        {formatTidyGbp(row.pence)}
                        <span className="ml-1.5 font-normal tracking-normal normal-case opacity-70">
                          {row.count}
                        </span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-sm bg-pvn-navy/8">
                      <div
                        className="h-full rounded-sm bg-pvn-gold transition-[width] duration-300"
                        style={{
                          width: `${(row.pence / categoryMax) * 100}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {tab === "target" ? (
          <form
            onSubmit={onSubmitTarget}
            className="border border-pvn-navy/10 bg-white px-4 py-5 sm:px-5"
          >
            <h2 className="font-nav text-[0.65rem] font-bold tracking-[0.16em] text-pvn-gold uppercase">
              Campaign target
            </h2>
            <p className="mt-1 text-[0.75rem] text-pvn-navy/50">
              Current target {formatWholeGbp(fund.targetAmount)}. Homepage and
              /give read this from the database.
            </p>

            <label className="font-nav mt-5 block text-[0.65rem] font-bold tracking-[0.14em] text-pvn-navy/45 uppercase">
              New target (£)
            </label>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-pvn-navy/40">
                  £
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={targetPounds}
                  onChange={(e) => setTargetPounds(e.target.value)}
                  className="w-full rounded-sm border border-pvn-navy/15 bg-white py-2.5 pr-3 pl-7 text-sm text-pvn-navy focus:border-pvn-gold focus:ring-2 focus:ring-pvn-gold/30 focus:outline-none"
                  disabled={saving}
                />
              </div>
              <button
                type="submit"
                disabled={saving || !dirty}
                className="font-nav inline-flex min-h-10 items-center justify-center rounded-md bg-pvn-navy px-5 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-cream uppercase transition hover:bg-pvn-navy/90 disabled:opacity-50"
              >
                Review & save
              </button>
            </div>
            <p className="mt-2 text-[0.75rem] text-pvn-navy/45">
              Between £10,000 and £100,000,000. You will confirm before it
              saves. Raised is never edited here.
            </p>
          </form>
        ) : null}
      </div>

      <ResultModal
        open={confirmOpen}
        variant="confirm"
        title="Update campaign target?"
        body={
          pendingPence != null
            ? `Set the building fund target to ${formatWholeGbp(pendingPence)}. Raised stays ${formatWholeGbp(fund.totalRaised)} (Stripe only).`
            : "Confirm the new target."
        }
        confirmLabel="Save target"
        busy={saving}
        onConfirm={() => void confirmSave()}
        onClose={() => {
          if (!saving) {
            setConfirmOpen(false);
            setPendingPence(null);
          }
        }}
      />
    </div>
  );
}
