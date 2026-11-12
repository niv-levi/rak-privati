-- =============================================================================
-- 0009: Storage buckets and policies
-- Bucket is PRIVATE. Public reads of active listings use server-generated signed URLs
-- cached on listing_images.public_url. Pending/draft images are never public.
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-images', 'listing-images', false, 12000000, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Path convention: listings/<listing_id>/<image_id>.<ext>
create or replace function public.storage_listing_id(p_name text)
returns uuid language sql immutable as $$
  select case when (storage.foldername(p_name))[1] = 'listings' and (storage.foldername(p_name))[2] ~ '^[0-9a-f-]{36}$' then (storage.foldername(p_name))[2]::uuid else null end;
$$;

create policy "listing images: owner upload" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'listing-images'
    and exists (select 1 from public.listings l where l.id = public.storage_listing_id(name) and l.seller_id = auth.uid() and l.status in ('draft','needs_correction','pending_review','active','paused'))
  );
create policy "listing images: owner read" on storage.objects for select to authenticated
  using (bucket_id = 'listing-images' and exists (select 1 from public.listings l where l.id = public.storage_listing_id(name) and l.seller_id = auth.uid()));
create policy "listing images: owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'listing-images' and exists (select 1 from public.listings l where l.id = public.storage_listing_id(name) and l.seller_id = auth.uid()));
create policy "listing images: staff all" on storage.objects for all to authenticated
  using (bucket_id = 'listing-images' and public.is_moderator()) with check (bucket_id = 'listing-images' and public.is_moderator());
