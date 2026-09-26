import { NextResponse } from "next/server";
import {
  PotStatus,
  PotType,
  Prisma,
  RestorationCategory,
} from "@prisma/client";
import { ensureCreatorAuthAccount } from "@/lib/auth/creator-account";
import { isExistingCreatorEmail } from "@/lib/auth/host-account";
import { bearerToken } from "@/lib/auth/require-host";
import { verifyAccessToken } from "@/lib/auth/verify-access-token";
import { notifyCreatorCredentials } from "@/lib/email/creator-notify";
import { uniquePotSlug } from "@/lib/slug";
import { assertDonationPence, formatWholeGbp, MIN_POT_SEED_PENCE } from "@/lib/money";
import {
  MIN_FOUNDER_STORY_WORDS,
  MIN_POT_DESCRIPTION_WORDS,
  optionalCopyProblem,
} from "@/lib/pots";
import { prisma } from "@/lib/prisma";
import { isVisitorError } from "@/lib/visitor-safe";

export const runtime = "nodejs";

const POT_TYPES = new Set<string>(Object.values(PotType));

function optionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function optionalInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  return value;
}

async function uniqueSlug(title: string): Promise<string> {
  return uniquePotSlug(title, async (slug) => {
    const existing = await prisma.pot.findUnique({ where: { slug } });
    return Boolean(existing);
  });
}

/**
 * Public pot directory.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const search = url.searchParams.get("search")?.trim();
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const limit = Math.min(
    50,
    Math.max(1, Number(url.searchParams.get("limit") ?? "24")),
  );
  const skip = (page - 1) * limit;

  const where: Prisma.PotWhereInput = {
    status: PotStatus.ACTIVE,
    ...(type && POT_TYPES.has(type) ? { type: type as PotType } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { story: { contains: search, mode: "insensitive" } },
            { fundraiser: { name: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [pots, total] = await Promise.all([
    prisma.pot.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
      select: {
        slug: true,
        title: true,
        story: true,
        photoUrl: true,
        type: true,
        targetAmount: true,
        totalRaised: true,
        donorCount: true,
        fundraiser: { select: { name: true } },
      },
    }),
    prisma.pot.count({ where }),
  ]);

  return NextResponse.json({
    pots,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
}

/**
 * Returning hosts must prove the email with a Bearer session.
 * New emails may create an account; temporary password is emailed only (never in JSON).
 */
export async function POST(request: Request) {
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
  const fundraiserName = optionalString(data.fundraiserName);
  const fundraiserEmail = optionalString(data.fundraiserEmail)?.toLowerCase();
  const photoUrl = optionalString(data.photoUrl);
  const type = optionalString(data.type);

  if (!title || title.length < 3) {
    return NextResponse.json(
      { error: "Title must be at least 3 characters." },
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
  if (!fundraiserName) {
    return NextResponse.json(
      { error: "Your name is required." },
      { status: 400 },
    );
  }
  if (
    !fundraiserEmail ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fundraiserEmail)
  ) {
    return NextResponse.json(
      { error: "A valid email is required." },
      { status: 400 },
    );
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

  const isAlumni = data.isAlumni === true;
  const slug = await uniqueSlug(title);

  try {
    const returning = await isExistingCreatorEmail(fundraiserEmail);
    if (returning) {
      const token = bearerToken(request);
      if (!token) {
        return NextResponse.json(
          {
            error:
              "This email already has a Host login. Sign in at Host home, then create the pot — or use a different email.",
          },
          { status: 401 },
        );
      }
      const verified = await verifyAccessToken(token);
      if (!verified.ok) {
        return NextResponse.json(
          {
            error:
              verified.reason === "timeout"
                ? "Auth check timed out. Retry shortly."
                : "Session expired. Sign in at Host home, then try again.",
          },
          { status: verified.reason === "timeout" ? 503 : 401 },
        );
      }
      if (verified.user.email !== fundraiserEmail) {
        return NextResponse.json(
          {
            error:
              "Signed-in email does not match. Use the same email as your Host login.",
          },
          { status: 403 },
        );
      }
    }

    const existing = await prisma.fundraiser.findUnique({
      where: { email: fundraiserEmail },
      select: { id: true, authUserId: true },
    });

    const account = await ensureCreatorAuthAccount({
      email: fundraiserEmail,
      name: fundraiserName,
      existingAuthUserId: existing?.authUserId,
    });

    const fundraiser = await prisma.fundraiser.upsert({
      where: { email: fundraiserEmail },
      create: {
        email: fundraiserEmail,
        name: fundraiserName,
        authUserId: account.authUserId,
        isAlumni,
        alumniYearsFrom: optionalInt(data.alumniYearsFrom) ?? undefined,
        alumniYearsTo: optionalInt(data.alumniYearsTo) ?? undefined,
        alumniMinistry: optionalString(data.alumniMinistry) ?? undefined,
        alumniCity: optionalString(data.alumniCity) ?? undefined,
        alumniCountry: optionalString(data.alumniCountry) ?? undefined,
      },
      update: {
        name: fundraiserName,
        authUserId: account.authUserId,
        ...(isAlumni
          ? {
              isAlumni: true,
              alumniYearsFrom: optionalInt(data.alumniYearsFrom) ?? undefined,
              alumniYearsTo: optionalInt(data.alumniYearsTo) ?? undefined,
              alumniMinistry: optionalString(data.alumniMinistry) ?? undefined,
              alumniCity: optionalString(data.alumniCity) ?? undefined,
              alumniCountry: optionalString(data.alumniCountry) ?? undefined,
            }
          : {
              isAlumni: false,
              alumniYearsFrom: null,
              alumniYearsTo: null,
              alumniMinistry: null,
              alumniCity: null,
              alumniCountry: null,
            }),
      },
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
      select: { id: true, slug: true, status: true, title: true },
    });

    let credentialsEmailed = false;
    if (account.isNewAccount && account.temporaryPassword) {
      credentialsEmailed = true;
      void notifyCreatorCredentials({
        email: fundraiserEmail,
        name: fundraiserName,
        temporaryPassword: account.temporaryPassword,
        potTitle: pot.title,
        potSlug: pot.slug,
      });
    }

    return NextResponse.json(
      {
        pot,
        account: {
          email: fundraiserEmail,
          isNewAccount: account.isNewAccount,
          credentialsEmailed,
        },
        message: account.isNewAccount
          ? `Pot ready. Check your inbox for your Host login, then seed with ${formatWholeGbp(MIN_POT_SEED_PENCE)} or more to open it.`
          : `Pot ready — linked to your existing login. Seed with ${formatWholeGbp(MIN_POT_SEED_PENCE)} or more to open it.`,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create pot failed", error);
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
