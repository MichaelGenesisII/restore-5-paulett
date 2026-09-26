"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type KeyboardEvent } from "react";

type StoryImageCardProps = {
  src: string;
  alt: string;
  label: string;
  numeral: string;
  title: string;
  lines: readonly string[];
  accent?: boolean;
  href?: string;
  linkLabel?: string;
};

export function StoryImageCard({
  src,
  alt,
  label,
  numeral,
  title,
  lines,
  accent = false,
  href,
  linkLabel,
}: StoryImageCardProps) {
  const [overlayVisible, setOverlayVisible] = useState(true);

  function toggleOverlay() {
    setOverlayVisible((visible) => !visible);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleOverlay();
    }
  }

  return (
    <article
      className="group relative min-h-[25rem] cursor-pointer overflow-hidden sm:min-h-[29rem] lg:min-h-[30rem]"
      role="button"
      tabIndex={0}
      aria-label={`${overlayVisible ? "Hide" : "Show"} details for ${label}`}
      onClick={toggleOverlay}
      onKeyDown={handleKeyDown}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 1024px) 100vw, 50vw"
        className="object-cover object-center transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
      />
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${
          overlayVisible
            ? "bg-[linear-gradient(to_top,rgba(12,27,51,0.94)_0%,rgba(12,27,51,0.76)_42%,rgba(12,27,51,0.28)_78%,rgba(12,27,51,0.08)_100%)]"
            : "bg-transparent"
        }`}
        aria-hidden
      />

      <div
        className={`absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 px-4 py-3 sm:px-5 ${
          accent
            ? "bg-pvn-gold text-pvn-navy"
            : "bg-pvn-navy/80 text-pvn-cream backdrop-blur-[1px]"
        }`}
      >
        <span className="font-nav text-[0.65rem] font-bold tracking-[0.22em] uppercase sm:text-xs">
          {label}
        </span>
        <span
          className={`font-nav text-[0.55rem] font-bold tracking-[0.18em] uppercase ${
            accent ? "text-pvn-navy" : "text-pvn-gold"
          }`}
        >
          {numeral}
        </span>
      </div>

      {overlayVisible ? (
        <div className="absolute inset-x-0 bottom-0 z-10 bg-pvn-navy/80 p-5 sm:p-6 lg:p-7">
        <p className="font-display text-2xl font-semibold leading-tight text-pvn-cream sm:text-3xl">
          {title}
        </p>
        <div className="mt-4 space-y-3 text-sm leading-snug text-pvn-cream/90 sm:text-base">
          {lines.map((line, index) => (
            <div
              key={line}
              className="flex items-baseline gap-3 border-t border-pvn-gold/30 pt-2 first:border-t-0 first:pt-0"
            >
              <span
                className={`font-nav shrink-0 text-[0.55rem] font-bold tracking-[0.14em] lowercase ${
                  accent ? "text-pvn-gold" : "text-pvn-cream/50"
                }`}
              >
                {String.fromCharCode(105 + index)}
              </span>
              <span>{line}</span>
            </div>
          ))}
        </div>

        {href && linkLabel ? (
          <Link
            href={href}
            onClick={(event) => event.stopPropagation()}
            className="font-nav mt-5 inline-flex items-center gap-2 rounded-md bg-pvn-gold px-5 py-3 text-xs font-bold tracking-[0.16em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light"
          >
            {linkLabel}
            <span aria-hidden>→</span>
          </Link>
        ) : null}
      </div>
      ) : null}
    </article>
  );
}
