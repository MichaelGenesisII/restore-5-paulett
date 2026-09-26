import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense, type CSSProperties } from "react";
import { ArcEdge, ARC_SPACE } from "@/components/ArcEdge";
import {
  AlumniHeroAside,
  AlumniHeroAsideFallback,
  AlumniReconnect,
  AlumniReconnectFallback,
} from "@/components/alumni/AlumniDeferred";
import { IconHeart, IconPeople, IconWall } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Alumni",
  description:
    "You may have left Belfast. You never left the story. Find your year, your ministry, your city — and take your part of the wall.",
  alternates: { canonical: "/alumni" },
};

/** Memory prompts unique to the alumni Remember band — not the home anaphora. */
const memoryFrames = [
  {
    src: "/gallery/sect1.avif",
    alt: "PVN Belfast community gathered together",
    caption: "The rooms that knew your laugh",
  },
  {
    src: "/gallery/sect2.avif",
    alt: "Friends and fellowship at PVN Belfast",
    caption: "The names you still pray for",
  },
  {
    src: "/gallery/first.avif",
    alt: "5 Paulett Avenue — the house waiting to be restored",
    caption: "The house you prayed would come",
  },
] as const;

/**
 * Distance from left/right edge.
 * `0` = flush; positive = inset; negative = past edge.
 */
const DOVE_EDGE_INSET = {
  mobile: "0px",
  desktop: "100px",
} as const;

/**
 * Distance from left/right edge on the Rebuild intro band.
 * `0` = flush; positive = inset; negative = past edge.
 */
const FLOWER_EDGE_INSET = {
  mobile: "0px",
  desktop: "60px",
} as const;

const actions = [
  {
    Icon: IconHeart,
    title: "Give to the house",
    body: "One gift, straight into the restoration fund — whether you run a pot or not.",
    bodyMobile: "One gift into the restoration fund.",
    href: "/give",
    label: "Give now",
  },
  {
    Icon: IconWall,
    title: "Start an alumni pot",
    body: "Name a section for your year, city or ministry, and invite the people who already know you.",
    bodyMobile: "Name your year, city or ministry.",
    href: "/fundraisers/create",
    label: "Start a pot",
  },
  {
    Icon: IconPeople,
    title: "Join a pot already rising",
    body: "Someone from your season may already be building. Find them and add your stone.",
    bodyMobile: "Find your people and add your stone.",
    href: "/fundraisers",
    label: "Browse pots",
  },
] as const;

export default async function AlumniPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; ministry?: string; search?: string }>;
}) {
  const query = await searchParams;
  const city = query.city?.trim() ?? "";
  const ministry = query.ministry?.trim() ?? "";
  const search = query.search?.trim() ?? "";

  return (
    <main className="w-full">
      {/* Hero — same structure as Our New Home */}
      <section
        className="relative isolate -mt-[4.75rem] overflow-hidden bg-pvn-navy pt-[calc(4.75rem+3.5rem)] text-pvn-cream"
        style={{ paddingBottom: `${ARC_SPACE}px` }}
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
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[22rem]"
          aria-hidden
          style={{
            background:
              "radial-gradient(120% 100% at 50% 0%, rgba(201,168,76,0.18), transparent 70%)",
          }}
        />

        <ArcEdge side="bottom" />

        <div className="relative mx-auto grid max-w-6xl gap-5 px-4 pb-2 sm:gap-8 sm:px-6 sm:pb-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-end lg:gap-16 lg:pb-6">
          <div className="min-w-0 text-center sm:text-left">
            <p className="font-nav inline-flex items-center justify-center gap-2 text-[0.65rem] font-semibold tracking-[0.2em] text-pvn-gold-light uppercase sm:justify-start sm:gap-2.5 sm:text-xs sm:tracking-[0.28em]">
              <span
                className="h-1.5 w-1.5 shrink-0 rotate-45 bg-pvn-gold"
                aria-hidden
              />
              PVN Belfast alumni
            </p>
            <h1 className="font-display mt-2.5 text-[2.5rem] leading-[1.02] font-semibold tracking-tight text-pvn-cream sm:mt-3 sm:text-5xl sm:leading-[1.05] lg:text-6xl xl:text-7xl">
              You may have left Belfast.
              <span className="mt-1 block text-pvn-gold">
                You never left the story.
              </span>
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-pretty text-pvn-cream/85 sm:mx-0 sm:mt-5 sm:max-w-xl sm:text-base lg:text-lg">
              <span className="sm:hidden">
                PVN Belfast has a home. Wherever God planted you, come back and
                build with us.
              </span>
              <span className="hidden sm:inline">
                Something we prayed about together has finally happened. PVN
                Belfast has a home. Wherever God has planted you today, come
                back and build with us.
              </span>
            </p>
          </div>

          <Suspense fallback={<AlumniHeroAsideFallback />}>
            <AlumniHeroAside />
          </Suspense>
        </div>
      </section>

      {/* Invitation — moved up next to hero */}
      <section
        className="relative overflow-hidden bg-pvn-cream py-14 sm:py-20"
        style={
          {
            "--dove-inset-mobile": DOVE_EDGE_INSET.mobile,
            "--dove-inset-desktop": DOVE_EDGE_INSET.desktop,
          } as CSSProperties
        }
      >
        <Image
          src="/dove-left.png"
          alt=""
          aria-hidden
          width={500}
          height={500}
          className="pointer-events-none absolute top-1/2 left-[var(--dove-inset-mobile)] w-40 -translate-y-1/2 opacity-[0.1] sm:left-[var(--dove-inset-desktop)] sm:w-52 lg:w-64 lg:opacity-[0.14]"
        />
        <Image
          src="/dove-right.png"
          alt=""
          aria-hidden
          width={499}
          height={499}
          className="pointer-events-none absolute top-1/2 right-[var(--dove-inset-mobile)] w-40 -translate-y-1/2 opacity-[0.1] sm:right-[var(--dove-inset-desktop)] sm:w-52 lg:w-64 lg:opacity-[0.14]"
        />

        <div className="relative mx-auto max-w-2xl px-4 text-center sm:px-6">
          <blockquote className="font-display text-2xl leading-snug font-semibold text-balance text-pvn-navy sm:text-3xl">
            “Wherever God has planted you today, come back and build with us.”
          </blockquote>
          <cite className="font-nav mt-4 block text-[0.7rem] font-bold tracking-[0.2em] text-pvn-navy/50 not-italic uppercase">
            Restore 5 Paulett · Alumni
          </cite>
          <div className="mt-8 flex justify-center">
            <Link
              href="/fundraisers/create"
              className="font-nav inline-flex rounded-md bg-pvn-gold px-5 py-3 text-xs font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light"
            >
              Start my pot
            </Link>
          </div>
        </div>
      </section>

      {/* Remember — archival contact sheet, not the home alumni layout */}
      <section
        id="remember"
        className="relative overflow-hidden bg-pvn-cream"
      >
        <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-24 bg-[radial-gradient(ellipse_at_left,rgba(201,168,76,0.08),transparent_70%)] lg:block" aria-hidden />

        <div className="relative mx-auto max-w-6xl px-4 pt-9">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-end lg:gap-16">
            <div>
              <p className="font-nav text-xs font-semibold tracking-[0.28em] text-pvn-gold uppercase">
                Remember
              </p>
              <h2 className="font-display mt-3 text-3xl leading-[1.08] font-semibold text-pvn-navy sm:text-4xl lg:text-[2.75rem]">
                PVN Belfast kept a seat
                <span className="mt-1 block text-pvn-gold">with your name on it.</span>
              </h2>
            </div>
            <p className="max-w-xl text-base leading-relaxed text-pvn-navy/75 text-pretty sm:text-lg lg:pb-1">
              Some memories never fade. The laughter, the prayers, the warmth of old rooms—they stay with you, no matter where you go. Hold them close again before stepping back onto the wall.
            </p>
          </div>
        </div>

        <div className="relative mt-10 bg-pvn-navy text-pvn-cream sm:mt-12">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pvn-gold/45 to-transparent"
            aria-hidden
          />
          <div className="mx-auto grid max-w-6xl gap-5 px-4 py-7 sm:grid-cols-3 sm:gap-6 sm:px-6 sm:py-9">
            {memoryFrames.map((frame, i) => (
              <figure
                key={frame.src}
                className="pvn-alumni-memory group"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-pvn-navy-light">
                  <Image
                    src={frame.src}
                    alt={frame.alt}
                    fill
                    sizes="(max-width: 640px) 100vw, 30vw"
                    className="object-cover object-center transition duration-700 ease-out group-hover:scale-[1.04]"
                    priority={i === 0}
                  />
                  <span
                    className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-pvn-cream/10"
                    aria-hidden
                  />
                </div>
                <figcaption className="mt-3 flex items-start gap-3">
                  <span
                    className="font-nav mt-0.5 text-[0.65rem] font-bold tracking-[0.2em] text-pvn-gold/70"
                    aria-hidden
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-nav text-[0.7rem] font-semibold tracking-[0.14em] text-pvn-cream/70 uppercase">
                    {frame.caption}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Reconnect — key forces Suspense fallback on every search/filter change */}
      <Suspense
        key={`${city}|${ministry}|${search}`}
        fallback={<AlumniReconnectFallback />}
      >
        <AlumniReconnect city={city} ministry={ministry} search={search} />
      </Suspense>

      {/* Rebuild — cream field so it clears the navy footer */}
      <section
        id="rebuild"
        className="relative overflow-hidden border-t border-pvn-navy/5 bg-pvn-cream pt-8 pb-14 sm:pt-10 sm:pb-20"
      >
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          {/* Intro band — flowers sit at the top of this block only */}
          <div
            className="relative overflow-hidden py-2 sm:py-4"
            style={
              {
                "--flower-inset-mobile": FLOWER_EDGE_INSET.mobile,
                "--flower-inset-desktop": FLOWER_EDGE_INSET.desktop,
              } as CSSProperties
            }
          >
            <Image
              src="/flower.png"
              alt=""
              aria-hidden
              width={497}
              height={373}
              className="pointer-events-none absolute top-0 left-[var(--flower-inset-mobile)] w-36 opacity-[0.12] sm:left-[var(--flower-inset-desktop)] sm:w-48 lg:w-60 lg:opacity-[0.16]"
            />
            <Image
              src="/flower.png"
              alt=""
              aria-hidden
              width={497}
              height={373}
              className="pointer-events-none absolute top-0 right-[var(--flower-inset-mobile)] w-36 scale-x-[-1] opacity-[0.12] sm:right-[var(--flower-inset-desktop)] sm:w-48 lg:w-60 lg:opacity-[0.16]"
            />

            <div className="relative mx-auto max-w-2xl text-center">
              <p className="font-nav text-xs font-semibold tracking-[0.28em] text-pvn-gold uppercase">
                Rebuild
              </p>
              <h2 className="font-display mt-3 text-3xl leading-[1.08] font-semibold text-pvn-navy sm:text-4xl lg:text-[2.75rem]">
                The wall is waiting
                <span className="mt-1 block text-pvn-gold">for your hands.</span>
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-pretty text-pvn-navy/70 sm:text-base">
                <span className="sm:hidden">
                  Give, lead a pot, or join one already rising.
                </span>
                <span className="hidden sm:inline">
                  Nehemiah&apos;s people each took a section. Yours is still open
                  — give, lead a pot, or join one already rising.
                </span>
              </p>
            </div>
          </div>

          {/* Mobile: inverted triangle (2 + 1). sm+: equal three-up row. */}
          <ul className="mt-10 flex flex-wrap justify-center gap-5 sm:mt-12 sm:grid sm:grid-cols-3 sm:gap-6">
            {actions.map(({ Icon, title, body, bodyMobile, href, label }) => (
              <li
                key={title}
                className="w-[calc(50%-0.625rem)] sm:w-auto"
              >
                <Link
                  href={href}
                  className="pvn-rebuild-card group relative flex h-full flex-col items-center overflow-hidden rounded-sm bg-pvn-cream p-5 text-center text-pvn-navy ring-1 ring-pvn-navy/10 sm:p-7"
                >
                  <span
                    className="pvn-rebuild-card-bar absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-pvn-gold"
                    aria-hidden
                  />

                  <span
                    className="pvn-rebuild-card-icon relative flex h-11 w-11 items-center justify-center rounded-sm bg-pvn-gold/10 text-pvn-gold"
                    aria-hidden
                  >
                    <Icon className="h-5 w-5" />
                  </span>

                  <h3 className="pvn-rebuild-card-title font-nav relative mt-5 text-sm font-bold tracking-[0.14em] text-pvn-navy uppercase">
                    {title}
                  </h3>
                  <p className="pvn-rebuild-card-body relative mt-3 flex-1 text-sm leading-relaxed text-pvn-navy/65">
                    <span className="sm:hidden">{bodyMobile}</span>
                    <span className="hidden sm:inline">{body}</span>
                  </p>

                  <span className="pvn-rebuild-card-cta font-nav relative mt-5 inline-flex items-center justify-center gap-2 text-[0.7rem] font-bold tracking-[0.16em] text-pvn-gold uppercase">
                    {label}
                    <span className="pvn-rebuild-card-arrow" aria-hidden>
                      →
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <p className="font-nav mt-10 text-center text-[0.65rem] font-semibold tracking-[0.28em] text-pvn-navy/35 uppercase sm:mt-12">
            No leaderboard · No competing pots · One house
          </p>
        </div>
      </section>
    </main>
  );
}
