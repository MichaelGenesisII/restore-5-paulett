-- Drop unused RestorationUpdate table (model removed from Prisma schema).
-- Safe if the table was never populated. Run after schema push, or alone:
--   npx prisma db execute --file prisma/sql/drop-restoration-update.sql --schema prisma/schema.prisma
-- Then re-run npm run db:security if needed.

DROP TABLE IF EXISTS "RestorationUpdate";
