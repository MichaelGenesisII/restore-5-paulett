import Link from "next/link";
import { IconHeart } from "@/components/icons";

export function HomeClosing() {
  return (
    <section
      id="closing"
      className="relative overflow-hidden border-t border-pvn-navy/5 bg-pvn-cream py-10 sm:py-12"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pvn-gold/50 to-transparent"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-nav text-xs font-semibold uppercase tracking-[0.28em] text-pvn-gold">
            The invitation
          </p>

          <h2 className="font-nav mt-3 text-2xl font-bold uppercase tracking-[0.08em] text-pvn-navy sm:text-3xl lg:text-4xl">
            The ruins are waiting.
            <span className="mt-1 block text-pvn-gold">
              The legacy is ours to restore.
            </span>
          </h2>

          <div
            className="mx-auto mt-4 flex items-center justify-center gap-2"
            aria-hidden
          >
            <span className="h-px w-8 bg-pvn-gold/50" />
            <span className="h-1.5 w-1.5 rotate-45 bg-pvn-gold" />
            <span className="h-px w-8 bg-pvn-gold/50" />
          </div>

          <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-pvn-navy/70 sm:text-base">
            Give today, start a fundraiser, or share the campaign — every part
            of the wall matters.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/give"
              className="font-nav inline-flex items-center gap-2 rounded-md bg-pvn-navy px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-pvn-cream transition hover:bg-pvn-navy-light sm:text-sm"
            >
              <IconHeart className="h-4 w-4 text-pvn-gold" />
              Give now
            </Link>
            <Link
              href="/fundraisers/create"
              className="font-nav inline-flex rounded-md border border-pvn-navy/25 px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-pvn-navy transition hover:border-pvn-gold hover:text-pvn-gold sm:text-sm"
            >
              Start a fundraiser
            </Link>
          </div>

          <p className="font-nav mt-6 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-pvn-navy/35">
            Your fundraiser → our house
          </p>
        </div>
      </div>
    </section>
  );
}
