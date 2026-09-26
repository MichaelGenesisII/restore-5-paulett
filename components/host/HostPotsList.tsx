"use client";

import Link from "next/link";
import { HostEmptyState } from "@/components/host/HostEmptyState";
import { HostPotCoverPlaceholder } from "@/components/host/HostPotCoverPlaceholder";
import { HostPotProgress } from "@/components/host/HostPotProgress";
import { HostPotStatusChip } from "@/components/host/HostPotStatusChip";
import { useHostDashboard } from "@/components/host/HostDashboardShell";
import { formatWholeGbp } from "@/lib/money";

function HostPotsListSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your pots…</span>
      <div className="h-8 w-40 animate-pulse rounded-sm bg-pvn-navy/10" />
      <div className="mt-2 h-4 w-full max-w-md animate-pulse rounded-sm bg-pvn-navy/8" />
      <ul className="mt-6 grid gap-2 sm:mt-8">
        {[0, 1, 2].map((i) => (
          <li
            key={i}
            className="flex gap-3 border border-pvn-navy/10 bg-white/55 p-3 sm:gap-4 sm:p-3.5"
          >
            <div className="h-16 w-16 shrink-0 animate-pulse rounded-sm bg-pvn-navy/10 sm:h-[4.5rem] sm:w-24" />
            <div className="min-w-0 flex-1 py-0.5">
              <div className="h-5 w-2/3 max-w-xs animate-pulse rounded-sm bg-pvn-navy/10" />
              <div className="mt-2 h-3.5 w-40 animate-pulse rounded-sm bg-pvn-navy/8" />
              <div className="mt-2.5 h-1.5 max-w-sm animate-pulse rounded-sm bg-pvn-navy/8" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HostPotsList() {
  const { data, meReady } = useHostDashboard();
  if (!data) return null;
  if (!meReady) return <HostPotsListSkeleton />;

  return (
    <div className="w-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold text-pvn-navy sm:text-4xl">
            Your pots
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-pvn-navy/65">
            Portfolio of every pot on this account — progress, messages, and
            quick links.
          </p>
        </div>
        {data.pots.length > 0 ? (
          <Link
            href="/host/pots/new"
            className="font-nav inline-flex min-h-10 w-full items-center justify-center rounded-md bg-pvn-gold px-4 text-xs font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light sm:w-auto"
          >
            Start a pot
          </Link>
        ) : null}
      </div>

      {data.pots.length === 0 ? (
        <HostEmptyState
          title="No pots yet"
          body="Open the first stone for your circle. A pot is a named place where gifts gather toward restoring 5 Paulett."
          actionHref="/host/pots/new"
          actionLabel="Start a pot"
        />
      ) : (
        <ul className="mt-6 grid gap-2 sm:mt-8">
          {data.pots.map((pot, index) => {
            const unreplied = pot.unrepliedCount ?? 0;
            const needsSeed = pot.status === "PENDING";

            return (
              <li
                key={pot.slug}
                className="animate-[pvn-rise_0.45s_ease-out_both]"
                style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
              >
                <Link
                  href={`/host/pots/${pot.slug}`}
                  className="group relative flex gap-3 overflow-hidden border border-pvn-navy/10 bg-white/55 p-3 transition duration-300 ease-out hover:-translate-y-0.5 hover:border-pvn-gold/45 hover:bg-white hover:shadow-[0_14px_28px_-18px_rgba(12,27,51,0.45)] sm:gap-4 sm:p-3.5"
                >
                  <span
                    className="pointer-events-none absolute inset-y-0 left-0 w-0.5 origin-top scale-y-0 bg-pvn-gold transition duration-300 ease-out group-hover:scale-y-100"
                    aria-hidden
                  />
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-sm sm:h-[4.5rem] sm:w-24">
                    {pot.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={pot.photoUrl}
                        alt=""
                        className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.06]"
                      />
                    ) : (
                      <HostPotCoverPlaceholder />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-display truncate text-lg font-semibold text-pvn-navy transition duration-300 group-hover:text-pvn-gold sm:text-xl">
                          {pot.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <HostPotStatusChip status={pot.status} />
                          {unreplied > 0 ? (
                            <span className="font-nav text-[0.55rem] font-bold tracking-[0.12em] text-pvn-gold uppercase">
                              {unreplied}{" "}
                              {unreplied === 1 ? "needs reply" : "need reply"}
                            </span>
                          ) : null}
                          {needsSeed ? (
                            <span className="font-nav text-[0.55rem] font-bold tracking-[0.12em] text-amber-800/80 uppercase">
                              Seed to go live
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <p className="font-nav shrink-0 pt-1 text-[0.6rem] font-bold tracking-[0.1em] text-pvn-navy/45 uppercase">
                        {pot.donorCount}{" "}
                        {pot.donorCount === 1 ? "gift" : "gifts"}
                      </p>
                    </div>

                    <p className="mt-1.5 text-sm text-pvn-navy/70">
                      <span className="font-semibold text-pvn-navy">
                        {formatWholeGbp(pot.totalRaised)}
                      </span>
                      <span className="text-pvn-navy/45">
                        {" "}
                        of {formatWholeGbp(pot.targetAmount)}
                      </span>
                    </p>

                    <div className="mt-1.5 max-w-md">
                      <HostPotProgress
                        raised={pot.totalRaised}
                        target={pot.targetAmount}
                      />
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
