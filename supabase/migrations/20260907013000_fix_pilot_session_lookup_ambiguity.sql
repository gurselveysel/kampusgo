-- PL/pgSQL dönüş sütun adlarıyla tablo sütunlarının çakışmasını giderir.
create or replace function public.pilot_broker_get_session(p_token_hash text)
returns table (
  user_id uuid, access_token text, refresh_token text,
  auth_expires_at timestamptz, absolute_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  update private.pilot_server_sessions as s
  set last_seen_at = now()
  where s.token_hash = p_token_hash
    and s.revoked_at is null
    and s.absolute_expires_at > now();

  return query
    select s.user_id, s.access_token, s.refresh_token, s.auth_expires_at, s.absolute_expires_at
    from private.pilot_server_sessions as s
    where s.token_hash = p_token_hash
      and s.revoked_at is null
      and s.absolute_expires_at > now();
end;
$$;

revoke all on function public.pilot_broker_get_session(text) from public, anon, authenticated;
grant execute on function public.pilot_broker_get_session(text) to service_role;
