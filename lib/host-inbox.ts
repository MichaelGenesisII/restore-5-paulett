import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";

export const HOST_INBOX_CACHE_TAG = "host-inbox";

export type HostInboxMessage = {
  id: string;
  potSlug: string;
  potTitle: string;
  potStatus: string;
  donorName: string | null;
  amount: number;
  message: string | null;
  commentHidden: boolean;
  isAnonymous: boolean;
  createdAt: string;
};

async function loadHostInbox(
  fundraiserId: string,
): Promise<{ messages: HostInboxMessage[] }> {
  // Single query — pot ownership filtered via relation (no separate pot round-trip).
  const donations = await prisma.donation.findMany({
    where: {
      status: "SUCCEEDED",
      message: { not: null },
      NOT: { message: "" },
      creatorReply: null,
      pot: { fundraiserId },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      donorName: true,
      amount: true,
      message: true,
      commentHidden: true,
      isAnonymous: true,
      createdAt: true,
      pot: {
        select: { slug: true, title: true, status: true },
      },
    },
  });

  const messages = donations
    .filter((d): d is typeof d & { pot: NonNullable<typeof d.pot> } =>
      Boolean(d.pot),
    )
    .map((d) => ({
      id: d.id,
      potSlug: d.pot.slug,
      potTitle: d.pot.title,
      potStatus: d.pot.status,
      donorName: d.donorName,
      amount: d.amount,
      message: d.message,
      commentHidden: d.commentHidden,
      isAnonymous: d.isAnonymous,
      createdAt: d.createdAt.toISOString(),
    }));

  return { messages };
}

/** Inbox thank-you queue — 30s Data Cache per fundraiser. */
export function getHostInboxCached(fundraiserId: string) {
  return unstable_cache(
    () => loadHostInbox(fundraiserId),
    ["host-inbox-v1", fundraiserId],
    {
      revalidate: 30,
      tags: [HOST_INBOX_CACHE_TAG, `host-inbox:${fundraiserId}`],
    },
  )();
}

export function revalidateHostInbox() {
  revalidateTag(HOST_INBOX_CACHE_TAG, "max");
}
