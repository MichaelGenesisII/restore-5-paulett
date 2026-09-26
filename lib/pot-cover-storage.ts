import { randomUUID } from "crypto";
import {
  getSupabaseAdmin,
  POT_COVER_BUCKET,
} from "@/lib/supabase-admin";

/**
 * Storage object path for a pot cover.
 * Scoped under fundraiser + pot so one host cannot collide with another.
 * Create-time uploads (no pot id yet) use `pending/{uuid}.ext`.
 */
export function potCoverObjectPath(input: {
  fundraiserId?: string | null;
  potId?: string | null;
  extension: "jpg" | "png" | "webp";
}): string {
  const file = `${randomUUID()}.${input.extension}`;
  if (input.fundraiserId && input.potId) {
    return `${input.fundraiserId}/${input.potId}/${file}`;
  }
  if (input.fundraiserId) {
    return `${input.fundraiserId}/pending/${file}`;
  }
  return `pending/${file}`;
}

/** Host profile photo — always under `{fundraiserId}/avatar/…`. */
export function hostAvatarObjectPath(input: {
  fundraiserId: string;
  extension: "jpg" | "png" | "webp";
}): string {
  return `${input.fundraiserId}/avatar/${randomUUID()}.${input.extension}`;
}

/**
 * Extract the storage object path from a public URL for our pot-covers bucket.
 * Returns null if the URL is not ours (never delete foreign/external URLs).
 */
export function potCoverPathFromPublicUrl(
  publicUrl: string | null | undefined,
): string | null {
  const trimmed = publicUrl?.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const marker = `/storage/v1/object/public/${POT_COVER_BUCKET}/`;
    const index = url.pathname.indexOf(marker);
    if (index === -1) return null;
    const path = decodeURIComponent(url.pathname.slice(index + marker.length));
    if (!path || path.includes("..")) return null;
    return path;
  } catch {
    return null;
  }
}

/** Best-effort delete; never throws. Only removes objects in our bucket. */
export async function deletePotCoverIfOurs(
  publicUrl: string | null | undefined,
): Promise<void> {
  const path = potCoverPathFromPublicUrl(publicUrl);
  if (!path) return;

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.storage
      .from(POT_COVER_BUCKET)
      .remove([path]);
    if (error) {
      console.error("Pot cover delete failed", { path, error });
    }
  } catch (error) {
    console.error("Pot cover delete threw", error);
  }
}
