import Image from "next/image";
import Link from "next/link";

/**
 * The two panels are written as matched pairs — line one answers line one,
 * line two answers line two — so the eye can read straight across the seam.
 */
const inheritedLines = [
  "Empty since 2010.",
  "Dust settled on the pews.",
  "An organ gone quiet.",
  "Stained glass with no one to see it.",
] as const;

const riseLines = [
  "Full again, every Sunday.",
  "Every seat taken.",
  "Music through the whole house.",
  "Generations gathered beneath it.",
] as const;

export function HomeVision() {
  return (
    <section
      id="vision"
      className="hidden bg-pvn-cream px-3 py-6 sm:px-6 sm:py-8 md:block lg:px-8 lg:py-10"
      aria-label="What we have inherited and what we see"
    >
      <div className="relative mx-auto grid max-w-7xl overflow-hidden border border-pvn-navy/10 lg:grid-cols-2">
        {/* Inherited — the sanctuary as it stands today */}
        <article className="relative min-h-[22rem] sm:min-h-[26rem] lg:min-h-[32rem]">
          <Image
            src="/gallery/sect2.avif"
            alt="The sanctuary at 5 Paulett Avenue today — organ pipes, stained glass and empty pews"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover object-center"
            priority={false}
          />
          {/* Weighted to the foot of the frame so the organ loft, the emblem
              and the glass stay readable above the text. */}
          <div
            className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.9)_0%,rgba(0,0,0,0.55)_30%,rgba(0,0,0,0.2)_60%,rgba(0,0,0,0.08)_100%)]"
            aria-hidden
          />
          <div className="relative z-10 flex h-full flex-col justify-end p-5 sm:p-7 lg:p-8">
            <p className="font-nav w-fit bg-pvn-navy/90 px-3 py-2 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-pvn-cream sm:text-xs">
              What we have inherited
            </p>
            <div className="mt-4 space-y-1 text-sm leading-snug text-pvn-cream/95 sm:text-base">
              {inheritedLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>
        </article>

        {/* What we see — a house full of people */}
        <article className="relative min-h-[22rem] border-t border-white/30 sm:min-h-[26rem] lg:min-h-[32rem] lg:border-t-0 lg:border-l lg:border-white/40">
          <Image
            src="/gallery/first.webp"
            alt="A preacher speaking to a full room at PVN Belfast"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover object-center"
            priority={false}
          />
          {/* Held to the lower third: the shade covers clothing, never faces. */}
          <div
            className="absolute inset-0 bg-[linear-gradient(to_top,rgba(12,27,51,0.94)_0%,rgba(12,27,51,0.6)_26%,rgba(12,27,51,0.15)_52%,transparent_74%)]"
            aria-hidden
          />
          <div className="relative z-10 flex h-full flex-col justify-end p-5 sm:p-7 lg:p-8">
            <p className="font-nav w-fit bg-pvn-gold px-3 py-2 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-pvn-navy sm:text-xs">
              What we see
            </p>
            <div className="mt-4 space-y-1 text-sm leading-snug text-pvn-cream sm:text-base">
              {riseLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            <Link
              href="/our-new-home"
              className="font-nav mt-5 inline-flex w-fit text-xs font-bold uppercase tracking-[0.16em] text-pvn-gold transition hover:text-pvn-gold-light"
            >
              See the vision →
            </Link>
          </div>
        </article>

        {/* Center transition mark */}
        <div
          className="pointer-events-none absolute top-1/2 left-1/2 z-20 hidden -translate-x-1/2 -translate-y-1/2 lg:block"
          aria-hidden
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-pvn-gold shadow-[0_8px_24px_rgba(12,27,51,0.35)] ring-4 ring-pvn-cream">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </span>
        </div>
      </div>
    </section>
  );
}
