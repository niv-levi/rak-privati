-- 0010: contact form messages (support/accessibility/legal)
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  topic text not null check (topic in ('support', 'accessibility', 'privacy', 'report_dealer', 'legal', 'other')),
  name text check (char_length(name) <= 80),
  email text check (char_length(email) <= 160),
  phone text check (char_length(phone) <= 20),
  message text not null check (char_length(message) between 10 and 4000),
  ip_hash text,
  status text not null default 'open' check (status in ('open', 'answered', 'closed')),
  handled_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index contact_messages_status_idx on public.contact_messages (status, created_at desc);
alter table public.contact_messages enable row level security;
create policy contact_messages_insert on public.contact_messages for insert with check (user_id is null or user_id = auth.uid());
create policy contact_messages_staff on public.contact_messages for all using (public.is_admin()) with check (public.is_admin());
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant insert on public.contact_messages to anon, authenticated;
    grant select, update on public.contact_messages to authenticated;
    grant all on public.contact_messages to service_role;
  end if;
end $$;
