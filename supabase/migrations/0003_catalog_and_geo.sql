-- =============================================================================
-- 0003: vehicle catalog and Israeli geography
-- =============================================================================

create table public.vehicle_makes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_he text not null,
  name_en text not null,
  gov_code integer,                          -- tozeret_cd from the Ministry of Transport dataset, when known
  is_popular boolean not null default false,
  sort_order integer not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vehicle_models (
  id uuid primary key default gen_random_uuid(),
  make_id uuid not null references public.vehicle_makes (id) on delete cascade,
  parent_model_id uuid references public.vehicle_models (id) on delete set null,   -- submodel support
  slug text not null,
  name_he text not null,
  name_en text not null,
  body_style public.body_style,
  category text,                              -- e.g. 'city', 'family', 'suv', 'executive', 'electric'
  generation text,
  year_from integer,
  year_to integer,
  is_popular boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (make_id, slug)
);
create index vehicle_models_make_idx on public.vehicle_models (make_id, active);

create table public.vehicle_trims (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.vehicle_models (id) on delete cascade,
  name_he text not null,
  name_en text,
  engine_cc integer check (engine_cc between 0 and 10000),
  fuel_type public.fuel_type,
  transmission public.transmission_type,
  body_style public.body_style,
  year_from integer,
  year_to integer,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index vehicle_trims_model_idx on public.vehicle_trims (model_id);

create table public.vehicle_catalog_aliases (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('make', 'model')),
  entity_id uuid not null,
  alias text not null,
  source text,
  created_at timestamptz not null default now(),
  unique (entity_type, alias)
);
create index vehicle_catalog_aliases_alias_trgm on public.vehicle_catalog_aliases using gin (alias gin_trgm_ops);

create table public.catalog_import_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  file_name text,
  rows_received integer not null default 0,
  rows_inserted integer not null default 0,
  rows_updated integer not null default 0,
  rows_skipped integer not null default 0,
  status public.sync_status not null default 'running',
  error text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

-- Flat catalog view used by search/forms
create view public.vehicle_catalog with (security_invoker = true) as
select
  m.id as make_id, m.slug as make_slug, m.name_he as make_name_he, m.name_en as make_name_en, m.is_popular as make_popular,
  mo.id as model_id, mo.slug as model_slug, mo.name_he as model_name_he, mo.name_en as model_name_en,
  mo.body_style, mo.category, mo.generation, mo.year_from, mo.year_to, mo.is_popular as model_popular,
  t.id as trim_id, t.name_he as trim_name_he, t.engine_cc, t.fuel_type, t.transmission
from public.vehicle_makes m
join public.vehicle_models mo on mo.make_id = m.id and mo.active
left join public.vehicle_trims t on t.model_id = mo.id and t.active
where m.active;

-- ---------------------------------------------------------------------------
-- Geography: district (מחוז) -> region/sub-district (נפה) -> city/locality (יישוב)
-- ---------------------------------------------------------------------------
create table public.geo_districts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_he text not null,
  name_en text not null,
  sort_order integer not null default 100
);

create table public.geo_regions (
  id uuid primary key default gen_random_uuid(),
  district_id uuid not null references public.geo_districts (id) on delete cascade,
  code text not null unique,
  name_he text not null,
  name_en text not null,
  sort_order integer not null default 100
);

create table public.geo_cities (
  id uuid primary key default gen_random_uuid(),
  region_id uuid references public.geo_regions (id) on delete set null,
  district_id uuid not null references public.geo_districts (id) on delete cascade,
  cbs_code integer unique,                     -- סמל יישוב (CBS locality code), when known
  name_he text not null,
  name_en text,
  lat double precision check (lat between 29 and 34),
  lng double precision check (lng between 34 and 36),
  is_major boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (district_id, name_he)
);
create index geo_cities_name_trgm on public.geo_cities using gin (name_he gin_trgm_ops);
create index geo_cities_region_idx on public.geo_cities (region_id);

alter table public.profiles add constraint profiles_city_fk foreign key (city_id) references public.geo_cities (id) on delete set null;

-- Haversine distance in km (no PostGIS dependency)
create or replace function public.distance_km(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision language sql immutable parallel safe as $$
  select 2 * 6371 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;
