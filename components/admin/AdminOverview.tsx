"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AdminDonationStatusChip } from "@/components/admin/AdminDonationStatusChip";
import { useAdminDashboard } from "@/components/admin/AdminDashboardShell";
import { useToast } from "@/components/toast/ToastProvider";
import { adminFetch } from "@/lib/admin-client";
import {
  readHostClientCache,
  writeHostClientCache,
} from "@/lib/host-client-cache";
import { contactTopicLabel } from "@/lib/contact-topics";
import { formatTidyGbp, formatWholeGbp, percentOf } from "@/lib/money";
import { visitorSafeApiError, visitorSafeMessage } from "@/lib/visitor-safe";

type Range = "today" | "7d" | "30d" | "all";
type Tab = "attention" | "snapshot" | "activity";

type OverviewPayload = {
  range: Range;
  pendingStuckHours: number;
  kpis: {
    succeededPence: number;
    succeededCount: number;
    averagePence: number;
    pendingCount: number;
    failedCount: number;
    direct: { pence: number; count: number };
    pot: { pence: number; count: number };
    giftAid: { pence: number; count: number };
    pots: {
      pending: number;
      active: number;
      paused: number;
      disabled: number;
      closed: number;
    };
    unhandledContacts: number;
    buildingFund: { targetPence: number; raisedPence: number };
  };
  attention: {
    stuckPending: Array<{
      id: string;
      amount: number;
      donorEmail: string | null;
      createdAt: string;
      destination: string;
      pot: { slug: string; title: string } | null;
    }>;
    unseededPots: Array<{
      slug: string;
      title: string;
      createdAt: string;
      hostName: string;
      hostEmail: string;
    }>;
    unhandledContacts: Array<{
      id: string;
      name: string;
      email: string;
      topic: string;
      createdAt: string;
    }>;
  };
  recent: {
    succeeded: FeedItem[];
    failed: FeedItem[];
  };
};

type FeedItem = {
  id: string;
  amount: number;
  donorName: string | null;
  donorEmail: string | null;
  isAnonymous: boolean;
  createdAt: string;
  pot: { slug: string; title: string } | null;
};

const RANGES: Array<{ id: Range; label: string }> = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7d" },
  { id: "30d", label: "30d" },
  { id: "all", label: "All" },
];

const OVERVIEW_CACHE_TTL_MS = 60_000;

function overviewCacheKey(nextRange: Range) {
  return `admin-overview:${nextRange}`;
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function whereLabel(item: { pot: { title: string } | null }) {
  return item.pot?.title ?? "/give";
}

function donorLine(item: FeedItem) {
  const name = item.isAnonymous
    ? "Anonymous"
    : item.donorName?.trim() || "—";
  return item.donorEmail ? `${name} · ${item.donorEmail}` : name;
}

function rangeHint(range: Range) {
  if (range === "today") return "today";
  if (range === "7d") return "last 7 days";
  if (range === "30d") return "last 30 days";
  return "all time";
}

function AdminOverviewSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading overview…</span>
      <div className="relative overflow-hidden rounded-sm bg-pvn-navy px-4 py-4 sm:px-6 sm:py-5">
        <div className="h-2.5 w-16 animate-pulse rounded-sm bg-pvn-cream/15" />
        <div className="mt-2 h-7 w-48 max-w-full animate-pulse rounded-sm bg-pvn-cream/20" />
        <div className="mt-2 h-4 w-full max-w-md animate-pulse rounded-sm bg-pvn-cream/10" />
        <div className="mt-4 flex gap-2">
          <div className="h-9 w-28 animate-pulse rounded-md bg-pvn-gold/40" />
          <div className="h-9 w-24 animate-pulse rounded-md bg-pvn-cream/10" />
        </div>
        <div className="mt-5 grid gap-4 border-t border-pvn-cream/12 pt-4 sm:grid-cols-2">
          <div>
            <div className="h-2.5 w-24 animate-pulse rounded-sm bg-pvn-cream/10" />
            <div className="mt-1.5 h-9 w-32 animate-pulse rounded-sm bg-pvn-cream/20" />
          </div>
          <div className="space-y-2">
            <div className="h-1.5 w-full animate-pulse rounded-sm bg-pvn-cream/15" />
            <div className="h-1.5 w-4/5 animate-pulse rounded-sm bg-pvn-cream/15" />
          </div>
        </div>
      </div>
      <div className="mt-8 flex gap-4 border-b border-pvn-navy/10 pb-3">
        <div className="h-4 w-20 animate-pulse rounded-sm bg-pvn-navy/10" />
        <div className="h-4 w-16 animate-pulse rounded-sm bg-pvn-navy/10" />
        <div className="h-4 w-16 animate-pulse rounded-sm bg-pvn-navy/10" />
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
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

/**
 * Admin home — Host-style hero, attention queue, range KPIs, recent gifts.
 */
export function AdminOverview() {
  const toast = useToast();
  const { data: session } = useAdminDashboard();
  const [range, setRange] = useState<Range>("7d");
  const [tab, setTab] = useState<Tab | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<OverviewPayload | null>(null);
  const tabPicked = useRef(false);

  const load = useCallback(async (nextRange: Range, soft: boolean) => {
    const cached = readHostClientCache<OverviewPayload>(
      overviewCacheKey(nextRange),
      OVERVIEW_CACHE_TTL_MS,
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
      `/api/admin/overview?range=${encodeURIComponent(nextRange)}`,
    );
    const json = (await response.json()) as OverviewPayload & {
      error?: string;
    };
    if (!response.ok) {
      throw new Error(
        visitorSafeApiError(
          response.status,
          json.error,
          "We could not load the overview.",
        ),
      );
    }
    setData(json);
    writeHostClientCache(overviewCacheKey(nextRange), json);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const soft = Boolean(
      readHostClientCache(overviewCacheKey(range), OVERVIEW_CACHE_TTL_MS),
    );
    // load() paints the sessionStorage cache before revalidating; that first
    // render from an external store is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(range, soft).catch((err) => {
      if (cancelled) return;
      toast.error(
        "Overview unavailable",
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

  const urgentCount = data
    ? data.attention.stuckPending.length +
      data.attention.unhandledContacts.length +
      data.attention.unseededPots.length
    : 0;

  // Default tab once: Needs you when something is waiting, else Snapshot.
  useEffect(() => {
    if (!data || tabPicked.current) return;
    tabPicked.current = true;
    setTab(urgentCount > 0 ? "attention" : "snapshot");
  }, [data, urgentCount]);

  const activeTab = tab ?? (urgentCount > 0 ? "attention" : "snapshot");

  if (loading && !data) return <AdminOverviewSkeleton />;

  if (!data) {
    return (
      <div className="mx-auto flex min-h-[36vh] max-w-lg flex-col items-center justify-center rounded-sm border border-dashed border-pvn-navy/15 bg-gradient-to-b from-pvn-cream/80 to-white px-5 py-12 text-center">
        <h2 className="font-display text-2xl font-semibold text-pvn-navy">
          Overview unavailable
        </h2>
        <p className="mt-2 text-sm text-pvn-navy/60">
          We could not load Operations. Check your connection and try again.
        </p>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void load(range, false).catch((err) => {
              toast.error(
                "Overview unavailable",
                visitorSafeMessage(
                  err instanceof Error ? err.message : null,
                  "Please try again.",
                ),
              );
              setLoading(false);
            });
          }}
          className="font-nav mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-pvn-navy px-5 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-cream uppercase"
        >
          Try again
        </button>
      </div>
    );
  }

  const fundPct = percentOf(
    data.kpis.buildingFund.raisedPence,
    data.kpis.buildingFund.targetPence,
  );

  const primaryCta =
    data.attention.stuckPending.length > 0
      ? {
          href: "/admin/gifts?status=PENDING",
          label: `Stuck cards · ${data.attention.stuckPending.length}`,
        }
      : data.kpis.unhandledContacts > 0
        ? {
            href: "/admin/inbox",
            label: `Inbox · ${data.kpis.unhandledContacts}`,
          }
        : data.kpis.pots.pending > 0
          ? {
              href: "/admin/pots",
              label: `Needs seed · ${data.kpis.pots.pending}`,
            }
          : { href: "/admin/gifts", label: "All gifts" };

  const statusLine =
    urgentCount > 0
      ? `${urgentCount} item${urgentCount === 1 ? "" : "s"} need a decision.`
      : "You’re clear on urgent work.";

  const tabs: Array<{ id: Tab; label: string; badge?: number }> = [
    {
      id: "attention",
      label: "Needs you",
      badge: urgentCount > 0 ? urgentCount : undefined,
    },
    { id: "snapshot", label: "Snapshot" },
    { id: "activity", label: "Activity" },
  ];

  return (
    <div className="w-full">
      {/* Hero — one composition, same language as Host overview */}
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
              Overview
            </p>
            <h1 className="font-display mt-0.5 text-xl font-semibold text-balance sm:text-2xl">
              {urgentCount > 0 ? "Needs a decision" : "Operations"}
            </h1>
            <p className="mt-1 text-sm leading-snug text-pvn-cream/70">
              {statusLine}
              {session?.user.email ? (
                <span className="text-pvn-cream/40">
                  {" "}
                  · {session.user.email}
                </span>
              ) : null}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={primaryCta.href}
              className="font-nav inline-flex min-h-9 items-center rounded-md bg-pvn-gold px-3.5 text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light"
            >
              {primaryCta.label}
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
              {refreshing ? (
                <span
                  className="h-3 w-3 animate-spin rounded-full border border-pvn-gold border-t-transparent"
                  aria-label="Refreshing"
                />
              ) : null}
            </div>
            <p className="font-display mt-0.5 text-3xl font-semibold tracking-tight text-pvn-cream sm:text-4xl">
              {formatWholeGbp(data.kpis.succeededPence)}
            </p>
            <p className="mt-1 text-sm text-pvn-cream/55">
              {data.kpis.succeededCount}{" "}
              {data.kpis.succeededCount === 1 ? "gift" : "gifts"}
              <span className="text-pvn-cream/30"> · </span>
              avg {formatTidyGbp(data.kpis.averagePence)}
              <span className="text-pvn-cream/30"> · </span>
              {data.kpis.pots.active} live fundraisers
              {data.kpis.pots.pending > 0 ? (
                <>
                  <span className="text-pvn-cream/30"> · </span>
                  {data.kpis.pots.pending} need seed
                </>
              ) : null}
            </p>
          </div>

          <Link href="/admin/building-fund" className="group block">
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="text-xs text-pvn-cream/70 group-hover:text-pvn-gold">
                Building fund
              </span>
              <span className="font-nav shrink-0 text-[0.6rem] font-bold tracking-[0.1em] text-pvn-gold uppercase">
                {fundPct}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-sm bg-pvn-cream/15">
              <div
                className="h-full rounded-sm bg-pvn-gold transition-[width] duration-500"
                style={{
                  width: `${Math.min(100, Math.max(2, fundPct))}%`,
                }}
              />
            </div>
            <p className="mt-1.5 text-[0.75rem] text-pvn-cream/45">
              {formatWholeGbp(data.kpis.buildingFund.raisedPence)} of{" "}
              {formatWholeGbp(data.kpis.buildingFund.targetPence)}
            </p>
          </Link>
        </div>
      </div>

      <nav
        className="mt-8 flex gap-1 overflow-x-auto border-b border-pvn-navy/10 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Overview sections"
      >
        {tabs.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                tabPicked.current = true;
                setTab(item.id);
              }}
              className={`font-nav relative -mb-px shrink-0 border-b-2 px-3.5 py-2.5 text-[0.7rem] font-bold tracking-[0.14em] uppercase transition sm:px-4 ${
                active
                  ? "border-pvn-gold text-pvn-navy"
                  : "border-transparent text-pvn-navy/45 hover:text-pvn-navy"
              }`}
            >
              {item.label}
              {item.badge ? (
                <span
                  className={`ml-1.5 ${active ? "text-pvn-gold" : "text-pvn-navy/35"}`}
                >
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="mt-6">
        {activeTab === "attention" ? (
          <div className="space-y-4">
            {urgentCount === 0 ? (
              <section className="border border-pvn-navy/10 bg-white px-4 py-8 text-center sm:px-5">
                <h2 className="font-display text-xl font-semibold text-pvn-navy">
                  Nothing urgent
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-pvn-navy/60">
                  No stuck cards, open contacts, or fundraisers waiting on a seed.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    tabPicked.current = true;
                    setTab("snapshot");
                  }}
                  className="font-nav mt-5 text-[0.65rem] font-bold tracking-[0.12em] text-pvn-gold uppercase"
                >
                  View snapshot →
                </button>
              </section>
            ) : (
              <>
                {data.attention.stuckPending.length > 0 ? (
                  <AttentionBlock
                    title={`Card pending over ${data.pendingStuckHours}h`}
                    tone="warn"
                    href="/admin/gifts?status=PENDING"
                  >
                    {data.attention.stuckPending.map((g) => (
                      <AttentionGiftRow key={g.id} gift={g} />
                    ))}
                  </AttentionBlock>
                ) : null}

                {data.attention.unhandledContacts.length > 0 ? (
                  <AttentionBlock
                    title={`Contact inbox (${data.kpis.unhandledContacts})`}
                    tone="warn"
                    href="/admin/inbox"
                  >
                    {data.attention.unhandledContacts.map((c) => (
                      <li
                        key={c.id}
                        className="flex flex-wrap items-baseline justify-between gap-2 border-b border-pvn-navy/8 py-2.5 text-sm last:border-0"
                      >
                        <Link
                          href={`/admin/inbox/${c.id}`}
                          className="min-w-0 text-pvn-navy underline decoration-pvn-gold/30 underline-offset-2"
                        >
                          {c.name}{" "}
                          <span className="text-pvn-navy/45">
                            · {contactTopicLabel(c.topic)}
                          </span>
                        </Link>
                        <span className="shrink-0 text-[0.75rem] text-pvn-navy/45">
                          {formatWhen(c.createdAt)}
                        </span>
                      </li>
                    ))}
                  </AttentionBlock>
                ) : null}

                {data.attention.unseededPots.length > 0 ? (
                  <AttentionBlock
                    title="Fundraisers awaiting seed"
                    tone="muted"
                    href="/admin/pots"
                  >
                    {data.attention.unseededPots.map((p) => (
                      <li
                        key={p.slug}
                        className="flex flex-wrap items-baseline justify-between gap-2 border-b border-pvn-navy/8 py-2.5 text-sm last:border-0"
                      >
                        <Link
                          href={`/admin/pots/${p.slug}`}
                          className="font-medium text-pvn-navy underline decoration-pvn-gold/30 underline-offset-2"
                        >
                          {p.title}
                        </Link>
                        <span className="text-[0.75rem] text-pvn-navy/45">
                          {p.hostName}
                        </span>
                      </li>
                    ))}
                  </AttentionBlock>
                ) : null}
              </>
            )}
          </div>
        ) : null}

        {activeTab === "snapshot" ? (
          <div className="space-y-6">
            <div className="grid gap-px overflow-hidden rounded-sm border border-pvn-navy/10 bg-pvn-navy/10 sm:grid-cols-2 lg:grid-cols-3">
              <KpiCell
                label="Direct /give"
                value={formatWholeGbp(data.kpis.direct.pence)}
                hint={`${data.kpis.direct.count} gifts`}
                href="/admin/gifts?destination=DIRECT"
              />
              <KpiCell
                label="Fundraiser gifts"
                value={formatWholeGbp(data.kpis.pot.pence)}
                hint={`${data.kpis.pot.count} gifts`}
                href="/admin/gifts?destination=POT"
              />
              <KpiCell
                label="Gift Aid"
                value={formatWholeGbp(data.kpis.giftAid.pence)}
                hint={`${data.kpis.giftAid.count} flagged`}
                href="/admin/gifts?giftAid=true&status=SUCCEEDED"
              />
              <KpiCell
                label="Pending"
                value={String(data.kpis.pendingCount)}
                href="/admin/gifts?status=PENDING"
              />
              <KpiCell
                label="Failed"
                value={String(data.kpis.failedCount)}
                href="/admin/gifts?status=FAILED"
              />
              <KpiCell
                label="Contacts open"
                value={String(data.kpis.unhandledContacts)}
                href="/admin/inbox"
              />
            </div>

            <section className="border border-pvn-navy/10 bg-white px-4 py-5 sm:px-5">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-nav text-[0.6rem] font-bold tracking-[0.14em] text-pvn-navy/40 uppercase">
                  Fundraisers · live
                </p>
                <Link
                  href="/admin/pots"
                  className="font-nav text-[0.6rem] font-bold tracking-[0.12em] text-pvn-gold uppercase"
                >
                  All fundraisers →
                </Link>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm sm:grid-cols-3">
                <PotStat label="Active" value={data.kpis.pots.active} />
                <PotStat
                  label="Needs seed"
                  value={data.kpis.pots.pending}
                  href="/admin/pots"
                />
                <PotStat label="Paused" value={data.kpis.pots.paused} />
                <PotStat label="Closed" value={data.kpis.pots.closed} />
                <PotStat label="Hidden" value={data.kpis.pots.disabled} />
              </dl>
            </section>
          </div>
        ) : null}

        {activeTab === "activity" ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <FeedColumn
              title="Recent succeeded"
              items={data.recent.succeeded}
              empty="No succeeded gifts yet."
              status="SUCCEEDED"
            />
            <FeedColumn
              title="Recent failed"
              items={data.recent.failed}
              empty="No failed gifts in the recent list."
              status="FAILED"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function KpiCell({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block bg-white px-3 py-3.5 transition hover:bg-pvn-cream/40 sm:px-4"
    >
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
    </Link>
  );
}

function PotStat({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href?: string;
}) {
  const valueEl = <span className="font-medium text-pvn-navy">{value}</span>;
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-pvn-navy/8 pb-1.5">
      <dt className="text-pvn-navy/55">{label}</dt>
      <dd>
        {href ? (
          <Link href={href} className="underline decoration-pvn-gold/40">
            {valueEl}
          </Link>
        ) : (
          valueEl
        )}
      </dd>
    </div>
  );
}

function AttentionBlock({
  title,
  tone,
  href,
  children,
}: {
  title: string;
  tone: "warn" | "muted";
  href?: string;
  children: ReactNode;
}) {
  const border =
    tone === "warn"
      ? "border-amber-800/25 bg-amber-50/60"
      : "border-pvn-navy/10 bg-white";

  return (
    <section className={`rounded-sm border px-4 py-4 sm:px-5 ${border}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-nav text-[0.65rem] font-bold tracking-[0.14em] text-pvn-navy uppercase">
          {title}
        </h2>
        {href ? (
          <Link
            href={href}
            className="font-nav text-[0.6rem] font-bold tracking-[0.12em] text-pvn-gold uppercase"
          >
            Open →
          </Link>
        ) : null}
      </div>
      <ul className="mt-2">{children}</ul>
    </section>
  );
}

function AttentionGiftRow({
  gift,
}: {
  gift: {
    id: string;
    amount: number;
    donorEmail: string | null;
    createdAt: string;
    pot: { slug: string; title: string } | null;
  };
}) {
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-2 border-b border-pvn-navy/8 py-2.5 text-sm last:border-0">
      <Link
        href={`/admin/gifts/${gift.id}`}
        className="font-medium text-pvn-navy underline decoration-pvn-gold/30 underline-offset-2"
      >
        {formatTidyGbp(gift.amount)}
      </Link>
      <span className="text-pvn-navy/60">{whereLabel(gift)}</span>
      <span className="w-full text-[0.75rem] text-pvn-navy/45 sm:w-auto">
        {gift.donorEmail ?? "No email"} · {formatWhen(gift.createdAt)}
      </span>
    </li>
  );
}

function FeedColumn({
  title,
  items,
  empty,
  status,
}: {
  title: string;
  items: FeedItem[];
  empty: string;
  status: "SUCCEEDED" | "FAILED";
}) {
  return (
    <section className="border border-pvn-navy/10 bg-white px-4 py-4 sm:px-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-nav text-[0.65rem] font-bold tracking-[0.16em] text-pvn-gold uppercase">
          {title}
        </h2>
        <Link
          href={`/admin/gifts?status=${status}`}
          className="font-nav text-[0.6rem] font-bold tracking-[0.12em] text-pvn-navy/45 uppercase hover:text-pvn-navy"
        >
          All →
        </Link>
      </div>
      {items.length === 0 ? (
        <div className="mt-4 border border-dashed border-pvn-navy/12 bg-pvn-cream/40 px-4 py-8 text-center">
          <p className="text-sm text-pvn-navy/55">{empty}</p>
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-pvn-navy/8">
          {items.map((item) => (
            <li key={item.id} className="py-3 first:pt-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link
                  href={`/admin/gifts/${item.id}`}
                  className="font-medium text-pvn-navy underline decoration-pvn-gold/25 underline-offset-2"
                >
                  {formatTidyGbp(item.amount)}
                </Link>
                <AdminDonationStatusChip status={status} />
              </div>
              <p className="mt-0.5 text-[0.75rem] text-pvn-navy/55">
                {whereLabel(item)} · {formatWhen(item.createdAt)}
              </p>
              <p className="mt-0.5 truncate text-[0.75rem] text-pvn-navy/40">
                {donorLine(item)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
