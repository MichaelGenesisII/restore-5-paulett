import { NextResponse } from "next/server";
import {
  hashVisitorId,
  parseDevice,
  parseReferrerHost,
  parseShareSrc,
} from "@/lib/pot-analytics";
import { isPubliclyVisible } from "@/lib/pot-lifecycle";
import {
  insertPotPageView,
  recentlyViewed,
} from "@/lib/pot-page-views";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * Public first-party page view for pot analytics.
 * No PII stored — visitor id is hashed; country from edge headers when present.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: true });
  }

  const data = body as Record<string, unknown>;
  const slug =
    typeof data.slug === "string" ? data.slug.trim().slice(0, 80) : "";
  const visitorId =
    typeof data.visitorId === "string"
      ? data.visitorId.trim().slice(0, 80)
      : "";

  if (!slug || !visitorId || visitorId.length < 8) {
    return NextResponse.json({ ok: true });
  }

  const pot = await prisma.pot.findUnique({
    where: { slug },
    select: { id: true, status: true },
  });
  if (!pot || !isPubliclyVisible(pot.status)) {
    return NextResponse.json({ ok: true });
  }

  const visitorKey = hashVisitorId(visitorId);
  if (await recentlyViewed(pot.id, visitorKey)) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  const countryHeader =
    request.headers.get("cf-ipcountry") ??
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("x-country-code");
  const country =
    countryHeader && /^[a-zA-Z]{2}$/.test(countryHeader.trim())
      ? countryHeader.trim().toUpperCase()
      : null;

  const referrer =
    typeof data.referrer === "string" ? data.referrer : null;
  const src = parseShareSrc(
    typeof data.src === "string" ? data.src : null,
    typeof data.utmSource === "string" ? data.utmSource : null,
  );

  try {
    await insertPotPageView({
      potId: pot.id,
      visitorKey,
      country,
      referrerHost: parseReferrerHost(referrer),
      device: parseDevice(request.headers.get("user-agent")),
      src,
    });
  } catch (error) {
    console.error("pot-view insert failed", error);
  }

  return NextResponse.json({ ok: true });
}
