import { NextResponse } from "next/server";
import {
  isAuthFailure,
  requireHost,
} from "@/lib/auth/require-host";
import {
  deletePotCoverIfOurs,
  hostAvatarObjectPath,
} from "@/lib/pot-cover-storage";
import { revalidateHomePots } from "@/lib/home-pots";
import { prisma } from "@/lib/prisma";
import {
  getSupabaseAdmin,
  POT_COVER_BUCKET,
  POT_COVER_MAX_BYTES,
  POT_COVER_TYPES,
} from "@/lib/supabase-admin";

export const runtime = "nodejs";

async function ensureFundraiser(session: {
  email: string;
  authUserId: string;
  fundraiser: { id: string; photoUrl?: string | null; name: string } | null;
}) {
  if (session.fundraiser) {
    return prisma.fundraiser.findUniqueOrThrow({
      where: { id: session.fundraiser.id },
      select: { id: true, photoUrl: true, name: true, email: true },
    });
  }

  const name = session.email.split("@")[0] || "Host";
  return prisma.fundraiser.create({
    data: {
      email: session.email,
      name,
      authUserId: session.authUserId,
    },
    select: { id: true, photoUrl: true, name: true, email: true },
  });
}

/**
 * Upload / replace the signed-in host’s profile photo.
 * Stores under `{fundraiserId}/avatar/…` and deletes the previous object when ours.
 */
export async function POST(request: Request) {
  const session = await requireHost(request);
  if (isAuthFailure(session)) return session;

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
      { error: "Keep the photo under 5 MB." },
      { status: 400 },
    );
  }

  const fundraiser = await ensureFundraiser(session);
  const previousPhotoUrl = fundraiser.photoUrl;

  const extension =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
  const path = hostAvatarObjectPath({
    fundraiserId: fundraiser.id,
    extension,
  });

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
      console.error("Host avatar upload failed", error);
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

    const updated = await prisma.fundraiser.update({
      where: { id: fundraiser.id },
      data: {
        photoUrl: data.publicUrl,
        authUserId: session.authUserId,
      },
      select: {
        photoUrl: true,
        name: true,
        email: true,
        bio: true,
        profileSlug: true,
        profilePublic: true,
      },
    });

    if (previousPhotoUrl && previousPhotoUrl !== data.publicUrl) {
      void deletePotCoverIfOurs(previousPhotoUrl);
    }

    revalidateHomePots();

    return NextResponse.json({
      url: updated.photoUrl,
      user: {
        email: updated.email,
        name: updated.name,
        bio: updated.bio,
        photoUrl: updated.photoUrl,
        profileSlug: updated.profileSlug,
        profilePublic: updated.profilePublic,
      },
    });
  } catch (error) {
    console.error("Host avatar upload failed", error);
    return NextResponse.json(
      { error: "We could not store that image. Try again." },
      { status: 500 },
    );
  }
}

/** Remove the host profile photo and delete the storage object when ours. */
export async function DELETE(request: Request) {
  const session = await requireHost(request);
  if (isAuthFailure(session)) return session;

  if (!session.fundraiser) {
    return NextResponse.json({
      user: {
        email: session.email,
        name: null,
        bio: null,
        photoUrl: null,
        profileSlug: null,
        profilePublic: false,
      },
    });
  }

  const current = await prisma.fundraiser.findUniqueOrThrow({
    where: { id: session.fundraiser.id },
    select: {
      photoUrl: true,
      email: true,
      name: true,
      bio: true,
      profileSlug: true,
      profilePublic: true,
    },
  });

  const previous = current.photoUrl;
  const updated = await prisma.fundraiser.update({
    where: { id: session.fundraiser.id },
    data: { photoUrl: null },
    select: {
      photoUrl: true,
      email: true,
      name: true,
      bio: true,
      profileSlug: true,
      profilePublic: true,
    },
  });

  void deletePotCoverIfOurs(previous);

  revalidateHomePots();

  return NextResponse.json({
    url: null,
    user: {
      email: updated.email,
      name: updated.name,
      bio: updated.bio,
      photoUrl: updated.photoUrl,
      profileSlug: updated.profileSlug,
      profilePublic: updated.profilePublic,
    },
  });
}
