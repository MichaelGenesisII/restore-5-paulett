"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/toast/ToastProvider";
import { potPublicUrl } from "@/lib/pot-share";

type Variant = "gold" | "navy" | "quiet";

type Props = {
  slug: string;
  /** Visible label when idle. */
  label?: string;
  variant?: Variant;
  className?: string;
  /** Attribution for analytics (?src=). */
  src?: string;
};

const variantClass: Record<Variant, string> = {
  gold:
    "border-pvn-gold/70 bg-pvn-gold text-pvn-navy shadow-[0_0_0_0_rgba(201,168,76,0.45)] hover:bg-pvn-gold-light hover:shadow-[0_8px_24px_-12px_rgba(201,168,76,0.85)]",
  navy:
    "border-pvn-navy/20 bg-pvn-navy text-pvn-cream hover:border-pvn-gold hover:bg-pvn-navy-light",
  quiet:
    "border-pvn-navy/20 bg-white/80 text-pvn-navy hover:border-pvn-gold hover:bg-pvn-gold/10",
};

/**
 * Copy public pot URL — high-visibility control with micro motion on hover + success.
 */
export function CopyPotLinkButton({
  slug,
  label = "Copy fundraiser link",
  variant = "gold",
  className = "",
  src = "host",
}: Props) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2200);
    return () => window.clearTimeout(t);
  }, [copied]);

  useEffect(() => {
    if (!burst) return;
    const t = window.setTimeout(() => setBurst(false), 600);
    return () => window.clearTimeout(t);
  }, [burst]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(potPublicUrl(slug, src));
      setCopied(true);
      setBurst(true);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy the link");
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-label={copied ? "Fundraiser link copied" : `Copy link to ${slug}`}
      className={`creator-copy-link font-nav group relative inline-flex min-h-8 items-center justify-center gap-1.5 overflow-hidden rounded-md border px-2.5 text-[0.6rem] font-bold tracking-[0.12em] uppercase transition duration-300 ease-out ${variantClass[variant]} ${
        copied ? "creator-copy-link--done" : "creator-copy-link--idle"
      } ${className}`}
    >
      <span
        className={`pointer-events-none absolute inset-0 opacity-0 transition ${
          burst ? "creator-copy-burst opacity-100" : ""
        }`}
        aria-hidden
      />
      <span className="relative flex h-3.5 w-3.5 shrink-0 items-center justify-center">
        {copied ? (
          <svg
            viewBox="0 0 24 24"
            className="creator-copy-check h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            className="creator-copy-icon h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l1.92-1.92a5 5 0 0 0-7.07-7.07L10.9 6.05" />
            <path d="M14 11a5 5 0 0 0-7.54-.54L4.54 12.4a5 5 0 0 0 7.07 7.07l1.46-1.46" />
          </svg>
        )}
      </span>
      <span className="relative" aria-live="polite">
        {copied ? "Link copied" : label}
      </span>
    </button>
  );
}
