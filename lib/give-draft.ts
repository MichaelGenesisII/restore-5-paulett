/**
 * Give-form draft in sessionStorage — survives Stripe’s full-page redirect
 * so cancel/retry can restore answers. Cleared after a successful gift.
 */

export const GIVE_DRAFT_KEY_BASE = "pvn-give-draft";

export type GiveDraft = {
  giftMode: string;
  preset: number | null;
  custom: string;
  donorName: string;
  donorEmail: string;
  message: string;
  isAnonymous: boolean;
  giftAid: boolean;
  donorAddressLine1: string;
  donorCity: string;
  donorPostcode: string;
  step: number;
  furthest: number;
};

export function giveDraftKey(potSlug?: string | null) {
  return potSlug
    ? `${GIVE_DRAFT_KEY_BASE}:pot:${potSlug}`
    : `${GIVE_DRAFT_KEY_BASE}:general`;
}

export function readGiveDraft(potSlug?: string | null): GiveDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(giveDraftKey(potSlug));
    return raw ? (JSON.parse(raw) as GiveDraft) : null;
  } catch {
    return null;
  }
}

export function writeGiveDraft(draft: GiveDraft, potSlug?: string | null) {
  try {
    sessionStorage.setItem(giveDraftKey(potSlug), JSON.stringify(draft));
  } catch {
    /* private mode / quota */
  }
}

export function clearGiveDraft(potSlug?: string | null) {
  try {
    sessionStorage.removeItem(giveDraftKey(potSlug));
  } catch {
    /* ignore */
  }
}

/** Clear general + pot-scoped drafts (and legacy unscoped key). */
export function clearAllGiveDrafts(potSlug?: string | null) {
  clearGiveDraft(null);
  if (potSlug) clearGiveDraft(potSlug);
  try {
    sessionStorage.removeItem(GIVE_DRAFT_KEY_BASE);
  } catch {
    /* ignore */
  }
}
