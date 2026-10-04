import { NextResponse } from "next/server";
import { PotStatus } from "@prisma/client";
import {
  isAdminAuthFailure,
  requireAdmin,
} from "@/lib/auth/require-admin";
import { revalidateAdminOverview } from "@/lib/admin-overview";
import { revalidateAdminPots } from "@/lib/admin-pots";
import {
  allowedPotTransitions,
  canTransitionPotStatus,
  potStatusLabel,
  statusChangeCopy,
} from "@/lib/pot-lifecycle";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

/** Admin pot detail. */
export async function GET(request: Request, context: RouteContext) {
  const session = await requireAdmin(request);
  if (isAdminAuthFailure(session)) return session;

  const { slug } = await context.params;
  if (!slug?.trim()) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  const pot = await prisma.pot.findUnique({
    where: { slug: slug.trim() },
    select: {
      id: true,
      slug: true,
      title: true,
      type: true,
      status: true,
      story: true,
      founderStory: true,
      photoUrl: true,
      totalRaised: true,
      targetAmount: true,
      donorCount: true,
      restorationCategory: true,
      createdAt: true,
      updatedAt: true,
      fundraiser: {
        select: {
          id: true,
          name: true,
          email: true,
          profileSlug: true,
          profilePublic: true,
          isAlumni: true,
        },
      },
      _count: {
        select: {
          donations: true,
        },
      },
    },
  });

  if (!pot) {
    return NextResponse.json({ error: "Pot not found" }, { status: 404 });
  }

  const transitions = allowedPotTransitions(pot.status).map((to) => ({
    status: to,
    label: potStatusLabel(to),
    ...statusChangeCopy(to),
  }));

  return NextResponse.json({
    pot: {
      ...pot,
      statusLabel: potStatusLabel(pot.status),
      donationAttempts: pot._count.donations,
      createdAt: pot.createdAt.toISOString(),
      updatedAt: pot.updatedAt.toISOString(),
      transitions,
    },
  });
}

/** Admin status moderation only. */
export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireAdmin(request);
  if (isAdminAuthFailure(session)) return session;

  const { slug } = await context.params;
  if (!slug?.trim()) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  let body: { status?: unknown };
  try {
    body = (await request.json()) as { status?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const nextStatus =
    typeof body.status === "string" ? body.status.trim() : "";
  if (!Object.values(PotStatus).includes(nextStatus as PotStatus)) {
    return NextResponse.json(
      { error: "That status change is not allowed." },
      { status: 400 },
    );
  }

  const pot = await prisma.pot.findUnique({
    where: { slug: slug.trim() },
    select: { id: true, status: true, slug: true },
  });
  if (!pot) {
    return NextResponse.json({ error: "Pot not found" }, { status: 404 });
  }

  if (!canTransitionPotStatus(pot.status, nextStatus)) {
    if (nextStatus === "ACTIVE" && pot.status === PotStatus.PENDING) {
      return NextResponse.json(
        {
          error:
            "A pot still needs its first seed gift before it can go live.",
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "That status change is not allowed." },
      { status: 400 },
    );
  }

  const updated = await prisma.pot.update({
    where: { id: pot.id },
    data: { status: nextStatus as PotStatus },
    select: {
      slug: true,
      status: true,
      title: true,
    },
  });

  revalidateAdminOverview();
  revalidateAdminPots();
  return NextResponse.json({
    pot: {
      ...updated,
      statusLabel: potStatusLabel(updated.status),
    },
  });
}
