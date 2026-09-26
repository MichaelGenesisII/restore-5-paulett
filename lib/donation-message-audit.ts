import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Load messageOriginal map (works before/after Prisma client regenerate). */
export async function loadMessageOriginals(
  donationIds: string[],
): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>();
  if (donationIds.length === 0) return map;

  try {
    const rows = await prisma.$queryRaw<
      Array<{ id: string; messageOriginal: string | null }>
    >`
      SELECT id, "messageOriginal"
      FROM "Donation"
      WHERE id IN (${Prisma.join(donationIds)})
    `;
    for (const row of rows) {
      map.set(row.id, row.messageOriginal);
    }
  } catch (error) {
    console.error("loadMessageOriginals failed", error);
  }

  return map;
}

/** Persist redacted public message + first original (audit). */
export async function redactDonationMessage(input: {
  id: string;
  nextMessage: string;
  previousMessage: string;
}): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "Donation"
    SET message = ${input.nextMessage},
        "messageOriginal" = COALESCE("messageOriginal", ${input.previousMessage || null})
    WHERE id = ${input.id}
  `;
}

/** Clear public message; keep original for audit when possible. */
export async function clearDonationMessage(input: {
  id: string;
  previousMessage: string;
}): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "Donation"
    SET "messageOriginal" = COALESCE("messageOriginal", ${input.previousMessage || null}),
        message = NULL,
        "creatorReply" = NULL,
        "creatorReplyAt" = NULL,
        "commentHidden" = false
    WHERE id = ${input.id}
  `;
}
