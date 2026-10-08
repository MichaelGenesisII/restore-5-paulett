import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  WallMetricsFallback,
  WallMetricsStrip,
  WallStonesFallback,
  WallStonesSection,
} from "@/components/wall/WallDeferred";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Wall",
  description:
    "Words left with gifts to the restoration of 5 Paulett Avenue — direct gifts first, and recent fundraiser messages too.",
  alternates: { canonical: "/the-wall" },
};

/**
 * The Wall — hero paints immediately; metrics + stones stream from cache.
 */
export default async function TheWallPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const query = await searchParams;
  const requested = Number.parseInt(query.page ?? "1", 10);
  const page = Number.isFinite(requested) && requested > 0 ? requested : 1;

  return (
    <main className="w-full">
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

        <div className="relative mx-auto max-w-3xl px-4 pb-2 text-center sm:px-6 sm:pb-4 lg:pb-6">
          <p className="font-nav inline-flex items-center justify-center gap-2 text-[0.65rem] font-semibold tracking-[0.2em] text-pvn-gold-light uppercase sm:gap-2.5 sm:text-xs sm:tracking-[0.28em]">
            <span
              className="h-1.5 w-1.5 shrink-0 rotate-45 bg-pvn-gold"
              aria-hidden
            />
            Restore 5 Paulett
          </p>
          <h1 className="font-display mt-2.5 text-[2.5rem] leading-[1.02] font-semibold tracking-tight text-pvn-cream sm:mt-3 sm:text-5xl sm:leading-[1.05] lg:text-6xl xl:text-7xl">
            The Wall
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-pretty text-pvn-cream/85 sm:mt-5 sm:max-w-xl sm:text-base lg:text-lg">
            Words left with gifts — first from those who gave to the house,
            then recent voices from the fundraisers. Each message is a stone.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3 sm:mt-8">
            <Link
              href="/give"
              className="font-nav inline-flex items-center justify-center rounded-md bg-pvn-gold px-5 py-3 text-xs font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light sm:text-sm"
            >
              Leave a word
            </Link>
            <a
              href="#stones"
              className="font-nav inline-flex items-center justify-center rounded-md border border-pvn-cream/35 px-5 py-3 text-xs font-bold tracking-[0.14em] text-pvn-cream uppercase transition hover:border-pvn-gold hover:text-pvn-gold sm:text-sm"
            >
              Read the stones
            </a>
          </div>
        </div>
      </section>

      <Suspense fallback={<WallMetricsFallback />}>
        <WallMetricsStrip />
      </Suspense>

      <Suspense key={page} fallback={<WallStonesFallback />}>
        <WallStonesSection page={page} />
      </Suspense>
    </main>
  );
}
