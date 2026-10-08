import { NextResponse } from "next/server";
import { isAuthFailure, requireHost } from "@/lib/auth/require-host";
import { getHostMeCached } from "@/lib/host-me";

export const runtime = "nodejs";

/** Returns the signed-in host’s fundraiser + pots (cached 30s). */
export async function GET(request: Request) {
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
        mustSetPassword: false,
      },
      pots: [],
    });
  }

  try {
    const payload = await getHostMeCached(session.fundraiser);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Host me failed", error);
    return NextResponse.json(
      { error: "Could not load your account." },
      { status: 500 },
    );
  }
}
