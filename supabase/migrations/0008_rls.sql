-- =============================================================================
-- 0008: Row Level Security
-- Principles: deny by default; public sees only active listings & reference data;
-- users see/manage their own rows; staff by role; privileged writes via service role.
-- =============================================================================

-- Reference data: readable by everyone, writable by data managers / super admins
do $$
declare t text;
begin
  foreach t in array array['vehicle_makes','vehicle_models','vehicle_trims','vehicle_catalog_aliases','geo_districts','geo_regions','geo_cities','policy_versions']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%s_public_read" on public.%I for select using (true)', t, t);
    execute format('create policy "%s_staff_write" on public.%I for all using (public.has_any_role(array[''super_admin'',''data_manager'']::public.user_role[])) with check (public.has_any_role(array[''super_admin'',''data_manager'']::public.user_role[]))', t, t);
  end loop;
end $$;

alter table public.catalog_import_runs enable row level security;
create policy catalog_import_runs_staff on public.catalog_import_runs for all using (public.has_any_role(array['super_admin','data_manager']::public.user_role[])) with check (public.has_any_role(array['super_admin','data_manager']::public.user_role[]));

-- Profiles
alter table public.profiles enable row level security;
create policy profiles_select_own on public.profiles for select using (id = auth.uid());
create policy profiles_select_staff on public.profiles for select using (public.is_admin());
create policy profiles_update_own on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_update_staff on public.profiles for update using (public.is_moderator()) with check (public.is_moderator());
-- inserts happen only through the auth trigger (security definer)

-- Roles: readable by self and staff; writes guarded by trigger + policy (super_admin only)
alter table public.user_roles enable row level security;
create policy user_roles_select_own on public.user_roles for select using (user_id = auth.uid());
create policy user_roles_select_staff on public.user_roles for select using (public.is_admin());
create policy user_roles_write_super on public.user_roles for all using (public.has_role('super_admin')) with check (public.has_role('super_admin'));

-- Consents & declarations: users insert their own, read their own; staff read
alter table public.consent_records enable row level security;
create policy consent_records_insert_own on public.consent_records for insert with check (user_id = auth.uid());
create policy consent_records_select_own on public.consent_records for select using (user_id = auth.uid());
create policy consent_records_select_staff on public.consent_records for select using (public.is_admin());

alter table public.seller_declarations enable row level security;
create policy seller_declarations_insert_own on public.seller_declarations for insert with check (user_id = auth.uid() and exists (select 1 from public.consent_records c where c.id = consent_record_id and c.user_id = auth.uid() and c.granted and c.consent_type = 'private_seller_declaration'));
create policy seller_declarations_select_own on public.seller_declarations for select using (user_id = auth.uid());
create policy seller_declarations_select_staff on public.seller_declarations for select using (public.is_admin());
create policy seller_declarations_revoke_own on public.seller_declarations for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy seller_declarations_update_staff on public.seller_declarations for update using (public.is_moderator()) with check (public.is_moderator());

-- Listings
alter table public.listings enable row level security;
create policy listings_public_active on public.listings for select using (status = 'active' and (expires_at is null or expires_at > now()));
create policy listings_select_own on public.listings for select using (seller_id = auth.uid());
create policy listings_select_staff on public.listings for select using (public.is_admin());
create policy listings_insert_own on public.listings for insert with check (seller_id = auth.uid() and public.account_is_usable(auth.uid()));
create policy listings_update_own on public.listings for update using (seller_id = auth.uid() and status in ('draft','needs_correction','pending_review','active','paused','rejected','expired')) with check (seller_id = auth.uid());
create policy listings_update_staff on public.listings for update using (public.is_moderator()) with check (public.is_moderator());
create policy listings_delete_own_draft on public.listings for delete using (seller_id = auth.uid() and status = 'draft');
create policy listings_delete_staff on public.listings for delete using (public.has_role('super_admin'));

alter table public.listing_private_data enable row level security;
create policy listing_private_own on public.listing_private_data for all using (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid())) with check (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()));
create policy listing_private_staff on public.listing_private_data for select using (public.is_moderator());

alter table public.listing_images enable row level security;
create policy listing_images_public on public.listing_images for select using (status = 'ready' and exists (select 1 from public.listings l where l.id = listing_id and l.status = 'active'));
create policy listing_images_own on public.listing_images for all using (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid())) with check (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()));
create policy listing_images_staff on public.listing_images for all using (public.is_moderator()) with check (public.is_moderator());

alter table public.listing_price_history enable row level security;
create policy listing_price_history_public on public.listing_price_history for select using (exists (select 1 from public.listings l where l.id = listing_id and (l.status = 'active' or l.seller_id = auth.uid())) or public.is_admin());

alter table public.favorites enable row level security;
create policy favorites_own on public.favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.saved_searches enable row level security;
create policy saved_searches_own on public.saved_searches for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.recently_viewed enable row level security;
create policy recently_viewed_own on public.recently_viewed for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.contact_events enable row level security;
create policy contact_events_select_requester on public.contact_events for select using (requester_id = auth.uid());
create policy contact_events_select_seller on public.contact_events for select using (exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()));
create policy contact_events_select_staff on public.contact_events for select using (public.is_admin());
-- inserts only via reveal_seller_contact() (security definer)

alter table public.listing_reports enable row level security;
create policy listing_reports_insert on public.listing_reports for insert with check ((reporter_id = auth.uid() or reporter_id is null) and exists (select 1 from public.listings l where l.id = listing_id and l.status = 'active'));
create policy listing_reports_select_own on public.listing_reports for select using (reporter_id = auth.uid());
create policy listing_reports_staff on public.listing_reports for all using (public.is_moderator()) with check (public.is_moderator());
create policy listing_reports_select_support on public.listing_reports for select using (public.is_admin());

-- Vehicle data
alter table public.vehicle_data_sources enable row level security;
create policy vehicle_data_sources_public_read on public.vehicle_data_sources for select using (true);
create policy vehicle_data_sources_staff_write on public.vehicle_data_sources for all using (public.has_any_role(array['super_admin','data_manager']::public.user_role[])) with check (public.has_any_role(array['super_admin','data_manager']::public.user_role[]));

alter table public.vehicle_data_sync_runs enable row level security;
create policy vehicle_data_sync_runs_staff on public.vehicle_data_sync_runs for all using (public.is_admin()) with check (public.has_any_role(array['super_admin','data_manager']::public.user_role[]));

alter table public.vehicle_lookup_requests enable row level security;
create policy vehicle_lookup_requests_own on public.vehicle_lookup_requests for select using (requested_by = auth.uid());
create policy vehicle_lookup_requests_staff on public.vehicle_lookup_requests for select using (public.is_admin());
-- inserts by server (service role) only

alter table public.vehicle_lookup_results enable row level security;
create policy vehicle_lookup_results_own on public.vehicle_lookup_results for select using (owner_id = auth.uid());
create policy vehicle_lookup_results_saved on public.vehicle_lookup_results for select using (exists (select 1 from public.saved_vehicle_reports s where s.lookup_result_id = id and s.user_id = auth.uid()));
create policy vehicle_lookup_results_staff on public.vehicle_lookup_results for select using (public.is_moderator());

alter table public.saved_vehicle_reports enable row level security;
create policy saved_vehicle_reports_own on public.saved_vehicle_reports for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.vehicle_history_records enable row level security;
create policy vehicle_history_records_staff on public.vehicle_history_records for select using (public.is_admin());

alter table public.vehicle_recalls enable row level security;
create policy vehicle_recalls_public on public.vehicle_recalls for select using (plate_hash is null);
create policy vehicle_recalls_staff on public.vehicle_recalls for select using (public.is_admin());

alter table public.vehicle_valuation_sources enable row level security;
create policy vehicle_valuation_sources_public on public.vehicle_valuation_sources for select using (true);
create policy vehicle_valuation_sources_staff on public.vehicle_valuation_sources for all using (public.has_any_role(array['super_admin','data_manager']::public.user_role[])) with check (public.has_any_role(array['super_admin','data_manager']::public.user_role[]));

alter table public.vehicle_valuations enable row level security;
create policy vehicle_valuations_own on public.vehicle_valuations for select using (requested_by = auth.uid());
create policy vehicle_valuations_staff on public.vehicle_valuations for select using (public.is_admin());

-- Moderation
alter table public.moderation_actions enable row level security;
create policy moderation_actions_staff_read on public.moderation_actions for select using (public.is_admin());
create policy moderation_actions_staff_insert on public.moderation_actions for insert with check (public.is_moderator() and actor_id = auth.uid());
create policy moderation_actions_target_read on public.moderation_actions for select using (target_user_id = auth.uid() or exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid()));

alter table public.moderation_flags enable row level security;
create policy moderation_flags_staff on public.moderation_flags for all using (public.is_admin()) with check (public.is_moderator());

alter table public.appeals enable row level security;
create policy appeals_insert_own on public.appeals for insert with check (user_id = auth.uid());
create policy appeals_select_own on public.appeals for select using (user_id = auth.uid());
create policy appeals_staff on public.appeals for all using (public.is_admin()) with check (public.is_moderator());

alter table public.notifications enable row level security;
create policy notifications_select_own on public.notifications for select using (user_id = auth.uid());
create policy notifications_update_own on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete_own on public.notifications for delete using (user_id = auth.uid());

alter table public.audit_logs enable row level security;
create policy audit_logs_staff_read on public.audit_logs for select using (public.has_any_role(array['super_admin','analyst']::public.user_role[]));

alter table public.application_settings enable row level security;
create policy application_settings_staff_read on public.application_settings for select using (public.is_admin());
create policy application_settings_super_write on public.application_settings for all using (public.has_role('super_admin')) with check (public.has_role('super_admin'));

alter table public.rate_limit_events enable row level security;        -- no policies: only security definer functions touch it
alter table public.account_signals enable row level security;
create policy account_signals_staff_read on public.account_signals for select using (public.is_moderator());
alter table public.analytics_events enable row level security;
create policy analytics_events_analyst_read on public.analytics_events for select using (public.has_any_role(array['super_admin','analyst']::public.user_role[]));

-- Public-safe listing projection (no plate, no seller contact)
create view public.public_listings with (security_invoker = true) as
select l.id, l.make_id, l.model_id, l.trim_id, l.make_name, l.model_name, l.trim_name, l.year, l.first_registration_date,
       l.mileage_km, l.test_mileage_km, l.test_mileage_date, l.ownership_count_declared, l.ownership_type, l.fuel_type, l.transmission,
       l.engine_cc, l.body_style, l.color, l.city_id, l.district_id, l.neighborhood, l.price, l.original_price, l.condition,
       l.maintenance_history, l.accident_declared, l.accident_details, l.body_repairs_declared, l.body_repair_details, l.equipment,
       l.description, l.contact_phone_opt_in, l.contact_whatsapp_opt_in, l.contact_hours, l.official_data, l.official_data_fetched_at,
       l.discrepancy_notes, l.published_at, l.expires_at, l.price_reduced_at, l.plate_masked, l.seller_id, l.status, l.views_count
  from public.listings l
 where l.status = 'active';

-- Grants (Supabase default roles)
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant usage on schema public to anon, authenticated, service_role;
    grant select on all tables in schema public to anon, authenticated;
    grant insert, update, delete on all tables in schema public to authenticated;
    grant all on all tables in schema public to service_role;
    grant all on all sequences in schema public to service_role;
    grant usage on all sequences in schema public to authenticated;
    grant execute on all functions in schema public to anon, authenticated, service_role;
    -- Functions that only the server may call
    revoke execute on function public.expire_listings() from anon, authenticated;
    revoke execute on function public.notify_saved_search_matches(uuid) from anon, authenticated;
    revoke execute on function public.write_audit(text, text, text, jsonb, jsonb) from anon;
    revoke execute on function public.check_rate_limit(text, text, integer, integer) from anon;
  end if;
end $$;
