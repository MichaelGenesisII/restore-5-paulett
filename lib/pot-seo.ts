import type { Metadata } from "next";
import { formatWholeGbp } from "@/lib/money";
import type { PublicPot } from "@/lib/pot-page";
import {
  absoluteUrl,
  SITE_NAME,
  truncateMeta,
} from "@/lib/seo";

export function potMetaDescription(pot: PublicPot): string {
  const story = (pot.story ?? "").trim();
  if (story) return truncateMeta(story);

  const host = pot.fundraiser.name;
  const raised = formatWholeGbp(pot.totalRaised);
  const target = formatWholeGbp(pot.targetAmount);
  return truncateMeta(
    `${pot.title} — a fundraiser hosted by ${host}. ${raised} of ${target} toward restoring 5 Paulett Avenue with PVN Belfast.`,
  );
}

export function potPageMetadata(pot: PublicPot): Metadata {
  const title = pot.title;
  const description = potMetaDescription(pot);
  const path = `/pots/${pot.slug}`;
  const url = absoluteUrl(path);
  const imageUrl = pot.photoUrl ? absoluteUrl(pot.photoUrl) : undefined;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_GB",
      title,
      description,
      url,
      ...(imageUrl
        ? { images: [{ url: imageUrl, alt: pot.title }] }
        : {}),
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title,
      description,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
  };
}

/** JSON-LD for a public pot page (WebPage + fundraising context). */
export function potJsonLd(pot: PublicPot) {
  const url = absoluteUrl(`/pots/${pot.slug}`);
  const description = potMetaDescription(pot);
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: pot.title,
    description,
    url,
    ...(pot.photoUrl ? { image: absoluteUrl(pot.photoUrl) } : {}),
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
    about: {
      "@type": "Thing",
      name: "Restoration of 5 Paulett Avenue, Belfast",
    },
    author: {
      "@type": "Person",
      name: pot.fundraiser.name,
    },
  };
}
