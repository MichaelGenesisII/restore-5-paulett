"use client";

import type { PotType } from "@prisma/client";
import { formatWholeGbp, percentOf } from "@/lib/money";

/**
 * Live wall-card preview — title-led like PotCard / the fundraisers wall.
 * Description lives on the pot page, not on the card.
 */
export function PotPreview({
  type,
  title,
  photoUrl,
  targetPence,
  fundraiserName,
}: {
  type: PotType;
  title: string;
  /** Kept for call-site compatibility; not shown on the wall card. */
  story?: string;
  photoUrl: string;
  targetPence: number | null;
  fundraiserName: string;
}) {
  const showPhoto = /^(https?:\/\/|blob:)\S+/i.test(photoUrl.trim());
  const pct = percentOf(0, targetPence ?? 0);
  const typeLabel = type.replaceAll("_", " ");
  const named = Boolean(title.trim());
  const host = fundraiserName.trim() || "your name here";

  return (
    <figure className="group overflow-hidden border border-pvn-navy/10 bg-white/70 shadow-[0_18px_44px_-30px_rgba(12,27,51,0.55)]">
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl.trim()}
          alt=""
          className="aspect-[16/9] w-full object-cover"
        />
      ) : (
        <div
          className="relative aspect-[16/9] w-full bg-pvn-navy-light"
          aria-hidden
        >
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
            <span className="h-2 w-2 rotate-45 bg-pvn-gold/80" />
            <span className="h-px w-8 bg-pvn-gold/35" />
          </div>
        </div>
      )}

      <figcaption className="relative z-10 flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="font-nav text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-pvn-gold">
            {typeLabel}
          </p>
          <p className="font-nav text-[0.7rem] font-bold text-pvn-navy/55">
            {pct}%
          </p>
        </div>

        <h3
          className={`font-display line-clamp-2 text-xl leading-snug font-semibold ${
            named ? "text-pvn-navy" : "text-pvn-navy/25"
          }`}
        >
          {named ? title.trim() : "Your fundraiser needs a name"}
        </h3>

        <div className="mt-auto pt-3">
          <div className="relative h-[3px] w-full bg-pvn-navy/12" aria-hidden>
            <div
              className="h-full bg-gradient-to-r from-pvn-gold to-pvn-gold-light"
              style={{ width: `${Math.max(pct, 0)}%` }}
            />
            <span
              className="absolute top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-pvn-gold"
              style={{ left: `${pct}%` }}
            />
          </div>
          <div className="mt-2.5 flex items-baseline justify-between gap-3">
            <p className="font-nav text-sm font-bold tracking-tight text-pvn-navy">
              {formatWholeGbp(0)}
              {targetPence !== null ? (
                <span className="font-normal text-pvn-navy/45">
                  {" "}
                  / {formatWholeGbp(targetPence)}
                </span>
              ) : null}
            </p>
            <p className="font-nav shrink-0 text-[0.65rem] uppercase tracking-[0.12em] text-pvn-navy/45">
              0 gifts
            </p>
          </div>
          <p className="mt-1 truncate text-xs text-pvn-navy/45">{host}</p>
          <span
            className="font-nav mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-md bg-pvn-gold px-4 text-[0.65rem] font-bold tracking-[0.14em] text-pvn-navy uppercase"
            aria-hidden
          >
            Support
          </span>
        </div>
      </figcaption>
    </figure>
  );
}
