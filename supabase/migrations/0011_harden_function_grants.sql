-- =============================================================================
-- 0011: Security hardening of SECURITY DEFINER helpers (found in internal review)
--  * write_audit: only staff / service may write audit entries (users could forge entries)
--  * check_rate_limit, flag_listing: internal only (users could exhaust others' quotas / create flags)
--  * listing_limit_for / count_counted_listings: own user or staff only (no enumeration of others)
-- =============================================================================
-- True for maintenance sessions (SQL editor / migrations) that did not SET ROLE to an API role.
-- NOTE: current_user cannot be used here because SECURITY DEFINER switches it to the owner.
create or replace function public.is_privileged_session()
returns boolean language sql stable as $$
  select coalesce(nullif(current_setting('role', true), ''), 'none') not in ('anon', 'authenticated');
$$;

create or replace function public.write_audit(p_action text, p_entity_type text, p_entity_id text, p_before jsonb, p_after jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_service_role() or public.is_admin() or public.is_privileged_session()) then
    raise exception 'AUDIT_WRITE_FORBIDDEN' using errcode = '42501';
  end if;
  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, before_data, after_data)
  values (auth.uid(), case when public.is_admin() then 'staff' else 'service' end, p_action, p_entity_type, p_entity_id, p_before, p_after);
end $$;

create or replace function public.listing_limit_for(p_user uuid)
returns integer language plpgsql stable security definer set search_path = public as $$
begin
  if p_user is distinct from auth.uid() and not (public.is_service_role() or public.is_admin() or public.guards_bypassed() or public.is_privileged_session()) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return coalesce((select max_active_listings from public.profiles where id = p_user), public.get_setting_int('max_active_listings', 2));
end $$;

create or replace function public.count_counted_listings(p_user uuid, p_exclude uuid)
returns integer language plpgsql stable security definer set search_path = public as $$
begin
  if p_user is distinct from auth.uid() and not (public.is_service_role() or public.is_admin() or public.is_privileged_session()) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return (select count(*)::int from public.listings
           where seller_id = p_user and id is distinct from p_exclude
             and status in ('pending_review', 'needs_correction', 'active', 'paused'));
end $$;

create or replace function public.request_account_deletion()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  perform set_config('app.bypass_guards', 'on', true);
  update public.listings set status = 'removed' where seller_id = auth.uid() and status not in ('removed');
  delete from public.favorites where user_id = auth.uid();
  delete from public.saved_searches where user_id = auth.uid();
  delete from public.recently_viewed where user_id = auth.uid();
  delete from public.saved_vehicle_reports where user_id = auth.uid();
  delete from public.notifications where user_id = auth.uid();
  update public.profiles set account_status = 'deleted', display_name = null, city_id = null, notification_prefs = '{}'::jsonb, status_reason = 'self_service_deletion', status_changed_at = now() where id = auth.uid();
  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id) values (auth.uid(), 'user', 'account.delete_requested', 'profile', auth.uid()::text);
end $$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function public.write_audit(text, text, text, jsonb, jsonb) from anon, public;
    revoke execute on function public.check_rate_limit(text, text, integer, integer) from anon, authenticated, public;
    revoke execute on function public.flag_listing(uuid, uuid, public.flag_type, integer, jsonb) from anon, authenticated, public;
    revoke execute on function public.listing_limit_for(uuid) from anon, public;
    revoke execute on function public.count_counted_listings(uuid, uuid) from anon, public;
    revoke execute on function public.request_account_deletion() from anon, public;
    revoke execute on function public.reveal_seller_contact(uuid, public.contact_channel) from anon, public;
    grant execute on function public.write_audit(text, text, text, jsonb, jsonb) to authenticated, service_role;
    grant execute on function public.check_rate_limit(text, text, integer, integer) to service_role;
    grant execute on function public.flag_listing(uuid, uuid, public.flag_type, integer, jsonb) to service_role;
    grant execute on function public.listing_limit_for(uuid) to authenticated, service_role;
    grant execute on function public.count_counted_listings(uuid, uuid) to authenticated, service_role;
    grant execute on function public.request_account_deletion() to authenticated;
    grant execute on function public.reveal_seller_contact(uuid, public.contact_channel) to authenticated;
  end if;
end $$;
