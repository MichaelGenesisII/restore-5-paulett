import Link from "next/link";
import { formatWholeGbp, percentOf } from "@/lib/money";

export type PotRollTileData = {
  slug: string;
  title: string;
  /** Cover image path, or null for pots without a photo. */
  photoUrl: string | null;
  type: string;
  targetAmount: number;
  totalRaised: number;
  donorCount: number;
  fundraiserName: string;
};

/**
 * Gold progress rule with a diamond marker riding the current value. The
 * `group/tile` variants only bite inside a pot tile; elsewhere they sit idle.
 */
export function PotRollMeter({ pct }: { pct: number }) {
  return (
    <div
      className="relative h-[3px] w-full bg-pvn-cream/15 transition-colors duration-300 group-hover/tile:bg-pvn-cream/25"
      aria-hidden
    >
      <div
        className="h-full bg-gradient-to-r from-pvn-gold to-pvn-gold-light"
        style={{ width: `${pct}%` }}
      />
      <span
        className="absolute top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-pvn-gold-light transition-transform duration-300 ease-out group-hover/tile:scale-[1.7] group-focus-visible/tile:scale-[1.7]"
        style={{ left: `${pct}%` }}
      />
    </div>
  );
}

/** Compact pot card for home + pot-detail horizontal rolls. */
export function PotRollTile({ pot }: { pot: PotRollTileData }) {
  const pct = percentOf(pot.totalRaised, pot.targetAmount);
  const typeLabel = pot.type.replaceAll("_", " ");
  const potHref = `/pots/${pot.slug}`;

  return (
    <article className="group/tile relative flex w-[16rem] shrink-0 flex-col border border-pvn-cream/12 bg-pvn-cream/[0.04] transition duration-300 ease-out hover:-translate-y-1.5 hover:border-pvn-gold/50 hover:bg-pvn-cream/[0.08] hover:shadow-[0_18px_40px_-18px_rgba(0,0,0,0.7)] focus-within:-translate-y-1.5 focus-within:bg-pvn-cream/[0.08] sm:w-[18rem]">
      <Link
        href={potHref}
        className="absolute inset-0 z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pvn-gold focus-visible:ring-offset-2 focus-visible:ring-offset-pvn-navy"
        aria-label={`Open ${pot.title}`}
      />
      <span
        className="pointer-events-none absolute top-0 left-0 z-30 h-4 w-4 origin-top-left scale-50 border-t-2 border-l-2 border-pvn-gold opacity-0 transition duration-300 ease-out group-hover/tile:scale-100 group-hover/tile:opacity-100 group-focus-within/tile:scale-100 group-focus-within/tile:opacity-100"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute right-0 bottom-0 z-30 h-4 w-4 origin-bottom-right scale-50 border-r-2 border-b-2 border-pvn-gold opacity-0 transition duration-300 ease-out group-hover/tile:scale-100 group-hover/tile:opacity-100 group-focus-within/tile:scale-100 group-focus-within/tile:opacity-100"
        aria-hidden
      />
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-pvn-navy-light">
        {pot.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pot.photoUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover/tile:scale-[1.03] group-focus-within/tile:scale-[1.03]"
          />
        ) : (
          <div className="relative h-full w-full">
            <div
              className="absolute inset-0 opacity-[0.16]"
              aria-hidden
              style={{
                backgroundImage: `
                  linear-gradient(335deg, #c9a84c 16px, transparent 16px),
                  linear-gradient(155deg, #c9a84c 16px, transparent 16px)
                `,
                backgroundSize: "38px 38px",
                backgroundPosition: "0 0, 19px 0",
              }}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <span
                className="h-2 w-2 rotate-45 bg-pvn-gold/80 transition-transform duration-500 ease-out group-hover/tile:rotate-[135deg] group-hover/tile:scale-125 group-focus-within/tile:rotate-[135deg] group-focus-within/tile:scale-125"
                aria-hidden
              />
              <span
                className="h-px w-8 bg-pvn-gold/35 transition-all duration-500 ease-out group-hover/tile:w-12 group-hover/tile:bg-pvn-gold/60 group-focus-within/tile:w-12 group-focus-within/tile:bg-pvn-gold/60"
                aria-hidden
              />
            </div>
          </div>
        )}
        <span
          className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-pvn-navy/85 via-pvn-navy/30 to-transparent"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-12 bg-gradient-to-r from-transparent via-pvn-gold/30 to-transparent transition-transform duration-[900ms] ease-out group-hover/tile:translate-x-[400%] group-focus-within/tile:translate-x-[400%]"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute right-3 bottom-3 z-10 flex h-7 w-7 translate-y-2 scale-90 items-center justify-center rounded-full bg-pvn-gold text-pvn-navy opacity-0 transition duration-300 ease-out group-hover/tile:translate-y-0 group-hover/tile:scale-100 group-hover/tile:opacity-100 group-focus-within/tile:translate-y-0 group-focus-within/tile:scale-100 group-focus-within/tile:opacity-100"
          aria-hidden
        >
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </span>
      </div>

      <div className="relative z-10 flex flex-1 flex-col px-4 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <p className="font-nav text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-pvn-gold transition-colors duration-300 group-hover/tile:text-pvn-gold-light">
            {typeLabel}
          </p>
          <p className="font-nav text-[0.7rem] font-bold text-pvn-cream/60 transition-colors duration-300 group-hover/tile:text-pvn-cream">
            {pct}%
          </p>
        </div>

        <h3 className="font-display mt-1 line-clamp-2 text-lg leading-snug font-semibold text-pvn-cream transition-colors duration-300 group-hover/tile:text-pvn-gold-light">
          {pot.title}
        </h3>

        <div className="mt-auto pt-3">
          <PotRollMeter pct={pct} />
          <div className="mt-2.5 flex items-baseline justify-between gap-3">
            <p className="font-nav text-sm font-bold tracking-tight text-pvn-cream">
              {formatWholeGbp(pot.totalRaised)}
              <span className="font-normal text-pvn-cream/45">
                {" "}
                / {formatWholeGbp(pot.targetAmount)}
              </span>
            </p>
            <p className="font-nav shrink-0 text-[0.65rem] uppercase tracking-[0.12em] text-pvn-cream/45">
              {pot.donorCount} {pot.donorCount === 1 ? "gift" : "gifts"}
            </p>
          </div>
          <p className="mt-1 truncate text-xs text-pvn-cream/45 transition-colors duration-300 group-hover/tile:text-pvn-cream/70">
            {pot.fundraiserName}
          </p>
          <span
            className="font-nav mt-3.5 inline-flex min-h-9 w-full items-center justify-center rounded-md bg-pvn-gold px-3 text-[0.6rem] font-bold tracking-[0.14em] text-pvn-navy uppercase transition duration-300 ease-out group-hover/tile:bg-pvn-gold-light group-focus-within/tile:bg-pvn-gold-light"
            aria-hidden
          >
            Support
          </span>
        </div>
      </div>
    </article>
  );
}
