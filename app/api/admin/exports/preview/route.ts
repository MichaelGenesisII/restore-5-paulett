import { NextResponse } from "next/server";
import {
  DonationStatus,
  type Prisma,
} from "@prisma/client";
import {
  isAdminAuthFailure,
  requireAdmin,
} from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function parseDateBound(value: string | null, endOfDay: boolean): Date | null {
  if (!value?.trim()) return null;
  const d = new Date(value.trim());
  if (Number.isNaN(d.getTime())) return null;
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    d.setUTCHours(23, 59, 59, 999);
  }
  return d;
}

function dateWhere(from: Date | null, to: Date | null): Prisma.DonationWhereInput {
  if (!from && !to) return {};
  const createdAt: Prisma.DateTimeFilter = {};
  if (from) createdAt.gte = from;
  if (to) createdAt.lte = to;
  return { createdAt };
}

/** Row counts for each export kind in the selected date range. */
export async function GET(request: Request) {
  const session = await requireAdmin(request);
  if (isAdminAuthFailure(session)) return session;

  const url = new URL(request.url);
  const from = parseDateBound(url.searchParams.get("from"), false);
  const to = parseDateBound(url.searchParams.get("to"), true);
  const base = dateWhere(from, to);

  const [giftAid, succeeded, attempts] = await Promise.all([
    prisma.donation.count({
      where: {
        ...base,
        status: DonationStatus.SUCCEEDED,
        giftAid: true,
      },
    }),
    prisma.donation.count({
      where: {
        ...base,
        status: DonationStatus.SUCCEEDED,
      },
    }),
    prisma.donation.count({ where: base }),
  ]);

  return NextResponse.json({
    from: from?.toISOString() ?? null,
    to: to?.toISOString() ?? null,
    counts: {
      "gift-aid": giftAid,
      succeeded,
      attempts,
    },
  });
}
