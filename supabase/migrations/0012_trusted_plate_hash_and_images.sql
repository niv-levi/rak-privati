-- =============================================================================
-- 0012: Close dealer-detection bypasses reachable through the public API
--  1. listings.plate_hash / plate_masked are computed in the database from
--     listing_private_data.plate_number with a salt the API cannot read.
--     Sellers can no longer write these columns directly.
--  2. listing_images rows can only be created by the server (service role) after
--     the upload route has processed the file and computed its hashes.
--  3. Non-private ownership types raise a moderation flag at submission.
-- =============================================================================
create schema if not exists private;
revoke all on schema private from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on schema private from anon, authenticated;
  end if;
end $$;

create table if not exists private.secrets (
  key text primary key,
  value text not null
);
insert into private.secrets (key, value) values ('plate_salt', encode(gen_random_bytes(32), 'hex')) on conflict (key) do nothing;

create or replace function public.compute_plate_hash(p_plate text)
returns text language sql stable security definer set search_path = public, private as $$
  select encode(hmac('plate:' || p_plate, (select value from private.secrets where key = 'plate_salt'), 'sha256'), 'hex');
$$;
revoke execute on function public.compute_plate_hash(text) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function public.compute_plate_hash(text) from anon, authenticated;
    grant execute on function public.compute_plate_hash(text) to service_role;
  end if;
end $$;

create or replace function public.mask_plate(p_plate text)
returns text language sql immutable as $$
  select case length(p_plate)
    when 7 then '••-•••-' || right(p_plate, 2)
    when 8 then '•••-••-•' || right(p_plate, 2)
    else '•••' end;
$$;

-- Keep listings.plate_hash in sync with the private plate (only path that sets it).
create or replace function public.sync_listing_plate()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.bypass_guards', 'on', true);
  if tg_op = 'DELETE' then
    update public.listings set plate_hash = null, plate_masked = null where id = old.listing_id;
    perform set_config('app.bypass_guards', '', true);
    return old;
  end if;
  update public.listings set plate_hash = public.compute_plate_hash(new.plate_number), plate_masked = public.mask_plate(new.plate_number) where id = new.listing_id;
  perform set_config('app.bypass_guards', '', true);
  return new;
end $$;
drop trigger if exists sync_listing_plate on public.listing_private_data;
create trigger sync_listing_plate after insert or update of plate_number or delete on public.listing_private_data for each row execute function public.sync_listing_plate();

-- Plate may only change while the listing is editable.
create or replace function public.guard_listing_private_data()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_status public.listing_status;
begin
  if public.is_service_role() or public.is_moderator() or public.guards_bypassed() then return coalesce(new, old); end if;
  select status into v_status from public.listings where id = coalesce(new.listing_id, old.listing_id);
  if v_status not in ('draft', 'needs_correction') then
    raise exception 'PLATE_LOCKED' using errcode = '42501';
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists guard_listing_private_data on public.listing_private_data;
create trigger guard_listing_private_data before insert or update or delete on public.listing_private_data for each row execute function public.guard_listing_private_data();

-- Sellers cannot write plate_hash / plate_masked directly.
create or replace function public.lock_listing_plate_columns()
returns trigger language plpgsql as $$
begin
  if public.is_service_role() or public.is_moderator() or public.guards_bypassed() then return new; end if;
  if tg_op = 'INSERT' then
    new.plate_hash := null; new.plate_masked := null;
  else
    new.plate_hash := old.plate_hash; new.plate_masked := old.plate_masked;
  end if;
  return new;
end $$;
drop trigger if exists a_lock_listing_plate_columns on public.listings;
create trigger a_lock_listing_plate_columns before insert or update on public.listings for each row execute function public.lock_listing_plate_columns();

-- Backfill existing rows with trusted hashes
update public.listings l set plate_hash = public.compute_plate_hash(p.plate_number), plate_masked = public.mask_plate(p.plate_number)
  from public.listing_private_data p where p.listing_id = l.id;

-- Images: no direct inserts from user sessions; reads/updates/deletes of own rows remain.
drop policy if exists listing_images_own on public.listing_images;
create policy listing_images_own_select on public.listing_images for select using (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()));
create policy listing_images_own_update on public.listing_images for update using (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid())) with check (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()));
create policy listing_images_own_delete on public.listing_images for delete using (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()));

-- Non-private ownership raises a review flag (never an automatic label)
create or replace function public.flag_non_private_ownership()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_official text;
begin
  if new.status <> 'pending_review' or old.status = 'pending_review' then return new; end if;
  v_official := new.official_data #>> '{registration,ownershipType,value}';
  if new.ownership_type in ('leasing', 'rental', 'company') or (v_official is not null and v_official !~ 'פרטי') then
    perform public.flag_listing(new.id, new.seller_id, 'manual', 2, jsonb_build_object('reason', 'non_private_ownership', 'declared', new.ownership_type, 'official', v_official));
  end if;
  return new;
end $$;
drop trigger if exists flag_non_private_ownership on public.listings;
create trigger flag_non_private_ownership after update of status on public.listings for each row execute function public.flag_non_private_ownership();

-- Image cap applies to every role, including the server upload path.
create or replace function public.enforce_image_cap()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.listing_images where listing_id = new.listing_id) >= 15 then
    raise exception 'TOO_MANY_IMAGES' using errcode = '23514';
  end if;
  return new;
end $$;
drop trigger if exists enforce_image_cap on public.listing_images;
create trigger enforce_image_cap before insert on public.listing_images for each row execute function public.enforce_image_cap();
