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

/** Opt-in "remember me on this device" for name and email. */
const GIVER_KEY = "pvn-giver";

export type RememberedGiver = { name: string; email: string };

export function readRememberedGiver(): RememberedGiver | null {
  try {
    const raw = localStorage.getItem(GIVER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RememberedGiver>;
    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      email: typeof parsed.email === "string" ? parsed.email : "",
    };
  } catch {
    return null;
  }
}

export function writeRememberedGiver(giver: RememberedGiver | null) {
  try {
    if (giver && (giver.name || giver.email)) {
      localStorage.setItem(GIVER_KEY, JSON.stringify(giver));
    } else {
      localStorage.removeItem(GIVER_KEY);
    }
  } catch {
    /* private mode / quota */
  }
}

/** `?amount=50` (pounds) from share links and the pot header chips. */
export function parseAmountParam(value: string | undefined): number | null {
  if (!value || !/^\d{1,6}(\.\d{1,2})?$/.test(value.trim())) return null;
  const pence = Math.round(Number(value) * 100);
  return pence > 0 ? pence : null;
}
