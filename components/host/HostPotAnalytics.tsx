"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/toast/ToastProvider";
import { hostFetch } from "@/lib/host-client";
import {
  readHostClientCache,
  writeHostClientCache,
} from "@/lib/host-client-cache";
import { formatTidyGbp, formatWholeGbp } from "@/lib/money";
import { visitorSafeApiError, visitorSafeMessage } from "@/lib/visitor-safe";

type Analytics = {
  slug: string;
  raisedPence: number;
  targetPence: number;
  progressPct: number;
  giftCount: number;
  approxUniqueDonors: number;
  averageGiftPence: number;
  medianGiftPence: number;
  largestGiftPence: number;
  raisedLast7Pence: number;
  raisedLast30Pence: number;
  giftsLast7: number;
  giftsLast30: number;
  newDonorCount: number;
  returningDonorCount: number;
  giftAidCount: number;
  giftAidEstimatePence: number;
  oneOffCount: number;
  recurringCount: number;
  messagesTotal: number;
  messagesUnreplied: number;
  messagesHidden: number;
  replyRatePct: number;
  daysSinceLastGift: number | null;
  daysLive: number | null;
  seriesDaily: Array<{ date: string; raisedPence: number; gifts: number }>;
  traffic: null | {
    pageViews7: number;
    pageViews30: number;
    pageViewsAll: number;
    uniqueVisitors7: number;
    uniqueVisitors30: number;
    conversionPct7: number | null;
    conversionPct30: number | null;
    topCountries: Array<{ country: string; views: number }>;
    topReferrers: Array<{ host: string; views: number }>;
    deviceSplit: { mobile: number; desktop: number; other: number };
    shareSources: Array<{ src: string; views: number }>;
    seriesDaily: Array<{ date: string; views: number; uniques: number }>;
    viewsWithZeroGifts7: boolean;
  };
};

type Tab = "gifts" | "traffic";

const ANALYTICS_CACHE_TTL_MS = 60_000;

function analyticsCacheKey(slug: string) {
  return `pot-analytics:${slug}`;
}

function Sparkline({
  values,
  className = "",
}: {
  values: number[];
  className?: string;
}) {
  const max = Math.max(...values, 1);
  const w = 120;
  const h = 28;
  const points = values
    .map((v, i) => {
      const x = values.length <= 1 ? 0 : (i / (values.length - 1)) * w;
      const y = h - (v / max) * (h - 2) - 1;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={`h-7 w-[7.5rem] overflow-visible ${className}`}
      aria-hidden
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-sm border border-pvn-navy/10 bg-white/55 px-3 py-2.5">
      <p className="font-nav text-[0.55rem] font-bold tracking-[0.14em] text-pvn-navy/40 uppercase">
        {label}
      </p>
      <p className="mt-1 font-display text-lg font-semibold text-pvn-navy">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-[0.7rem] text-pvn-navy/45">{hint}</p>
      ) : null}
    </div>
  );
}

function BarList({
  items,
  empty,
}: {
  items: Array<{ label: string; value: number }>;
  empty: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-pvn-navy/45">{empty}</p>;
  }
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.label}>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate text-pvn-navy/70">{item.label}</span>
            <span className="font-nav shrink-0 text-[0.65rem] font-bold tracking-[0.08em] text-pvn-navy/45 uppercase">
              {item.value}
            </span>
          </div>
          <div className="mt-1 h-1 overflow-hidden bg-pvn-navy/10">
            <div
              className="h-full bg-pvn-gold"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function HostPotAnalytics({ slug }: { slug: string }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("gifts");
  const [data, setData] = useState<Analytics | null>(null);

  const load = useCallback(async () => {
    const cached = readHostClientCache<Analytics>(
      analyticsCacheKey(slug),
      ANALYTICS_CACHE_TTL_MS,
    );
    if (cached) {
      setData(cached);
      setLoading(false);
    }

    const response = await hostFetch(
      `/api/host/pots/${slug}/analytics`,
    );
    const json = (await response.json()) as Analytics & { error?: string };
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
    writeHostClientCache(analyticsCacheKey(slug), json);
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    // load() paints the sessionStorage cache before revalidating; that first
    // render from an external store is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().catch((err) => {
      if (cancelled) return;
      toast.error(
        "Analytics unavailable",
        visitorSafeMessage(
          err instanceof Error ? err.message : null,
          "Please try again.",
        ),
      );
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [load, toast]);

  if (loading && !data) {
    return (
      <section id="analytics" className="scroll-mt-24" aria-busy="true">
        <h2 className="font-display text-xl font-semibold text-pvn-navy">
          Analytics
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-sm border border-pvn-navy/10 bg-white/55"
            />
          ))}
        </div>
      </section>
    );
  }

  if (!data) return null;

  const giftSpark = data.seriesDaily.map((d) => d.raisedPence);
  const traffic = data.traffic;

  return (
    <section id="analytics" className="scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-pvn-navy">
            Analytics
          </h2>
          <p className="mt-1 max-w-xl text-sm text-pvn-navy/55">
            Gift performance and link traffic — privacy-first, no visitor names.
          </p>
        </div>
        <div className="flex gap-1" role="tablist" aria-label="Analytics">
          {(
            [
              { id: "gifts" as const, label: "Gifts" },
              { id: "traffic" as const, label: "Traffic" },
            ] as const
          ).map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item.id)}
                className={`font-nav min-h-9 rounded-md px-3 text-[0.65rem] font-bold tracking-[0.12em] uppercase transition ${
                  active
                    ? "bg-pvn-navy text-pvn-cream"
                    : "border border-pvn-navy/15 text-pvn-navy/55 hover:text-pvn-navy"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "gifts" ? (
        <div className="mt-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-pvn-navy/60">
              Raised last 30 days · sparkline
            </p>
            <span className="text-pvn-gold">
              <Sparkline values={giftSpark} />
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            <Stat
              label="Progress"
              value={`${data.progressPct}%`}
              hint={`${formatWholeGbp(data.raisedPence)} of ${formatWholeGbp(data.targetPence)}`}
            />
            <Stat
              label="Gifts"
              value={String(data.giftCount)}
              hint={`~${data.approxUniqueDonors} donors`}
            />
            <Stat
              label="7-day raised"
              value={formatTidyGbp(data.raisedLast7Pence)}
              hint={`${data.giftsLast7} gifts`}
            />
            <Stat
              label="Avg gift"
              value={formatTidyGbp(data.averageGiftPence)}
              hint={`Median ${formatTidyGbp(data.medianGiftPence)}`}
            />
            <Stat
              label="Largest"
              value={formatTidyGbp(data.largestGiftPence)}
            />
            <Stat
              label="Gift Aid"
              value={String(data.giftAidCount)}
              hint={`~${formatTidyGbp(data.giftAidEstimatePence)} reclaim`}
            />
            <Stat
              label="Messages"
              value={String(data.messagesTotal)}
              hint={`${data.messagesUnreplied} unreplied · ${data.replyRatePct}% replied`}
            />
            <Stat
              label="Quiet for"
              value={
                data.daysSinceLastGift === null
                  ? "—"
                  : `${data.daysSinceLastGift}d`
              }
              hint={
                data.daysLive !== null ? `${data.daysLive}d live` : "Not live yet"
              }
            />
          </div>
          <p className="text-xs text-pvn-navy/45">
            Gift mix: {data.oneOffCount} one-off ·{" "}
            {data.recurringCount} monthly · {data.newDonorCount} first-time
            emails · {data.returningDonorCount} returning gifts
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {!traffic || traffic.pageViewsAll === 0 ? (
            <p className="rounded-sm border border-dashed border-pvn-navy/15 bg-white/40 px-4 py-6 text-sm text-pvn-navy/55">
              No page views recorded yet. Share your pot link — visits from the
              public page appear here (after a short delay).
            </p>
          ) : (
            <>
              {traffic.viewsWithZeroGifts7 ? (
                <p className="rounded-sm border border-amber-600/20 bg-amber-500/10 px-3.5 py-2.5 text-sm text-amber-950/80">
                  People are looking (last 7 days) but no new gifts landed —
                  a nudge to your circle may help.
                </p>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-pvn-navy/60">
                  Views last 30 days · sparkline
                </p>
                <span className="text-pvn-gold">
                  <Sparkline
                    values={traffic.seriesDaily.map((d) => d.views)}
                  />
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                <Stat
                  label="Views (7d)"
                  value={String(traffic.pageViews7)}
                  hint={`${traffic.uniqueVisitors7} unique`}
                />
                <Stat
                  label="Views (30d)"
                  value={String(traffic.pageViews30)}
                  hint={`${traffic.uniqueVisitors30} unique`}
                />
                <Stat
                  label="Conversion (7d)"
                  value={
                    traffic.conversionPct7 === null
                      ? "—"
                      : `${traffic.conversionPct7}%`
                  }
                  hint="Gifts ÷ unique visitors"
                />
                <Stat
                  label="All-time views"
                  value={String(traffic.pageViewsAll)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <p className="font-nav text-[0.6rem] font-bold tracking-[0.14em] text-pvn-navy/45 uppercase">
                    Top countries (30d)
                  </p>
                  <div className="mt-2">
                    <BarList
                      items={traffic.topCountries.map((c) => ({
                        label: c.country,
                        value: c.views,
                      }))}
                      empty="No country data yet (needs edge geo)."
                    />
                  </div>
                </div>
                <div>
                  <p className="font-nav text-[0.6rem] font-bold tracking-[0.14em] text-pvn-navy/45 uppercase">
                    Top referrers (30d)
                  </p>
                  <div className="mt-2">
                    <BarList
                      items={traffic.topReferrers.map((r) => ({
                        label: r.host,
                        value: r.views,
                      }))}
                      empty="Mostly direct visits so far."
                    />
                  </div>
                </div>
                <div>
                  <p className="font-nav text-[0.6rem] font-bold tracking-[0.14em] text-pvn-navy/45 uppercase">
                    Share sources (30d)
                  </p>
                  <div className="mt-2">
                    <BarList
                      items={traffic.shareSources.map((s) => ({
                        label: s.src,
                        value: s.views,
                      }))}
                      empty="Copy links with src= to attribute shares."
                    />
                  </div>
                </div>
                <div>
                  <p className="font-nav text-[0.6rem] font-bold tracking-[0.14em] text-pvn-navy/45 uppercase">
                    Devices (30d)
                  </p>
                  <p className="mt-2 text-sm text-pvn-navy/65">
                    {traffic.deviceSplit.mobile} mobile ·{" "}
                    {traffic.deviceSplit.desktop} desktop ·{" "}
                    {traffic.deviceSplit.other} other
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
