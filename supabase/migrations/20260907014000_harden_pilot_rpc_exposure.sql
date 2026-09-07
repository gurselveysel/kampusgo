-- Advisor hardening: ayrıcalıklı gövdeler API'ye açık olmayan private şemaya
-- taşınır; public RPC adları yalnız SECURITY INVOKER sarmalayıcıdır.

alter function public.pilot_my_context() set schema private;
alter function public.pilot_workspace_command(text, text, text, jsonb, uuid) set schema private;

revoke all on function private.pilot_my_context() from public, anon;
revoke all on function private.pilot_workspace_command(text, text, text, jsonb, uuid) from public, anon;
grant execute on function private.pilot_my_context() to authenticated;
grant execute on function private.pilot_workspace_command(text, text, text, jsonb, uuid) to authenticated;

create function public.pilot_my_context()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$ select private.pilot_my_context(); $$;

create function public.pilot_workspace_command(
  p_route_slug text,
  p_role_key text,
  p_command text,
  p_payload jsonb,
  p_idempotency_key uuid
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.pilot_workspace_command(
    p_route_slug, p_role_key, p_command, p_payload, p_idempotency_key
  );
$$;

revoke all on function public.pilot_my_context() from public, anon;
revoke all on function public.pilot_workspace_command(text, text, text, jsonb, uuid) from public, anon;
grant execute on function public.pilot_my_context() to authenticated;
grant execute on function public.pilot_workspace_command(text, text, text, jsonb, uuid) to authenticated;

create policy pilot_login_identities_deny_all on private.pilot_login_identities
for all to public using (false) with check (false);
create policy pilot_login_attempts_deny_all on private.pilot_login_attempts
for all to public using (false) with check (false);
create policy pilot_server_sessions_deny_all on private.pilot_server_sessions
for all to public using (false) with check (false);
