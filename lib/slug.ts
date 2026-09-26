const SLUG_MAX = 64;

export function slugifyTitle(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX);

  return base.length > 0 ? base : "pot";
}

/** Normalise a host-chosen pot or profile slug (same rules as titles). */
export function normalizeSlug(input: string): string {
  return slugifyTitle(input);
}

export function withSlugSuffix(base: string, suffix: string): string {
  const trimmed = base.slice(0, SLUG_MAX - suffix.length - 1);
  return `${trimmed}-${suffix}`;
}

/** Reserve a unique pot slug from a title (DB check). */
export async function uniquePotSlug(
  title: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const base = slugifyTitle(title);
  let candidate = base;
  let attempt = 0;

  while (attempt < 20) {
    if (!(await exists(candidate))) {
      return candidate;
    }
    attempt += 1;
    candidate = withSlugSuffix(base, String(attempt));
  }

  return withSlugSuffix(base, crypto.randomUUID().slice(0, 8));
}
