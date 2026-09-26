import { PotType } from "@prisma/client";
import { unstable_cache, revalidateTag } from "next/cache";
import { loadMessageOriginals } from "@/lib/donation-message-audit";
import { prisma } from "@/lib/prisma";

export const HOST_POT_MANAGE_CACHE_TAG = "host-pot-manage";

export type HostManagePayload = {
  pot: {
    slug: string;
    title: string;
    story: string | null;
    founderStory: string | null;
    photoUrl: string | null;
    type: PotType;
    status: string;
    targetAmount: number;
    totalRaised: number;
    donorCount: number;
    createdAt: string;
    updatedAt: string;
    donations: Array<{
      id: string;
      donorName: string | null;
      amount: number;
      message: string | null;
      messageOriginal: string | null;
      commentHidden: boolean;
      creatorReply: string | null;
      creatorReplyAt: string | null;
      isAnonymous: boolean;
      createdAt: string;
    }>;
    silentGifts: Array<{
      id: string;
      donorName: string | null;
      amount: number;
      isAnonymous: boolean;
      createdAt: string;
    }>;
  };
};

async function loadHostPotManage(potId: string): Promise<HostManagePayload | null> {
  const pot = await prisma.pot.findUnique({
    where: { id: potId },
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
      createdAt: true,
      updatedAt: true,
      donations: {
        where: { status: "SUCCEEDED" },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          donorName: true,
          amount: true,
          message: true,
          commentHidden: true,
          creatorReply: true,
          creatorReplyAt: true,
          isAnonymous: true,
          createdAt: true,
        },
      },
    },
  });

  if (!pot) return null;

  const withText = pot.donations.filter((d) => Boolean(d.message?.trim()));
  const silentGifts = pot.donations
    .filter((d) => !d.message?.trim())
    .map((d) => ({
      id: d.id,
      donorName: d.donorName,
      amount: d.amount,
      isAnonymous: d.isAnonymous,
      createdAt: d.createdAt.toISOString(),
    }));

  const originals = await loadMessageOriginals(withText.map((d) => d.id));

  const donations = withText.map((d) => ({
    id: d.id,
    donorName: d.donorName,
    amount: d.amount,
    message: d.message,
    messageOriginal: originals.get(d.id) ?? null,
    commentHidden: d.commentHidden,
    creatorReply: d.creatorReply,
    creatorReplyAt: d.creatorReplyAt?.toISOString() ?? null,
    isAnonymous: d.isAnonymous,
    createdAt: d.createdAt.toISOString(),
  }));

  return {
    pot: {
      slug: pot.slug,
      title: pot.title,
      story: pot.story,
      founderStory: pot.founderStory,
      photoUrl: pot.photoUrl,
      type: pot.type,
      status: pot.status,
      targetAmount: pot.targetAmount,
      totalRaised: pot.totalRaised,
      donorCount: pot.donorCount,
      createdAt: pot.createdAt.toISOString(),
      updatedAt: pot.updatedAt.toISOString(),
      donations,
      silentGifts,
    },
  };
}

/** Host manage payload — 30s Data Cache per pot. */
export function getHostPotManageCached(potId: string) {
  return unstable_cache(
    () => loadHostPotManage(potId),
    ["host-pot-manage-v1", potId],
    {
      revalidate: 30,
      tags: [HOST_POT_MANAGE_CACHE_TAG, `host-pot-manage:${potId}`],
    },
  )();
}

export function revalidateHostPotManage() {
  revalidateTag(HOST_POT_MANAGE_CACHE_TAG, "max");
}
