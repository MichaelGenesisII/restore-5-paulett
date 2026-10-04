"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";

export type GalleryShot = {
  src: string;
  shape: "wide" | "portrait";
};

type Props = {
  shots: readonly GalleryShot[];
};

/**
 * Masonry of the house photographs: hover lifts and gilds a tile; click or
 * touch opens it full-bleed with prev/next for the rest of the set.
 */
export function HomeGallery({ shots }: Props) {
  const [active, setActive] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const open = active !== null;
  const current = open ? shots[active] : null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const onClose = () => setActive(null);
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, []);

  const go = useCallback(
    (delta: number) => {
      setActive((index) => {
        if (index === null) return index;
        return (index + delta + shots.length) % shots.length;
      });
    },
    [shots.length],
  );

  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        go(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        go(-1);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, go]);

  return (
    <>
      <div className="columns-1 gap-3 sm:columns-2 sm:gap-4 lg:columns-3 lg:gap-5">
        {shots.map((shot, index) => (
          <button
            key={shot.src}
            type="button"
            onClick={() => setActive(index)}
            aria-label={`Open photograph ${index + 1} of ${shots.length}`}
            className="pvn-gallery-tile group relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-sm bg-pvn-navy/5 text-left sm:mb-4 lg:mb-5"
          >
            <Image
              src={shot.src}
              alt={`5 Paulett Avenue — photograph ${index + 1}`}
              width={shot.shape === "portrait" ? 1200 : 1600}
              height={shot.shape === "portrait" ? 1600 : 1066}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="pvn-gallery-image h-auto w-full object-cover"
              priority={index < 3}
            />
            <span
              className="pvn-gallery-veil pointer-events-none absolute inset-0"
              aria-hidden
            />
            <span
              className="pvn-gallery-frame pointer-events-none absolute inset-2 border border-pvn-gold/0"
              aria-hidden
            />
            <span className="pvn-gallery-cue font-nav pointer-events-none absolute right-3 bottom-3 rounded-sm bg-pvn-navy/80 px-2.5 py-1 text-[0.6rem] font-bold tracking-[0.16em] text-pvn-cream uppercase opacity-0 backdrop-blur-sm">
              View
            </span>
          </button>
        ))}
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="pvn-modal m-0 h-dvh max-h-dvh w-dvw max-w-dvw border-0 bg-transparent p-0 text-pvn-cream open:flex open:flex-col backdrop:bg-pvn-navy/88 backdrop:backdrop-blur-md"
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        {current && active !== null ? (
          <div className="relative flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
              <p
                id={titleId}
                className="font-nav text-[0.65rem] font-bold tracking-[0.2em] text-pvn-gold uppercase"
              >
                Photograph {active + 1} of {shots.length}
              </p>
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="font-nav inline-flex min-h-10 items-center rounded-sm border border-pvn-cream/20 px-3 text-[0.65rem] font-bold tracking-[0.16em] text-pvn-cream/80 uppercase transition hover:border-pvn-gold hover:text-pvn-gold"
              >
                Close
              </button>
            </div>

            <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6 sm:px-10">
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Previous photograph"
                className="font-nav absolute top-1/2 left-2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-pvn-cream/20 bg-pvn-navy/60 text-lg text-pvn-cream backdrop-blur-sm transition hover:border-pvn-gold hover:text-pvn-gold sm:left-4"
              >
                ←
              </button>

              <div
                key={current.src}
                className="pvn-figure relative flex max-h-[min(78dvh,52rem)] w-full max-w-5xl items-center justify-center"
              >
                <Image
                  src={current.src}
                  alt={`5 Paulett Avenue — photograph ${active + 1}`}
                  width={current.shape === "portrait" ? 1200 : 1600}
                  height={current.shape === "portrait" ? 1600 : 1066}
                  sizes="(max-width: 1024px) 100vw, 64rem"
                  className="max-h-[min(78dvh,52rem)] w-auto max-w-full rounded-sm object-contain shadow-[0_40px_90px_-30px_rgba(0,0,0,0.7)]"
                  priority
                />
              </div>

              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Next photograph"
                className="font-nav absolute top-1/2 right-2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-pvn-cream/20 bg-pvn-navy/60 text-lg text-pvn-cream backdrop-blur-sm transition hover:border-pvn-gold hover:text-pvn-gold sm:right-4"
              >
                →
              </button>
            </div>

            <p className="font-nav pb-5 text-center text-[0.6rem] font-bold tracking-[0.18em] text-pvn-cream/45 uppercase">
              Swipe the arrows · Esc to close
            </p>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
