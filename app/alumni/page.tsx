import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import {
  AlumniHeroAside,
  AlumniHeroAsideFallback,
  AlumniReconnect,
  AlumniReconnectFallback,
} from "@/components/alumni/AlumniDeferred";
import { SlowCarousel } from "@/components/SlowCarousel";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Alumni",
  description:
    "You may have left Belfast. You never left the story. Find your year, your ministry, your city — and take your part of the wall.",
  alternates: { canonical: "/alumni" },
};

/** Photos for the alumni Remember band, in the order they scroll. */
const memoryFrames = [
  { file: "1 (4).webp", alt: "Three women beside a PVN 19th anniversary cake" },
  { file: "1 (1) (1).avif", alt: "Two young men from PVN Belfast smiling side by side" },
  { file: "1 (10).webp", alt: "A young woman holding a smiling baby" },
  { file: "1 (2) (1).avif", alt: "A man and a woman from PVN Belfast, in black and white" },
  { file: "1 (3).avif", alt: "A young boy laughing towards the camera" },
  { file: "1 (1).avif", alt: "Two women smiling together outside after a service" },
  { file: "1 (8).webp", alt: "A man with four boys in matching outfits" },
  { file: "1 (11).webp", alt: "Portrait of a woman in a mustard jacket" },
  { file: "1 (12).webp", alt: "A man carrying a little girl in a party dress" },
  { file: "1 (5).webp", alt: "Two young women with their arms around each other" },
  { file: "1 (2).avif", alt: "A mother holding her child, with family beside her" },
  { file: "1 (6).webp", alt: "Three men standing together, one holding a toddler" },
  { file: "1 (7).webp", alt: "A couple standing together outside the church" },
  { file: "1 (9).webp", alt: "A young woman smiling at a little girl in her arms" },
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
        className="relative isolate -mt-[4.75rem] overflow-hidden bg-pvn-navy pt-[calc(4.75rem+3.5rem)] pb-12 text-pvn-cream sm:pb-14"
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
      <section className="relative overflow-hidden bg-pvn-cream py-14 sm:py-20">
        <div className="relative mx-auto max-w-2xl px-4 text-center sm:px-6">
          <blockquote className="font-display text-2xl leading-snug font-semibold text-balance text-pvn-navy sm:text-3xl">
            “Wherever God has planted you today, come back and build with us.”
          </blockquote>
          <cite className="font-nav mt-4 block text-[0.7rem] font-bold tracking-[0.2em] text-pvn-navy/50 not-italic uppercase">
            Restore 5 Paulett Av · Alumni
          </cite>
          <div className="mt-8 flex justify-center">
            <Link
              href="/fundraisers/create"
              className="font-nav inline-flex rounded-md bg-pvn-gold px-5 py-3 text-xs font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light"
            >
              Start my fundraiser
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
          <div className="mx-auto max-w-6xl px-2.5 py-5 sm:px-4 sm:py-7">
            <SlowCarousel
              label="Memories of PVN Belfast"
              tone="dark"
              intervalMs={4_500}
              resumeAfterMs={8_000}
              slideClassName="w-[78%] px-1.5 sm:w-1/2 sm:px-2.5 lg:w-1/3 lg:px-3"
              slideLabels={memoryFrames.map((frame) => frame.alt)}
            >
            {memoryFrames.map((frame, i) => (
              <figure key={frame.file} className="group">
                <div className="relative aspect-[3/4] overflow-hidden bg-pvn-navy-light">
                  <Image
                    src={encodeURI(`/alumni/${frame.file}`)}
                    alt={frame.alt}
                    fill
                    draggable={false}
                    sizes="(max-width: 640px) 78vw, (max-width: 1024px) 50vw, 360px"
                    className="object-cover object-center transition duration-700 ease-out group-hover:scale-[1.04]"
                    priority={i === 0}
                  />
                  <span
                    className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-pvn-cream/10"
                    aria-hidden
                  />
                </div>
              </figure>
            ))}
            </SlowCarousel>
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
    </main>
  );
}
