-- =============================================================================
-- רק פרטי — 0001: extensions and enum types
-- =============================================================================
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- Roles for staff. Regular users have NO row in user_roles.
create type public.user_role as enum ('super_admin', 'moderator', 'support', 'data_manager', 'analyst');

create type public.account_status as enum ('active', 'warned', 'suspended', 'blocked', 'deleted');
create type public.review_level as enum ('standard', 'strict');

create type public.listing_status as enum (
  'draft',            -- seller is still editing
  'pending_review',   -- submitted, waiting for moderation
  'needs_correction', -- moderator asked for changes
  'active',           -- approved and public
  'paused',           -- hidden by seller or moderator
  'rejected',         -- moderator rejected
  'sold',             -- seller marked as sold
  'expired',          -- passed expires_at
  'removed'           -- removed by seller/moderator (soft delete)
);

create type public.fuel_type as enum ('petrol', 'diesel', 'hybrid', 'plug_in_hybrid', 'electric', 'lpg', 'other');
create type public.transmission_type as enum ('automatic', 'manual', 'other');
create type public.body_style as enum ('sedan', 'hatchback', 'suv', 'crossover', 'station_wagon', 'coupe', 'convertible', 'mpv', 'minivan', 'pickup', 'other');
create type public.vehicle_condition as enum ('excellent', 'very_good', 'good', 'fair', 'needs_repair');
create type public.ownership_type as enum ('private', 'leasing', 'rental', 'company', 'other');

create type public.moderation_action_type as enum (
  'approve', 'reject', 'request_correction', 'pause', 'unpause', 'remove', 'restore',
  'flag', 'unflag', 'note',
  'warn_user', 'suspend_user', 'block_user', 'reinstate_user', 'set_review_level', 'set_listing_limit',
  'appeal_received', 'appeal_accepted', 'appeal_rejected'
);
create type public.flag_type as enum (
  'duplicate_plate', 'duplicate_image', 'similar_description', 'listing_frequency',
  'related_accounts', 'user_report', 'limit_exceeded', 'dealer_pattern', 'manual'
);
create type public.flag_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
create type public.report_reason as enum ('suspected_dealer', 'wrong_info', 'sold_already', 'scam', 'offensive', 'duplicate', 'other');
create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
create type public.appeal_status as enum ('open', 'accepted', 'rejected');
create type public.notification_type as enum (
  'listing_approved', 'listing_rejected', 'listing_needs_correction', 'listing_paused', 'listing_removed',
  'new_inquiry', 'listing_expiring', 'listing_expired', 'price_reduced', 'saved_search_match',
  'security', 'account', 'system'
);
create type public.data_status as enum ('available', 'partial', 'not_found', 'needs_review', 'unavailable', 'not_configured');
create type public.provider_kind as enum (
  'government_vehicle', 'government_history', 'government_recalls',
  'commercial_valuation', 'commercial_history', 'sms', 'email', 'analytics'
);
create type public.provider_status as enum ('configured', 'not_configured', 'error', 'disabled');
create type public.sync_status as enum ('running', 'succeeded', 'failed');
create type public.consent_type as enum ('terms', 'privacy', 'private_seller_declaration', 'contact_sharing', 'marketing');
create type public.contact_channel as enum ('phone', 'whatsapp');
create type public.valuation_source_type as enum ('internal_listings', 'commercial_provider', 'government');
create type public.confidence_level as enum ('none', 'low', 'medium', 'high');
create type public.image_status as enum ('uploading', 'ready', 'rejected');
create type public.history_record_type as enum ('test_mileage', 'ownership_change', 'registration', 'other');
