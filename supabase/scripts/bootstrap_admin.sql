-- =============================================================================
-- First-admin bootstrap. Run ONCE from the Supabase SQL editor (service context)
-- after the first staff member has signed in with their phone.
-- Replace the phone number below. Never expose this through the application.
-- =============================================================================
do $$
declare v_user uuid;
begin
  select id into v_user from auth.users where phone = '972500000000';   -- E.164 without '+', as stored by Supabase Auth
  if v_user is null then
    raise exception 'No auth user with that phone. Sign in once first.';
  end if;
  if exists (select 1 from public.user_roles where role = 'super_admin') then
    raise exception 'A super_admin already exists. Grant further roles from /admin/users.';
  end if;
  -- The guard trigger allows this because the SQL editor runs with the service role.
  insert into public.user_roles (user_id, role) values (v_user, 'super_admin');
  insert into public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, after_data)
  values (null, 'service', 'role.bootstrap_super_admin', 'user_roles', v_user::text, jsonb_build_object('role', 'super_admin'));
  raise notice 'super_admin granted to %', v_user;
end $$;
