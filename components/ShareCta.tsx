"use client";

import { useEffect, useState } from "react";
import { IconShare } from "@/components/icons";
import { useToast } from "@/components/toast/ToastProvider";

type Props = {
  title: string;
  text: string;
  /** Resolve the share URL at click time (needs `window` for origin). */
  getUrl: () => string;
  /** Accessible label while idle. */
  label?: string;
  className?: string;
  /** Larger tap target for pot hero CTAs; `compact` shrinks on narrow screens. */
  size?: "md" | "lg" | "compact";
};

/** Home hero CTA row sizing — shared so all three buttons shrink together. */
export const HERO_CTA_SIZE_CLASS =
  "gap-1 px-2 py-2.5 text-[0.6rem] tracking-[0.04em] min-[400px]:gap-1.5 min-[400px]:px-3 min-[400px]:text-[0.68rem] min-[400px]:tracking-[0.08em] sm:gap-2 sm:px-5 sm:py-3 sm:text-sm sm:tracking-[0.1em]";

export const HERO_CTA_ICON_CLASS = "h-3.5 w-3.5 sm:h-4 sm:w-4";

/**
 * Native share sheet when available; otherwise copy link.
 * Idle pulse + icon motion; check + burst when a link is copied.
 */
export function ShareCta({
  title,
  text,
  getUrl,
  label = "Share",
  className = "",
  size = "md",
}: Props) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [burstKey, setBurstKey] = useState(0);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2200);
    return () => window.clearTimeout(t);
  }, [copied]);

  async function share() {
    const url = getUrl().trim();
    if (!url) {
      toast.error("Could not share the link");
      return;
    }

    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title, text, url });
        return;
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setBurstKey((k) => k + 1);
      setCopied(true);
      toast.success("Link copied", "Paste it anywhere to share.");
    } catch {
      toast.error("Could not copy the link");
    }
  }

  const sizeClass =
    size === "lg"
      ? "gap-2 min-h-12 px-4 text-xs tracking-[0.16em] sm:px-5"
      : size === "compact"
        ? HERO_CTA_SIZE_CLASS
        : "gap-2 px-4 py-3 text-xs tracking-[0.1em] sm:px-5 sm:text-sm";
  const iconBox = size === "compact" ? HERO_CTA_ICON_CLASS : "h-4 w-4";

  return (
    <button
      type="button"
      onClick={() => void share()}
      aria-label={copied ? "Link copied" : label}
      className={`share-cta font-nav inline-flex items-center justify-center whitespace-nowrap rounded-md border border-pvn-cream/30 bg-pvn-navy/35 font-bold text-pvn-cream uppercase backdrop-blur-sm transition hover:border-pvn-gold hover:text-pvn-gold ${sizeClass} ${
        copied ? "share-cta--copied" : "share-cta--idle"
      } ${className}`}
    >
      <span
        className={`relative flex shrink-0 items-center justify-center text-pvn-gold ${iconBox}`}
      >
        {copied ? (
          <>
            <span
              key={burstKey}
              className="share-cta-burst absolute inset-[-6px] rounded-full"
              aria-hidden
            />
            <svg
              viewBox="0 0 24 24"
              className={`share-cta-check relative ${iconBox}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M5 12.5 10 17.5 19 7" />
            </svg>
          </>
        ) : (
          <IconShare className={`share-cta-icon ${iconBox}`} />
        )}
      </span>
      {copied ? "Link copied" : "Share"}
    </button>
  );
}
