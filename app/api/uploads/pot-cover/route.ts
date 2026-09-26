import { NextResponse } from "next/server";
import {
  getSupabaseAdmin,
  POT_COVER_BUCKET,
  POT_COVER_MAX_BYTES,
  POT_COVER_TYPES,
} from "@/lib/supabase-admin";
import {
  isAuthFailure,
  requireHost,
  requireOwnedPot,
} from "@/lib/auth/require-host";
import { potCoverObjectPath } from "@/lib/pot-cover-storage";
import { rateLimitConsume, requestClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const ANON_UPLOAD_LIMIT = 8;
const ANON_UPLOAD_WINDOW_MS = 15 * 60 * 1000;

/**
 * Accepts a cover image (JPEG / PNG / WebP, max 5 MB).
 *
 * - Authenticated + potSlug: stores under `{fundraiserId}/{potId}/…`
 * - Authenticated, no pot: stores under `{fundraiserId}/pending/…`
 * - Unauthenticated (create wizard before login): stores under `pending/…`
 *   with a light per-IP rate limit.
 *
 * Does not delete the previous cover — callers replace via pot PATCH.
 */
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: "Choose an image to upload." },
      { status: 400 },
    );
  }

  if (!POT_COVER_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Use a JPEG, PNG or WebP image." },
      { status: 400 },
    );
  }

  if (file.size > POT_COVER_MAX_BYTES) {
    return NextResponse.json(
      { error: "Keep the cover under 5 MB." },
      { status: 400 },
    );
  }

  const potSlugRaw = form.get("potSlug");
  const potSlug =
    typeof potSlugRaw === "string" && potSlugRaw.trim()
      ? potSlugRaw.trim()
      : null;

  let fundraiserId: string | null = null;
  let potId: string | null = null;
  let authenticated = false;

  if (potSlug) {
    const owned = await requireOwnedPot(request, potSlug);
    if (owned instanceof NextResponse) return owned;
    fundraiserId = owned.fundraiserId;
    potId = owned.pot.id;
    authenticated = true;
  } else {
    const session = await requireHost(request);
    if (!isAuthFailure(session) && session.fundraiser) {
      fundraiserId = session.fundraiser.id;
      authenticated = true;
    }
  }

  if (!authenticated) {
    const limited = rateLimitConsume(
      `pot-cover-anon:${requestClientIp(request)}`,
      ANON_UPLOAD_LIMIT,
      ANON_UPLOAD_WINDOW_MS,
    );
    if (!limited.ok) {
      return NextResponse.json(
        {
          error: `Too many uploads. Try again in about ${limited.retryAfterSec} seconds.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(limited.retryAfterSec) },
        },
      );
    }
  }

  const extension =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
  const path = potCoverObjectPath({ fundraiserId, potId, extension });

  try {
    const supabase = getSupabaseAdmin();
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error } = await supabase.storage
      .from(POT_COVER_BUCKET)
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
        cacheControl: "31536000",
      });

    if (error) {
      console.error("Pot cover upload failed", error);
      return NextResponse.json(
        { error: "We could not store that image. Try again." },
        { status: 500 },
      );
    }

    const { data } = supabase.storage.from(POT_COVER_BUCKET).getPublicUrl(path);
    if (!data.publicUrl) {
      return NextResponse.json(
        { error: "We could not finish uploading that image. Try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: data.publicUrl, path });
  } catch (error) {
    console.error("Pot cover upload failed", error);
    return NextResponse.json(
      { error: "We could not store that image. Try again." },
      { status: 500 },
    );
  }
}
