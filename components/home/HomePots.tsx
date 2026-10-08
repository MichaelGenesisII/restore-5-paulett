import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import { IconWall } from "@/components/icons";
import {
  PotRollMeter,
  type PotRollTileData,
} from "@/components/pots/PotRollTile";
import { HomePotsRoll } from "@/components/home/HomePotsRoll";
import { formatWholeGbp, percentOf } from "@/lib/money";

export type HomePotTile = PotRollTileData;

function SectionShell({ children }: { children: ReactNode }) {
  return (
    <section
      id="pots"
      className="relative overflow-hidden bg-pvn-navy py-14 text-pvn-cream sm:py-16"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        aria-hidden
        style={{
          backgroundImage: `
            linear-gradient(335deg, #c9a84c 20px, transparent 20px),
            linear-gradient(155deg, #c9a84c 20px, transparent 20px)
          `,
          backgroundSize: "52px 52px",
          backgroundPosition: "0 0, 26px 0",
        }}
      />

      {/* Light falling from the top edge, so the navy has depth behind the heading */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[26rem]"
        aria-hidden
        style={{
          background:
            "radial-gradient(120% 100% at 50% 0%, rgba(201,168,76,0.15), transparent 68%)",
        }}
      />

      {children}
    </section>
  );
}

function EmptyPots() {
  return (
    <SectionShell>
      <div className="relative mx-auto max-w-xl px-4 text-center sm:px-6">
        <p className="font-nav flex items-center justify-center gap-2.5 text-xs font-semibold uppercase tracking-[0.28em] text-pvn-gold">
          <span className="h-1.5 w-1.5 rotate-45 bg-pvn-gold" aria-hidden />
          Take your part of the wall
        </p>
        <h2 className="font-display mt-3 text-3xl font-semibold text-balance text-pvn-cream sm:text-4xl">
          Start a fundraiser
        </h2>
        <p className="mt-3 text-pvn-cream/70">
          Take your section of the wall — for your family, alumni year,
          ministry, or friends — and invite others to build with you.
        </p>

        <div
          className="mx-auto mt-6 flex items-center justify-center gap-2"
          aria-hidden
        >
          <span className="h-px w-10 bg-pvn-gold/40" />
          <IconWall className="h-5 w-5 text-pvn-gold" />
          <span className="h-px w-10 bg-pvn-gold/40" />
        </div>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/fundraisers/create"
            className="font-nav inline-flex items-center justify-center gap-2 rounded-md bg-pvn-gold px-5 py-3.5 text-sm font-bold uppercase tracking-[0.14em] text-pvn-navy transition hover:bg-pvn-gold-light"
          >
            <IconWall className="h-4 w-4 shrink-0 text-pvn-navy" />
            Start a fundraiser
          </Link>
          <Link
            href="/give"
            className="font-nav inline-flex items-center justify-center text-xs font-bold uppercase tracking-[0.16em] text-pvn-gold transition hover:text-pvn-gold-light"
          >
            Or give to the building fund →
          </Link>
        </div>
      </div>
    </SectionShell>
  );
}

type HomePotsProps = {
  pots: HomePotTile[];
};

export function HomePots({ pots }: HomePotsProps) {
  if (pots.length === 0) {
    return <EmptyPots />;
  }

  const totals = pots.reduce(
    (acc, pot) => ({
      raised: acc.raised + pot.totalRaised,
      target: acc.target + pot.targetAmount,
      gifts: acc.gifts + pot.donorCount,
    }),
    { raised: 0, target: 0, gifts: 0 },
  );
  const wallPct = percentOf(totals.raised, totals.target);

  const figures = [
    {
      value: String(pots.length),
      label: pots.length === 1 ? "fundraiser rising" : "fundraisers rising",
    },
    { value: formatWholeGbp(totals.raised), label: "raised so far" },
    { value: String(totals.gifts), label: "gifts given" },
  ];

  const heading =
    pots.length === 1
      ? "A fundraiser is already rising"
      : "Fundraisers already rising";

  return (
    <SectionShell>
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        {/* No buttons here on purpose — the section above carries the three
            ways to build, and every tile in the roll is already a link. */}
        <div className="max-w-xl">
          <p className="font-nav flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.28em] text-pvn-gold">
            <span className="h-1.5 w-1.5 rotate-45 bg-pvn-gold" aria-hidden />
            Take your part of the wall
          </p>
          <h2 className="font-display mt-3 text-3xl font-semibold text-balance text-pvn-cream sm:text-4xl">
            {heading}
          </h2>
          <p className="mt-3 text-pvn-cream/70">
            Every fundraiser is someone&apos;s part of the wall — family, alumni,
            ministry, or city friends. All of them build the same house.
          </p>
        </div>

        {/* Where the wall stands, added up across every pot in the roll */}
        <div className="mt-6 flex flex-col gap-4 border-t border-pvn-cream/12 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {figures.map((figure, i) => (
              <Fragment key={figure.label}>
                {i > 0 && (
                  <span
                    className="hidden h-1 w-1 rotate-45 bg-pvn-gold/50 sm:block"
                    aria-hidden
                  />
                )}
                <p className="font-nav text-[0.7rem] uppercase tracking-[0.16em] text-pvn-cream/45">
                  <span className="font-display text-base font-semibold tracking-normal text-pvn-cream">
                    {figure.value}
                  </span>{" "}
                  {figure.label}
                </p>
              </Fragment>
            ))}
          </div>

          <div className="w-full sm:max-w-[18rem]">
            <div className="font-nav flex items-baseline justify-between gap-3 text-[0.65rem] uppercase tracking-[0.2em] text-pvn-cream/45">
              <span>
                {pots.length === 1 ? "This fundraiser" : "Across every fundraiser"}
              </span>
              <span className="text-pvn-gold">{wallPct}%</span>
            </div>
            <div className="mt-2">
              <PotRollMeter pct={wallPct} />
            </div>
          </div>
        </div>
      </div>

      <HomePotsRoll pots={pots} />

      <div className="relative mx-auto mt-6 flex max-w-6xl justify-center px-4 sm:px-6">
        <Link
          href="/fundraisers/create"
          className="font-nav inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-pvn-gold transition hover:text-pvn-gold-light"
        >
          <IconWall className="h-3.5 w-3.5" />
          Start your own fundraiser →
        </Link>
      </div>
    </SectionShell>
  );
}
