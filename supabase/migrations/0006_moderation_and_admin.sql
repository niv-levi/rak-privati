-- =============================================================================
-- 0006: moderation, appeals, notifications, audit, settings, rate limits, analytics
-- =============================================================================

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings (id) on delete set null,
  target_user_id uuid references auth.users (id) on delete set null,
  actor_id uuid references auth.users (id) on delete set null,   -- null = system
  action public.moderation_action_type not null,
  reason text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index moderation_actions_listing_idx on public.moderation_actions (listing_id, created_at desc);
create index moderation_actions_user_idx on public.moderation_actions (target_user_id, created_at desc);
comment on table public.moderation_actions is 'Append-only moderation history.';

create table public.moderation_flags (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  flag_type public.flag_type not null,
  severity smallint not null default 1 check (severity between 1 and 5),
  status public.flag_status not null default 'open',
  details jsonb not null default '{}'::jsonb,
  resolved_by uuid references auth.users (id) on delete set null,
  resolved_at timestamptz,
  resolution text,
  created_at timestamptz not null default now()
);
create index moderation_flags_open_idx on public.moderation_flags (status, created_at desc);
create index moderation_flags_listing_idx on public.moderation_flags (listing_id);
create index moderation_flags_user_idx on public.moderation_flags (user_id);

create table public.appeals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  listing_id uuid references public.listings (id) on delete set null,
  moderation_action_id uuid references public.moderation_actions (id) on delete set null,
  message text not null check (char_length(message) between 10 and 2000),
  status public.appeal_status not null default 'open',
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  decision_notes text,
  created_at timestamptz not null default now()
);
create index appeals_status_idx on public.appeals (status, created_at desc);
create index appeals_user_idx on public.appeals (user_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text,
  href text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity,
  actor_id uuid,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  ip_hash text,
  prev_hash text,
  row_hash text,
  created_at timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);
comment on table public.audit_logs is 'Tamper-evident append-only log (hash chain).';

create table public.application_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.rate_limit_events (
  id bigint generated always as identity primary key,
  bucket text not null,
  key_hash text not null,
  created_at timestamptz not null default now()
);
create index rate_limit_events_lookup_idx on public.rate_limit_events (bucket, key_hash, created_at desc);

create table public.account_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  signal_type text not null check (signal_type in ('ip', 'device')),
  value_hash text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, signal_type, value_hash)
);
create index account_signals_value_idx on public.account_signals (signal_type, value_hash);
comment on table public.account_signals is 'Salted hashes only, used to detect related accounts. Retention: 90 days.';

create table public.analytics_events (
  id bigint generated always as identity primary key,
  event_name text not null,
  user_hash text,                           -- salted hash of user id (not reversible)
  session_hash text,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index analytics_events_name_idx on public.analytics_events (event_name, created_at desc);
