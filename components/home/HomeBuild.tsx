import Image from "next/image";
import type { CSSProperties } from "react";

/**
 * Distance from left/right edge.
 * `0` = flush; positive = inset; negative = past edge.
 */
const FLOWER_EDGE_INSET = {
  mobile: "0px",
  desktop: "60px",
} as const;

export function HomeBuild() {
  return (
    <section
      id="build"
      className="relative overflow-hidden border-t border-pvn-navy/5 bg-pvn-cream py-6"
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
        className="pointer-events-none absolute top-1/2 left-[var(--flower-inset-mobile)] w-44 -translate-y-1/2 opacity-[0.12] sm:left-[var(--flower-inset-desktop)] sm:w-56 lg:w-72 lg:opacity-[0.16]"
      />
      <Image
        src="/flower.png"
        alt=""
        aria-hidden
        width={497}
        height={373}
        className="pointer-events-none absolute top-1/2 right-[var(--flower-inset-mobile)] w-44 -translate-y-1/2 scale-x-[-1] opacity-[0.12] sm:right-[var(--flower-inset-desktop)] sm:w-56 lg:w-72 lg:opacity-[0.16]"
      />

      <div className="relative mx-auto max-w-2xl px-4 text-center sm:px-6">
        <p className="font-nav text-xs font-semibold uppercase tracking-[0.28em] text-pvn-gold">
          How the wall rises
        </p>
        <h2 className="font-display mt-3 text-3xl font-semibold leading-tight text-pvn-navy sm:text-4xl">
          We cannot build this alone
        </h2>

        <div
          className="mx-auto mt-4 flex items-center justify-center gap-2"
          aria-hidden
        >
          <span className="h-px w-8 bg-pvn-gold/50" />
          <span className="h-1.5 w-1.5 rotate-45 bg-pvn-gold" />
          <span className="h-px w-8 bg-pvn-gold/50" />
        </div>

        <p className="mt-5 text-base leading-relaxed text-pvn-navy/75 text-pretty sm:text-lg">
          Nehemiah&apos;s wall was never rebuilt by one person. Families took a
          section. Individuals took a section. Groups took a section — and
          together the work was finished. 5 Paulett will rise the same way.
        </p>

        <blockquote className="mt-6">
          <p className="font-display text-lg italic text-pvn-navy/85 sm:text-xl">
            &ldquo;Let us rise up and build.&rdquo;
          </p>
          <cite className="font-nav mt-2 block text-xs font-semibold not-italic uppercase tracking-[0.2em] text-pvn-gold">
            Nehemiah 2:18
          </cite>
        </blockquote>

        <p className="font-nav mt-8 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-pvn-navy/35">
          Every gift, in every pot, restores the same house
        </p>
      </div>
    </section>
  );
}
