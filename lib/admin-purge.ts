import { DonationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Non-succeeded gift attempts older than this are eligible for purge. */
export const STALE_DONATION_DAYS = 90;

const unfinishedStatuses = [
  DonationStatus.PENDING,
  DonationStatus.FAILED,
] as const;

export function staleDonationCutoff(now = new Date()): Date {
  return new Date(
    now.getTime() - STALE_DONATION_DAYS * 24 * 60 * 60 * 1000,
  );
}

export async function countStaleDonations(cutoff = staleDonationCutoff()) {
  return prisma.donation.count({
    where: {
      status: { in: [...unfinishedStatuses] },
      createdAt: { lt: cutoff },
    },
  });
}

/** Pending/failed still inside the 90-day window (visible on Gifts, not purgeable yet). */
export async function countRecentUnfinishedDonations(
  cutoff = staleDonationCutoff(),
) {
  return prisma.donation.count({
    where: {
      status: { in: [...unfinishedStatuses] },
      createdAt: { gte: cutoff },
    },
  });
}

/**
 * Deletes PENDING / FAILED donations older than 90 days.
 * Succeeded and refunded rows are never removed.
 */
export async function purgeStaleDonations(cutoff = staleDonationCutoff()) {
  const result = await prisma.donation.deleteMany({
    where: {
      status: { in: [...unfinishedStatuses] },
      createdAt: { lt: cutoff },
    },
  });
  return {
    deleted: result.count,
    olderThanDays: STALE_DONATION_DAYS,
    cutoff: cutoff.toISOString(),
  };
}
