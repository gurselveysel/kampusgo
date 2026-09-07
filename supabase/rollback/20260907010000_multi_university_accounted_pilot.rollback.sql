-- Yalnız bu migration'ın eklediği yüzeyi kaldırır. Legacy profiles,
-- organizations, roles, user_roles ve private.has_role korunur.
begin;

revoke execute on function public.pilot_workspace_command(text, text, text, jsonb, uuid) from authenticated;
revoke execute on function public.pilot_workspace_snapshot(text, text) from authenticated;
revoke execute on function public.pilot_my_context() from authenticated;

drop function if exists public.pilot_broker_revoke_session(text);
drop function if exists public.pilot_broker_refresh_session(text, text, text, timestamptz);
drop function if exists public.pilot_broker_get_session(text);
drop function if exists public.pilot_broker_create_session(text, uuid, text, text, timestamptz, timestamptz, text, text);
drop function if exists public.pilot_broker_clear_attempt(text);
drop function if exists public.pilot_broker_consume_attempt(text, integer);
drop function if exists public.pilot_broker_login_lookup(text);
drop function if exists public.pilot_workspace_command(text, text, text, jsonb, uuid);
drop function if exists public.pilot_workspace_snapshot(text, text);
drop function if exists public.pilot_my_context();
drop function if exists private.pilot_workspace_command(text, text, text, jsonb, uuid);
drop function if exists private.pilot_my_context();

drop view if exists public.pilot_my_cases;
drop view if exists public.pilot_my_catalog;

drop table if exists public.pilot_command_receipts;
drop table if exists public.pilot_admin_access_checks;
drop table if exists public.pilot_integration_dry_runs;
drop table if exists public.pilot_finance_dry_runs;
drop table if exists public.pilot_account_credentials;
drop table if exists public.pilot_account_case_actions;
drop table if exists public.pilot_account_cases;
drop table if exists public.pilot_account_catalog;
drop table if exists public.pilot_institutional_rules;
drop table if exists public.pilot_workspace_settings;

drop function if exists private.pilot_has_scope(uuid, uuid, text);
drop function if exists private.pilot_has_any_role(uuid, uuid, text[]);
drop function if exists private.pilot_active_membership(uuid, uuid);

drop table if exists private.pilot_server_sessions;
drop table if exists private.pilot_login_attempts;
drop table if exists private.pilot_login_identities;
drop table if exists public.organization_memberships;

revoke usage on schema private from authenticated;

commit;
