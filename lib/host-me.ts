import { unstable_cache, revalidateTag } from "next/cache";
import { HOST_INBOX_CACHE_TAG } from "@/lib/host-inbox";
import { HOST_POT_ANALYTICS_CACHE_TAG } from "@/lib/host-pot-analytics";
import { HOST_POT_MANAGE_CACHE_TAG } from "@/lib/host-pot-manage";
import { prisma } from "@/lib/prisma";

export const HOST_ME_CACHE_TAG = "host-me";

export type HostMePayload = {
  user: {
    email: string;
    name: string | null;
    bio: string | null;
    photoUrl: string | null;
    profileSlug: string | null;
    profilePublic: boolean;
  };
  pots: Array<{
    slug: string;
    title: string;
    status: string;
    totalRaised: number;
    targetAmount: number;
    donorCount: number;
    photoUrl: string | null;
    createdAt: string;
    unrepliedCount: number;
  }>;
};

type FundraiserUser = {
  id: string;
  email: string;
  name: string | null;
  bio: string | null;
  photoUrl: string | null;
  profileSlug: string | null;
  profilePublic: boolean;
};

async function loadHostMe(fundraiser: FundraiserUser): Promise<HostMePayload> {
  const pots = await prisma.pot.findMany({
    where: { fundraiserId: fundraiser.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      totalRaised: true,
      targetAmount: true,
      donorCount: true,
      photoUrl: true,
      createdAt: true,
    },
  });

  const potIds = pots.map((p) => p.id);
  const unrepliedByPot =
    potIds.length === 0
      ? []
      : await prisma.donation.groupBy({
          by: ["potId"],
          where: {
            potId: { in: potIds },
            status: "SUCCEEDED",
            message: { not: null },
            NOT: { message: "" },
            creatorReply: null,
          },
          _count: { _all: true },
        });

  const unrepliedMap = new Map(
    unrepliedByPot
      .filter((row): row is typeof row & { potId: string } => row.potId != null)
      .map((row) => [row.potId, row._count._all]),
  );

  return {
    user: {
      email: fundraiser.email,
      name: fundraiser.name,
      bio: fundraiser.bio,
      photoUrl: fundraiser.photoUrl,
      profileSlug: fundraiser.profileSlug,
      profilePublic: fundraiser.profilePublic,
    },
    pots: pots.map(({ id, createdAt, ...pot }) => ({
      ...pot,
      createdAt: createdAt.toISOString(),
      unrepliedCount: unrepliedMap.get(id) ?? 0,
    })),
  };
}

/**
 * Host dashboard payload — 30s Data Cache per fundraiser.
 * Invalidated with other pot caches when gift totals change.
 */
export function getHostMeCached(fundraiser: FundraiserUser) {
  return unstable_cache(
    () => loadHostMe(fundraiser),
    ["host-me-v1", fundraiser.id],
    {
      revalidate: 30,
      tags: [HOST_ME_CACHE_TAG, `host-me:${fundraiser.id}`],
    },
  )();
}

/** Invalidate all Host dashboard Data Caches (me, inbox, manage, analytics). */
export function revalidateHostMe() {
  revalidateTag(HOST_ME_CACHE_TAG, "max");
  revalidateTag(HOST_INBOX_CACHE_TAG, "max");
  revalidateTag(HOST_POT_MANAGE_CACHE_TAG, "max");
  revalidateTag(HOST_POT_ANALYTICS_CACHE_TAG, "max");
}
