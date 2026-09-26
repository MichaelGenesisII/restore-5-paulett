import { NextResponse } from "next/server";
import {
  isAuthFailure,
  requireHost,
} from "@/lib/auth/require-host";
import { prisma } from "@/lib/prisma";
import { normalizeSlug } from "@/lib/slug";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { deletePotCoverIfOurs } from "@/lib/pot-cover-storage";
import { isVisitorError } from "@/lib/visitor-safe";
import { revalidateHostMe } from "@/lib/host-me";

export const runtime = "nodejs";

const NAME_MAX = 80;
const BIO_MAX = 600;

type ProfileSelect = {
  id: string;
  email: string;
  name: string;
  authUserId: string | null;
  bio: string | null;
  photoUrl: string | null;
  profileSlug: string | null;
  profilePublic: boolean;
};

const profileSelect = {
  id: true,
  email: true,
  name: true,
  authUserId: true,
  bio: true,
  photoUrl: true,
  profileSlug: true,
  profilePublic: true,
} as const;

/**
 * Update the signed-in host’s display name and public profile fields.
 */
export async function PATCH(request: Request) {
  const session = await requireHost(request);
  if (isAuthFailure(session)) return session;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const data: {
    name?: string;
    bio?: string | null;
    photoUrl?: string | null;
    profileSlug?: string | null;
    profilePublic?: boolean;
  } = {};

  if ("name" in input) {
    if (typeof input.name !== "string") {
      return NextResponse.json(
        { error: "Enter the name visitors should see." },
        { status: 400 },
      );
    }
    const name = input.name.trim();
    if (name.length < 2) {
      return NextResponse.json(
        { error: "Use at least 2 characters for your name." },
        { status: 400 },
      );
    }
    if (name.length > NAME_MAX) {
      return NextResponse.json(
        { error: `Keep your name under ${NAME_MAX} characters.` },
        { status: 400 },
      );
    }
    data.name = name;
  }

  if ("bio" in input) {
    if (input.bio !== null && typeof input.bio !== "string") {
      return NextResponse.json({ error: "Invalid bio." }, { status: 400 });
    }
    const bio =
      typeof input.bio === "string" ? input.bio.trim() || null : null;
    if (bio && bio.length > BIO_MAX) {
      return NextResponse.json(
        { error: `Keep your bio under ${BIO_MAX} characters.` },
        { status: 400 },
      );
    }
    data.bio = bio;
  }

  if ("photoUrl" in input) {
    if (input.photoUrl !== null && typeof input.photoUrl !== "string") {
      return NextResponse.json({ error: "Invalid photo." }, { status: 400 });
    }
    data.photoUrl =
      typeof input.photoUrl === "string" ? input.photoUrl.trim() || null : null;
  }

  if ("profileSlug" in input) {
    if (input.profileSlug !== null && typeof input.profileSlug !== "string") {
      return NextResponse.json(
        { error: "Choose a valid profile link." },
        { status: 400 },
      );
    }
    if (input.profileSlug === null || String(input.profileSlug).trim() === "") {
      data.profileSlug = null;
    } else {
      const slug = normalizeSlug(String(input.profileSlug));
      if (slug.length < 3) {
        return NextResponse.json(
          { error: "The profile link needs at least 3 characters." },
          { status: 400 },
        );
      }
      const taken = await prisma.fundraiser.findFirst({
        where: {
          profileSlug: slug,
          ...(session.fundraiser
            ? { NOT: { id: session.fundraiser.id } }
            : {}),
        },
        select: { id: true },
      });
      if (taken) {
        return NextResponse.json(
          { error: "That profile link is already taken." },
          { status: 409 },
        );
      }
      data.profileSlug = slug;
    }
  }

  if ("profilePublic" in input) {
    if (typeof input.profilePublic !== "boolean") {
      return NextResponse.json(
        { error: "Invalid public toggle." },
        { status: 400 },
      );
    }
    data.profilePublic = input.profilePublic;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  try {
    let fundraiser: ProfileSelect;

    if (!session.fundraiser) {
      if (!data.name) {
        return NextResponse.json(
          { error: "Enter a display name before publishing a profile." },
          { status: 400 },
        );
      }
      if (data.profilePublic && !data.profileSlug) {
        return NextResponse.json(
          {
            error:
              "Choose a profile link before making your profile public.",
          },
          { status: 400 },
        );
      }
      fundraiser = await prisma.fundraiser.create({
        data: {
          email: session.email,
          name: data.name,
          authUserId: session.authUserId,
          bio: data.bio ?? null,
          photoUrl: data.photoUrl ?? null,
          profileSlug: data.profileSlug ?? null,
          profilePublic: data.profilePublic ?? false,
        },
        select: profileSelect,
      });
    } else {
      const current = await prisma.fundraiser.findUniqueOrThrow({
        where: { id: session.fundraiser.id },
        select: {
          profilePublic: true,
          profileSlug: true,
          photoUrl: true,
        },
      });
      const nextPublic = data.profilePublic ?? current.profilePublic;
      const nextSlug =
        "profileSlug" in data ? data.profileSlug : current.profileSlug;
      if (nextPublic && !nextSlug) {
        return NextResponse.json(
          {
            error:
              "Choose a profile link before making your profile public.",
          },
          { status: 400 },
        );
      }

      // Photo is managed by /api/host/avatar — strip accidental client photoUrl
      // except explicit null clear as a safety net.
      const previousPhoto = current.photoUrl;
      const clearingPhoto =
        "photoUrl" in data && data.photoUrl === null && previousPhoto;

      fundraiser = await prisma.fundraiser.update({
        where: { id: session.fundraiser.id },
        data: {
          ...data,
          ...(session.fundraiser.authUserId
            ? {}
            : { authUserId: session.authUserId }),
        },
        select: profileSelect,
      });

      if (clearingPhoto) {
        void deletePotCoverIfOurs(previousPhoto);
      }
    }

    if (data.name) {
      try {
        await getSupabaseAdmin().auth.admin.updateUserById(session.authUserId, {
          user_metadata: { name: data.name },
        });
      } catch (metaError) {
        console.error("Host name metadata sync failed", metaError);
      }
    }

    revalidateHostMe();

    return NextResponse.json({
      user: {
        email: fundraiser.email,
        name: fundraiser.name,
        bio: fundraiser.bio,
        photoUrl: fundraiser.photoUrl,
        profileSlug: fundraiser.profileSlug,
        profilePublic: fundraiser.profilePublic,
      },
    });
  } catch (error) {
    console.error("Host profile update failed", error);
    return NextResponse.json(
      {
        error: isVisitorError(error)
          ? error.message
          : "We could not update your profile. Please try again.",
      },
      { status: 500 },
    );
  }
}
