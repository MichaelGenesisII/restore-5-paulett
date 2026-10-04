/**
 * Public pot URLs and share blurbs for creators (Share kit).
 */

export function potPublicUrl(slug: string, src?: string) {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL ?? "");
  const url = new URL(`${origin}/pots/${slug}`);
  if (src) url.searchParams.set("src", src);
  return url.toString();
}

/**
 * Ready-made WhatsApp / email text naming Genesis Family and 5 Paulett.
 */
export function potShareBlurb(opts: {
  url: string;
  title?: string;
}): string {
  const title = opts.title?.trim();
  const lead = title
    ? `We're raising through “${title}” for Genesis Family toward restoring 5 Paulett.`
    : `We're raising for Genesis Family toward restoring 5 Paulett.`;
  return `${lead} If you can chip in or share, here's the pot:\n${opts.url}`;
}
