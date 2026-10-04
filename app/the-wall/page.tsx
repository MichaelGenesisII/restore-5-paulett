import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
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
    "Words left with gifts to the restoration of 5 Paulett Avenue — direct gifts first, and recent pot messages too.",
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
        className="relative isolate -mt-[4.75rem] overflow-hidden pt-[4.75rem] text-pvn-cream"
      >
        <div className="absolute inset-0">
          <Image
            src="/hero.avif"
            alt=""
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          <div
            className="absolute inset-0 bg-gradient-to-b from-pvn-navy/55 via-pvn-navy/72 to-pvn-navy/92"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            aria-hidden
            style={{
              backgroundImage: `
                linear-gradient(335deg, #c9a84c 18px, transparent 18px),
                linear-gradient(155deg, #c9a84c 18px, transparent 18px)
              `,
              backgroundSize: "48px 48px",
              backgroundPosition: "0 0, 24px 0",
            }}
          />
        </div>

        <div className="relative mx-auto flex min-h-[min(78svh,36rem)] max-w-6xl flex-col justify-end px-4 pt-28 pb-10 sm:px-6 sm:pb-12 lg:pb-14">
          <p className="font-nav text-[0.7rem] font-bold tracking-[0.28em] text-pvn-gold uppercase sm:text-xs">
            Restore 5 Paulett
          </p>
          <h1 className="font-display mt-3 max-w-xl text-5xl leading-[0.95] font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl">
            The Wall
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-pvn-cream/80 text-pretty sm:text-lg">
            Words left with gifts — first from those who gave to the house,
            then recent voices from the pots. Each message is a stone.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
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
