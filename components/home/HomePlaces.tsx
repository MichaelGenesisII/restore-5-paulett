"use client";

import { useEffect, useRef, useState } from "react";

type Place = {
  title: string;
  body: string;
  accent: boolean;
  icon:
    | "prayer"
    | "worship"
    | "word"
    | "nextgen"
    | "families"
    | "community"
    | "heritage"
    | "nations";
};

/**
 * Every body opens on a different word and stays inside a narrow length band,
 * so the eight cards read as one set without falling into a chant.
 */
const places: Place[] = [
  {
    title: "A Place for Prayer",
    body: "Prayer rises continually for Belfast, for Northern Ireland and for the nations.",
    accent: true,
    icon: "prayer",
  },
  {
    title: "A Place for Worship",
    body: "Generation after generation gathers to lift His name and encounter God together.",
    accent: false,
    icon: "worship",
  },
  {
    title: "A Place for the Word",
    body: "Teaching that disciples, equips and sends people out to live what they believe.",
    accent: false,
    icon: "word",
  },
  {
    title: "A Place for the Next Generation",
    body: "Children find Christ, young people find purpose, and tomorrow's leaders are raised.",
    accent: false,
    icon: "nextgen",
  },
  {
    title: "A Place for Families",
    body: "Marriages are strengthened, families are supported, and every person belongs.",
    accent: false,
    icon: "families",
  },
  {
    title: "A Place for Community",
    body: "Our doors stay open to serve, to support and to bring hope to the people of Belfast.",
    accent: false,
    icon: "community",
  },
  {
    title: "A Place of Heritage",
    body: "Nearly 190 years of faith and community life, preserved, honoured and passed on.",
    accent: true,
    icon: "heritage",
  },
  {
    title: "A Place for All Nations",
    body: "People of every culture and nation belong here, worshipping and building together.",
    accent: false,
    icon: "nations",
  },
];

function PlaceIcon({
  name,
  className,
}: {
  name: Place["icon"];
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 bg-pvn-gold ${className ?? ""}`}
      style={{
        WebkitMaskImage: `url(/svg/${name}.svg)`,
        maskImage: `url(/svg/${name}.svg)`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}

function PlaceItem({ place }: { place: Place }) {
  return (
    <article className="relative flex h-full flex-col items-center px-4 py-2 text-center sm:px-3 lg:px-4">
      <span className="mb-5 flex h-14 w-14 items-center justify-center">
        <PlaceIcon name={place.icon} className="h-12 w-12" />
      </span>
      {/* Two lines are reserved so the longer titles don't push their body
          text out of step with the cards beside them. */}
      <h3 className="font-nav flex min-h-[2.6em] items-center text-balance text-[0.8rem] font-bold uppercase leading-snug tracking-[0.1em] text-pvn-navy">
        {place.title}
      </h3>
      <div
        className="mt-1 mb-3 flex items-center gap-2 opacity-70"
        aria-hidden
      >
        <span className="h-px w-4 bg-pvn-gold/50" />
        <span className="h-1 w-1 rotate-45 bg-pvn-gold" />
        <span className="h-px w-4 bg-pvn-gold/50" />
      </div>
      <p className="text-sm leading-relaxed text-pvn-navy/70 text-pretty">
        {place.body}
      </p>
    </article>
  );
}

export function HomePlaces() {
  const [visible, setVisible] = useState(1);
  const [rawIndex, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setVisible(mq.matches ? 4 : 1);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // How many start positions when advancing 1 item at a time
  const maxIndex = Math.max(0, places.length - visible);
  // Clamped at render, so going 1 → 4 visible never strands the carousel.
  const index = Math.min(rawIndex, maxIndex);

  useEffect(() => {
    if (paused || maxIndex < 1) return;
    // Desktop (4 visible): 6s · Mobile (1 visible): 3s
    const ms = visible >= 4 ? 6000 : 3000;
    const id = window.setInterval(() => {
      setIndex((current) => (current >= maxIndex ? 0 : current + 1));
    }, ms);
    return () => window.clearInterval(id);
  }, [paused, maxIndex, visible]);

  const go = (direction: -1 | 1) => {
    setIndex((current) => {
      const next = Math.min(current, maxIndex) + direction;
      if (next < 0) return maxIndex;
      if (next > maxIndex) return 0;
      return next;
    });
  };

  const stepPercent = 100 / visible;
  const dotCount = maxIndex + 1;

  return (
    <section
      id="places"
      className="relative hidden overflow-hidden border-t border-pvn-navy/5 bg-pvn-cream py-14 sm:py-20 md:block"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pvn-gold/50 to-transparent"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-nav text-xs font-semibold uppercase tracking-[0.28em] text-pvn-gold">
            What this house will hold
          </p>
          <h2 className="font-nav mt-3 text-2xl font-bold uppercase tracking-[0.08em] text-pvn-navy sm:text-3xl lg:text-4xl">
            A Place of Victory for All Nations
          </h2>
          <div
            className="mx-auto mt-4 flex items-center justify-center gap-2"
            aria-hidden
          >
            <span className="h-px w-8 bg-pvn-gold/50" />
            <span className="h-1.5 w-1.5 rotate-45 bg-pvn-gold" />
            <span className="h-px w-8 bg-pvn-gold/50" />
          </div>
        </div>

        <div
          className="relative mt-10 md:mt-12"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={(event) => {
            touchStartX.current = event.touches[0]?.clientX ?? null;
            setPaused(true);
          }}
          onTouchEnd={(event) => {
            const start = touchStartX.current;
            const end = event.changedTouches[0]?.clientX;
            touchStartX.current = null;
            setPaused(false);
            if (start == null || end == null) return;
            const delta = end - start;
            if (Math.abs(delta) < 40) return;
            go(delta < 0 ? 1 : -1);
          }}
        >
          <div className="overflow-hidden">
            <div
              className="flex w-full transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ transform: `translateX(-${index * stepPercent}%)` }}
            >
              {places.map((place) => (
                <div
                  key={place.title}
                  className="shrink-0"
                  style={{ flex: `0 0 ${stepPercent}%` }}
                >
                  <div className="h-full px-1 md:px-2">
                    <div className="mx-auto h-full max-w-sm rounded-sm border border-pvn-navy/8 bg-white/50 px-2 py-8 shadow-[0_18px_40px_-28px_rgba(12,27,51,0.35)] md:max-w-none">
                      <PlaceItem place={place} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2">
            {Array.from({ length: dotCount }).map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Show place ${i + 1}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i === index
                    ? "w-7 bg-pvn-gold"
                    : "w-1.5 bg-pvn-navy/20 hover:bg-pvn-navy/35"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
