import Link from "next/link";
import { PotCard } from "@/components/PotCard";
import type { PotRollTileData } from "@/components/pots/PotRollTile";

type Props = {
  pots: PotRollTileData[];
};

/**
 * Pot details — horizontal row of other pots on a bright cream field
 * (same card language as /fundraisers).
 */
export function PotMorePots({ pots }: Props) {
  if (pots.length === 0) return null;

  const useRoll = pots.length >= 3;
  const loop = useRoll ? [...pots, ...pots] : pots;

  function card(pot: PotRollTileData) {
    return (
      <div className="w-[16rem] shrink-0 sm:w-[18rem]">
        <PotCard
          pot={{
            slug: pot.slug,
            title: pot.title,
            story: null,
            photoUrl: pot.photoUrl,
            type: pot.type,
            targetAmount: pot.targetAmount,
            totalRaised: pot.totalRaised,
            donorCount: pot.donorCount,
            fundraiser: { name: pot.fundraiserName },
          }}
        />
      </div>
    );
  }

  return (
    <section
      id="more-pots"
      className="border-t border-pvn-navy/10 bg-pvn-cream py-10 sm:py-12"
      aria-labelledby="more-pots-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div className="min-w-0 max-w-xl">
            <p className="font-nav flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.28em] text-pvn-gold">
              <span className="h-1.5 w-1.5 rotate-45 bg-pvn-gold" aria-hidden />
              Along the same wall
            </p>
            <h2
              id="more-pots-heading"
              className="font-display mt-2 text-2xl font-semibold text-balance text-pvn-navy sm:text-3xl"
            >
              Other stones rising
            </h2>
          </div>

          <Link
            href="/fundraisers"
            className="font-nav shrink-0 text-sm font-bold uppercase tracking-[0.16em] text-pvn-gold transition hover:text-pvn-navy"
          >
            See all →
          </Link>
        </div>
      </div>

      {useRoll ? (
        <div
          className="group relative mt-6 overflow-hidden py-3"
          style={{
            WebkitMaskImage:
              "linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)",
            maskImage:
              "linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)",
          }}
        >
          <div
            className="pvn-roll-track flex w-max flex-nowrap gap-4 group-hover:[animation-play-state:paused]"
            style={{ animation: "pvn-roll-left 50s linear infinite" }}
          >
            {loop.map((pot, i) => (
              <div key={`${pot.slug}-${i}`}>{card(pot)}</div>
            ))}
          </div>
        </div>
      ) : (
        <div
          className="mt-6 overflow-x-auto overscroll-x-contain py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{
            WebkitMaskImage:
              "linear-gradient(to right, transparent, #000 6%, #000 94%, transparent)",
            maskImage:
              "linear-gradient(to right, transparent, #000 6%, #000 94%, transparent)",
          }}
        >
          <div className="flex w-max flex-nowrap gap-4 px-4 sm:px-6">
            {pots.map((pot) => (
              <div key={pot.slug}>{card(pot)}</div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
