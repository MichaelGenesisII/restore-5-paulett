import { NextResponse } from "next/server";
import {
  isAdminAuthFailure,
  requireAdmin,
} from "@/lib/auth/require-admin";
import { potStatusLabel } from "@/lib/pot-lifecycle";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/** Single host with pots summary. */
export async function GET(request: Request, context: RouteContext) {
  const session = await requireAdmin(request);
  if (isAdminAuthFailure(session)) return session;

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const host = await prisma.fundraiser.findUnique({
    where: { id: id.trim() },
    select: {
      id: true,
      name: true,
      email: true,
      profileSlug: true,
      profilePublic: true,
      bio: true,
      photoUrl: true,
      isAlumni: true,
      alumniYearsFrom: true,
      alumniYearsTo: true,
      alumniMinistry: true,
      alumniCity: true,
      alumniCountry: true,
      createdAt: true,
      pots: {
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
          type: true,
          photoUrl: true,
          totalRaised: true,
          targetAmount: true,
          donorCount: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!host) {
    return NextResponse.json({ error: "Host not found" }, { status: 404 });
  }

  const potCount = host.pots.length;
  const livePots = host.pots.filter((p) => p.status === "ACTIVE").length;
  const totalRaised = host.pots.reduce((s, p) => s + p.totalRaised, 0);

  return NextResponse.json({
    host: {
      id: host.id,
      name: host.name,
      email: host.email,
      profileSlug: host.profileSlug,
      profilePublic: host.profilePublic,
      bio: host.bio,
      photoUrl: host.photoUrl,
      isAlumni: host.isAlumni,
      alumniYearsFrom: host.alumniYearsFrom,
      alumniYearsTo: host.alumniYearsTo,
      alumniMinistry: host.alumniMinistry,
      alumniCity: host.alumniCity,
      alumniCountry: host.alumniCountry,
      createdAt: host.createdAt.toISOString(),
      potCount,
      livePots,
      totalRaised,
      pots: host.pots.map((p) => ({
        ...p,
        statusLabel: potStatusLabel(p.status),
        updatedAt: p.updatedAt.toISOString(),
      })),
    },
  });
}
