import Link from "next/link";
import { formatWholeGbp, percentOf } from "@/lib/money";
import { potTypeLabel } from "@/lib/pots";
import type { PotType } from "@prisma/client";

type AlumniPot = {
  slug: string;
  title: string;
  photoUrl: string | null;
  type: PotType;
  targetAmount: number;
  totalRaised: number;
  donorCount: number;
  fundraiser: {
    name: string;
    alumniCity: string | null;
    alumniMinistry: string | null;
  };
};

export function AlumniPotCard({ pot }: { pot: AlumniPot }) {
  const pct = percentOf(pot.totalRaised, pot.targetAmount);
  const started = pot.totalRaised > 0;
  const place =
    pot.fundraiser.alumniCity?.trim() ||
    pot.fundraiser.alumniMinistry?.trim() ||
    null;
  const potHref = `/pots/${pot.slug}`;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-sm border border-pvn-navy/10 bg-white/70 shadow-[0_18px_44px_-30px_rgba(12,27,51,0.45)] transition duration-300 hover:-translate-y-0.5 hover:border-pvn-gold/50 focus-within:-translate-y-0.5 focus-within:border-pvn-gold/50">
      <Link
        href={potHref}
        className="absolute inset-0 z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pvn-gold focus-visible:ring-offset-2"
        aria-label={`Open ${pot.title}`}
      />
      {pot.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={pot.photoUrl}
          alt=""
          className="aspect-[16/9] w-full object-cover"
        />
      ) : (
        <div
          className="flex aspect-[16/9] w-full items-center justify-center bg-pvn-navy/[0.04]"
          aria-hidden
        >
          <span className="font-nav text-[0.6rem] font-bold tracking-[0.2em] text-pvn-navy/30 uppercase">
            {potTypeLabel(pot.type)}
          </span>
        </div>
      )}

      <div className="relative z-10 flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-nav rounded-full bg-pvn-navy px-2.5 py-1 text-[0.6rem] font-bold tracking-[0.14em] text-pvn-cream uppercase">
            {potTypeLabel(pot.type)}
          </span>
          {place ? (
            <span className="font-nav rounded-full border border-pvn-gold/50 px-2.5 py-1 text-[0.6rem] font-bold tracking-[0.14em] text-pvn-navy/70 uppercase">
              {place}
            </span>
          ) : null}
        </div>

        <h3 className="font-display text-xl leading-tight font-semibold text-pvn-navy">
          {pot.title}
        </h3>

        <div className="mt-auto pt-1">
          <div
            className="h-1.5 w-full overflow-hidden bg-pvn-navy/10"
            aria-hidden
          >
            <span
              className="block h-full bg-pvn-gold transition-[width] duration-500"
              style={{
                width: `${started ? Math.max(pct, 1.5) : 0}%`,
              }}
            />
          </div>
          <p className="font-nav mt-2 flex items-baseline justify-between gap-3 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-navy/60 uppercase">
            <span>
              {formatWholeGbp(pot.totalRaised)}
              {started ? " raised" : " so far"}
            </span>
            <span className="text-pvn-navy">
              {formatWholeGbp(pot.targetAmount)} target
            </span>
          </p>
        </div>

        <p className="border-t border-pvn-navy/10 pt-3 text-xs text-pvn-navy/55">
          {pot.donorCount} {pot.donorCount === 1 ? "gift" : "gifts"} ·{" "}
          {pot.fundraiser.name}
        </p>

        <span
          className="font-nav inline-flex min-h-10 w-full items-center justify-center rounded-md bg-pvn-gold px-4 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-navy uppercase transition duration-300 ease-out group-hover:bg-pvn-gold-light group-focus-within:bg-pvn-gold-light"
          aria-hidden
        >
          Support
        </span>
      </div>
    </article>
  );
}
