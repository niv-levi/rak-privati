-- =============================================================================
-- 0007: helper functions, business-rule triggers, private-seller enforcement
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Role helpers (SECURITY DEFINER so RLS on user_roles does not recurse)
-- ---------------------------------------------------------------------------
create or replace function public.has_role(p_role public.user_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = p_role);
$$;

create or replace function public.has_any_role(p_roles public.user_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = any (p_roles));
$$;

-- "admin" = any staff role that may see private data; write permissions are narrower.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid());
$$;

create or replace function public.is_moderator()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_any_role(array['super_admin', 'moderator']::public.user_role[]);
$$;

create or replace function public.is_service_role()
returns boolean language sql stable as $$
  select coalesce(current_setting('request.jwt.claim.role', true), (current_setting('request.jwt.claims', true)::jsonb ->> 'role')) = 'service_role'
      or current_user = 'service_role';
$$;

-- Internal SECURITY DEFINER routines set this flag so row guards let them through.
create or replace function public.guards_bypassed()
returns boolean language sql stable as $$
  select coalesce(current_setting('app.bypass_guards', true), '') = 'on';
$$;

create or replace function public.account_is_usable(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = p_user and account_status in ('active', 'warned'));
$$;

-- Settings helper
create or replace function public.get_setting(p_key text)
returns jsonb language sql stable security definer set search_path = public as $$
  select value from public.application_settings where key = p_key;
$$;

create or replace function public.get_setting_int(p_key text, p_default integer)
returns integer language sql stable security definer set search_path = public as $$
  select coalesce((select (value #>> '{}')::integer from public.application_settings where key = p_key), p_default);
$$;

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles','vehicle_makes','vehicle_models','vehicle_trims','listings','listing_private_data','saved_searches','vehicle_data_sources','vehicle_valuation_sources']
  loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Profiles: created from auth.users; phone is mirrored, never client-written
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, phone_e164, phone_verified_at)
  values (new.id, new.phone, case when new.phone_confirmed_at is not null then new.phone_confirmed_at else null end)
  on conflict (id) do update set phone_e164 = excluded.phone_e164, phone_verified_at = coalesce(public.profiles.phone_verified_at, excluded.phone_verified_at);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.handle_auth_user_updated()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
     set phone_e164 = new.phone,
         phone_verified_at = coalesce(phone_verified_at, new.phone_confirmed_at)
   where id = new.id;
  return new;
end $$;

create trigger on_auth_user_updated after update of phone, phone_confirmed_at on auth.users for each row execute function public.handle_auth_user_updated();

-- Users may edit only a safe subset of their profile.
create or replace function public.protect_profile_columns()
returns trigger language plpgsql as $$
begin
  if public.is_service_role() or public.is_moderator() or public.guards_bypassed() then
    return new;
  end if;
  new.phone_e164 := old.phone_e164;
  new.phone_verified_at := old.phone_verified_at;
  new.account_status := old.account_status;
  new.review_level := old.review_level;
  new.max_active_listings := old.max_active_listings;
  new.status_reason := old.status_reason;
  new.status_changed_at := old.status_changed_at;
  return new;
end $$;
create trigger a_protect_profile_columns before update on public.profiles for each row execute function public.protect_profile_columns();

-- ---------------------------------------------------------------------------
-- user_roles: never self-granted. Only super_admin (or service role for bootstrap).
-- ---------------------------------------------------------------------------
create or replace function public.guard_user_roles()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_service_role() then
    return coalesce(new, old);
  end if;
  if not public.has_role('super_admin') then
    raise exception 'ROLE_CHANGE_FORBIDDEN' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' and new.user_id = auth.uid() then
    raise exception 'ROLE_SELF_GRANT_FORBIDDEN' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' then
    new.granted_by := auth.uid();
  end if;
  return coalesce(new, old);
end $$;
create trigger guard_user_roles before insert or update or delete on public.user_roles for each row execute function public.guard_user_roles();

-- ---------------------------------------------------------------------------
-- Immutable tables
-- ---------------------------------------------------------------------------
create or replace function public.reject_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'IMMUTABLE_ROW' using errcode = '42501', hint = tg_table_name || ' rows cannot be modified';
end $$;

create trigger consent_records_immutable before update or delete on public.consent_records for each row execute function public.reject_mutation();
create trigger moderation_actions_immutable before update or delete on public.moderation_actions for each row execute function public.reject_mutation();
create trigger contact_events_immutable before update or delete on public.contact_events for each row execute function public.reject_mutation();

create or replace function public.guard_seller_declaration_update()
returns trigger language plpgsql as $$
begin
  -- Only revocation fields may change.
  if new.user_id <> old.user_id or new.consent_record_id <> old.consent_record_id
     or new.declaration_version <> old.declaration_version or new.declared_at <> old.declared_at then
    raise exception 'IMMUTABLE_ROW' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger seller_declarations_guard before update on public.seller_declarations for each row execute function public.guard_seller_declaration_update();
create trigger seller_declarations_no_delete before delete on public.seller_declarations for each row execute function public.reject_mutation();

-- Audit log: hash chain, append only
create or replace function public.audit_log_chain()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_prev text;
begin
  select row_hash into v_prev from public.audit_logs order by seq desc limit 1;
  new.prev_hash := v_prev;
  new.row_hash := encode(digest(coalesce(v_prev, '') || '|' || coalesce(new.actor_id::text, '') || '|' || new.action || '|' || new.entity_type || '|' || coalesce(new.entity_id, '') || '|' || coalesce(new.before_data::text, '') || '|' || coalesce(new.after_data::text, '') || '|' || new.created_at::text, 'sha256'), 'hex');
  return new;
end $$;
create trigger audit_logs_chain before insert on public.audit_logs for each row execute function public.audit_log_chain();
create trigger audit_logs_immutable before update or delete on public.audit_logs for each row execute function public.reject_mutation();

create or replace function public.write_audit(p_action text, p_entity_type text, p_entity_id text, p_before jsonb, p_after jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, before_data, after_data)
  values (auth.uid(), case when public.is_service_role() then 'service' when public.is_admin() then 'staff' else 'user' end, p_action, p_entity_type, p_entity_id, p_before, p_after);
end $$;

-- ---------------------------------------------------------------------------
-- Rate limiting (DB-backed, usable from server actions via RPC)
-- ---------------------------------------------------------------------------
create or replace function public.check_rate_limit(p_bucket text, p_key text, p_limit integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_count integer; v_key text;
begin
  v_key := encode(digest(p_key, 'sha256'), 'hex');
  delete from public.rate_limit_events where bucket = p_bucket and created_at < now() - make_interval(secs => p_window_seconds * 4);
  select count(*) into v_count from public.rate_limit_events
   where bucket = p_bucket and key_hash = v_key and created_at > now() - make_interval(secs => p_window_seconds);
  if v_count >= p_limit then
    return false;
  end if;
  insert into public.rate_limit_events (bucket, key_hash) values (p_bucket, v_key);
  return true;
end $$;

-- ---------------------------------------------------------------------------
-- Listing lifecycle guards
-- ---------------------------------------------------------------------------
create or replace function public.listing_limit_for(p_user uuid)
returns integer language sql stable security definer set search_path = public as $$
  select coalesce((select max_active_listings from public.profiles where id = p_user), public.get_setting_int('max_active_listings', 2));
$$;

create or replace function public.count_counted_listings(p_user uuid, p_exclude uuid)
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::int from public.listings
   where seller_id = p_user and id is distinct from p_exclude
     and status in ('pending_review', 'needs_correction', 'active', 'paused');
$$;

create or replace function public.guard_listing_changes()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_is_staff boolean := public.is_service_role() or public.is_moderator() or public.guards_bypassed();
  v_allowed boolean;
  v_limit integer;
  v_decl record;
begin
  if tg_op = 'INSERT' then
    if not v_is_staff then
      if new.seller_id <> auth.uid() then
        raise exception 'SELLER_MISMATCH' using errcode = '42501';
      end if;
      if new.status <> 'draft' then
        raise exception 'LISTING_MUST_START_AS_DRAFT' using errcode = '42501';
      end if;
      new.moderated_at := null; new.moderated_by := null; new.published_at := null; new.expires_at := null;
      new.rejection_reason := null; new.correction_notes := null; new.views_count := 0; new.contact_count := 0;
    end if;
    if not public.account_is_usable(new.seller_id) and not v_is_staff then
      raise exception 'ACCOUNT_NOT_ELIGIBLE' using errcode = '42501';
    end if;
    return new;
  end if;

  -- UPDATE
  if not v_is_staff then
    -- Sellers can never touch moderation/ownership columns
    new.seller_id := old.seller_id;
    new.moderated_at := old.moderated_at;
    new.moderated_by := old.moderated_by;
    new.rejection_reason := old.rejection_reason;
    new.correction_notes := old.correction_notes;
    new.views_count := old.views_count;
    new.contact_count := old.contact_count;
    new.expires_at := old.expires_at;
    new.published_at := old.published_at;

    if new.status <> old.status then
      v_allowed := case
        when old.status = 'draft' and new.status in ('pending_review', 'removed') then true
        when old.status = 'needs_correction' and new.status in ('pending_review', 'removed') then true
        when old.status = 'pending_review' and new.status in ('removed') then true
        when old.status = 'active' and new.status in ('paused', 'sold', 'removed') then true
        when old.status = 'paused' and new.status in ('active', 'sold', 'removed') and old.paused_at is not null and old.moderated_by is distinct from old.seller_id then true
        when old.status = 'rejected' and new.status in ('removed') then true
        when old.status = 'expired' and new.status in ('removed') then true
        else false
      end;
      -- A listing paused by a moderator cannot be reactivated by the seller
      if old.status = 'paused' and new.status = 'active' and exists (
        select 1 from public.moderation_actions ma where ma.listing_id = old.id and ma.action = 'pause' and ma.actor_id is distinct from old.seller_id and ma.created_at >= old.paused_at
      ) then
        v_allowed := false;
      end if;
      if not v_allowed then
        raise exception 'LISTING_TRANSITION_FORBIDDEN: % -> %', old.status, new.status using errcode = '42501';
      end if;
      -- Reactivating an expired-by-time listing is not allowed
      if new.status = 'active' and old.expires_at is not null and old.expires_at < now() then
        raise exception 'LISTING_EXPIRED' using errcode = '42501';
      end if;
    end if;
    -- Content of active listings may be edited only for price/description/contact fields; structural vehicle fields are locked
    if old.status = 'active' and new.status = 'active' then
      new.make_id := old.make_id; new.model_id := old.model_id; new.year := old.year; new.plate_hash := old.plate_hash; new.plate_masked := old.plate_masked;
    end if;
  end if;

  -- Transitions to pending_review: declaration + limit checks (apply to everyone except service role)
  if new.status = 'pending_review' and old.status <> 'pending_review' then
    if new.declaration_id is null then
      raise exception 'DECLARATION_REQUIRED' using errcode = '23514';
    end if;
    select * into v_decl from public.seller_declarations where id = new.declaration_id;
    if v_decl is null or v_decl.user_id <> new.seller_id or v_decl.revoked_at is not null then
      raise exception 'DECLARATION_INVALID' using errcode = '23514';
    end if;
    v_limit := public.listing_limit_for(new.seller_id);
    if public.count_counted_listings(new.seller_id, new.id) >= v_limit then
      raise exception 'LISTING_LIMIT_EXCEEDED' using errcode = '23514', hint = v_limit::text;
    end if;
    if new.price is null or new.year is null or new.make_id is null or new.model_id is null or new.mileage_km is null or new.city_id is null then
      raise exception 'LISTING_INCOMPLETE' using errcode = '23514';
    end if;
    if (select count(*) from public.listing_images li where li.listing_id = new.id and li.status = 'ready') < 3 then
      raise exception 'LISTING_NEEDS_PHOTOS' using errcode = '23514';
    end if;
    new.submitted_at := now();
  end if;

  -- Timestamps
  if new.status = 'active' and old.status <> 'active' then
    if new.published_at is null then new.published_at := now(); end if;
    if new.expires_at is null or new.expires_at < now() then
      new.expires_at := now() + make_interval(days => public.get_setting_int('listing_expiry_days', 60));
    end if;
    new.paused_at := null;
  end if;
  if new.status = 'paused' and old.status <> 'paused' then new.paused_at := now(); end if;
  if new.status = 'sold' and old.status <> 'sold' then new.sold_at := now(); end if;
  if new.status = 'removed' and old.status <> 'removed' then new.removed_at := now(); end if;
  if new.status in ('active', 'rejected', 'needs_correction') and old.status = 'pending_review' then
    new.moderated_at := now();
    if new.moderated_by is null and auth.uid() is not null then new.moderated_by := auth.uid(); end if;
  end if;
  -- Price history
  if new.price is distinct from old.price and old.price is not null then
    insert into public.listing_price_history (listing_id, old_price, new_price) values (new.id, old.price, new.price);
    if new.original_price is null then new.original_price := old.price; end if;
    if new.price < old.price then new.price_reduced_at := now(); end if;
  end if;
  return new;
end $$;
create trigger guard_listing_changes before insert or update on public.listings for each row execute function public.guard_listing_changes();

-- Sellers may delete only drafts; everything else is soft-removed.
create or replace function public.guard_listing_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_service_role() or public.is_moderator() then return old; end if;
  if old.status <> 'draft' then
    raise exception 'ONLY_DRAFTS_CAN_BE_DELETED' using errcode = '42501';
  end if;
  return old;
end $$;
create trigger guard_listing_delete before delete on public.listings for each row execute function public.guard_listing_delete();

-- ---------------------------------------------------------------------------
-- Private-seller enforcement: automatic flags (never automatic labelling)
-- ---------------------------------------------------------------------------
create or replace function public.flag_listing(p_listing uuid, p_user uuid, p_type public.flag_type, p_severity int, p_details jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.moderation_flags where listing_id = p_listing and flag_type = p_type and status in ('open', 'reviewing')) then
    return;
  end if;
  insert into public.moderation_flags (listing_id, user_id, flag_type, severity, details) values (p_listing, p_user, p_type, p_severity, p_details);
end $$;

create or replace function public.run_listing_abuse_checks()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_other_sellers int;
  v_recent int;
  v_related int;
  v_similar record;
  v_total_recent int;
begin
  if new.status <> 'pending_review' or old.status = 'pending_review' then
    return new;
  end if;

  -- 1. Same plate advertised by a different account in the last 180 days
  if new.plate_hash is not null then
    select count(distinct seller_id) into v_other_sellers from public.listings
     where plate_hash = new.plate_hash and seller_id <> new.seller_id and id <> new.id and status <> 'removed' and created_at > now() - interval '180 days';
    if v_other_sellers > 0 then
      perform public.flag_listing(new.id, new.seller_id, 'duplicate_plate', 3, jsonb_build_object('other_sellers', v_other_sellers));
    end if;
  end if;

  -- 2. Listing frequency: listings submitted by this seller in the last 30 days
  select count(*) into v_recent from public.listings
   where seller_id = new.seller_id and id <> new.id and submitted_at > now() - interval '30 days';
  if v_recent >= public.get_setting_int('flag_listing_frequency_threshold', 3) then
    perform public.flag_listing(new.id, new.seller_id, 'listing_frequency', 2, jsonb_build_object('submitted_last_30_days', v_recent + 1));
  end if;

  -- 3. Different vehicles over time (dealer pattern): distinct plates in 180 days
  select count(distinct plate_hash) into v_total_recent from public.listings
   where seller_id = new.seller_id and plate_hash is not null and created_at > now() - interval '180 days';
  if v_total_recent >= public.get_setting_int('flag_distinct_vehicles_threshold', 4) then
    perform public.flag_listing(new.id, new.seller_id, 'dealer_pattern', 4, jsonb_build_object('distinct_vehicles_180_days', v_total_recent));
  end if;

  -- 4. Related accounts sharing device/IP signals that also publish
  select count(distinct s2.user_id) into v_related
    from public.account_signals s1
    join public.account_signals s2 on s2.signal_type = s1.signal_type and s2.value_hash = s1.value_hash and s2.user_id <> s1.user_id
    join public.listings l on l.seller_id = s2.user_id and l.status in ('pending_review', 'active', 'paused', 'needs_correction')
   where s1.user_id = new.seller_id and s1.last_seen_at > now() - interval '90 days';
  if v_related >= public.get_setting_int('flag_related_accounts_threshold', 1) then
    perform public.flag_listing(new.id, new.seller_id, 'related_accounts', 3, jsonb_build_object('related_publishing_accounts', v_related));
  end if;

  -- 5. Similar description to another seller's recent listing (pg_trgm)
  if new.description is not null and char_length(new.description) >= 80 then
    select l.id, similarity(l.description, new.description) as sim into v_similar
      from public.listings l
     where l.seller_id <> new.seller_id and l.id <> new.id and l.description is not null
       and l.status in ('pending_review', 'active', 'paused', 'needs_correction')
       and l.created_at > now() - interval '120 days'
       and similarity(l.description, new.description) >= 0.75
     order by sim desc limit 1;
    if v_similar.id is not null then
      perform public.flag_listing(new.id, new.seller_id, 'similar_description', 2, jsonb_build_object('similar_listing_id', v_similar.id, 'similarity', round(v_similar.sim::numeric, 2)));
    end if;
  end if;

  -- 6. Accounts under strict review always get a visible marker for moderators
  if (select review_level from public.profiles where id = new.seller_id) = 'strict' then
    perform public.flag_listing(new.id, new.seller_id, 'manual', 2, jsonb_build_object('reason', 'account_under_strict_review'));
  end if;
  return new;
end $$;
create trigger run_listing_abuse_checks after update of status on public.listings for each row execute function public.run_listing_abuse_checks();

-- Duplicate image detection across accounts
create or replace function public.check_duplicate_image()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_seller uuid; v_other uuid;
begin
  if new.content_hash is null and new.perceptual_hash is null then return new; end if;
  select seller_id into v_seller from public.listings where id = new.listing_id;
  select l.id into v_other
    from public.listing_images li join public.listings l on l.id = li.listing_id
   where li.id <> new.id and l.seller_id <> v_seller and l.status <> 'removed'
     and ((new.content_hash is not null and li.content_hash = new.content_hash)
       or (new.perceptual_hash is not null and li.perceptual_hash = new.perceptual_hash))
   limit 1;
  if v_other is not null then
    perform public.flag_listing(new.listing_id, v_seller, 'duplicate_image', 3, jsonb_build_object('other_listing_id', v_other));
  end if;
  return new;
end $$;
create trigger check_duplicate_image after insert or update of content_hash, perceptual_hash on public.listing_images for each row execute function public.check_duplicate_image();

-- Images may only be attached by the seller while the listing is editable
create or replace function public.guard_listing_images()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_listing record;
begin
  if public.is_service_role() or public.is_moderator() then return coalesce(new, old); end if;
  select seller_id, status into v_listing from public.listings where id = coalesce(new.listing_id, old.listing_id);
  if v_listing.seller_id <> auth.uid() then
    raise exception 'NOT_LISTING_OWNER' using errcode = '42501';
  end if;
  if tg_op in ('INSERT', 'DELETE') and v_listing.status not in ('draft', 'needs_correction', 'pending_review', 'active', 'paused') then
    raise exception 'LISTING_NOT_EDITABLE' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' and (select count(*) from public.listing_images where listing_id = new.listing_id) >= 15 then
    raise exception 'TOO_MANY_IMAGES' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' then
    new.public_url := old.public_url; new.public_url_expires_at := old.public_url_expires_at;
    new.content_hash := old.content_hash; new.perceptual_hash := old.perceptual_hash;
    new.storage_path := old.storage_path; new.listing_id := old.listing_id;
  end if;
  return coalesce(new, old);
end $$;
create trigger guard_listing_images before insert or update or delete on public.listing_images for each row execute function public.guard_listing_images();

-- ---------------------------------------------------------------------------
-- Declarations: revoking a declaration pauses listings pending review
-- ---------------------------------------------------------------------------
create or replace function public.on_declaration_revoked()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.bypass_guards', 'on', true);
  if new.revoked_at is not null and old.revoked_at is null then
    update public.listings set status = 'paused' where declaration_id = new.id and status in ('active', 'pending_review');
    insert into public.moderation_actions (target_user_id, actor_id, action, reason)
    values (new.user_id, auth.uid(), 'pause', 'private_seller_declaration_revoked');
  end if;
  return new;
end $$;
create trigger on_declaration_revoked after update on public.seller_declarations for each row execute function public.on_declaration_revoked();

-- Account status changes pause the user's public listings
create or replace function public.on_account_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.bypass_guards', 'on', true);
  if new.account_status in ('suspended', 'blocked', 'deleted') and old.account_status not in ('suspended', 'blocked', 'deleted') then
    update public.listings set status = 'paused' where seller_id = new.id and status in ('active', 'pending_review');
    new.status_changed_at := now();
  end if;
  return new;
end $$;
create trigger on_account_status_change before update of account_status on public.profiles for each row execute function public.on_account_status_change();

-- ---------------------------------------------------------------------------
-- Expiry job (call from scheduled job / admin)
-- ---------------------------------------------------------------------------
create or replace function public.expire_listings()
returns integer language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  perform set_config('app.bypass_guards', 'on', true);
  with expired as (
    update public.listings set status = 'expired' where status = 'active' and expires_at < now() returning id, seller_id, make_name, model_name
  ), notified as (
    insert into public.notifications (user_id, type, title, body, href)
    select seller_id, 'listing_expired', 'המודעה שלך פגה', coalesce(make_name || ' ' || model_name, 'המודעה') || ' – ניתן לפרסם מחדש מהחשבון שלך.', '/account/listings' from expired returning 1
  )
  select count(*) into v_count from expired;
  return v_count;
end $$;

-- ---------------------------------------------------------------------------
-- Protected contact reveal
-- ---------------------------------------------------------------------------
create or replace function public.reveal_seller_contact(p_listing uuid, p_channel public.contact_channel)
returns table (phone_e164 text, display_name text, contact_hours text)
language plpgsql security definer set search_path = public as $$
declare v_listing record; v_profile record; v_ok boolean;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if not public.account_is_usable(auth.uid()) then
    raise exception 'ACCOUNT_NOT_ELIGIBLE' using errcode = '42501';
  end if;
  select * into v_listing from public.listings where id = p_listing and status = 'active';
  if v_listing is null then
    raise exception 'LISTING_NOT_AVAILABLE' using errcode = 'P0002';
  end if;
  if (p_channel = 'phone' and not v_listing.contact_phone_opt_in) or (p_channel = 'whatsapp' and not v_listing.contact_whatsapp_opt_in) then
    raise exception 'CHANNEL_NOT_AVAILABLE' using errcode = 'P0002';
  end if;
  v_ok := public.check_rate_limit('contact_reveal', auth.uid()::text, public.get_setting_int('contact_reveal_limit_per_hour', 20), 3600);
  if not v_ok then
    raise exception 'RATE_LIMITED' using errcode = '53400';
  end if;
  select p.phone_e164, p.display_name into v_profile from public.profiles p where p.id = v_listing.seller_id;
  if v_profile.phone_e164 is null then
    raise exception 'CONTACT_UNAVAILABLE' using errcode = 'P0002';
  end if;
  insert into public.contact_events (listing_id, requester_id, channel) values (p_listing, auth.uid(), p_channel);
  update public.listings set contact_count = contact_count + 1 where id = p_listing;
  if v_listing.seller_id <> auth.uid() then
    insert into public.notifications (user_id, type, title, body, href)
    values (v_listing.seller_id, 'new_inquiry', 'מישהו התעניין ברכב שלך', 'פרטי הקשר שלך נחשפו למתעניין במודעה ' || coalesce(v_listing.make_name || ' ' || v_listing.model_name, ''), '/account/listings');
  end if;
  return query select v_profile.phone_e164, v_profile.display_name, v_listing.contact_hours;
end $$;

-- View counter (no personal data)
create or replace function public.increment_listing_views(p_listing uuid)
returns void language sql security definer set search_path = public as $$
  update public.listings set views_count = views_count + 1 where id = p_listing and status = 'active';
$$;

-- ---------------------------------------------------------------------------
-- Public seller profile (safe subset)
-- ---------------------------------------------------------------------------
create or replace function public.public_seller_info(p_seller uuid)
returns table (display_name text, phone_verified boolean, declared_private boolean, member_since timestamptz, active_listings integer)
language sql stable security definer set search_path = public as $$
  select
    coalesce(nullif(split_part(coalesce(p.display_name, ''), ' ', 1), ''), 'מוכר פרטי') as display_name,
    p.phone_verified_at is not null as phone_verified,
    exists (select 1 from public.seller_declarations d where d.user_id = p.id and d.revoked_at is null) as declared_private,
    p.created_at as member_since,
    (select count(*)::int from public.listings l where l.seller_id = p.id and l.status = 'active') as active_listings
  from public.profiles p where p.id = p_seller;
$$;

-- ---------------------------------------------------------------------------
-- Marketplace search RPC (combines filters, radius, sorting, pagination)
-- ---------------------------------------------------------------------------
create or replace function public.search_listings(p jsonb)
returns table (
  id uuid, make_name text, model_name text, trim_name text, year int, price int, original_price int, mileage_km int,
  city_name text, district_name text, published_at timestamptz, price_reduced_at timestamptz,
  fuel_type public.fuel_type, transmission public.transmission_type, body_style public.body_style,
  ownership_type public.ownership_type, ownership_count_declared int, engine_cc int, condition public.vehicle_condition,
  seller_id uuid, cover_path text, cover_url text, cover_alt text, has_official_data boolean, distance_km double precision,
  total_count bigint
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_sort text := coalesce(p->>'sort', 'newest');
  v_page int := greatest(coalesce((p->>'page')::int, 1), 1);
  v_size int := least(greatest(coalesce((p->>'page_size')::int, 24), 1), 48);
  v_lat double precision; v_lng double precision; v_radius double precision;
  v_q text := nullif(trim(coalesce(p->>'q', '')), '');
begin
  if p ? 'radius_city_id' and (p->>'radius_km') is not null then
    select c.lat, c.lng into v_lat, v_lng from public.geo_cities c where c.id = (p->>'radius_city_id')::uuid;
    v_radius := (p->>'radius_km')::double precision;
  end if;

  return query
  with base as (
    select l.*,
      c.name_he as city_name_he, d.name_he as district_name_he,
      case when v_lat is not null and c.lat is not null then public.distance_km(v_lat, v_lng, c.lat, c.lng) else null end as dist
    from public.listings l
    left join public.geo_cities c on c.id = l.city_id
    left join public.geo_districts d on d.id = l.district_id
    where l.status = 'active' and (l.expires_at is null or l.expires_at > now())
      and (not (p ? 'make_ids') or l.make_id = any (array(select jsonb_array_elements_text(p->'make_ids'))::uuid[]))
      and (not (p ? 'model_ids') or l.model_id = any (array(select jsonb_array_elements_text(p->'model_ids'))::uuid[]))
      and (not (p ? 'trim_ids') or l.trim_id = any (array(select jsonb_array_elements_text(p->'trim_ids'))::uuid[]))
      and ((p->>'year_min') is null or l.year >= (p->>'year_min')::int)
      and ((p->>'year_max') is null or l.year <= (p->>'year_max')::int)
      and ((p->>'price_min') is null or l.price >= (p->>'price_min')::int)
      and ((p->>'price_max') is null or l.price <= (p->>'price_max')::int)
      and ((p->>'km_min') is null or l.mileage_km >= (p->>'km_min')::int)
      and ((p->>'km_max') is null or l.mileage_km <= (p->>'km_max')::int)
      and ((p->>'owners_max') is null or l.ownership_count_declared <= (p->>'owners_max')::int)
      and ((p->>'engine_min') is null or l.engine_cc >= (p->>'engine_min')::int)
      and ((p->>'engine_max') is null or l.engine_cc <= (p->>'engine_max')::int)
      and (not (p ? 'fuel') or l.fuel_type = any (array(select jsonb_array_elements_text(p->'fuel'))::public.fuel_type[]))
      and (not (p ? 'transmission') or l.transmission = any (array(select jsonb_array_elements_text(p->'transmission'))::public.transmission_type[]))
      and (not (p ? 'body') or l.body_style = any (array(select jsonb_array_elements_text(p->'body'))::public.body_style[]))
      and (not (p ? 'ownership') or l.ownership_type = any (array(select jsonb_array_elements_text(p->'ownership'))::public.ownership_type[]))
      and (not (p ? 'condition') or l.condition = any (array(select jsonb_array_elements_text(p->'condition'))::public.vehicle_condition[]))
      and (not (p ? 'category') or exists (select 1 from public.vehicle_models vm where vm.id = l.model_id and vm.category = any (array(select jsonb_array_elements_text(p->'category')))))
      and (not (p ? 'district_ids') or l.district_id = any (array(select jsonb_array_elements_text(p->'district_ids'))::uuid[]))
      and (not (p ? 'region_ids') or c.region_id = any (array(select jsonb_array_elements_text(p->'region_ids'))::uuid[]))
      and (not (p ? 'city_ids') or l.city_id = any (array(select jsonb_array_elements_text(p->'city_ids'))::uuid[]))
      and ((p->>'recent_days') is null or l.published_at > now() - make_interval(days => (p->>'recent_days')::int))
      and (coalesce((p->>'price_reduced')::boolean, false) = false or l.price_reduced_at is not null)
      and (coalesce((p->>'has_official_data')::boolean, false) = false or l.official_data is not null)
      and (v_q is null or (coalesce(l.make_name,'') || ' ' || coalesce(l.model_name,'') || ' ' || coalesce(l.trim_name,'') || ' ' || coalesce(l.description,'')) ilike '%' || v_q || '%')
  ), filtered as (
    select * from base where v_radius is null or (dist is not null and dist <= v_radius)
  ), counted as (
    select f.*, count(*) over () as total from filtered f
  )
  select
    cn.id, cn.make_name, cn.model_name, cn.trim_name, cn.year, cn.price, cn.original_price, cn.mileage_km,
    cn.city_name_he, cn.district_name_he, cn.published_at, cn.price_reduced_at,
    cn.fuel_type, cn.transmission, cn.body_style, cn.ownership_type, cn.ownership_count_declared, cn.engine_cc, cn.condition,
    cn.seller_id,
    (select li.storage_path from public.listing_images li where li.listing_id = cn.id and li.status = 'ready' order by li.is_cover desc, li.sort_order limit 1) as cover_path,
    (select li.public_url from public.listing_images li where li.listing_id = cn.id and li.status = 'ready' order by li.is_cover desc, li.sort_order limit 1) as cover_url,
    (select li.alt_text from public.listing_images li where li.listing_id = cn.id and li.status = 'ready' order by li.is_cover desc, li.sort_order limit 1) as cover_alt,
    cn.official_data is not null as has_official_data,
    cn.dist,
    cn.total
  from counted cn
  order by
    case when v_sort = 'price_asc' then cn.price end asc,
    case when v_sort = 'price_desc' then cn.price end desc,
    case when v_sort = 'km_asc' then cn.mileage_km end asc,
    case when v_sort = 'year_desc' then cn.year end desc,
    case when v_sort = 'reduced' then cn.price_reduced_at end desc nulls last,
    case when v_sort = 'relevance' and v_q is not null then similarity(coalesce(cn.make_name,'') || ' ' || coalesce(cn.model_name,''), v_q) end desc nulls last,
    cn.published_at desc nulls last, cn.id
  limit v_size offset (v_page - 1) * v_size;
end $$;

-- Internal asking-price comparables for valuation ("מחירי פרסום של מודעות דומות")
create or replace function public.comparable_listings(p_model uuid, p_year int, p_km int, p_window_days int, p_exclude uuid)
returns table (id uuid, price int, year int, mileage_km int, published_at timestamptz, status public.listing_status)
language sql stable security definer set search_path = public as $$
  select l.id, l.price, l.year, l.mileage_km, l.published_at, l.status
    from public.listings l
   where l.model_id = p_model and l.id is distinct from p_exclude
     and l.status in ('active', 'sold', 'expired')
     and abs(l.year - p_year) <= 1
     and (p_km is null or l.mileage_km is null or abs(l.mileage_km - p_km) <= 60000)
     and coalesce(l.published_at, l.created_at) > now() - make_interval(days => p_window_days)
   order by abs(l.year - p_year), coalesce(l.published_at, l.created_at) desc
   limit 60;
$$;

-- Saved-search matching for a newly approved listing (used by notification job)
create or replace function public.notify_saved_search_matches(p_listing uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare v_count int := 0; s record; l record; v_match boolean;
begin
  select * into l from public.listings where id = p_listing and status = 'active';
  if l is null then return 0; end if;
  for s in select * from public.saved_searches where notify and user_id <> l.seller_id loop
    v_match := true;
    if s.query ? 'make_ids' and not (l.make_id::text in (select jsonb_array_elements_text(s.query->'make_ids'))) then v_match := false; end if;
    if v_match and s.query ? 'model_ids' and not (l.model_id::text in (select jsonb_array_elements_text(s.query->'model_ids'))) then v_match := false; end if;
    if v_match and (s.query->>'year_min') is not null and l.year < (s.query->>'year_min')::int then v_match := false; end if;
    if v_match and (s.query->>'year_max') is not null and l.year > (s.query->>'year_max')::int then v_match := false; end if;
    if v_match and (s.query->>'price_max') is not null and l.price > (s.query->>'price_max')::int then v_match := false; end if;
    if v_match and (s.query->>'price_min') is not null and l.price < (s.query->>'price_min')::int then v_match := false; end if;
    if v_match and (s.query->>'km_max') is not null and l.mileage_km > (s.query->>'km_max')::int then v_match := false; end if;
    if v_match and s.query ? 'district_ids' and not (l.district_id::text in (select jsonb_array_elements_text(s.query->'district_ids'))) then v_match := false; end if;
    if v_match and s.query ? 'city_ids' and not (l.city_id::text in (select jsonb_array_elements_text(s.query->'city_ids'))) then v_match := false; end if;
    if v_match then
      insert into public.notifications (user_id, type, title, body, href, metadata)
      values (s.user_id, 'saved_search_match', 'רכב חדש שמתאים לחיפוש השמור שלך', coalesce(l.make_name || ' ' || l.model_name || ' ' || l.year::text, 'מודעה חדשה') || ' – ' || s.name, '/cars/' || l.id, jsonb_build_object('saved_search_id', s.id, 'listing_id', l.id));
      update public.saved_searches set last_notified_at = now() where id = s.id;
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end $$;

-- When a listing becomes active, notify saved searches + seller
create or replace function public.on_listing_activated()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'active' and old.status = 'pending_review' then
    insert into public.notifications (user_id, type, title, body, href)
    values (new.seller_id, 'listing_approved', 'המודעה שלך אושרה ופורסמה', coalesce(new.make_name || ' ' || new.model_name, 'המודעה') || ' מופיעה עכשיו בלוח.', '/cars/' || new.id);
    perform public.notify_saved_search_matches(new.id);
  elsif new.status = 'rejected' and old.status = 'pending_review' then
    insert into public.notifications (user_id, type, title, body, href)
    values (new.seller_id, 'listing_rejected', 'המודעה שלך לא אושרה', coalesce(new.rejection_reason, 'ניתן לעיין בפרטים ולהגיש ערעור מהחשבון שלך.'), '/account/listings');
  elsif new.status = 'needs_correction' and old.status = 'pending_review' then
    insert into public.notifications (user_id, type, title, body, href)
    values (new.seller_id, 'listing_needs_correction', 'נדרש תיקון במודעה', coalesce(new.correction_notes, 'יש לעדכן את המודעה ולשלוח אותה שוב לבדיקה.'), '/account/listings/' || new.id || '/edit');
  elsif new.status = 'active' and old.status = 'active' and new.price < old.price then
    insert into public.notifications (user_id, type, title, body, href, metadata)
    select f.user_id, 'price_reduced', 'ירידת מחיר ברכב ששמרת', coalesce(new.make_name || ' ' || new.model_name, 'רכב') || ' – המחיר ירד.', '/cars/' || new.id, jsonb_build_object('listing_id', new.id, 'old', old.price, 'new', new.price)
      from public.favorites f where f.listing_id = new.id and f.user_id <> new.seller_id;
  end if;
  return new;
end $$;
create trigger on_listing_activated after update on public.listings for each row execute function public.on_listing_activated();

-- Users reporting a listing creates a moderator flag
create or replace function public.on_listing_report()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.flag_listing(new.listing_id, (select seller_id from public.listings where id = new.listing_id), 'user_report', case when new.reason = 'suspected_dealer' then 3 else 2 end, jsonb_build_object('report_id', new.id, 'reason', new.reason));
  return new;
end $$;
create trigger on_listing_report after insert on public.listing_reports for each row execute function public.on_listing_report();

-- Account deletion (self-service): anonymize + mark deleted; auth user removed by server job
create or replace function public.request_account_deletion()
returns void language plpgsql security definer set search_path = public as $$
begin
  perform set_config('app.bypass_guards', 'on', true);
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  update public.listings set status = 'removed' where seller_id = auth.uid() and status not in ('removed');
  delete from public.favorites where user_id = auth.uid();
  delete from public.saved_searches where user_id = auth.uid();
  delete from public.recently_viewed where user_id = auth.uid();
  delete from public.saved_vehicle_reports where user_id = auth.uid();
  delete from public.notifications where user_id = auth.uid();
  update public.profiles set account_status = 'deleted', display_name = null, city_id = null, notification_prefs = '{}'::jsonb, status_reason = 'self_service_deletion', status_changed_at = now() where id = auth.uid();
  perform public.write_audit('account.delete_requested', 'profile', auth.uid()::text, null, null);
end $$;
