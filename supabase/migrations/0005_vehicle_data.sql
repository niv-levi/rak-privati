-- =============================================================================
-- 0005: vehicle data sources, lookups, history, recalls, valuations
-- =============================================================================

create table public.vehicle_data_sources (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,                    -- e.g. 'gov_il_vehicles'
  name_he text not null,
  name_en text not null,
  provider_kind public.provider_kind not null,
  source_url text,
  dataset_name text,
  license_info text,
  usage_permission text,                       -- human-readable statement of permitted use
  supported_data_types text[] not null default '{}',
  status public.provider_status not null default 'not_configured',
  config jsonb not null default '{}'::jsonb,   -- non-secret configuration only
  adapter_version text,
  enabled boolean not null default true,
  last_success_at timestamptz,
  last_error text,
  last_error_at timestamptz,
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vehicle_data_sync_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.vehicle_data_sources (id) on delete cascade,
  status public.sync_status not null default 'running',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  rows_processed integer not null default 0,
  error text,
  notes text,
  triggered_by uuid references auth.users (id) on delete set null
);
create index vehicle_data_sync_runs_source_idx on public.vehicle_data_sync_runs (source_id, started_at desc);

create table public.vehicle_lookup_requests (
  id uuid primary key default gen_random_uuid(),
  plate_hash text not null,
  plate_masked text not null,
  requested_by uuid references auth.users (id) on delete set null,
  ip_hash text,
  purpose text check (purpose in ('check', 'sell')),
  status public.data_status not null default 'unavailable',
  duration_ms integer,
  created_at timestamptz not null default now()
);
create index vehicle_lookup_requests_user_idx on public.vehicle_lookup_requests (requested_by, created_at desc);
create index vehicle_lookup_requests_plate_idx on public.vehicle_lookup_requests (plate_hash, created_at desc);

create table public.vehicle_lookup_results (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.vehicle_lookup_requests (id) on delete set null,
  plate_hash text not null,
  plate_number text not null check (plate_number ~ '^[0-9]{7,8}$'),  -- visible only to owner/admin via RLS
  report jsonb not null,                         -- normalized VehicleReport (fields with attribution)
  overall_status public.data_status not null,
  sources_used jsonb not null default '[]'::jsonb,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  owner_id uuid references auth.users (id) on delete cascade
);
create index vehicle_lookup_results_plate_idx on public.vehicle_lookup_results (plate_hash, fetched_at desc);
create index vehicle_lookup_results_owner_idx on public.vehicle_lookup_results (owner_id, fetched_at desc);

alter table public.listings add constraint listings_lookup_result_fk foreign key (lookup_result_id) references public.vehicle_lookup_results (id) on delete set null;

create table public.saved_vehicle_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lookup_result_id uuid not null references public.vehicle_lookup_results (id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  unique (user_id, lookup_result_id)
);

create table public.vehicle_history_records (
  id uuid primary key default gen_random_uuid(),
  plate_hash text not null,
  source_id uuid not null references public.vehicle_data_sources (id) on delete cascade,
  record_type public.history_record_type not null,
  record_date date,
  value_numeric numeric,
  value_text text,
  raw jsonb,
  fetched_at timestamptz not null default now(),
  source_updated_at timestamptz
);
create index vehicle_history_records_plate_idx on public.vehicle_history_records (plate_hash, record_type, record_date desc);

create table public.vehicle_recalls (
  id uuid primary key default gen_random_uuid(),
  plate_hash text,
  make_name text,
  model_name text,
  year_from integer,
  year_to integer,
  recall_code text,
  title text not null,
  description text,
  source_id uuid references public.vehicle_data_sources (id) on delete set null,
  published_at date,
  raw jsonb,
  fetched_at timestamptz not null default now()
);
create index vehicle_recalls_plate_idx on public.vehicle_recalls (plate_hash) where plate_hash is not null;

create table public.vehicle_valuation_sources (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name_he text not null,
  source_type public.valuation_source_type not null,
  status public.provider_status not null default 'not_configured',
  config jsonb not null default '{"min_comparables": 5, "window_days": 120}'::jsonb,
  priority integer not null default 100,
  enabled boolean not null default true,
  label_he text not null,                       -- e.g. 'מחירי פרסום של מודעות דומות'
  disclaimer_he text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vehicle_valuations (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid references auth.users (id) on delete set null,
  listing_id uuid references public.listings (id) on delete set null,
  source_id uuid references public.vehicle_valuation_sources (id) on delete set null,
  input jsonb not null,
  result jsonb not null,
  estimated_low integer,
  estimated_mid integer,
  estimated_high integer,
  confidence public.confidence_level not null default 'none',
  comparable_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index vehicle_valuations_listing_idx on public.vehicle_valuations (listing_id, created_at desc);
create index vehicle_valuations_user_idx on public.vehicle_valuations (requested_by, created_at desc);
