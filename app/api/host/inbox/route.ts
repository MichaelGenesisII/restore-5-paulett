import { NextResponse } from "next/server";
import {
  isAuthFailure,
  requireHost,
} from "@/lib/auth/require-host";
import { getHostInboxCached } from "@/lib/host-inbox";

export const runtime = "nodejs";

/**
 * Cross-pot thank-you queue: succeeded gifts with a message and no creator reply.
 * Oldest first so creators work chronologically. Cached 30s.
 */
export async function GET(request: Request) {
  const session = await requireHost(request);
  if (isAuthFailure(session)) return session;

  if (!session.fundraiser) {
    return NextResponse.json({ messages: [] });
  }

  try {
    const payload = await getHostInboxCached(session.fundraiser.id);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Host inbox failed", error);
    return NextResponse.json(
      { error: "Could not load your inbox." },
      { status: 500 },
    );
  }
}
