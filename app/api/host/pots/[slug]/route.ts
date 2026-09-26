import { NextResponse } from "next/server";
import { PotStatus, PotType } from "@prisma/client";
import {
  requireOwnedPot,
} from "@/lib/auth/require-host";
import { canTransitionPotStatus } from "@/lib/pot-lifecycle";
import { deletePotCoverIfOurs } from "@/lib/pot-cover-storage";
import {
  MIN_FOUNDER_STORY_WORDS,
  MIN_POT_DESCRIPTION_WORDS,
  optionalCopyProblem,
} from "@/lib/pots";
import { assertDonationPence } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { normalizeSlug } from "@/lib/slug";
import { isVisitorError } from "@/lib/visitor-safe";
import { revalidateHomePots } from "@/lib/home-pots";
import { revalidateHostMe } from "@/lib/host-me";
import { getHostPotManageCached } from "@/lib/host-pot-manage";

export const runtime = "nodejs";

const POT_TYPES = new Set<string>(Object.values(PotType));
const TITLE_MAX = 80;

function optionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Full pot + gift messages + silent gifts for the host manage screen (cached 30s). */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const owned = await requireOwnedPot(request, slug);
  if (owned instanceof NextResponse) return owned;

  try {
    const payload = await getHostPotManageCached(owned.pot.id);
    if (!payload) {
      return NextResponse.json({ error: "Pot not found" }, { status: 404 });
    }
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Host pot manage failed", error);
    return NextResponse.json(
      { error: "Could not load this pot." },
      { status: 500 },
    );
  }
}

/** Update pot details, status, cover, or public slug. When photoUrl changes, deletes the previous cover in our bucket. */
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const owned = await requireOwnedPot(request, slug);
  if (owned instanceof NextResponse) return owned;

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

  const input = body as Record<string, unknown>;

  const data: {
    title?: string;
    story?: string | null;
    founderStory?: string | null;
    photoUrl?: string | null;
    type?: PotType;
    targetAmount?: number;
    status?: PotStatus;
    slug?: string;
  } = {};

  let nextSlug: string | null = null;
  if ("slug" in input) {
    if (typeof input.slug !== "string") {
      return NextResponse.json(
        { error: "Choose a valid link." },
        { status: 400 },
      );
    }
    const candidate = normalizeSlug(input.slug);
    if (candidate.length < 3) {
      return NextResponse.json(
        { error: "The link needs at least 3 characters." },
        { status: 400 },
      );
    }
    if (candidate !== owned.pot.slug) {
      const taken = await prisma.pot.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (taken && taken.id !== owned.pot.id) {
        return NextResponse.json(
          { error: "That link is already in use. Try another." },
          { status: 409 },
        );
      }

      const redirectHit = await prisma.potSlugRedirect.findUnique({
        where: { oldSlug: candidate },
        select: { potId: true },
      });
      if (redirectHit && redirectHit.potId !== owned.pot.id) {
        return NextResponse.json(
          { error: "That link is reserved by another pot. Try another." },
          { status: 409 },
        );
      }

      nextSlug = candidate;
      data.slug = candidate;
    }
  }

  if ("title" in input) {
    const title = optionalString(input.title);
    if (!title || title.length < 3) {
      return NextResponse.json(
        { error: "The pot needs a title of at least 3 characters." },
        { status: 400 },
      );
    }
    if (title.length > TITLE_MAX) {
      return NextResponse.json(
        { error: `Keep the title under ${TITLE_MAX} characters.` },
        { status: 400 },
      );
    }
    data.title = title;
  }

  if ("story" in input) {
    const story = optionalString(input.story);
    const problem = optionalCopyProblem(
      story ?? "",
      MIN_POT_DESCRIPTION_WORDS,
      "The description",
    );
    if (problem) {
      return NextResponse.json({ error: problem }, { status: 400 });
    }
    data.story = story;
  }

  if ("founderStory" in input) {
    const founderStory = optionalString(input.founderStory);
    const problem = optionalCopyProblem(
      founderStory ?? "",
      MIN_FOUNDER_STORY_WORDS,
      "Your story",
    );
    if (problem) {
      return NextResponse.json({ error: problem }, { status: 400 });
    }
    data.founderStory = founderStory;
  }

  if ("photoUrl" in input) {
    if (input.photoUrl === null || input.photoUrl === "") {
      data.photoUrl = null;
    } else {
      const photoUrl = optionalString(input.photoUrl);
      if (!photoUrl) {
        return NextResponse.json(
          { error: "That cover image link does not look valid." },
          { status: 400 },
        );
      }
      data.photoUrl = photoUrl;
    }
  }

  if ("type" in input) {
    const type = optionalString(input.type);
    if (!type || !POT_TYPES.has(type)) {
      return NextResponse.json(
        { error: "Choose a valid pot type." },
        { status: 400 },
      );
    }
    data.type = type as PotType;
  }

  if ("targetAmountPence" in input || "targetAmount" in input) {
    try {
      data.targetAmount = assertDonationPence(
        input.targetAmountPence ?? input.targetAmount,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Enter a valid target amount.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  if ("status" in input) {
    const status = optionalString(input.status);
    if (!status) {
      return NextResponse.json(
        { error: "That status change is not allowed." },
        { status: 400 },
      );
    }

    if (!canTransitionPotStatus(owned.pot.status, status)) {
      if (status === "ACTIVE" && owned.pot.status === PotStatus.PENDING) {
        return NextResponse.json(
          {
            error:
              "This pot opens after the first seed gift clears — it cannot be activated by hand.",
          },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { error: "That status change is not allowed." },
        { status: 400 },
      );
    }

    // Raw update so PAUSED/CLOSED work before Prisma client regenerates.
    await prisma.$executeRaw`
      UPDATE "Pot"
      SET status = CAST(${status} AS "PotStatus"),
          "updatedAt" = NOW()
      WHERE id = ${owned.pot.id}
    `;
  }

  if (Object.keys(data).length === 0 && !("status" in input)) {
    return NextResponse.json(
      { error: "Nothing to update." },
      { status: 400 },
    );
  }

  const previousPhotoUrl = owned.pot.photoUrl;
  const photoChanging =
    "photoUrl" in data && data.photoUrl !== previousPhotoUrl;
  const previousSlug = owned.pot.slug;

  try {
    const pot = await prisma.$transaction(async (tx) => {
      if (nextSlug && nextSlug !== previousSlug) {
        // Reclaim if this pot previously used nextSlug as an old link.
        await tx.potSlugRedirect.deleteMany({
          where: { oldSlug: nextSlug, potId: owned.pot.id },
        });
        await tx.potSlugRedirect.upsert({
          where: { oldSlug: previousSlug },
          create: { oldSlug: previousSlug, potId: owned.pot.id },
          update: { potId: owned.pot.id },
        });
      }

      if (Object.keys(data).length > 0) {
        return tx.pot.update({
          where: { id: owned.pot.id },
          data,
          select: {
            slug: true,
            title: true,
            story: true,
            founderStory: true,
            photoUrl: true,
            type: true,
            status: true,
            targetAmount: true,
            totalRaised: true,
            donorCount: true,
            updatedAt: true,
          },
        });
      }

      return tx.pot.findUniqueOrThrow({
        where: { id: owned.pot.id },
        select: {
          slug: true,
          title: true,
          story: true,
          founderStory: true,
          photoUrl: true,
          type: true,
          status: true,
          targetAmount: true,
          totalRaised: true,
          donorCount: true,
          updatedAt: true,
        },
      });
    });

    if (photoChanging) {
      void deletePotCoverIfOurs(previousPhotoUrl);
      // Cover change — bust public pot/home caches too (not only host desk).
      revalidateHomePots();
    } else {
      revalidateHostMe();
    }

    return NextResponse.json({ pot });
  } catch (error) {
    console.error("Host pot update failed", error);
    if (isVisitorError(error)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "We could not save those changes. Please try again." },
      { status: 500 },
    );
  }
}
