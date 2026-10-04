"use client";

import { useEffect } from "react";
import { readConsent, subscribeToConsent } from "@/lib/consent";

const VISITOR_KEY = "pvn_vid";

function getVisitorId(): string | null {
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY);
    if (existing && existing.length >= 8) return existing;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `v-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    return null;
  }
}

function sendPotView(slug: string, signal: AbortSignal) {
  const consent = readConsent();
  if (!consent?.analytics) return;

  const visitorId = getVisitorId();
  if (!visitorId) return;

  const params = new URLSearchParams(window.location.search);
  void fetch("/api/analytics/pot-view", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug,
      visitorId,
      referrer: document.referrer || null,
      src: params.get("src"),
      utmSource: params.get("utm_source"),
    }),
    signal,
    keepalive: true,
  }).catch(() => undefined);
}

/**
 * First-party pot page view for Host analytics.
 * Runs only when the visitor has allowed “Understanding the rebuild” (analytics).
 */
export function PotViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const controller = new AbortController();
    const fire = () => sendPotView(slug, controller.signal);

    fire();
    const unsubscribe = subscribeToConsent(fire);

    return () => {
      controller.abort();
      unsubscribe();
    };
  }, [slug]);

  return null;
}
