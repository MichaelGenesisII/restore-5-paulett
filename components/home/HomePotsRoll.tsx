"use client";

import { useState } from "react";
import {
  PotRollTile,
  type PotRollTileData,
} from "@/components/pots/PotRollTile";

/**
 * Auto-scrolling pot strip with hover pause and an explicit Pause control
 * for keyboard / vestibular users.
 */
export function HomePotsRoll({ pots }: { pots: PotRollTileData[] }) {
  const [paused, setPaused] = useState(false);
  const minTiles = 6;
  const copies = Math.max(2, Math.ceil(minTiles / pots.length));
  const loop = Array.from({ length: copies }, () => pots).flat();

  return (
    <div>
      <div
        className="group relative mt-6 overflow-hidden py-4"
        style={{
          WebkitMaskImage:
            "linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)",
          maskImage:
            "linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)",
        }}
      >
        <div
          className="pvn-roll-track flex w-max flex-nowrap gap-4 group-hover:[animation-play-state:paused]"
          style={{
            animation: "pvn-roll-left 50s linear infinite",
            animationPlayState: paused ? "paused" : "running",
          }}
        >
          {loop.map((pot, i) => (
            <PotRollTile key={`${pot.slug}-${i}`} pot={pot} />
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
          className="font-nav inline-flex min-h-10 items-center rounded-md border border-pvn-cream/25 px-4 text-[0.65rem] font-bold tracking-[0.16em] text-pvn-cream/80 uppercase transition hover:border-pvn-gold/50 hover:text-pvn-gold"
        >
          {paused ? "Play pot row" : "Pause pot row"}
        </button>
        <p
          className="font-nav hidden items-center justify-center gap-3 text-[0.6rem] uppercase tracking-[0.22em] text-pvn-cream/35 sm:flex"
          aria-hidden
        >
          <span className="h-1 w-1 rotate-45 bg-pvn-gold/50" />
          Hover or pause · open any pot
          <span className="h-1 w-1 rotate-45 bg-pvn-gold/50" />
        </p>
      </div>
    </div>
  );
}
