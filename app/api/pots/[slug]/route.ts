import { NextResponse } from "next/server";
import { isPubliclyVisible } from "@/lib/pot-lifecycle";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const pot = await prisma.pot.findUnique({
    where: { slug },
    include: {
      fundraiser: { select: { name: true, isAlumni: true } },
      donations: {
        where: { status: "SUCCEEDED", isAnonymous: false },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { donorName: true, amount: true, message: true, createdAt: true },
      },
    },
  });

  if (!pot || !isPubliclyVisible(pot.status)) {
    return NextResponse.json({ error: "Fundraiser not found" }, { status: 404 });
  }

  return NextResponse.json({
    slug: pot.slug,
    title: pot.title,
    story: pot.story,
    founderStory: pot.founderStory,
    photoUrl: pot.photoUrl,
    type: pot.type,
    targetAmount: pot.targetAmount,
    totalRaised: pot.totalRaised,
    donorCount: pot.donorCount,
    status: pot.status,
    fundraiser: pot.fundraiser,
    recentGifts: pot.donations,
  });
}
