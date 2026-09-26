-- Public cover images for fundraising pots.
-- Run in the Supabase SQL editor (or create the bucket in Dashboard → Storage).
--
-- Public buckets serve files by URL without a SELECT policy on storage.objects.
-- A broad SELECT policy (bucket_id only) also allows *listing* every object —
-- Supabase Advisors flag that. Uploads go through this app with the service role
-- (bypasses RLS); do not add anon INSERT policies.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pot-covers',
  'pot-covers',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Remove listing-capable public SELECT if it was created by an older script.
drop policy if exists "Public read pot covers" on storage.objects;
