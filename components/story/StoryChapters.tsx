"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

export type StoryChapter = {
  id: string;
  title: string;
  lead: string;
  body: readonly string[];
};

/** How long each chapter holds before the card turns itself. */
const DURATION_MS = 6000;

const NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"] as const;

function Chevron({ back = false }: { back?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={back ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}

/**
 * One card that turns its own page. Autoplay stops while the card is held,
 * hovered or focused, and the gold rail freezes with it rather than restarting,
 * so what you see is genuinely how long is left.
 */
export function StoryChapters({
  chapters,
}: {
  chapters: readonly StoryChapter[];
}) {
  const total = chapters.length;

  const [active, setActive] = useState(0);
  const [held, setHeld] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reduced, setReduced] = useState(false);

  /** Mirrors `active` so the timer cleanup can tell a pause from an advance. */
  const slideRef = useRef(0);
  const remainingRef = useRef(DURATION_MS);
  const startedRef = useRef(0);

  const paused = held || hovered || focused || reduced;

  const goTo = useCallback(
    (next: number) => {
      const wrapped = (next + total) % total;
      slideRef.current = wrapped;
      remainingRef.current = DURATION_MS;
      setActive(wrapped);
    },
    [total],
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  /** Deep links from elsewhere on the page should open the right chapter. */
  useEffect(() => {
    const applyHash = () => {
      const id = window.location.hash.slice(1);
      if (!id) return;
      const index = chapters.findIndex((chapter) => chapter.id === id);
      if (index >= 0) goTo(index);
    };

    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [chapters, goTo]);

  useEffect(() => {
    if (paused || total < 2) return;

    const slideAtStart = slideRef.current;
    startedRef.current = Date.now();
    const id = window.setTimeout(
      () => goTo(slideAtStart + 1),
      remainingRef.current,
    );

    return () => {
      window.clearTimeout(id);
      // Only bank the leftover when we stopped mid-chapter; an advance resets it.
      if (slideRef.current === slideAtStart) {
        remainingRef.current = Math.max(
          400,
          remainingRef.current - (Date.now() - startedRef.current),
        );
      }
    };
  }, [paused, active, goTo, total]);

  return (
    <div
      className="mx-auto max-w-2xl rounded-sm border border-pvn-navy/8 bg-white/50 px-5 py-8 shadow-[0_18px_40px_-28px_rgba(12,27,51,0.35)] select-none sm:px-8 sm:py-10"
      role="group"
      aria-roledescription="carousel"
      aria-label="Chapters of our story"
      onPointerDown={() => setHeld(true)}
      onPointerUp={() => setHeld(false)}
      onPointerCancel={() => setHeld(false)}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={() => {
        setHovered(false);
        setHeld(false);
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      {/* Every chapter shares one grid cell, so the card is as tall as the
          longest of them and the turn is a true crossfade, not a jump. */}
      <div className="grid">
        {chapters.map((chapter, index) => {
          const current = index === active;
          return (
            <article
              key={chapter.id}
              id={chapter.id}
              aria-hidden={!current}
              inert={!current || undefined}
              className={`col-start-1 row-start-1 scroll-mt-28 text-center transition duration-500 ease-out ${
                current
                  ? "translate-y-0 opacity-100"
                  : "pointer-events-none translate-y-1 opacity-0"
              }`}
            >
              <span className="mb-4 flex h-11 items-center justify-center">
                <span className="font-display text-3xl leading-none font-semibold text-pvn-gold">
                  {NUMERALS[index]}
                </span>
              </span>

              <h3 className="font-nav text-lg leading-snug font-bold tracking-[0.08em] text-balance text-pvn-navy uppercase sm:text-xl">
                {chapter.title}
              </h3>

              <div
                className="mx-auto mt-4 flex items-center justify-center gap-2"
                aria-hidden
              >
                <span className="h-px w-8 bg-pvn-gold/50" />
                <span className="h-1.5 w-1.5 rotate-45 bg-pvn-gold" />
                <span className="h-px w-8 bg-pvn-gold/50" />
              </div>

              <p className="font-display mt-3 text-base text-pvn-navy/55 italic">
                {chapter.lead}
              </p>

              <div className="mx-auto mt-4 max-w-lg space-y-3 text-sm leading-relaxed text-pvn-navy/70 text-pretty">
                {chapter.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-7 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => goTo(active - 1)}
          aria-label="Previous chapter"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-pvn-navy/35 transition duration-300 ease-out hover:bg-pvn-navy/5 hover:text-pvn-navy focus-visible:bg-pvn-navy/5 focus-visible:text-pvn-navy focus-visible:outline-none"
        >
          <Chevron back />
        </button>

        <div className="flex items-center gap-2">
          {chapters.map((chapter, index) => {
            const current = index === active;
            return (
              <button
                key={chapter.id}
                type="button"
                onClick={() => goTo(index)}
                aria-label={`Chapter ${NUMERALS[index]} — ${chapter.title}`}
                aria-current={current}
                className={`h-1.5 overflow-hidden rounded-full transition-all duration-500 ${
                  current
                    ? "w-7 bg-pvn-navy/20"
                    : "w-1.5 bg-pvn-navy/20 hover:bg-pvn-navy/35"
                }`}
              >
                {/* The live dot doubles as the six-second rail. */}
                {current ? (
                  <span
                    data-paused={paused}
                    className="pvn-story-fill block h-full w-full rounded-full bg-pvn-gold"
                    style={
                      {
                        "--pvn-story-duration": `${DURATION_MS}ms`,
                      } as CSSProperties
                    }
                  />
                ) : null}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => goTo(active + 1)}
          aria-label="Next chapter"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-pvn-navy/35 transition duration-300 ease-out hover:bg-pvn-navy/5 hover:text-pvn-navy focus-visible:bg-pvn-navy/5 focus-visible:text-pvn-navy focus-visible:outline-none"
        >
          <Chevron />
        </button>
      </div>
    </div>
  );
}
