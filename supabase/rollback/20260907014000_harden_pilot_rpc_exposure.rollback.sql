begin;

drop policy if exists pilot_server_sessions_deny_all on private.pilot_server_sessions;
drop policy if exists pilot_login_attempts_deny_all on private.pilot_login_attempts;
drop policy if exists pilot_login_identities_deny_all on private.pilot_login_identities;

drop function if exists public.pilot_workspace_command(text, text, text, jsonb, uuid);
drop function if exists public.pilot_my_context();
alter function private.pilot_workspace_command(text, text, text, jsonb, uuid) set schema public;
alter function private.pilot_my_context() set schema public;

revoke all on function public.pilot_workspace_command(text, text, text, jsonb, uuid) from public, anon;
revoke all on function public.pilot_my_context() from public, anon;
grant execute on function public.pilot_workspace_command(text, text, text, jsonb, uuid) to authenticated;
grant execute on function public.pilot_my_context() to authenticated;

commit;
