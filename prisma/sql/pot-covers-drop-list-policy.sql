-- One-shot fix for Advisor: "Public Bucket Allows Listing" on pot-covers.
-- Safe to re-run. Does not change the bucket’s public URL serving.
--
-- Run in Supabase SQL editor, or:
--   npx prisma db execute --file prisma/sql/pot-covers-drop-list-policy.sql --schema prisma/schema.prisma

drop policy if exists "Public read pot covers" on storage.objects;
