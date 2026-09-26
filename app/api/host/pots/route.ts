import { NextResponse } from "next/server";
import { PotStatus, PotType, RestorationCategory } from "@prisma/client";
import {
  isAuthFailure,
  requireHost,
} from "@/lib/auth/require-host";
import { assertDonationPence } from "@/lib/money";
import {
  MIN_FOUNDER_STORY_WORDS,
  MIN_POT_DESCRIPTION_WORDS,
  optionalCopyProblem,
} from "@/lib/pots";
import { prisma } from "@/lib/prisma";
import { uniquePotSlug } from "@/lib/slug";
import { isVisitorError } from "@/lib/visitor-safe";
import { revalidateHostMe } from "@/lib/host-me";

export const runtime = "nodejs";

const POT_TYPES = new Set<string>(Object.values(PotType));
const TITLE_MAX = 80;

function optionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Create a PENDING pot under the signed-in creator (no temp-password path).
 * Body: title, type, targetAmountPence, story?, founderStory?, photoUrl?, name?
 */
export async function POST(request: Request) {
  const session = await requireHost(request);
  if (isAuthFailure(session)) return session;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Something went wrong with that request. Please try again." },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Something went wrong with that request. Please try again." },
      { status: 400 },
    );
  }

  const data = body as Record<string, unknown>;
  const title = optionalString(data.title);
  const story = optionalString(data.story);
  const founderStory = optionalString(data.founderStory);
  const photoUrl = optionalString(data.photoUrl);
  const type = optionalString(data.type);
  const nameOverride = optionalString(data.name);

  if (!title || title.length < 3) {
    return NextResponse.json(
      { error: "Title must be at least 3 characters." },
      { status: 400 },
    );
  }
  if (title.length > TITLE_MAX) {
    return NextResponse.json(
      { error: `Title must be ${TITLE_MAX} characters or fewer.` },
      { status: 400 },
    );
  }

  const storyProblem = optionalCopyProblem(
    story ?? "",
    MIN_POT_DESCRIPTION_WORDS,
    "The pot description",
  );
  if (storyProblem) {
    return NextResponse.json({ error: storyProblem }, { status: 400 });
  }
  const founderProblem = optionalCopyProblem(
    founderStory ?? "",
    MIN_FOUNDER_STORY_WORDS,
    "Your story",
  );
  if (founderProblem) {
    return NextResponse.json({ error: founderProblem }, { status: 400 });
  }
  if (photoUrl && !/^https?:\/\/\S+$/i.test(photoUrl)) {
    return NextResponse.json(
      { error: "Cover image URL is not valid." },
      { status: 400 },
    );
  }
  if (!type || !POT_TYPES.has(type)) {
    return NextResponse.json({ error: "Invalid pot type." }, { status: 400 });
  }

  let targetAmount: number;
  try {
    targetAmount = assertDonationPence(data.targetAmountPence);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Choose a valid target amount.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const displayName =
    nameOverride ??
    session.fundraiser?.name ??
    session.email.split("@")[0] ??
    "Host";

  try {
    const fundraiser =
      session.fundraiser ??
      (await prisma.fundraiser.create({
        data: {
          email: session.email,
          name: displayName,
          authUserId: session.authUserId,
        },
        select: { id: true, email: true, name: true, authUserId: true },
      }));

    if (session.fundraiser && nameOverride && nameOverride !== fundraiser.name) {
      await prisma.fundraiser.update({
        where: { id: fundraiser.id },
        data: { name: nameOverride },
      });
    }

    if (session.fundraiser && !session.fundraiser.authUserId) {
      await prisma.fundraiser.update({
        where: { id: fundraiser.id },
        data: { authUserId: session.authUserId },
      });
    }

    const slug = await uniquePotSlug(title, async (candidate) => {
      const existing = await prisma.pot.findUnique({
        where: { slug: candidate },
      });
      return Boolean(existing);
    });

    const pot = await prisma.pot.create({
      data: {
        slug,
        type: type as PotType,
        status: PotStatus.PENDING,
        title,
        story: story ?? null,
        founderStory,
        photoUrl,
        targetAmount,
        restorationCategory: RestorationCategory.GENERAL,
        fundraiserId: fundraiser.id,
      },
      select: {
        id: true,
        slug: true,
        status: true,
        title: true,
        targetAmount: true,
      },
    });

    revalidateHostMe();

    return NextResponse.json(
      {
        pot,
        message: "Pot ready. Seed with £25 or more to open it.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Creator create pot failed", error);
    return NextResponse.json(
      {
        error: isVisitorError(error)
          ? error.message
          : "We could not create your pot. Please try again.",
      },
      { status: 500 },
    );
  }
}
