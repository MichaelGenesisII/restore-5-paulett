-- After `prisma db push` adds Donation.totalsApplied / subscriptionCancelledAt:
-- mark existing succeeded gifts so retries do not double-count wall totals.
UPDATE "Donation"
SET "totalsApplied" = true
WHERE status = 'SUCCEEDED'
  AND "totalsApplied" = false;
