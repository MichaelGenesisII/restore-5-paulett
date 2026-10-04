import { NextResponse } from "next/server";
import type { Fundraiser, Pot } from "@prisma/client";
import { verifyAccessToken } from "@/lib/auth/verify-access-token";
import { prisma } from "@/lib/prisma";

export type HostSession = {
  authUserId: string;
  email: string;
  fundraiser: Pick<
    Fundraiser,
    | "id"
    | "email"
    | "name"
    | "authUserId"
    | "bio"
    | "photoUrl"
    | "profileSlug"
    | "profilePublic"
  > | null;
};

export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token || null;
}

/**
 * Validates the Bearer access token and loads the matching Fundraiser by email.
 * Returns a NextResponse on auth failure.
 */
export async function requireHost(
  request: Request,
): Promise<HostSession | NextResponse> {
  const token = bearerToken(request);
  if (!token) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const verified = await verifyAccessToken(token);
  if (!verified.ok) {
    if (verified.reason === "timeout") {
      return NextResponse.json(
        { error: "Auth check timed out. Retry shortly." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  const fundraiser = await prisma.fundraiser.findUnique({
    where: { email: verified.user.email },
    select: {
      id: true,
      email: true,
      name: true,
      authUserId: true,
      bio: true,
      photoUrl: true,
      profileSlug: true,
      profilePublic: true,
    },
  });

  return {
    authUserId: verified.user.id,
    email: verified.user.email,
    fundraiser,
  };
}

export function isAuthFailure(
  value: HostSession | NextResponse,
): value is NextResponse {
  return value instanceof NextResponse;
}

/** Load a pot owned by the signed-in host’s fundraiser. */
export async function requireOwnedPot(
  request: Request,
  slug: string,
): Promise<
  | { session: HostSession; pot: Pot; fundraiserId: string }
  | NextResponse
> {
  const session = await requireHost(request);
  if (isAuthFailure(session)) return session;

  if (!session.fundraiser) {
    return NextResponse.json(
      { error: "No host account found for this login." },
      { status: 404 },
    );
  }

  const pot = await prisma.pot.findUnique({ where: { slug } });
  if (!pot || pot.fundraiserId !== session.fundraiser.id) {
    return NextResponse.json({ error: "Fundraiser not found" }, { status: 404 });
  }

  return {
    session,
    pot,
    fundraiserId: session.fundraiser.id,
  };
}
