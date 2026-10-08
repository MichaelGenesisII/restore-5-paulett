import { NextResponse } from "next/server";
import { PotStatus } from "@prisma/client";
import { rejectUnlessCron } from "@/lib/cron-auth";
import { notifyCreatorSeedReminder } from "@/lib/email/creator-notify";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Older than this and the host has clearly moved on; stay quiet. */
const MAX_AGE_DAYS = 7;
const BATCH = 50;

/**
 * Daily: one nudge for fundraisers still waiting on their seed gift a day
 * after they were created.
 */
export async function GET(request: Request) {
  const rejected = rejectUnlessCron(request);
  if (rejected) return rejected;

  const now = Date.now();
  const pots = await prisma.pot.findMany({
    where: {
      status: PotStatus.PENDING,
      seedReminderSentAt: null,
      createdAt: {
        lte: new Date(now - DAY_MS),
        gte: new Date(now - MAX_AGE_DAYS * DAY_MS),
      },
    },
    orderBy: { createdAt: "asc" },
    take: BATCH,
    select: {
      id: true,
      slug: true,
      title: true,
      fundraiser: { select: { email: true, name: true } },
    },
  });

  let sent = 0;
  for (const pot of pots) {
    // Claim first so an overlapping run cannot email twice.
    const claimed = await prisma.pot.updateMany({
      where: { id: pot.id, seedReminderSentAt: null },
      data: { seedReminderSentAt: new Date() },
    });
    if (claimed.count === 0) continue;

    const delivered = await notifyCreatorSeedReminder({
      email: pot.fundraiser.email,
      name: pot.fundraiser.name,
      potTitle: pot.title,
      potSlug: pot.slug,
    });
    if (delivered) {
      sent += 1;
    } else {
      await prisma.pot.update({
        where: { id: pot.id },
        data: { seedReminderSentAt: null },
      });
    }
  }

  console.info(`seed-reminders: sent ${sent} of ${pots.length}`);
  return NextResponse.json({ ok: true, candidates: pots.length, sent });
}
