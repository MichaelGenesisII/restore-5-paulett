import Image from "next/image";
import Link from "next/link";

export function HomeCalling() {
  return (
    <section
      id="calling"
      className="border-t border-pvn-navy/5 bg-pvn-cream py-14 sm:py-20"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col gap-5">
          <p className="font-nav text-xs font-semibold uppercase tracking-[0.28em] text-pvn-gold">
            Why now
          </p>
          <h2 className="font-display text-3xl font-semibold leading-tight text-pvn-navy text-balance sm:text-4xl lg:text-5xl">
            The purchase was the beginning
          </h2>
          <p className="max-w-md text-base leading-relaxed text-pvn-navy/75 text-pretty sm:text-lg">
            In 1928 the congregation before us spent roughly £6,000 on a new
            hall for people they would never meet. Every generation at 5 Paulett
            has built for the one that followed.
          </p>
          <p className="max-w-md text-base leading-relaxed text-pvn-navy/75 text-pretty sm:text-lg">
            The doors closed in 2010 and the building has been waiting ever
            since. The keys are ours now. The roof, the stone and the windows
            are still ahead of us.
          </p>
          <p className="font-nav flex items-center gap-3 text-sm font-bold uppercase tracking-[0.2em] text-pvn-gold">
            <span className="h-px w-8 bg-pvn-gold/60" aria-hidden />
            Now it is our turn
          </p>
          <Link
            href="/our-story"
            className="font-nav mt-1 inline-flex w-fit text-sm font-bold uppercase tracking-[0.16em] text-pvn-navy underline decoration-pvn-gold decoration-2 underline-offset-4 transition hover:text-pvn-gold"
          >
            The story of 5 Paulett →
          </Link>
        </div>

        <figure className="relative order-first w-full lg:order-none">
          {/* Outer frame */}
          <div className="relative border border-pvn-navy/20 bg-pvn-cream p-2.5 sm:p-3">
            {/* Gold double-line mat */}
            <div className="relative border border-pvn-gold/70 p-1.5 sm:p-2">
              <div className="relative border border-pvn-gold/35 p-[3px]">
                {/* Corner ornaments */}
                <span
                  className="pointer-events-none absolute -left-px -top-px z-10 h-4 w-4 border-l-2 border-t-2 border-pvn-gold sm:h-5 sm:w-5"
                  aria-hidden
                />
                <span
                  className="pointer-events-none absolute -right-px -top-px z-10 h-4 w-4 border-r-2 border-t-2 border-pvn-gold sm:h-5 sm:w-5"
                  aria-hidden
                />
                <span
                  className="pointer-events-none absolute -bottom-px -left-px z-10 h-4 w-4 border-b-2 border-l-2 border-pvn-gold sm:h-5 sm:w-5"
                  aria-hidden
                />
                <span
                  className="pointer-events-none absolute -bottom-px -right-px z-10 h-4 w-4 border-b-2 border-r-2 border-pvn-gold sm:h-5 sm:w-5"
                  aria-hidden
                />

                <div className="relative aspect-square w-full overflow-hidden bg-pvn-navy">
                  <Image
                    src="/gallery/first.avif"
                    alt="5 Paulett Avenue — the house waiting to be restored"
                    fill
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    className="object-cover object-center"
                    priority={false}
                  />
                </div>
              </div>
            </div>
          </div>

          <figcaption className="mt-3 flex items-center justify-center gap-2 font-nav text-xs font-semibold uppercase tracking-[0.16em] text-pvn-navy/45">
            <span className="h-px w-5 bg-pvn-gold/50" aria-hidden />
            5 Paulett Avenue
            <span className="h-px w-5 bg-pvn-gold/50" aria-hidden />
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
