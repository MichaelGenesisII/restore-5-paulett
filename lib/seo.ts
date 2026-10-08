/**
 * Shared SEO helpers — titles, descriptions, absolute URLs for metadata/OG.
 */

export const SITE_NAME = "Restore 5 Paulett Ave";
export const SITE_TAGLINE =
  "Help Place of Victory for All Nations Belfast restore 5 Paulett Avenue — YOUR FUNDRAISER → OUR HOUSE.";

export function siteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

/** Resolve a path or absolute URL to a full URL for Open Graph / canonical. */
export function absoluteUrl(pathOrUrl: string): string {
  const trimmed = pathOrUrl.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const origin = siteOrigin();
  return `${origin}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
}

/** Collapse whitespace and truncate for meta description (Google ~155–160). */
export function truncateMeta(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const sliced = clean.slice(0, max - 1);
  const boundary = sliced.lastIndexOf(" ");
  const base = boundary > 80 ? sliced.slice(0, boundary) : sliced;
  return `${base}…`;
}
