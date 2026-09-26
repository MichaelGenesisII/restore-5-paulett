"use client";

const PREFIX = "pvn-host:";

/** Short-lived sessionStorage helpers for stale-while-revalidate on Host pages. */
export function readHostClientCache<T>(key: string, ttlMs: number): T | null {
  try {
    const raw = sessionStorage.getItem(`${PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; data: T };
    if (Date.now() - parsed.at > ttlMs) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function writeHostClientCache<T>(key: string, data: T) {
  try {
    sessionStorage.setItem(
      `${PREFIX}${key}`,
      JSON.stringify({ at: Date.now(), data }),
    );
  } catch {
    // Private mode / quota — ignore.
  }
}

export function clearHostClientCache(key: string) {
  try {
    sessionStorage.removeItem(`${PREFIX}${key}`);
  } catch {
    // ignore
  }
}
