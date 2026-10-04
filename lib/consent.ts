/**
 * Cookie consent, stored on the visitor's own device rather than on a server.
 *
 * Two rules drive the shape of this: nothing beyond the strictly necessary may
 * run before a choice is made, and refusing must be exactly as easy as
 * agreeing. Bump CONSENT_VERSION whenever the categories change — that
 * invalidates old choices and asks again, which is what consent means.
 */

export const CONSENT_VERSION = 2;
export const CONSENT_KEY = "pvn-cookie-consent";

/** Fired whenever a choice is saved, so listeners can react without a reload. */
export const CONSENT_CHANGED_EVENT = "pvn:consent-changed";

/** Fired by the footer and the cookies page to reopen the preferences panel. */
export const OPEN_PREFERENCES_EVENT = "pvn:open-cookie-preferences";

export type OptionalCategory = "analytics" | "marketing";

export type ConsentChoice = {
  analytics: boolean;
  marketing: boolean;
  version: number;
  decidedAt: string;
};

export const ALL_DECLINED: Pick<ConsentChoice, OptionalCategory> = {
  analytics: false,
  marketing: false,
};

export const ALL_ACCEPTED: Pick<ConsentChoice, OptionalCategory> = {
  analytics: true,
  marketing: true,
};

export function parseConsent(raw: string | null): ConsentChoice | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<ConsentChoice>;
    // A stored choice from an older category set is no longer informed consent.
    if (parsed.version !== CONSENT_VERSION) return null;

    return {
      analytics: parsed.analytics === true,
      marketing: parsed.marketing === true,
      version: CONSENT_VERSION,
      decidedAt: parsed.decidedAt ?? "",
    };
  } catch {
    return null;
  }
}

export function rawConsent(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(CONSENT_KEY);
  } catch {
    return null;
  }
}

export function readConsent(): ConsentChoice | null {
  return parseConsent(rawConsent());
}

/** Subscription for useSyncExternalStore — covers this tab and other tabs. */
export function subscribeToConsent(onChange: () => void) {
  window.addEventListener(CONSENT_CHANGED_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CONSENT_CHANGED_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function writeConsent(choice: Pick<ConsentChoice, OptionalCategory>) {
  if (typeof window === "undefined") return;

  const stored: ConsentChoice = {
    ...choice,
    version: CONSENT_VERSION,
    decidedAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(stored));
  } catch {
    // Private browsing with storage blocked. Nothing optional runs, which is
    // the safe outcome — the banner simply asks again next visit.
  }

  window.dispatchEvent(
    new CustomEvent<ConsentChoice>(CONSENT_CHANGED_EVENT, { detail: stored }),
  );
}

export function clearConsent() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CONSENT_KEY);
  } catch {
    // Nothing to do — an unreadable store is already the declined state.
  }
}

export function openCookiePreferences() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OPEN_PREFERENCES_EVENT));
}
