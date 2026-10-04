"use client";

import { useEffect, useState } from "react";
import { CopyPotLinkButton } from "@/components/host/CopyPotLinkButton";
import { useToast } from "@/components/toast/ToastProvider";
import { potPublicUrl, potShareBlurb } from "@/lib/pot-share";

type BlurbKind = "whatsapp" | "email";

type Props = {
  slug: string;
  /** Pot title for a warmer blurb when available. */
  title?: string;
  className?: string;
  /** Compact labels for list cards. */
  compact?: boolean;
  /** Cream/gold buttons for navy surfaces. */
  onDark?: boolean;
};

/**
 * Copy pot link + suggested WhatsApp / email blurbs (G4 Share kit).
 */
export function HostShareKit({
  slug,
  title,
  className = "",
  compact = false,
  onDark = false,
}: Props) {
  const toast = useToast();
  const [copied, setCopied] = useState<BlurbKind | null>(null);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(null), 2200);
    return () => window.clearTimeout(t);
  }, [copied]);

  async function copyBlurb(kind: BlurbKind) {
    const url = potPublicUrl(slug, kind);
    const text = potShareBlurb({ url, title });
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      toast.success(
        kind === "whatsapp" ? "WhatsApp message copied" : "Email blurb copied",
        "Paste it into your message.",
      );
    } catch {
      toast.error("Could not copy the message");
    }
  }

  const quietBtn = onDark
    ? "font-nav inline-flex min-h-8 items-center justify-center rounded-md border border-pvn-cream/30 bg-pvn-cream/[0.08] px-2.5 text-[0.6rem] font-bold tracking-[0.12em] text-pvn-cream uppercase transition hover:border-pvn-gold hover:text-pvn-gold"
    : "font-nav inline-flex min-h-8 items-center justify-center rounded-md border border-pvn-navy/20 bg-white/80 px-2.5 text-[0.6rem] font-bold tracking-[0.12em] text-pvn-navy uppercase transition hover:border-pvn-gold hover:bg-pvn-gold/10";
  const compactBtn = "min-h-8 px-2.5";

  return (
    <div
      className={
        compact
          ? `contents ${className}`
          : `flex flex-wrap items-center gap-2 ${className}`
      }
    >
      <CopyPotLinkButton
        slug={slug}
        label={compact ? "Copy link" : "Copy fundraiser link"}
        className={compact ? compactBtn : undefined}
      />
      <button
        type="button"
        onClick={() => void copyBlurb("whatsapp")}
        aria-label={
          copied === "whatsapp"
            ? "WhatsApp message copied"
            : "Copy WhatsApp message with fundraiser link"
        }
        className={`${quietBtn} ${compact ? compactBtn : ""}`}
      >
        {copied === "whatsapp"
          ? "Copied"
          : compact
            ? "WhatsApp"
            : "Copy WhatsApp message"}
      </button>
      <button
        type="button"
        onClick={() => void copyBlurb("email")}
        aria-label={
          copied === "email"
            ? "Email blurb copied"
            : "Copy email blurb with fundraiser link"
        }
        className={`${quietBtn} ${compact ? compactBtn : ""}`}
      >
        {copied === "email"
          ? "Copied"
          : compact
            ? "Email"
            : "Copy email blurb"}
      </button>
    </div>
  );
}
