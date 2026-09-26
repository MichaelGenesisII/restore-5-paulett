import { NextResponse } from "next/server";
import { requireOwnedPot } from "@/lib/auth/require-host";
import {
  clearDonationMessage,
  loadMessageOriginals,
  redactDonationMessage,
} from "@/lib/donation-message-audit";
import { revalidateHostMe } from "@/lib/host-me";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MESSAGE_MAX = 2000;

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

/**
 * Hide/unhide (`hidden`) or redact/replace public giver text (`message`).
 * Redact stores the first original in `messageOriginal` for audit.
 */
export async function PATCH(request: Request, ctx: RouteCtx) {
  const { slug, donationId } = await ctx.params;
  const loaded = await loadOwnedComment(request, slug, donationId);
  if (loaded instanceof NextResponse) return loaded;

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

  if ("message" in input) {
    if (typeof input.message !== "string") {
      return NextResponse.json(
        { error: "Enter the replacement message text." },
        { status: 400 },
      );
    }
    const nextMessage = input.message.trim();
    if (!nextMessage) {
      return NextResponse.json(
        {
          error:
            "Replacement text cannot be empty. Delete the comment instead.",
        },
        { status: 400 },
      );
    }
    if (nextMessage.length > MESSAGE_MAX) {
      return NextResponse.json(
        { error: `Keep the message under ${MESSAGE_MAX} characters.` },
        { status: 400 },
      );
    }

    const previous = loaded.donation.message?.trim() ?? "";
    await redactDonationMessage({
      id: loaded.donation.id,
      nextMessage,
      previousMessage: previous,
    });

    const originals = await loadMessageOriginals([loaded.donation.id]);
    const donation = await prisma.donation.findUnique({
      where: { id: loaded.donation.id },
      select: {
        id: true,
        message: true,
        commentHidden: true,
        creatorReply: true,
        creatorReplyAt: true,
      },
    });

    revalidateHostMe();

    return NextResponse.json({
      comment: {
        ...donation,
        messageOriginal: originals.get(loaded.donation.id) ?? null,
      },
    });
  }

  if ("hidden" in input) {
    const donation = await prisma.donation.update({
      where: { id: loaded.donation.id },
      data: { commentHidden: input.hidden === true },
      select: {
        id: true,
        commentHidden: true,
        message: true,
        creatorReply: true,
        creatorReplyAt: true,
      },
    });
    const originals = await loadMessageOriginals([donation.id]);

    revalidateHostMe();

    return NextResponse.json({
      comment: {
        ...donation,
        messageOriginal: originals.get(donation.id) ?? null,
      },
    });
  }

  return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
}

/**
 * Permanently remove the gift message (and any reply) from public view.
 * Keeps `messageOriginal` when present for audit; gift amount stays.
 */
export async function DELETE(request: Request, ctx: RouteCtx) {
  const { slug, donationId } = await ctx.params;
  const loaded = await loadOwnedComment(request, slug, donationId);
  if (loaded instanceof NextResponse) return loaded;

  await clearDonationMessage({
    id: loaded.donation.id,
    previousMessage: loaded.donation.message?.trim() ?? "",
  });

  revalidateHostMe();

  return NextResponse.json({ ok: true });
}
