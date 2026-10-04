"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useState } from "react";
import { useToast } from "@/components/toast/ToastProvider";
import { adminFetch } from "@/lib/admin-client";
import {
  readHostClientCache,
  writeHostClientCache,
} from "@/lib/host-client-cache";
import { formatTidyGbp, formatWholeGbp } from "@/lib/money";
import { visitorSafeApiError, visitorSafeMessage } from "@/lib/visitor-safe";

type Range = "7d" | "30d" | "90d" | "all";
type MainTab = "overview" | "trends" | "checkout" | "pots";
type PotSubTab = "raised" | "count" | "lifetime";
type TrendMetric = "raisedPence" | "gifts" | "attempts";

type DayPoint = {
  date: string;
  raisedPence: number;
  gifts: number;
  attempts: number;
};

type AnalyticsPayload = {
  range: Range;
  seriesNote: string | null;
  totals: {
    succeededPence: number;
    succeededCount: number;
    averagePence: number;
    direct: { pence: number; count: number };
    pot: { pence: number; count: number };
    methods: { cardOneOff: number; cardMonthly: number };
    giftAid: { count: number; pence: number; reclaimPence: number };
    funnel: {
      attempts: number;
      succeeded: number;
      pending: number;
      failed: number;
      refunded: number;
      conversionPct: number | null;
    };
  };
  buildingFund: {
    targetPence: number;
    raisedPence: number;
    progressPct: number;
  };
  topPotsByRaised: Array<{
    slug: string;
    title: string;
    pence: number;
    count: number;
  }>;
  topPotsByCount: Array<{
    slug: string;
    title: string;
    pence: number;
    count: number;
  }>;
  lifetimeTopPots: Array<{
    slug: string;
    title: string;
    pence: number;
    count: number;
    status: string;
  }>;
  seriesDaily: DayPoint[];
};

const RANGES: Array<{ id: Range; label: string }> = [
  { id: "7d", label: "7d" },
  { id: "30d", label: "30d" },
  { id: "90d", label: "90d" },
  { id: "all", label: "All" },
];

const MAIN_TABS: Array<{ id: MainTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "trends", label: "Trends" },
  { id: "checkout", label: "Checkout" },
  { id: "pots", label: "Pots" },
];

const TREND_METRICS: Array<{ id: TrendMetric; label: string }> = [
  { id: "raisedPence", label: "£ raised" },
  { id: "gifts", label: "Gifts" },
  { id: "attempts", label: "Attempts" },
];

const ANALYTICS_CACHE_TTL_MS = 60_000;

function analyticsCacheKey(range: Range) {
  return `admin-analytics:${range}`;
}

function rangeHint(range: Range) {
  if (range === "7d") return "last 7 days";
  if (range === "30d") return "last 30 days";
  if (range === "90d") return "last 90 days";
  return "all time";
}

function formatDayLabel(isoDate: string) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function formatDayFull(isoDate: string) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function AdminAnalyticsSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading analytics…</span>
      <div className="relative overflow-hidden rounded-sm bg-pvn-navy px-4 py-4 sm:px-6 sm:py-5">
        <div className="h-2.5 w-16 animate-pulse rounded-sm bg-pvn-cream/15" />
        <div className="mt-2 h-7 w-36 animate-pulse rounded-sm bg-pvn-cream/20" />
        <div className="mt-2 h-3.5 w-full max-w-md animate-pulse rounded-sm bg-pvn-cream/10" />
        <div className="mt-5 grid gap-4 border-t border-pvn-cream/12 pt-4 sm:grid-cols-2">
          <div>
            <div className="h-2.5 w-24 animate-pulse rounded-sm bg-pvn-cream/10" />
            <div className="mt-1.5 h-9 w-32 animate-pulse rounded-sm bg-pvn-cream/20" />
          </div>
          <div className="h-1.5 w-full animate-pulse rounded-sm bg-pvn-cream/15" />
        </div>
      </div>
      <div className="mt-6 flex gap-3 border-b border-pvn-navy/10 pb-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-4 w-16 animate-pulse rounded-sm bg-pvn-navy/10"
          />
        ))}
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="border border-pvn-navy/10 bg-white/55 px-4 py-4"
          >
            <div className="h-2.5 w-16 animate-pulse rounded-sm bg-pvn-navy/10" />
            <div className="mt-2 h-7 w-24 animate-pulse rounded-sm bg-pvn-navy/10" />
          </div>
        ))}
      </div>
    </div>
  );
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

function BarList({
  items,
  empty,
  valueFormat = "count",
}: {
  items: Array<{ label: string; value: number; href?: string; hint?: string }>;
  empty: string;
  valueFormat?: "count" | "money";
}) {
  if (items.length === 0) {
    return <p className="text-sm text-pvn-navy/45">{empty}</p>;
  }
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item.label}>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            {item.href ? (
              <Link
                href={item.href}
                className="truncate text-pvn-navy/75 underline decoration-pvn-gold/25 underline-offset-2 hover:decoration-pvn-gold"
              >
                {item.label}
              </Link>
            ) : (
              <span className="truncate text-pvn-navy/75">{item.label}</span>
            )}
            <span className="font-nav shrink-0 text-[0.65rem] font-bold tracking-[0.08em] text-pvn-navy/45 uppercase">
              {valueFormat === "money"
                ? formatTidyGbp(item.value)
                : item.value}
              {item.hint ? (
                <span className="ml-1.5 font-normal tracking-normal normal-case opacity-70">
                  {item.hint}
                </span>
              ) : null}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-sm bg-pvn-navy/8">
            <div
              className="h-full rounded-sm bg-pvn-gold transition-[width] duration-300"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function InteractiveTrendChart({
  series,
  metric,
}: {
  series: DayPoint[];
  metric: TrendMetric;
}) {
  const [active, setActive] = useState<number | null>(null);
  const tipId = useId();

  if (series.length === 0) {
    return <p className="text-sm text-pvn-navy/45">No days in this range.</p>;
  }

  const values = series.map((d) => d[metric]);
  const max = Math.max(...values, 1);
  const selected = active != null ? series[active] : null;

  return (
    <div>
      <div
        className="flex h-44 items-end gap-px sm:h-52 sm:gap-0.5"
        role="img"
        aria-label="Daily trend chart"
        onMouseLeave={() => setActive(null)}
      >
        {series.map((day, i) => {
          const value = day[metric];
          const heightPct = Math.max((value / max) * 100, value > 0 ? 3 : 0);
          const isActive = active === i;
          return (
            <button
              key={day.date}
              type="button"
              className="group relative flex min-w-0 flex-1 flex-col justify-end outline-none"
              style={{ height: "100%" }}
              aria-describedby={isActive ? tipId : undefined}
              aria-label={`${formatDayFull(day.date)}: ${
                metric === "raisedPence"
                  ? formatTidyGbp(value)
                  : String(value)
              }`}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
            >
              <span
                className={`mx-auto w-full max-w-[1.25rem] rounded-t-sm transition ${
                  isActive
                    ? "bg-pvn-navy"
                    : "bg-pvn-gold/80 group-hover:bg-pvn-gold"
                }`}
                style={{ height: `${heightPct}%` }}
              />
            </button>
          );
        })}
      </div>

      <div
        id={tipId}
        className="mt-4 min-h-[4.5rem] border border-pvn-navy/10 bg-pvn-cream/50 px-3.5 py-3 sm:px-4"
        aria-live="polite"
      >
        {selected ? (
          <>
            <p className="font-nav text-[0.6rem] font-bold tracking-[0.12em] text-pvn-navy/45 uppercase">
              {formatDayFull(selected.date)}
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-[0.7rem] text-pvn-navy/45">Raised</p>
                <p className="font-medium text-pvn-navy">
                  {formatTidyGbp(selected.raisedPence)}
                </p>
              </div>
              <div>
                <p className="text-[0.7rem] text-pvn-navy/45">Gifts</p>
                <p className="font-medium text-pvn-navy">{selected.gifts}</p>
              </div>
              <div>
                <p className="text-[0.7rem] text-pvn-navy/45">Attempts</p>
                <p className="font-medium text-pvn-navy">{selected.attempts}</p>
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-pvn-navy/50">
            Hover or tap a day to see raised £, gifts, and checkout attempts.
          </p>
        )}
      </div>

      <div className="mt-2 flex justify-between text-[0.65rem] text-pvn-navy/40">
        <span>{formatDayLabel(series[0].date)}</span>
        <span>{formatDayLabel(series[series.length - 1].date)}</span>
      </div>
    </div>
  );
}

function FunnelBars({
  funnel,
}: {
  funnel: AnalyticsPayload["totals"]["funnel"];
}) {
  const rows = [
    { label: "Attempts", value: funnel.attempts, tone: "bg-pvn-navy/70" },
    { label: "Succeeded", value: funnel.succeeded, tone: "bg-pvn-gold" },
    { label: "Pending", value: funnel.pending, tone: "bg-amber-700/50" },
    { label: "Failed", value: funnel.failed, tone: "bg-red-800/45" },
    { label: "Refunded", value: funnel.refunded, tone: "bg-pvn-navy/25" },
  ];
  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="text-pvn-navy/70">{row.label}</span>
            <span className="font-medium text-pvn-navy">{row.value}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-sm bg-pvn-navy/8">
            <div
              className={`h-full rounded-sm transition-[width] duration-300 ${row.tone}`}
              style={{ width: `${(row.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * House-wide gift analytics — Host-style hero, tabbed sections.
 */
export function AdminAnalytics() {
  const toast = useToast();
  const [range, setRange] = useState<Range>("30d");
  const [tab, setTab] = useState<MainTab>("overview");
  const [potSub, setPotSub] = useState<PotSubTab>("raised");
  const [trendMetric, setTrendMetric] = useState<TrendMetric>("raisedPence");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<AnalyticsPayload | null>(null);

  const load = useCallback(async (nextRange: Range, soft: boolean) => {
    const cached = readHostClientCache<AnalyticsPayload>(
      analyticsCacheKey(nextRange),
      ANALYTICS_CACHE_TTL_MS,
    );
    if (cached) {
      setData(cached);
      setLoading(false);
      setRefreshing(true);
    } else if (soft) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const response = await adminFetch(
      `/api/admin/analytics?range=${encodeURIComponent(nextRange)}`,
    );
    const json = (await response.json()) as AnalyticsPayload & {
      error?: string;
    };
    if (!response.ok) {
      throw new Error(
        visitorSafeApiError(
          response.status,
          json.error,
          "We could not load analytics.",
        ),
      );
    }
    setData(json);
    writeHostClientCache(analyticsCacheKey(nextRange), json);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const soft = Boolean(
      readHostClientCache(analyticsCacheKey(range), ANALYTICS_CACHE_TTL_MS),
    );
    // load() paints the sessionStorage cache before revalidating; that first
    // render from an external store is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(range, soft).catch((err) => {
      if (cancelled) return;
      toast.error(
        "Analytics unavailable",
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
  }, [load, range, toast]);

  if (loading && !data) return <AdminAnalyticsSkeleton />;

  if (!data) {
    return (
      <div className="mx-auto flex min-h-[36vh] max-w-lg flex-col items-center justify-center border border-dashed border-pvn-navy/15 px-5 py-12 text-center">
        <h2 className="font-display text-2xl font-semibold text-pvn-navy">
          Analytics unavailable
        </h2>
        <p className="mt-2 text-sm text-pvn-navy/60">
          We could not load house-wide figures. Try again.
        </p>
        <button
          type="button"
          onClick={() => {
            void load(range, false).catch(() => undefined);
          }}
          className="font-nav mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-pvn-navy px-5 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-cream uppercase"
        >
          Try again
        </button>
      </div>
    );
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
              Analytics
            </p>
            <h1 className="font-display mt-0.5 text-xl font-semibold text-balance sm:text-2xl">
              House-wide giving
            </h1>
            <p className="mt-1 text-sm leading-snug text-pvn-cream/70">
              {data.totals.succeededCount}{" "}
              {data.totals.succeededCount === 1 ? "gift" : "gifts"} ·{" "}
              {rangeHint(range)}
              {data.totals.funnel.conversionPct != null ? (
                <>
                  <span className="text-pvn-cream/30"> · </span>
                  {data.totals.funnel.conversionPct}% paid
                </>
              ) : null}
              {refreshing ? (
                <span className="ml-2 inline-block h-3 w-3 animate-spin rounded-full border border-pvn-gold border-t-transparent align-middle" />
              ) : null}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/gifts"
              className="font-nav inline-flex min-h-9 items-center rounded-md bg-pvn-gold px-3.5 text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light"
            >
              Gifts
            </Link>
            <Link
              href="/admin/building-fund"
              className="font-nav inline-flex min-h-9 items-center rounded-md border border-pvn-cream/30 px-3 text-[0.65rem] font-bold tracking-[0.12em] text-pvn-cream uppercase transition hover:border-pvn-gold hover:text-pvn-gold"
            >
              Fund
            </Link>
          </div>
        </div>

        <div className="relative mt-5 grid gap-4 border-t border-pvn-cream/12 pt-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] sm:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-nav text-[0.55rem] font-bold tracking-[0.16em] text-pvn-cream/45 uppercase">
                Succeeded · {rangeHint(range)}
              </p>
              <div
                className="flex gap-0.5 rounded-sm border border-pvn-cream/15 p-0.5"
                role="group"
                aria-label="Date range"
              >
                {RANGES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRange(r.id)}
                    disabled={refreshing && range !== r.id}
                    className={`font-nav rounded-sm px-1.5 py-0.5 text-[0.55rem] font-bold tracking-[0.1em] uppercase transition disabled:opacity-50 ${
                      range === r.id
                        ? "bg-pvn-gold text-pvn-navy"
                        : "text-pvn-cream/50 hover:text-pvn-cream"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="font-display mt-0.5 text-3xl font-semibold tracking-tight text-pvn-cream sm:text-4xl">
              {formatWholeGbp(data.totals.succeededPence)}
            </p>
            <p className="mt-1 text-sm text-pvn-cream/55">
              avg {formatTidyGbp(data.totals.averagePence)}
              <span className="text-pvn-cream/30"> · </span>
              {data.totals.direct.count} direct
              <span className="text-pvn-cream/30"> · </span>
              {data.totals.pot.count} pot
            </p>
          </div>

          <Link href="/admin/building-fund" className="group block">
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="text-xs text-pvn-cream/70 group-hover:text-pvn-gold">
                Building fund
              </span>
              <span className="font-nav shrink-0 text-[0.6rem] font-bold tracking-[0.1em] text-pvn-gold uppercase">
                {data.buildingFund.progressPct}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-sm bg-pvn-cream/15">
              <div
                className="h-full rounded-sm bg-pvn-gold transition-[width] duration-500"
                style={{
                  width: `${Math.min(100, Math.max(2, data.buildingFund.progressPct))}%`,
                }}
              />
            </div>
            <p className="mt-1.5 text-[0.75rem] text-pvn-cream/45">
              {formatWholeGbp(data.buildingFund.raisedPence)} of{" "}
              {formatWholeGbp(data.buildingFund.targetPence)}
            </p>
          </Link>
        </div>
      </div>

      <nav
        className="mt-6 flex gap-1 overflow-x-auto border-b border-pvn-navy/10 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Analytics sections"
      >
        {MAIN_TABS.map((t) => {
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
            <div className="grid gap-px overflow-hidden rounded-sm border border-pvn-navy/10 bg-pvn-navy/10 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCell
                label="Direct /give"
                value={formatWholeGbp(data.totals.direct.pence)}
                hint={`${data.totals.direct.count} gifts`}
              />
              <KpiCell
                label="Pot gifts"
                value={formatWholeGbp(data.totals.pot.pence)}
                hint={`${data.totals.pot.count} gifts`}
              />
              <KpiCell
                label="Gift Aid"
                value={String(data.totals.giftAid.count)}
                hint={`~${formatTidyGbp(data.totals.giftAid.reclaimPence)} reclaim`}
              />
              <KpiCell
                label="Paid rate"
                value={
                  data.totals.funnel.conversionPct != null
                    ? `${data.totals.funnel.conversionPct}%`
                    : "—"
                }
                hint={`${data.totals.funnel.succeeded} of ${data.totals.funnel.attempts}`}
              />
            </div>

            <button
              type="button"
              onClick={() => setTab("trends")}
              className="font-nav text-[0.65rem] font-bold tracking-[0.12em] text-pvn-gold uppercase"
            >
              Explore daily trends →
            </button>
          </div>
        ) : null}

        {tab === "trends" ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-nav text-[0.65rem] font-bold tracking-[0.16em] text-pvn-gold uppercase">
                  Daily activity
                </h2>
                {data.seriesNote ? (
                  <p className="mt-1 text-[0.75rem] text-pvn-navy/50">
                    {data.seriesNote}
                  </p>
                ) : null}
              </div>
              <div
                className="flex flex-wrap gap-1 border border-pvn-navy/10 bg-white p-1"
                role="group"
                aria-label="Trend metric"
              >
                {TREND_METRICS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setTrendMetric(m.id)}
                    className={`font-nav rounded-sm px-2.5 py-1.5 text-[0.6rem] font-bold tracking-[0.12em] uppercase transition ${
                      trendMetric === m.id
                        ? "bg-pvn-navy text-pvn-cream"
                        : "text-pvn-navy/50 hover:text-pvn-navy"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <section className="border border-pvn-navy/10 bg-white px-3 py-4 sm:px-5 sm:py-5">
              <InteractiveTrendChart
                series={data.seriesDaily}
                metric={trendMetric}
              />
            </section>
          </div>
        ) : null}

        {tab === "checkout" ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="border border-pvn-navy/10 bg-white px-4 py-5 sm:px-5">
              <h2 className="font-nav text-[0.65rem] font-bold tracking-[0.16em] text-pvn-gold uppercase">
                Attempt funnel
              </h2>
              <p className="mt-1 text-[0.75rem] text-pvn-navy/50">
                {data.totals.funnel.conversionPct != null
                  ? `${data.totals.funnel.conversionPct}% of attempts paid`
                  : "No attempts in this range"}
              </p>
              <div className="mt-5">
                <FunnelBars funnel={data.totals.funnel} />
              </div>
              <Link
                href="/admin/gifts?status=FAILED"
                className="font-nav mt-5 inline-block text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy/50 uppercase hover:text-pvn-navy"
              >
                Review failed gifts →
              </Link>
            </section>

            <section className="border border-pvn-navy/10 bg-white px-4 py-5 sm:px-5">
              <h2 className="font-nav text-[0.65rem] font-bold tracking-[0.16em] text-pvn-gold uppercase">
                One-off vs monthly
              </h2>
              <p className="mt-1 text-[0.75rem] text-pvn-navy/50">
                Succeeded gifts only
              </p>
              <div className="mt-5">
                <BarList
                  empty="No succeeded gifts in range."
                  items={[
                    {
                      label: "Card · one-off",
                      value: data.totals.methods.cardOneOff,
                    },
                    {
                      label: "Card · monthly",
                      value: data.totals.methods.cardMonthly,
                    },
                  ].filter((i) => i.value > 0)}
                />
              </div>
            </section>
          </div>
        ) : null}

        {tab === "pots" ? (
          <div className="space-y-4">
            <div
              className="flex flex-wrap gap-1 border border-pvn-navy/10 bg-white p-1"
              role="tablist"
              aria-label="Pot rankings"
            >
              {(
                [
                  { id: "raised" as const, label: "By £" },
                  { id: "count" as const, label: "By gifts" },
                  { id: "lifetime" as const, label: "Lifetime" },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={potSub === s.id}
                  onClick={() => setPotSub(s.id)}
                  className={`font-nav rounded-sm px-3 py-1.5 text-[0.6rem] font-bold tracking-[0.12em] uppercase transition ${
                    potSub === s.id
                      ? "bg-pvn-navy text-pvn-cream"
                      : "text-pvn-navy/50 hover:text-pvn-navy"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <section className="border border-pvn-navy/10 bg-white px-4 py-5 sm:px-5">
              {potSub === "raised" ? (
                <>
                  <h2 className="font-nav text-[0.65rem] font-bold tracking-[0.16em] text-pvn-gold uppercase">
                    Top pots by £
                  </h2>
                  <p className="mt-1 text-[0.75rem] text-pvn-navy/50">
                    Succeeded gifts in the selected range
                  </p>
                  <div className="mt-5">
                    <BarList
                      empty="No pot gifts in this range."
                      valueFormat="money"
                      items={data.topPotsByRaised.map((p) => ({
                        label: p.title,
                        value: p.pence,
                        href: `/admin/pots/${p.slug}`,
                        hint: `${p.count}`,
                      }))}
                    />
                  </div>
                </>
              ) : null}
              {potSub === "count" ? (
                <>
                  <h2 className="font-nav text-[0.65rem] font-bold tracking-[0.16em] text-pvn-gold uppercase">
                    Top pots by gifts
                  </h2>
                  <p className="mt-1 text-[0.75rem] text-pvn-navy/50">
                    Succeeded gifts in the selected range
                  </p>
                  <div className="mt-5">
                    <BarList
                      empty="No pot gifts in this range."
                      items={data.topPotsByCount.map((p) => ({
                        label: p.title,
                        value: p.count,
                        href: `/admin/pots/${p.slug}`,
                        hint: formatTidyGbp(p.pence),
                      }))}
                    />
                  </div>
                </>
              ) : null}
              {potSub === "lifetime" ? (
                <>
                  <h2 className="font-nav text-[0.65rem] font-bold tracking-[0.16em] text-pvn-gold uppercase">
                    Lifetime leaders
                  </h2>
                  <p className="mt-1 text-[0.75rem] text-pvn-navy/50">
                    Pot totals from the database — independent of range
                  </p>
                  <div className="mt-5">
                    <BarList
                      empty="No pots yet."
                      valueFormat="money"
                      items={data.lifetimeTopPots.slice(0, 10).map((p) => ({
                        label: p.title,
                        value: p.pence,
                        href: `/admin/pots/${p.slug}`,
                        hint: `${p.count}`,
                      }))}
                    />
                  </div>
                </>
              ) : null}
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}
