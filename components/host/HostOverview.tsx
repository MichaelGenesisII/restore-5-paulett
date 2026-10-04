"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { HostEmptyState } from "@/components/host/HostEmptyState";
import { HostPotProgress } from "@/components/host/HostPotProgress";
import { HostPotStatusChip } from "@/components/host/HostPotStatusChip";
import { useHostDashboard } from "@/components/host/HostDashboardShell";
import { formatWholeGbp, percentOf } from "@/lib/money";

type Tab = "focus" | "movers" | "pots";

function HostAvatarPlaceholder() {
  return (
    <span
      className="flex h-full w-full items-center justify-center bg-pvn-cream/10 text-pvn-gold/70 transition group-hover:bg-pvn-cream/15 group-hover:text-pvn-gold"
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        className="h-7 w-7 sm:h-8 sm:w-8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="9" r="3.5" />
        <path d="M5 19c0-3.2 3-5 7-5s7 1.8 7 5" />
      </svg>
    </span>
  );
}

function HostOverviewAvatar({
  photoUrl,
}: {
  photoUrl: string | null | undefined;
  name?: string | null;
  email?: string;
}) {
  const trimmedUrl = photoUrl?.trim() || null;
  // Remembers which URL failed, so a new photo is retried automatically.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const failed = failedUrl !== null && failedUrl === trimmedUrl;

  const showPhoto = Boolean(trimmedUrl) && !failed;

  return (
    <Link
      href="/host/account"
      className="group relative h-12 w-12 shrink-0 overflow-hidden rounded-sm ring-1 ring-pvn-gold/50 transition hover:ring-pvn-gold sm:h-14 sm:w-14"
      aria-label={showPhoto ? "View account photo" : "Add a profile photo"}
    >
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={trimmedUrl!}
          alt=""
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          onError={() => setFailedUrl(trimmedUrl)}
        />
      ) : (
        <HostAvatarPlaceholder />
      )}
    </Link>
  );
}

function HostOverviewSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your overview…</span>
      <div className="relative overflow-hidden rounded-sm bg-pvn-navy px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="h-12 w-12 shrink-0 animate-pulse rounded-sm bg-pvn-cream/15 sm:h-14 sm:w-14" />
          <div className="min-w-0 flex-1">
            <div className="h-2.5 w-16 animate-pulse rounded-sm bg-pvn-cream/15" />
            <div className="mt-2 h-6 w-40 max-w-full animate-pulse rounded-sm bg-pvn-cream/20 sm:h-7 sm:w-52" />
            <div className="mt-2 h-3.5 w-full max-w-md animate-pulse rounded-sm bg-pvn-cream/10" />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-pvn-cream/12 pt-4">
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
            <div className="h-1.5 w-full animate-pulse rounded-sm bg-pvn-cream/15" />
            <div className="h-1.5 w-4/5 animate-pulse rounded-sm bg-pvn-cream/15" />
          </div>
        </div>
      </div>
      <div className="mt-8 flex gap-4 border-b border-pvn-navy/10 pb-3">
        <div className="h-4 w-20 animate-pulse rounded-sm bg-pvn-navy/10" />
        <div className="h-4 w-16 animate-pulse rounded-sm bg-pvn-navy/10" />
        <div className="h-4 w-12 animate-pulse rounded-sm bg-pvn-navy/10" />
      </div>
      <ul className="mt-6 grid gap-3">
        {[0, 1, 2].map((i) => (
          <li
            key={i}
            className="border border-pvn-navy/10 bg-white/55 p-4 sm:p-5"
          >
            <div className="h-6 w-2/3 max-w-xs animate-pulse rounded-sm bg-pvn-navy/10" />
            <div className="mt-3 h-4 w-40 animate-pulse rounded-sm bg-pvn-navy/8" />
            <div className="mt-4 h-2 w-full animate-pulse rounded-sm bg-pvn-navy/8" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HostOverview() {
  const { data, meReady } = useHostDashboard();
  const [tab, setTab] = useState<Tab>("focus");

  const summary = useMemo(() => {
    if (!data) {
      return {
        raised: 0,
        gifts: 0,
        live: 0,
        pending: 0,
        paused: 0,
        unreplied: 0,
        firstName: null as string | null,
        topMovers: [] as typeof data extends null ? never[] : NonNullable<typeof data>["pots"],
        needsAttention: [] as typeof data extends null ? never[] : NonNullable<typeof data>["pots"],
      };
    }

    const raised = data.pots.reduce((sum, pot) => sum + pot.totalRaised, 0);
    const gifts = data.pots.reduce((sum, pot) => sum + pot.donorCount, 0);
    const live = data.pots.filter((p) => p.status === "ACTIVE").length;
    const pending = data.pots.filter((p) => p.status === "PENDING").length;
    const paused = data.pots.filter((p) => p.status === "PAUSED").length;
    const unreplied = data.pots.reduce(
      (sum, pot) => sum + (pot.unrepliedCount ?? 0),
      0,
    );
    const firstName = data.user.name?.trim().split(/\s+/)[0] || null;

    const topMovers = [...data.pots]
      .filter((p) => p.totalRaised > 0 || p.donorCount > 0)
      .sort((a, b) => b.totalRaised - a.totalRaised)
      .slice(0, 5);

    const needsAttention = [...data.pots]
      .filter((p) => (p.unrepliedCount ?? 0) > 0 || p.status === "PENDING")
      .sort((a, b) => {
        if (a.status === "PENDING" && b.status !== "PENDING") return -1;
        if (b.status === "PENDING" && a.status !== "PENDING") return 1;
        return (b.unrepliedCount ?? 0) - (a.unrepliedCount ?? 0);
      });

    return {
      raised,
      gifts,
      live,
      pending,
      paused,
      unreplied,
      firstName,
      topMovers,
      needsAttention,
    };
  }, [data]);

  if (!data) return null;
  if (!meReady) return <HostOverviewSkeleton />;

  const {
    raised,
    gifts,
    live,
    pending,
    paused,
    unreplied,
    firstName,
    topMovers,
    needsAttention,
  } = summary;

  const focusCount = needsAttention.length;
  const primaryCta =
    unreplied > 0
      ? {
          href: "/host/inbox",
          label: `Open inbox · ${unreplied}`,
        }
      : pending > 0
        ? {
            href: `/host/pots/${needsAttention.find((p) => p.status === "PENDING")?.slug ?? data.pots[0]?.slug ?? ""}`,
            label: "Seed a fundraiser",
          }
        : data.pots.length === 0
          ? { href: "/host/pots/new", label: "Start a fundraiser" }
          : { href: "/host/pots", label: "Your fundraisers" };

  const tabs: Array<{ id: Tab; label: string; badge?: number }> = [
    {
      id: "focus",
      label: "Needs you",
      badge: focusCount > 0 ? focusCount : undefined,
    },
    { id: "movers", label: "Movers" },
    { id: "pots", label: "Fundraisers" },
  ];

  return (
    <div>
      {/* Greeting composition — one job */}
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
          <div className="flex min-w-0 max-w-xl items-center gap-3 sm:gap-4">
            <HostOverviewAvatar photoUrl={data.user.photoUrl} />
            <div className="min-w-0">
              <p className="font-nav text-[0.6rem] font-bold tracking-[0.18em] text-pvn-gold uppercase">
                Overview
              </p>
              <h1 className="font-display mt-0.5 text-xl font-semibold text-balance sm:text-2xl">
                {firstName ? `Hello, ${firstName}` : "Your wall"}
              </h1>
              <p className="mt-1 text-sm leading-snug text-pvn-cream/70">
                {data.pots.length === 0
                  ? "No fundraisers yet — open the first one and Overview will fill with progress and gift messages."
                  : unreplied > 0
                    ? `${unreplied} gift ${unreplied === 1 ? "message" : "messages"} waiting for a reply. Start there.`
                    : pending > 0
                      ? `${pending} ${pending === 1 ? "fundraiser still needs" : "fundraisers still need"} a seed to go live.`
                      : `No gift messages waiting for a reply. ${live} live ${live === 1 ? "fundraiser" : "fundraisers"} on the wall.`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={primaryCta.href}
              className="font-nav inline-flex min-h-9 items-center rounded-md bg-pvn-gold px-3.5 text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light"
            >
              {primaryCta.label}
            </Link>
            {data.pots.length > 0 ? (
              <Link
                href="/host/pots/new"
                className="font-nav inline-flex min-h-9 items-center rounded-md border border-pvn-cream/30 px-3 text-[0.65rem] font-bold tracking-[0.12em] text-pvn-cream uppercase transition hover:border-pvn-gold hover:text-pvn-gold"
              >
                Start a fundraiser
              </Link>
            ) : null}
          </div>
        </div>

        {data.pots.length > 0 ? (
          <div className="relative mt-5 grid gap-4 border-t border-pvn-cream/12 pt-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] sm:items-end">
            <div>
              <p className="font-nav text-[0.55rem] font-bold tracking-[0.16em] text-pvn-cream/45 uppercase">
                Raised across fundraisers
              </p>
              <p className="font-display mt-0.5 text-3xl font-semibold tracking-tight text-pvn-cream sm:text-4xl">
                {formatWholeGbp(raised)}
              </p>
              <p className="mt-1 text-sm text-pvn-cream/55">
                {gifts} {gifts === 1 ? "gift" : "gifts"}
                <span className="text-pvn-cream/30"> · </span>
                {live} live
                {pending > 0 ? (
                  <>
                    <span className="text-pvn-cream/30"> · </span>
                    {pending} need seed
                  </>
                ) : null}
                {paused > 0 ? (
                  <>
                    <span className="text-pvn-cream/30"> · </span>
                    {paused} paused
                  </>
                ) : null}
              </p>
            </div>

            <div className="space-y-2">
              {topMovers.slice(0, 3).map((pot) => {
                const pct = percentOf(pot.totalRaised, pot.targetAmount);
                return (
                  <Link
                    key={pot.slug}
                    href={`/host/pots/${pot.slug}#analytics`}
                    className="block group"
                  >
                    <div className="mb-1 flex items-baseline justify-between gap-2">
                      <span className="truncate text-xs text-pvn-cream/70 group-hover:text-pvn-gold">
                        {pot.title}
                      </span>
                      <span className="font-nav shrink-0 text-[0.6rem] font-bold tracking-[0.1em] text-pvn-gold uppercase">
                        {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-sm bg-pvn-cream/15">
                      <div
                        className="h-full rounded-sm bg-pvn-gold transition-[width] duration-500"
                        style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
                      />
                    </div>
                  </Link>
                );
              })}
              {topMovers.length === 0 ? (
                <p className="text-sm text-pvn-cream/45">
                  Gifts will draw the pulse here.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {data.pots.length === 0 ? (
        <HostEmptyState
          title="Your wall is waiting"
          body="Start a fundraiser, seed it, and invite your people. Overview will fill with movers, thank-yous, and progress."
          actionHref="/host/pots/new"
          actionLabel="Start a fundraiser"
        />
      ) : (
        <>
          <nav
            className="mt-8 flex gap-1 overflow-x-auto border-b border-pvn-navy/10 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Overview sections"
          >
            {tabs.map((item) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
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

          {tab === "focus" ? (
            <section className="mt-6 animate-[pvn-rise_0.35s_ease-out]">
              <h2 className="sr-only">Needs you</h2>
              {needsAttention.length === 0 ? (
                <div className="border border-pvn-navy/10 bg-white/55 px-5 py-10 text-center">
                  <p className="font-nav text-[0.6rem] font-bold tracking-[0.18em] text-pvn-gold uppercase">
                    Clear
                  </p>
                  <p className="font-display mt-2 text-2xl font-semibold text-pvn-navy">
                    Nothing waiting
                  </p>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-pvn-navy/55">
                    No unreplied messages and no fundraisers stuck on seed.
                    Check Movers for who’s leading the wall.
                  </p>
                  <button
                    type="button"
                    onClick={() => setTab("movers")}
                    className="font-nav mt-5 inline-flex text-[0.65rem] font-bold tracking-[0.12em] text-pvn-gold uppercase hover:text-pvn-navy"
                  >
                    See movers →
                  </button>
                </div>
              ) : (
                <ul className="grid gap-3">
                  {needsAttention.map((pot) => {
                    const needsSeed = pot.status === "PENDING";
                    const unrepliedCount = pot.unrepliedCount ?? 0;
                    return (
                      <li
                        key={pot.slug}
                        className="border border-pvn-navy/10 bg-white/55 p-4 transition hover:border-pvn-navy/18 hover:bg-white/85 sm:p-5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Link
                              href={
                                needsSeed
                                  ? `/host/pots/${pot.slug}`
                                  : `/host/pots/${pot.slug}#messages`
                              }
                              className="font-display text-xl font-semibold text-pvn-navy transition hover:text-pvn-gold"
                            >
                              {pot.title}
                            </Link>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <HostPotStatusChip status={pot.status} />
                              {unrepliedCount > 0 ? (
                                <span className="font-nav text-[0.6rem] font-bold tracking-[0.12em] text-pvn-gold uppercase">
                                  {unrepliedCount} unreplied
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-2 text-sm text-pvn-navy/55">
                              {needsSeed
                                ? "Lay the first stone so this fundraiser can go live."
                                : "Someone left words — a thank-you is waiting."}
                            </p>
                          </div>
                          <Link
                            href={
                              needsSeed
                                ? `/host/pots/${pot.slug}`
                                : unrepliedCount > 0
                                  ? "/host/inbox"
                                  : `/host/pots/${pot.slug}`
                            }
                            className="font-nav inline-flex min-h-9 shrink-0 items-center rounded-md bg-pvn-gold px-3.5 text-[0.65rem] font-bold tracking-[0.12em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light"
                          >
                            {needsSeed
                              ? "Seed fundraiser"
                              : unrepliedCount > 0
                                ? "Reply"
                                : "Manage"}
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ) : null}

          {tab === "movers" ? (
            <section className="mt-6 animate-[pvn-rise_0.35s_ease-out]">
              <h2 className="sr-only">Top movers</h2>
              {topMovers.length === 0 ? (
                <p className="text-sm text-pvn-navy/55">
                  No gifts yet — share a fundraiser link and this board will fill.
                </p>
              ) : (
                <ul className="grid gap-3">
                  {topMovers.map((pot, index) => {
                    const pct = percentOf(pot.totalRaised, pot.targetAmount);
                    return (
                      <li
                        key={pot.slug}
                        className="border border-pvn-navy/10 bg-white/55 p-4 transition hover:border-pvn-navy/18 hover:bg-white/85 sm:p-5"
                      >
                        <Link
                          href={`/host/pots/${pot.slug}#analytics`}
                          className="block"
                        >
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <div className="flex min-w-0 items-baseline gap-3">
                              <span className="font-nav text-[0.65rem] font-bold tracking-[0.14em] text-pvn-gold uppercase">
                                #{index + 1}
                              </span>
                              <span className="font-display truncate text-xl font-semibold text-pvn-navy">
                                {pot.title}
                              </span>
                            </div>
                            <span className="font-nav text-[0.65rem] font-bold tracking-[0.1em] text-pvn-navy/50 uppercase">
                              {formatWholeGbp(pot.totalRaised)} · {pct}%
                            </span>
                          </div>
                          <div className="mt-3 max-w-md">
                            <HostPotProgress
                              raised={pot.totalRaised}
                              target={pot.targetAmount}
                            />
                          </div>
                          <p className="mt-2 text-sm text-pvn-navy/50">
                            {pot.donorCount}{" "}
                            {pot.donorCount === 1 ? "gift" : "gifts"}
                            {(pot.unrepliedCount ?? 0) > 0
                              ? ` · ${pot.unrepliedCount} unreplied`
                              : null}
                          </p>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ) : null}

          {tab === "pots" ? (
            <section className="mt-6 animate-[pvn-rise_0.35s_ease-out]">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <h2 className="sr-only">Your fundraisers</h2>
                <p className="text-sm text-pvn-navy/55">
                  {data.pots.length} on this account
                </p>
                <Link
                  href="/host/pots"
                  className="font-nav text-[0.65rem] font-bold tracking-[0.12em] text-pvn-gold uppercase hover:text-pvn-navy"
                >
                  Full portfolio →
                </Link>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2">
                {data.pots.slice(0, 6).map((pot) => (
                  <li key={pot.slug}>
                    <Link
                      href={`/host/pots/${pot.slug}`}
                      className="flex h-full flex-col border border-pvn-navy/10 bg-white/55 p-4 transition hover:border-pvn-navy/18 hover:bg-white/85"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-display text-lg font-semibold text-pvn-navy">
                          {pot.title}
                        </span>
                        <HostPotStatusChip status={pot.status} />
                      </div>
                      <p className="mt-2 text-sm text-pvn-navy/55">
                        {formatWholeGbp(pot.totalRaised)} of{" "}
                        {formatWholeGbp(pot.targetAmount)}
                      </p>
                      <div className="mt-3">
                        <HostPotProgress
                          raised={pot.totalRaised}
                          target={pot.targetAmount}
                        />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
