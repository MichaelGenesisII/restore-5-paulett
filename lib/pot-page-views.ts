import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { TrafficRow } from "@/lib/pot-analytics";

export async function insertPotPageView(input: {
  potId: string;
  visitorKey: string;
  country: string | null;
  referrerHost: string | null;
  device: string;
  src: string | null;
}): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO "PotPageView" (
      id, "potId", "viewedAt", day, "visitorKey", country, "referrerHost", device, src
    ) VALUES (
      ${randomUUID()},
      ${input.potId},
      NOW(),
      (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date,
      ${input.visitorKey},
      ${input.country},
      ${input.referrerHost},
      ${input.device},
      ${input.src}
    )
  `;
}

/** Dedupe: skip if same visitor viewed this pot in the last 20 minutes. */
export async function recentlyViewed(
  potId: string,
  visitorKey: string,
): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "PotPageView"
    WHERE "potId" = ${potId}
      AND "visitorKey" = ${visitorKey}
      AND "viewedAt" > NOW() - INTERVAL '20 minutes'
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function loadPotPageViews(
  potId: string,
  sinceDays = 90,
): Promise<TrafficRow[]> {
  const rows = await prisma.$queryRaw<
    Array<{
      viewedAt: Date;
      day: Date;
      visitorKey: string;
      country: string | null;
      referrerHost: string | null;
      device: string;
      src: string | null;
    }>
  >`
    SELECT "viewedAt", day, "visitorKey", country, "referrerHost", device, src
    FROM "PotPageView"
    WHERE "potId" = ${potId}
      AND "viewedAt" > NOW() - (${sinceDays} * INTERVAL '1 day')
    ORDER BY "viewedAt" ASC
  `;
  return rows;
}

export async function countPageViewsByPotIds(
  potIds: string[],
  sinceDays: number,
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (potIds.length === 0) return map;

  const rows = await prisma.$queryRaw<
    Array<{ potId: string; count: bigint }>
  >`
    SELECT "potId", COUNT(*)::bigint AS count
    FROM "PotPageView"
    WHERE "potId" IN (${Prisma.join(potIds)})
      AND "viewedAt" > NOW() - (${sinceDays} * INTERVAL '1 day')
    GROUP BY "potId"
  `;
  for (const row of rows) {
    map.set(row.potId, Number(row.count));
  }
  return map;
}
