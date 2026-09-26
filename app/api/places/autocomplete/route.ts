import { NextResponse } from "next/server";
import { rateLimitConsume, requestClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const LIMIT = 40;
const WINDOW_MS = 60_000;

function placesKey(): string | null {
  return process.env.GOOGLE_PLACES_API_KEY?.trim() || null;
}

/**
 * UK address suggestions via Places Autocomplete (New).
 * Requires GOOGLE_PLACES_API_KEY. Returns { suggestions: [] } if unset.
 */
export async function POST(request: Request) {
  const key = placesKey();
  if (!key) {
    return NextResponse.json({ suggestions: [], configured: false });
  }

  const limited = rateLimitConsume(
    `places-auto:${requestClientIp(request)}`,
    LIMIT,
    WINDOW_MS,
  );
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many lookups. Try again shortly." },
      { status: 429 },
    );
  }

  let body: { input?: unknown; sessionToken?: unknown };
  try {
    body = (await request.json()) as {
      input?: unknown;
      sessionToken?: unknown;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const input = typeof body.input === "string" ? body.input.trim() : "";
  if (input.length < 3 || input.length > 200) {
    return NextResponse.json({ suggestions: [], configured: true });
  }

  const sessionToken =
    typeof body.sessionToken === "string" && body.sessionToken.length > 0
      ? body.sessionToken.slice(0, 64)
      : undefined;

  try {
    const response = await fetch(
      "https://places.googleapis.com/v1/places:autocomplete",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask":
            "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat",
        },
        body: JSON.stringify({
          input,
          includedRegionCodes: ["gb"],
          languageCode: "en-GB",
          regionCode: "gb",
          ...(sessionToken ? { sessionToken } : {}),
        }),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("Places autocomplete failed", response.status, text);
      return NextResponse.json(
        { error: "Address lookup failed. Enter your address manually." },
        { status: 502 },
      );
    }

    const data = (await response.json()) as {
      suggestions?: Array<{
        placePrediction?: {
          placeId?: string;
          text?: { text?: string };
          structuredFormat?: {
            mainText?: { text?: string };
            secondaryText?: { text?: string };
          };
        };
      }>;
    };

    const suggestions = (data.suggestions ?? [])
      .map((row) => {
        const p = row.placePrediction;
        if (!p?.placeId) return null;
        const label =
          p.text?.text ||
          [p.structuredFormat?.mainText?.text, p.structuredFormat?.secondaryText?.text]
            .filter(Boolean)
            .join(", ");
        if (!label) return null;
        return { placeId: p.placeId, label };
      })
      .filter((row): row is { placeId: string; label: string } => Boolean(row))
      .slice(0, 6);

    return NextResponse.json({ suggestions, configured: true });
  } catch (error) {
    console.error("Places autocomplete error", error);
    return NextResponse.json(
      { error: "Address lookup failed. Enter your address manually." },
      { status: 502 },
    );
  }
}
