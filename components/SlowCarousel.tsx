"use client";

import {
  Children,
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

const AUTO_GLIDE_MS = 1600;
const MANUAL_GLIDE_MS = 650;

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

function ease(p: number) {
  return p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2;
}

/**
 * A row of cards readers can swipe (touch), drag (mouse) or scroll (trackpad).
 * It drifts one card along every `intervalMs` while on screen, and stops the
 * moment the reader takes over — for good, or until `resumeAfterMs` of quiet.
 */
export function SlowCarousel({
  label,
  slideClassName,
  intervalMs = 12_000,
  resumeAfterMs,
  tone = "light",
  slideLabels,
  children,
}: {
  label: string;
  /** Width per slide, e.g. "w-full md:w-1/2 lg:w-1/4". Spacing goes inside. */
  slideClassName: string;
  intervalMs?: number;
  /** Photos can pick up again after a pause; reading carousels should not. */
  resumeAfterMs?: number;
  /** Control colours for a cream ("light") or navy ("dark") background. */
  tone?: "light" | "dark";
  slideLabels?: readonly string[];
  children: ReactNode;
}) {
  const slides = Children.toArray(children);
  const count = slides.length;

  const trackRef = useRef<HTMLDivElement>(null);
  const glideRef = useRef<number | null>(null);
  const dragRef = useRef<{ x: number; left: number; moved: boolean } | null>(
    null,
  );

  const [index, setIndex] = useState(0);
  const [maxIndex, setMaxIndex] = useState<number | null>(null);
  const [inView, setInView] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [touchedAt, setTouchedAt] = useState(0);
  const [reduced, setReduced] = useState(false);
  const takenOver = touchedAt > 0;
  const takeOver = useCallback(() => setTouchedAt(Date.now()), []);

  useEffect(() => {
    if (!touchedAt || !resumeAfterMs) return;
    const id = window.setTimeout(() => setTouchedAt(0), resumeAfterMs);
    return () => window.clearTimeout(id);
  }, [touchedAt, resumeAfterMs]);

  const step = useCallback(() => {
    const first = trackRef.current?.firstElementChild as HTMLElement | null;
    return first?.offsetWidth ?? 0;
  }, []);

  const stopGlide = useCallback(() => {
    if (glideRef.current !== null) cancelAnimationFrame(glideRef.current);
    glideRef.current = null;
    if (trackRef.current) trackRef.current.style.scrollSnapType = "";
  }, []);

  const glideTo = useCallback(
    (next: number, duration: number) => {
      const track = trackRef.current;
      const size = step();
      if (!track || size === 0) return;
      const last = maxIndex ?? count - 1;
      const target = Math.max(0, Math.min(last, next)) * size;

      stopGlide();
      if (reduced) {
        track.scrollLeft = target;
        return;
      }
      const from = track.scrollLeft;
      const distance = target - from;
      if (Math.abs(distance) < 1) return;

      // Snapping would fight each frame of the glide; it comes back at the end.
      track.style.scrollSnapType = "none";
      const started = performance.now();
      const frame = (now: number) => {
        const p = Math.min(1, (now - started) / duration);
        track.scrollLeft = from + distance * ease(p);
        if (p < 1) glideRef.current = requestAnimationFrame(frame);
        else stopGlide();
      };
      glideRef.current = requestAnimationFrame(frame);
    },
    [count, maxIndex, reduced, step, stopGlide],
  );

  const go = useCallback(
    (next: number) => {
      takeOver();
      const last = maxIndex ?? count - 1;
      const wrapped = next < 0 ? last : next > last ? 0 : next;
      glideTo(wrapped, MANUAL_GLIDE_MS);
    },
    [count, glideTo, maxIndex, takeOver],
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const measure = () => {
      const size = step();
      if (size === 0) return;
      const visible = Math.max(1, Math.round(track.clientWidth / size));
      setMaxIndex(Math.max(0, count - visible));
    };
    const onScroll = () => {
      const size = step();
      if (size > 0) setIndex(Math.round(track.scrollLeft / size));
    };

    const resize = new ResizeObserver(measure);
    resize.observe(track);
    const seen = new IntersectionObserver(
      ([entry]) => setInView(Boolean(entry?.isIntersecting)),
      { threshold: 0.4 },
    );
    seen.observe(track);
    track.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      resize.disconnect();
      seen.disconnect();
      track.removeEventListener("scroll", onScroll);
    };
  }, [count, step]);

  useEffect(() => stopGlide, [stopGlide]);

  const last = maxIndex ?? 0;
  const current = Math.min(index, last);
  const playing =
    !takenOver && !reduced && inView && !hovered && !focused && last > 0;

  useEffect(() => {
    if (!playing) return;
    const id = window.setTimeout(
      () => glideTo(current >= last ? 0 : current + 1, AUTO_GLIDE_MS),
      intervalMs,
    );
    return () => window.clearTimeout(id);
  }, [playing, current, last, intervalMs, glideTo]);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    takeOver();
    stopGlide();
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    const track = trackRef.current;
    if (!track) return;
    dragRef.current = { x: event.clientX, left: track.scrollLeft, moved: false };
    track.style.scrollSnapType = "none";
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const track = trackRef.current;
    if (!drag || !track) return;
    const dx = event.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 4) {
      drag.moved = true;
      track.setPointerCapture(event.pointerId);
    }
    if (drag.moved) track.scrollLeft = drag.left - dx;
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const track = trackRef.current;
    dragRef.current = null;
    if (!drag || !track) return;
    if (!drag.moved) {
      track.style.scrollSnapType = "";
      return;
    }
    const size = step() || 1;
    const dx = event.clientX - drag.x;
    const exact = track.scrollLeft / size;
    // A deliberate flick moves at least one card, even if it was short.
    const target =
      dx < -40 ? Math.ceil(exact) : dx > 40 ? Math.floor(exact) : Math.round(exact);
    glideTo(target, MANUAL_GLIDE_MS);
  }

  const arrowClass = `inline-flex h-10 w-10 items-center justify-center rounded-full border transition duration-300 ease-out hover:border-pvn-gold/50 focus-visible:outline-none ${
    tone === "dark"
      ? "border-pvn-cream/15 text-pvn-cream/60 hover:bg-pvn-cream/10 hover:text-pvn-cream focus-visible:bg-pvn-cream/10 focus-visible:text-pvn-cream"
      : "border-pvn-navy/10 text-pvn-navy/50 hover:bg-pvn-navy/5 hover:text-pvn-navy focus-visible:bg-pvn-navy/5 focus-visible:text-pvn-navy"
  }`;
  const dotClass =
    tone === "dark"
      ? "bg-pvn-cream/25 hover:bg-pvn-cream/45"
      : "bg-pvn-navy/20 hover:bg-pvn-navy/35";

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      go(current + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(current - 1);
    }
  }

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={(event) => setFocused(event.target.matches(":focus-visible"))}
      onBlur={() => setFocused(false)}
    >
      <div
        ref={trackRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onWheel={(event) => {
          if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
            takeOver();
            stopGlide();
          }
        }}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain py-3 select-none [scrollbar-width:none] focus-visible:outline-none md:cursor-grab md:active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            role="group"
            aria-roledescription="slide"
            aria-label={slideLabels?.[i] ?? `${i + 1} of ${count}`}
            className={`shrink-0 snap-start ${slideClassName}`}
          >
            {slide}
          </div>
        ))}
      </div>

      {maxIndex !== null && maxIndex > 0 ? (
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => go(current - 1)}
            aria-label="Previous"
            className={arrowClass}
          >
            <Chevron back />
          </button>

          <div className="flex items-center gap-2">
            {Array.from({ length: maxIndex + 1 }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to ${slideLabels?.[i] ?? `slide ${i + 1}`}`}
                aria-current={i === current}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i === current ? "w-7 bg-pvn-gold" : `w-1.5 ${dotClass}`
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => go(current + 1)}
            aria-label="Next"
            className={arrowClass}
          >
            <Chevron />
          </button>
        </div>
      ) : null}
    </div>
  );
}
