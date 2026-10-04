"use client";

import { ShareCta } from "@/components/ShareCta";

const SHARE_TITLE = "Restore 5 Paulett";
const SHARE_TEXT =
  "Help rebuild Place of Victory's home at 5 Paulett Avenue in East Belfast.";

/**
 * Home hero Share — campaign URL + micro-motion.
 */
export function HomeShareButton({ className = "" }: { className?: string }) {
  return (
    <ShareCta
      title={SHARE_TITLE}
      text={SHARE_TEXT}
      label="Share this campaign"
      size="compact"
      className={`border-pvn-gold hover:border-pvn-gold-light hover:bg-pvn-navy/50 ${className}`}
      getUrl={() =>
        typeof window !== "undefined"
          ? window.location.origin
          : (process.env.NEXT_PUBLIC_APP_URL ?? "")
      }
    />
  );
}
