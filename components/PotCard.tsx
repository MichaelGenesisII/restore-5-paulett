import Link from "next/link";

type PotSummary = {
  slug: string;
  title: string;
  story: string | null;
  photoUrl: string | null;
  type: string;
  targetAmount: number;
  totalRaised: number;
  donorCount: number;
  fundraiser: { name: string };
};

function formatWholeGbp(pence: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(pence / 100);
}

function percentOf(raised: number, target: number) {
  return target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;
}

function Meter({ pct }: { pct: number }) {
  return (
    <div className="relative h-[3px] w-full bg-pvn-navy/12" aria-hidden>
      <div
        className="h-full bg-gradient-to-r from-pvn-gold to-pvn-gold-light"
        style={{ width: `${pct}%` }}
      />
      <span
        className="absolute top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-pvn-gold transition-transform duration-300 ease-out group-hover:scale-[1.7] group-focus-within:scale-[1.7]"
        style={{ left: `${pct}%` }}
      />
    </div>
  );
}

export function PotCard({ pot }: { pot: PotSummary }) {
  const pct = percentOf(pot.totalRaised, pot.targetAmount);
  const typeLabel = pot.type.replaceAll("_", " ");
  const potHref = `/pots/${pot.slug}`;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden border border-pvn-navy/10 bg-white/70 transition duration-300 ease-out hover:-translate-y-1.5 hover:border-pvn-gold/60 hover:bg-white hover:shadow-[0_18px_40px_-18px_rgba(12,27,51,0.35)] focus-within:-translate-y-1.5 focus-within:border-pvn-gold/60">
      {/* Sits above media/copy so the whole card opens the pot. */}
      <Link
        href={potHref}
        className="absolute inset-0 z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pvn-gold focus-visible:ring-offset-2"
        aria-label={`Open ${pot.title}`}
      />
      <span
        className="pointer-events-none absolute top-0 left-0 z-30 h-4 w-4 origin-top-left scale-50 border-t-2 border-l-2 border-pvn-gold opacity-0 transition duration-300 ease-out group-hover:scale-100 group-hover:opacity-100 group-focus-within:scale-100 group-focus-within:opacity-100"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute right-0 bottom-0 z-30 h-4 w-4 origin-bottom-right scale-50 border-r-2 border-b-2 border-pvn-gold opacity-0 transition duration-300 ease-out group-hover:scale-100 group-hover:opacity-100 group-focus-within:scale-100 group-focus-within:opacity-100"
        aria-hidden
      />

      {pot.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={pot.photoUrl}
          alt=""
          className="aspect-[16/9] w-full object-cover transition duration-500 group-hover:scale-[1.03] group-focus-within:scale-[1.03]"
        />
      ) : (
        <div className="relative aspect-[16/9] w-full bg-pvn-navy-light" aria-hidden>
          <div
            className="absolute inset-0 opacity-[0.16]"
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
            <span className="h-2 w-2 rotate-45 bg-pvn-gold/80 transition-transform duration-500 ease-out group-hover:rotate-[135deg] group-hover:scale-125 group-focus-within:rotate-[135deg] group-focus-within:scale-125" />
            <span className="h-px w-8 bg-pvn-gold/35 transition-all duration-500 ease-out group-hover:w-12 group-hover:bg-pvn-gold/60 group-focus-within:w-12 group-focus-within:bg-pvn-gold/60" />
          </div>
        </div>
      )}
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-pvn-navy/30 to-transparent"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-1/3 -translate-x-[150%] skew-x-12 bg-gradient-to-r from-transparent via-pvn-gold/30 to-transparent transition-transform duration-[900ms] ease-out group-hover:translate-x-[400%] group-focus-within:translate-x-[400%]"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute right-3 top-3 z-10 flex h-7 w-7 translate-y-2 scale-90 items-center justify-center rounded-full bg-pvn-gold text-pvn-navy opacity-0 transition duration-300 ease-out group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:scale-100 group-focus-within:opacity-100"
        aria-hidden
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </span>

      <div className="relative z-10 flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="font-nav text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-pvn-gold transition-colors duration-300 group-hover:text-pvn-gold-light group-focus-within:text-pvn-gold-light">
            {typeLabel}
          </p>
          <p className="font-nav text-[0.7rem] font-bold text-pvn-navy/55 transition-colors duration-300 group-hover:text-pvn-navy group-focus-within:text-pvn-navy">
            {pct}%
          </p>
        </div>

        <h2 className="font-display line-clamp-2 text-xl font-semibold leading-snug text-pvn-navy transition-colors duration-300 group-hover:text-pvn-navy-light group-focus-within:text-pvn-navy-light">
          {pot.title}
        </h2>
        <div className="mt-auto pt-3">
          <Meter pct={pct} />
          <div className="mt-2.5 flex items-baseline justify-between gap-3">
            <p className="font-nav text-sm font-bold tracking-tight text-pvn-navy">
              {formatWholeGbp(pot.totalRaised)}
              <span className="font-normal text-pvn-navy/45"> / {formatWholeGbp(pot.targetAmount)}</span>
            </p>
            <p className="font-nav shrink-0 text-[0.65rem] uppercase tracking-[0.12em] text-pvn-navy/45">
              {pot.donorCount} {pot.donorCount === 1 ? "gift" : "gifts"}
            </p>
          </div>
          <p className="mt-1 truncate text-xs text-pvn-navy/45 transition-colors duration-300 group-hover:text-pvn-navy/70 group-focus-within:text-pvn-navy/70">
            {pot.fundraiser.name}
          </p>
          <span
            className="font-nav mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-md bg-pvn-gold px-4 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-navy uppercase transition duration-300 ease-out group-hover:bg-pvn-gold-light group-focus-within:bg-pvn-gold-light"
            aria-hidden
          >
            Support
          </span>
        </div>
      </div>
    </article>
  );
}
