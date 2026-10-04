-- Supabase security hardening for Prisma-only access.
-- Run: npm run db:security
--
-- Enables RLS on all public tables so PostgREST (anon/authenticated) cannot
-- read or write data. The app uses Prisma with the postgres role, which
-- bypasses RLS. No permissive policies are added.
--
-- Also see: prisma/sql/pot-covers-bucket.sql (storage listing)

ALTER TABLE "Fundraiser" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Pot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Donation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BuildingFund" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminUser" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContactMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PotSlugRedirect" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PotPageView" ENABLE ROW LEVEL SECURITY;
