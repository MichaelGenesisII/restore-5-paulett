import { NextResponse } from "next/server";
import { rateLimitConsume, requestClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const LIMIT = 30;
const WINDOW_MS = 60_000;

type AddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

function component(
  components: AddressComponent[],
  type: string,
): string | null {
  const row = components.find((c) => c.types?.includes(type));
  const value = row?.longText?.trim() || row?.shortText?.trim();
  return value || null;
}

function placesKey(): string | null {
  return process.env.GOOGLE_PLACES_API_KEY?.trim() || null;
}

/**
 * Resolve a Places placeId into Gift Aid address fields (UK).
 */
export async function POST(request: Request) {
  const key = placesKey();
  if (!key) {
    return NextResponse.json(
      { error: "Address lookup is not configured." },
      { status: 503 },
    );
  }

  const limited = rateLimitConsume(
    `places-details:${requestClientIp(request)}`,
    LIMIT,
    WINDOW_MS,
  );
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many lookups. Try again shortly." },
      { status: 429 },
    );
  }

  let body: { placeId?: unknown; sessionToken?: unknown };
  try {
    body = (await request.json()) as {
      placeId?: unknown;
      sessionToken?: unknown;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const placeId =
    typeof body.placeId === "string" ? body.placeId.trim() : "";
  if (!placeId || placeId.length > 256) {
    return NextResponse.json({ error: "placeId required" }, { status: 400 });
  }

  // placeId may be "places/ChIJ…" or bare ChIJ…
  const pathId = placeId.startsWith("places/")
    ? placeId.slice("places/".length)
    : placeId;

  const sessionToken =
    typeof body.sessionToken === "string" && body.sessionToken.length > 0
      ? body.sessionToken.slice(0, 64)
      : undefined;

  const url = new URL(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(pathId)}`,
  );
  if (sessionToken) url.searchParams.set("sessionToken", sessionToken);
  url.searchParams.set("languageCode", "en-GB");
  url.searchParams.set("regionCode", "gb");

  try {
    const response = await fetch(url, {
      headers: {
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "addressComponents,formattedAddress",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Places details failed", response.status, text);
      return NextResponse.json(
        { error: "Could not load that address. Enter it manually." },
        { status: 502 },
      );
    }

    const data = (await response.json()) as {
      addressComponents?: AddressComponent[];
      formattedAddress?: string;
    };

    const components = data.addressComponents ?? [];
    const streetNumber = component(components, "street_number");
    const route = component(components, "route");
    const premise = component(components, "premise");
    const subpremise = component(components, "subpremise");

    const lineParts = [
      [subpremise, streetNumber].filter(Boolean).join(" "),
      route,
      !route && !streetNumber ? premise : null,
    ].filter((part) => part && String(part).trim().length > 0);

    const line1 =
      lineParts.join(", ").trim() ||
      data.formattedAddress?.split(",")[0]?.trim() ||
      "";

    const city =
      component(components, "postal_town") ||
      component(components, "locality") ||
      component(components, "administrative_area_level_2") ||
      "";

    const postcode = component(components, "postal_code") || "";

    return NextResponse.json({
      line1,
      city,
      postcode,
      formattedAddress: data.formattedAddress ?? null,
    });
  } catch (error) {
    console.error("Places details error", error);
    return NextResponse.json(
      { error: "Could not load that address. Enter it manually." },
      { status: 502 },
    );
  }
}
