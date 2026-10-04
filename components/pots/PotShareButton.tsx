"use client";

import { ShareCta } from "@/components/ShareCta";
import { potPublicUrl } from "@/lib/pot-share";

type Props = {
  slug: string;
  title: string;
  className?: string;
};

/**
 * Pot hero Share — public pot link with src=share attribution.
 */
export function PotShareButton({ slug, title, className = "" }: Props) {
  const trimmed = title.trim() || "this fundraiser";

  return (
    <ShareCta
      title={trimmed}
      text={`Join me on “${trimmed}” — raising for the restoration of 5 Paulett.`}
      label={`Share ${trimmed}`}
      size="lg"
      className={className}
      getUrl={() => potPublicUrl(slug, "share")}
    />
  );
}
