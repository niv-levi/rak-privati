-- =============================================================================
-- 0002: profiles, roles, policy versions, consent records, seller declarations
-- =============================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) between 2 and 60),
  phone_e164 text unique,                     -- written by trigger from auth.users; never by the client
  phone_verified_at timestamptz,
  city_id uuid,                               -- fk added after geo tables exist
  account_status public.account_status not null default 'active',
  review_level public.review_level not null default 'standard',
  max_active_listings integer check (max_active_listings between 0 and 50), -- admin override, null = global default
  notification_prefs jsonb not null default '{"in_app": true, "email": false, "sms_important": true, "saved_search": true}'::jsonb,
  marketing_consent_at timestamptz,
  status_reason text,
  status_changed_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'One row per auth user. Phone is copied from auth.users by trigger.';

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.user_role not null,
  granted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create table public.policy_versions (
  id uuid primary key default gen_random_uuid(),
  policy_type public.consent_type not null,
  version text not null,
  title text not null,
  summary text,
  content_hash text,                           -- sha256 of the published document text
  effective_from timestamptz not null default now(),
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  unique (policy_type, version)
);
create unique index policy_versions_one_current_idx on public.policy_versions (policy_type) where is_current;

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  consent_type public.consent_type not null,
  policy_version_id uuid references public.policy_versions (id),
  version text not null,
  granted boolean not null,
  granted_at timestamptz not null default now(),
  ip_hash text,                                -- salted hash only; stored only when legally justified & disclosed
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index consent_records_user_idx on public.consent_records (user_id, consent_type, granted_at desc);
comment on table public.consent_records is 'Append-only. Each row is an immutable consent event.';

create table public.seller_declarations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  consent_record_id uuid not null references public.consent_records (id),
  declaration_version text not null,
  declaration_text_hash text,
  declared_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_reason text,
  created_at timestamptz not null default now()
);
create index seller_declarations_user_idx on public.seller_declarations (user_id, declared_at desc);
comment on table public.seller_declarations is 'Private-seller declaration events. Immutable except revocation fields.';
