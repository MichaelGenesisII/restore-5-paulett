import Image from "next/image";
import Link from "next/link";
import { HomeShareButton } from "@/components/home/HomeShareButton";
import {
  IconGlobe,
  IconHeart,
  IconHouse,
  IconPeople,
  IconWall,
} from "@/components/icons";

type HomeHeroProps = {
  raised: number;
  target: number;
  peopleGiven: number;
  potCount: number;
  countryCount: number;
};

function formatWholeGbp(pence: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(pence / 100);
}

function formatCount(n: number) {
  return new Intl.NumberFormat("en-GB").format(n);
}

/** The campaign strapline, kept verbatim but set as one quiet rule. */
const strapline = [
  "Rebuilding the ruins",
  "Restoring the legacy",
  "Building for generations",
] as const;

function ProgressRail({ pct, label }: { pct: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-pvn-cream/15">
        <div
          className="h-full rounded-full bg-gradient-to-r from-pvn-gold to-pvn-gold-light"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-nav text-sm font-semibold text-pvn-cream">
        {label}
      </span>
    </div>
  );
}

export function HomeHero({
  raised,
  target,
  peopleGiven,
  potCount,
  countryCount,
}: HomeHeroProps) {
  const started = raised > 0;
  const exactPct = target > 0 ? Math.min(100, (raised / target) * 100) : 0;
  const pct = Math.round(exactPct);
  // Early on, a real gift can round to 0% — say "<1%" and keep a sliver of
  // gold on the rail rather than showing an empty bar next to a live total.
  const pctLabel = started && pct === 0 ? "<1%" : `${pct}%`;
  const railPct = started ? Math.max(exactPct, 1.2) : 0;

  // Before the first gifts land, an empty figure is worse than no figure —
  // the card leads with the goal and invites the first builder instead.
  const stats = [
    {
      key: "people",
      icon: IconPeople,
      count: peopleGiven,
      label: `${formatCount(peopleGiven)} ${peopleGiven === 1 ? "gift has" : "gifts have"} been given`,
      short: `${formatCount(peopleGiven)} ${peopleGiven === 1 ? "gift" : "gifts"}`,
    },
    {
      key: "pots",
      icon: IconWall,
      count: potCount,
      label: `${formatCount(potCount)} ${potCount === 1 ? "fundraiser" : "fundraisers"} building`,
      short: `${formatCount(potCount)} ${potCount === 1 ? "fundraiser" : "fundraisers"}`,
    },
    {
      key: "countries",
      icon: IconGlobe,
      count: countryCount,
      label: `${formatCount(countryCount)} ${countryCount === 1 ? "country" : "countries"} involved`,
      short: `${formatCount(countryCount)} ${countryCount === 1 ? "country" : "countries"}`,
    },
  ].filter((stat) => stat.count > 0);

  return (
    <section className="relative isolate flex min-h-[100svh] -mt-[4.75rem] flex-col overflow-hidden pt-[4.75rem]">
      <div className="absolute inset-0">
        <Image
          src="/hero.webp"
          alt="A full hall at PVN Belfast during a service"
          fill
          priority
          sizes="100vw"
          className="object-cover saturate-[0.35]"
          style={{ objectPosition: "50% 45%" }}
        />
        {/* The photo is bright and busy (white walls, lit screens), so it is
            muted and washed in navy before anything is set on top of it. */}
        <div className="absolute inset-0 bg-pvn-navy/30" aria-hidden />
        <div
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,27,51,0.42)_0%,rgba(12,27,51,0.58)_45%,rgba(12,27,51,0.8)_100%)] lg:bg-[linear-gradient(100deg,rgba(12,27,51,0.85)_0%,rgba(12,27,51,0.66)_38%,rgba(12,27,51,0.28)_66%,rgba(12,27,51,0.45)_100%)]"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,27,51,0.3)_0%,transparent_20%,transparent_75%,rgba(12,27,51,0.65)_100%)]"
          aria-hidden
        />
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] lg:gap-12 lg:py-12">
          <div
            className="flex max-w-2xl flex-col items-start gap-5 [text-shadow:0_1px_2px_rgba(12,27,51,0.6),0_2px_24px_rgba(12,27,51,0.7)] sm:gap-6"
            style={{ animation: "pvn-rise 700ms ease-out both" }}
          >
            <p className="font-nav flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.75rem] font-semibold uppercase tracking-[0.28em] text-pvn-gold-light sm:text-sm">
              Place of Victory for All Nations
              <span className="h-1.5 w-1.5 rotate-45 bg-pvn-gold" aria-hidden />
              East Belfast
            </p>

            <h1 className="font-nav text-5xl font-bold uppercase leading-[0.92] tracking-[-0.005em] text-pvn-cream sm:text-6xl lg:text-7xl">
              <span className="block">Restore</span>
              <span className="block text-pvn-gold">5 Paulett</span>
            </h1>

            {/* The 20-second answer: what the building is, and what happened to it. */}
            <p className="max-w-xl text-base leading-relaxed text-pvn-cream/90 text-pretty sm:text-lg">
              A historic East Belfast church, closed since 2010 and empty for
              over a decade. We prayed for a home — now we have one. Together,
              we bring it back to life.
            </p>

            <p className="font-nav flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-pvn-cream/85 sm:text-xs">
              {strapline.map((line, i) => (
                <span key={line} className="flex items-center gap-3">
                  {i > 0 && (
                    <span
                      className="h-1 w-1 rotate-45 bg-pvn-gold"
                      aria-hidden
                    />
                  )}
                  {line}
                </span>
              ))}
            </p>

            <div className="flex flex-wrap gap-3 pt-1 [text-shadow:none]">
              <Link
                href="/give"
                className="font-nav inline-flex items-center gap-2 rounded-md bg-pvn-gold px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-pvn-navy shadow-[0_8px_24px_rgba(12,27,51,0.35)] transition hover:bg-pvn-gold-light sm:px-5 sm:text-sm"
              >
                <IconHeart className="h-4 w-4 shrink-0 text-pvn-navy" />
                Give now
              </Link>
              <Link
                href="/fundraisers/create"
                className="font-nav inline-flex items-center justify-center gap-2 rounded-md border border-pvn-gold bg-pvn-navy/70 px-4 py-3 text-xs font-bold uppercase tracking-[0.1em] text-pvn-cream backdrop-blur-sm transition hover:border-pvn-gold-light hover:bg-pvn-navy/85 hover:text-pvn-gold sm:px-5 sm:text-sm"
              >
                <IconWall className="h-4 w-4 shrink-0 text-pvn-gold" />
                Start a fundraiser
              </Link>
              <HomeShareButton />
            </div>

            {/* The card is desktop-only, so small screens get the same proof here */}
            <div className="w-full max-w-md rounded-xl border border-pvn-gold/25 bg-pvn-navy/90 p-4 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.6)] backdrop-blur-md [text-shadow:none] lg:hidden">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-nav text-2xl font-bold tracking-tight text-pvn-cream">
                  {started ? formatWholeGbp(raised) : formatWholeGbp(target)}
                </p>
                <p className="font-nav text-[0.65rem] uppercase tracking-[0.16em] text-pvn-cream/70">
                  {started
                    ? `of ${formatWholeGbp(target)} · phase one`
                    : "phase one goal"}
                </p>
              </div>
              <div className="mt-3">
                <ProgressRail pct={railPct} label={pctLabel} />
              </div>
              <p className="font-nav mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.65rem] uppercase tracking-[0.14em] text-pvn-cream/70">
                {stats.length > 0 ? (
                  stats.map((stat, i) => (
                    <span key={stat.key} className="flex items-center gap-2.5">
                      {i > 0 && (
                        <span
                          className="h-1 w-1 rotate-45 bg-pvn-gold/60"
                          aria-hidden
                        />
                      )}
                      {stat.short}
                    </span>
                  ))
                ) : (
                  <span>Be the first to take your part of the wall</span>
                )}
              </p>
            </div>
          </div>

          <aside
            className="hidden w-full rounded-2xl border border-pvn-gold/25 bg-pvn-navy/90 p-5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.65)] backdrop-blur-md sm:p-6 lg:block lg:max-w-md lg:justify-self-end"
            style={{ animation: "pvn-rise 700ms ease-out 120ms both" }}
          >
            <p className="font-nav w-full text-center text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-pvn-cream/85 sm:text-xs">
              Together, we are building a place of victory
            </p>
            <div className="mt-5 flex items-end justify-between gap-4">
              <p className="font-nav text-4xl font-bold tracking-tight text-pvn-cream sm:text-5xl">
                {started ? formatWholeGbp(raised) : formatWholeGbp(target)}
              </p>
              <div className="font-nav shrink-0 pb-1 text-right text-xs uppercase tracking-[0.14em] text-pvn-cream/70">
                {started ? (
                  <>
                    <p>Raised of phase one</p>
                    <p className="mt-0.5 text-lg font-semibold tracking-normal text-pvn-cream">
                      {formatWholeGbp(target)}
                    </p>
                  </>
                ) : (
                  <>
                    <p>Phase one goal</p>
                    <p className="mt-0.5 text-lg font-semibold tracking-normal text-pvn-gold-light">
                      Not one brick yet
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="mt-4">
              <ProgressRail pct={railPct} label={pctLabel} />
            </div>

            {stats.length > 0 ? (
              <ul
                className="mt-6 grid gap-3 border-t border-pvn-cream/10 pt-5"
                style={{
                  gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))`,
                }}
              >
                {stats.map((stat) => (
                  <li
                    key={stat.key}
                    className="flex flex-col items-center gap-2 text-center"
                  >
                    <stat.icon className="h-5 w-5 text-pvn-gold" />
                    <p className="font-nav text-[0.65rem] font-semibold uppercase leading-snug tracking-wide text-pvn-cream/90">
                      {stat.label}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-6 border-t border-pvn-cream/10 pt-5 text-center text-sm leading-relaxed text-pvn-cream/75">
                No one has given yet. Be the first to take your part of the
                wall.
              </p>
            )}

            <div className="mt-6 flex flex-col gap-2.5">
              <Link
                href="/give"
                className="font-nav inline-flex w-full items-center justify-center gap-2 rounded-md bg-pvn-gold px-5 py-3.5 text-sm font-bold uppercase tracking-[0.14em] text-pvn-navy transition hover:bg-pvn-gold-light"
              >
                <IconHeart className="h-4 w-4 shrink-0 text-pvn-navy" />
                Give now
              </Link>
              <Link
                href="/fundraisers"
                className="font-nav inline-flex w-full items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-pvn-gold transition hover:text-pvn-gold-light"
              >
                Browse fundraisers →
              </Link>
            </div>
          </aside>
        </div>

        <div className="relative bg-pvn-navy/95 backdrop-blur-sm">
          {/* Double gold rule with an ornamental keystone mark */}
          <div
            className="relative flex h-3 items-center justify-center"
            aria-hidden
          >
            <div className="absolute inset-x-0 top-[5px] h-px bg-gradient-to-r from-transparent via-pvn-gold/40 to-transparent" />
            <div className="absolute inset-x-0 top-[7px] h-px bg-gradient-to-r from-transparent via-pvn-gold to-transparent" />
            <div className="absolute inset-x-0 top-[9px] h-px bg-gradient-to-r from-transparent via-pvn-gold/35 to-transparent" />
            <span className="relative z-10 flex items-center gap-2 bg-pvn-navy px-2">
              <span className="h-px w-5 bg-gradient-to-r from-transparent to-pvn-gold" />
              <span className="relative flex h-3 w-3 items-center justify-center">
                <span className="absolute h-3 w-3 rotate-45 border border-pvn-gold/80" />
                <span className="h-2 w-2 rotate-45 bg-pvn-gold shadow-[0_0_14px_rgba(201,168,76,0.7)]" />
              </span>
              <span className="h-px w-5 bg-gradient-to-l from-transparent to-pvn-gold" />
            </span>
          </div>

          <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-3 text-center sm:flex-row sm:gap-6 sm:px-6 sm:text-left">
            <IconHouse className="hidden h-5 w-5 shrink-0 text-pvn-gold sm:block" />
            <blockquote className="min-w-0 flex-1">
              <p className="font-display text-base italic leading-snug text-pvn-cream/85 text-pretty sm:text-lg">
                &ldquo;They shall build the old wastes, they shall raise up the
                former desolations&hellip;&rdquo;
                <cite className="font-nav ml-2 whitespace-nowrap text-[0.65rem] font-semibold not-italic uppercase tracking-[0.2em] text-pvn-gold-light">
                  Isaiah 61:4
                </cite>
              </p>
            </blockquote>
            <Link
              href="/our-story"
              className="font-nav shrink-0 whitespace-nowrap text-sm font-bold uppercase tracking-[0.16em] text-pvn-gold transition hover:text-pvn-gold-light"
            >
              Read our story →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
