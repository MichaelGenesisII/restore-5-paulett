import { NextResponse } from "next/server";
import { requireOwnedPot } from "@/lib/auth/require-host";
import { revalidateHostMe } from "@/lib/host-me";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const REPLY_MAX = 1000;

type RouteCtx = {
  params: Promise<{ slug: string; donationId: string }>;
};

async function loadOwnedComment(request: Request, slug: string, donationId: string) {
  const owned = await requireOwnedPot(request, slug);
  if (owned instanceof NextResponse) return owned;

  const donation = await prisma.donation.findFirst({
    where: {
      id: donationId,
      potId: owned.pot.id,
      status: "SUCCEEDED",
    },
  });

  if (!donation || !donation.message?.trim()) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  return { owned, donation };
}

/** Create or replace the single creator reply (max one). */
export async function PUT(request: Request, ctx: RouteCtx) {
  const { slug, donationId } = await ctx.params;
  const loaded = await loadOwnedComment(request, slug, donationId);
  if (loaded instanceof NextResponse) return loaded;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const raw =
    body && typeof body === "object" && "reply" in body
      ? (body as { reply: unknown }).reply
      : null;
  const reply = typeof raw === "string" ? raw.trim() : "";

  if (!reply) {
    return NextResponse.json(
      { error: "Write a short reply before posting." },
      { status: 400 },
    );
  }
  if (reply.length > REPLY_MAX) {
    return NextResponse.json(
      { error: `Keep replies under ${REPLY_MAX} characters.` },
      { status: 400 },
    );
  }

  const donation = await prisma.donation.update({
    where: { id: loaded.donation.id },
    data: {
      creatorReply: reply,
      creatorReplyAt: new Date(),
    },
    select: {
      id: true,
      creatorReply: true,
      creatorReplyAt: true,
      commentHidden: true,
    },
  });

  revalidateHostMe();

  return NextResponse.json({ comment: donation });
}

/** Remove the host reply. */
export async function DELETE(request: Request, ctx: RouteCtx) {
  const { slug, donationId } = await ctx.params;
  const loaded = await loadOwnedComment(request, slug, donationId);
  if (loaded instanceof NextResponse) return loaded;

  if (!loaded.donation.creatorReply) {
    return NextResponse.json({ ok: true });
  }

  const donation = await prisma.donation.update({
    where: { id: loaded.donation.id },
    data: {
      creatorReply: null,
      creatorReplyAt: null,
    },
    select: {
      id: true,
      creatorReply: true,
      creatorReplyAt: true,
    },
  });

  revalidateHostMe();

  return NextResponse.json({ comment: donation });
}
