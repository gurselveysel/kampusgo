-- Paylaşılan pilot DB'de sentetik hesaplarla negatif RLS/grant testi.
-- Tek transaction içinde çalışır; üyelik/rol iptal denemeleri ROLLBACK edilir.
begin;

do $$
begin
  if exists (
    select 1 from information_schema.table_privileges
    where grantee = 'anon'
      and table_schema = 'public'
      and table_name in (
        'organization_memberships','pilot_workspace_settings','pilot_institutional_rules',
        'pilot_account_catalog','pilot_account_cases','pilot_account_case_actions',
        'pilot_account_credentials','pilot_finance_dry_runs','pilot_integration_dry_runs',
        'pilot_admin_access_checks','pilot_command_receipts'
      )
  ) then raise exception 'ANON_NEW_TABLE_GRANT_FOUND'; end if;

  if has_table_privilege('authenticated', 'public.profiles', 'UPDATE')
     or has_column_privilege('authenticated', 'public.profiles', 'organization_id', 'UPDATE')
     or has_column_privilege('authenticated', 'public.profiles', 'is_active', 'UPDATE') then
    raise exception 'LEGACY_PROFILE_UPDATE_WIDENED';
  end if;

  if (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where ((n.nspname = 'public' and c.relname in (
        'organization_memberships','pilot_workspace_settings','pilot_institutional_rules',
        'pilot_account_catalog','pilot_account_cases','pilot_account_case_actions',
        'pilot_account_credentials','pilot_finance_dry_runs','pilot_integration_dry_runs',
        'pilot_admin_access_checks','pilot_command_receipts'))
        or (n.nspname = 'private' and c.relname in ('pilot_login_identities','pilot_login_attempts','pilot_server_sessions')))
        and c.relrowsecurity and c.relforcerowsecurity) <> 14 then
    raise exception 'RLS_FORCE_COVERAGE_FAILED';
  end if;

  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'pilot_my_catalog'
      and c.reloptions @> array['security_invoker=true']
  ) then raise exception 'SECURITY_INVOKER_VIEW_MISSING'; end if;
end $$;

select set_config('request.jwt.claim.sub', (
  select user_id::text from private.pilot_login_identities where normalized_username = 'gazi.ogrenci'
), true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('pilot.test.gazi_org', (select id::text from public.organizations where slug = 'gazi'), true);
set local role authenticated;

do $$
declare snapshot jsonb;
begin
  if (select count(*) from public.organization_memberships) <> 1 then raise exception 'STUDENT_MEMBERSHIP_SCOPE_FAILED'; end if;
  if (select count(*) from public.pilot_account_catalog) <> 3 then raise exception 'STUDENT_CATALOG_SCOPE_FAILED'; end if;
  if exists (select 1 from public.pilot_account_cases where owner_user_id <> (select auth.uid())) then raise exception 'OTHER_OWNER_CASE_VISIBLE'; end if;
  if exists (select 1 from public.pilot_account_cases where organization_id <> current_setting('pilot.test.gazi_org')::uuid) then raise exception 'CROSS_ORG_CASE_VISIBLE'; end if;

  snapshot := public.pilot_workspace_snapshot('gazi', 'ogrenci');
  if jsonb_array_length(snapshot->'catalog') <> 3 then raise exception 'VALID_SNAPSHOT_FAILED'; end if;

  begin
    perform public.pilot_workspace_snapshot('dpu', 'ogrenci');
    raise exception 'CROSS_ORG_RPC_ALLOWED';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.pilot_workspace_snapshot('gazi', 'mali-isler');
    raise exception 'UNASSIGNED_ROLE_RPC_ALLOWED';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.profiles set organization_id = gen_random_uuid(), is_active = true where id = (select auth.uid());
    raise exception 'PROFILE_SELF_ESCALATION_ALLOWED';
  exception
    when insufficient_privilege then null;
    when sqlstate '42P17' then null; -- Legacy profiles_self_or_admin_update recursion; işlem yine reddedilir.
  end;

  begin
    update public.organization_memberships set status = 'active' where user_id = (select auth.uid());
    raise exception 'MEMBERSHIP_SELF_UPDATE_ALLOWED';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
update public.organization_memberships
set status = 'inactive'
where user_id = (select user_id from private.pilot_login_identities where normalized_username = 'gazi.ogrenci')
  and organization_id = (select id from public.organizations where slug = 'gazi');
set local role authenticated;
do $$
begin
  begin
    perform public.pilot_workspace_snapshot('gazi', 'ogrenci');
    raise exception 'REVOKED_MEMBERSHIP_STILL_ACTIVE';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
update public.organization_memberships
set status = 'active'
where user_id = (select user_id from private.pilot_login_identities where normalized_username = 'gazi.ogrenci')
  and organization_id = (select id from public.organizations where slug = 'gazi');
delete from public.user_roles
where user_id = (select user_id from private.pilot_login_identities where normalized_username = 'gazi.ogrenci')
  and organization_id = (select id from public.organizations where slug = 'gazi');
set local role authenticated;
do $$
begin
  begin
    perform public.pilot_workspace_snapshot('gazi', 'ogrenci');
    raise exception 'REMOVED_ROLE_STILL_ACTIVE';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
rollback;

select 'PASS' as accounted_pilot_security;
