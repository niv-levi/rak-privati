-- =============================================================================
-- 0004: listings, images, price history, favorites, saved searches, views, contacts, reports
-- =============================================================================

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users (id) on delete cascade,
  status public.listing_status not null default 'draft',
  declaration_id uuid references public.seller_declarations (id),
  -- Vehicle identity (full plate lives in listing_private_data; only hash + masked tail here)
  plate_hash text,                                  -- sha256(normalized plate + app salt)
  plate_masked text,                                -- e.g. "••-•••-67"
  make_id uuid references public.vehicle_makes (id),
  model_id uuid references public.vehicle_models (id),
  trim_id uuid references public.vehicle_trims (id),
  make_name text,
  model_name text,
  trim_name text,
  year integer check (year between 1980 and extract(year from now())::int + 1),
  first_registration_date date,
  mileage_km integer check (mileage_km between 0 and 2000000),         -- declared by seller
  test_mileage_km integer check (test_mileage_km between 0 and 2000000),-- last official test, if available
  test_mileage_date date,
  ownership_count_declared integer check (ownership_count_declared between 1 and 20),
  ownership_type public.ownership_type,
  fuel_type public.fuel_type,
  transmission public.transmission_type,
  engine_cc integer check (engine_cc between 0 and 10000),
  body_style public.body_style,
  color text,
  -- Location
  city_id uuid references public.geo_cities (id),
  district_id uuid references public.geo_districts (id),
  neighborhood text,
  -- Sale
  price integer check (price between 1000 and 5000000),
  original_price integer,
  condition public.vehicle_condition,
  maintenance_history text check (char_length(maintenance_history) <= 2000),
  accident_declared boolean,
  accident_details text check (char_length(accident_details) <= 1000),
  body_repairs_declared boolean,
  body_repair_details text check (char_length(body_repair_details) <= 1000),
  equipment text[] not null default '{}',
  description text check (char_length(description) <= 4000),
  -- Contact preferences (seller opt-in; phone itself stays in profiles)
  contact_phone_opt_in boolean not null default false,
  contact_whatsapp_opt_in boolean not null default false,
  contact_hours text check (char_length(contact_hours) <= 120),
  -- Official data snapshot with source attribution (never replaces seller declarations)
  official_data jsonb,
  official_data_fetched_at timestamptz,
  discrepancy_notes text check (char_length(discrepancy_notes) <= 1000),
  lookup_result_id uuid,
  -- Lifecycle
  wizard_step smallint not null default 1,
  submitted_at timestamptz,
  moderated_at timestamptz,
  moderated_by uuid references auth.users (id) on delete set null,
  rejection_reason text,
  correction_notes text,
  published_at timestamptz,
  expires_at timestamptz,
  sold_at timestamptz,
  paused_at timestamptz,
  removed_at timestamptz,
  price_reduced_at timestamptz,
  views_count integer not null default 0,
  contact_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index listings_seller_idx on public.listings (seller_id, status);
create index listings_status_published_idx on public.listings (status, published_at desc) where status = 'active';
create index listings_search_idx on public.listings (make_id, model_id, year, price, mileage_km) where status = 'active';
create index listings_city_idx on public.listings (city_id) where status = 'active';
create index listings_district_idx on public.listings (district_id) where status = 'active';
create index listings_plate_hash_idx on public.listings (plate_hash) where plate_hash is not null;
create index listings_description_trgm on public.listings using gin (description gin_trgm_ops);
create index listings_expires_idx on public.listings (expires_at) where status = 'active';

-- Full plate and anything else that must never reach public readers.
create table public.listing_private_data (
  listing_id uuid primary key references public.listings (id) on delete cascade,
  plate_number text not null check (plate_number ~ '^[0-9]{7,8}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  bucket text not null default 'listing-images',
  storage_path text not null unique,
  sort_order integer not null default 0,
  is_cover boolean not null default false,
  width integer,
  height integer,
  bytes integer check (bytes between 0 and 15000000),
  mime_type text check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/avif')),
  content_hash text,                      -- sha256 of the optimized file (exact duplicate detection)
  perceptual_hash text,                   -- dHash hex (near-duplicate detection)
  alt_text text check (char_length(alt_text) <= 200),
  status public.image_status not null default 'uploading',
  public_url text,                        -- cached signed URL for active listings
  public_url_expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index listing_images_listing_idx on public.listing_images (listing_id, sort_order);
create index listing_images_content_hash_idx on public.listing_images (content_hash) where content_hash is not null;
create index listing_images_phash_idx on public.listing_images (perceptual_hash) where perceptual_hash is not null;
create unique index listing_images_one_cover_idx on public.listing_images (listing_id) where is_cover;

create table public.listing_price_history (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  old_price integer,
  new_price integer not null,
  changed_at timestamptz not null default now()
);
create index listing_price_history_listing_idx on public.listing_price_history (listing_id, changed_at desc);

create table public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);
create index favorites_listing_idx on public.favorites (listing_id);

create table public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  query jsonb not null default '{}'::jsonb,
  query_string text not null default '',
  notify boolean not null default true,
  last_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index saved_searches_user_idx on public.saved_searches (user_id);
create index saved_searches_notify_idx on public.saved_searches (notify) where notify;

create table public.recently_viewed (
  user_id uuid not null references auth.users (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create table public.contact_events (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  requester_id uuid references auth.users (id) on delete set null,
  channel public.contact_channel not null,
  ip_hash text,
  created_at timestamptz not null default now()
);
create index contact_events_listing_idx on public.contact_events (listing_id, created_at desc);
create index contact_events_requester_idx on public.contact_events (requester_id, created_at desc);

create table public.listing_reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  reporter_id uuid references auth.users (id) on delete set null,
  reason public.report_reason not null,
  details text check (char_length(details) <= 2000),
  status public.report_status not null default 'open',
  resolved_by uuid references auth.users (id) on delete set null,
  resolved_at timestamptz,
  resolution_notes text,
  ip_hash text,
  created_at timestamptz not null default now()
);
create index listing_reports_status_idx on public.listing_reports (status, created_at desc);
create index listing_reports_listing_idx on public.listing_reports (listing_id);

-- Comparison sets are client-side (localStorage); no table needed.
