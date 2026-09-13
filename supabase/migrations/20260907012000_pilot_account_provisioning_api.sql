-- Yalnız kontrollü, e-posta göndermeyen sentetik hesap kurulumunun kullanıcı
-- adı eşmesini kaydeder. EXECUTE sadece service_role'a verilir.
create or replace function public.pilot_broker_provision_identity(
  p_username text,
  p_user_id uuid,
  p_auth_email text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_username text := lower(btrim(p_username));
begin
  if v_username !~ '^[a-z0-9._-]{3,64}$'
     or p_auth_email !~ '^[a-z0-9._-]+@pilot[.]invalid$' then
    raise exception 'PILOT_IDENTITY_FORMAT_INVALID' using errcode = '22023';
  end if;
  if not exists (select 1 from auth.users u where u.id = p_user_id and u.email = p_auth_email) then
    raise exception 'PILOT_AUTH_IDENTITY_MISMATCH' using errcode = '23503';
  end if;
  insert into private.pilot_login_identities(normalized_username, user_id, auth_email, is_active)
  values (v_username, p_user_id, p_auth_email, true)
  on conflict (normalized_username) do update
  set user_id = excluded.user_id, auth_email = excluded.auth_email, is_active = true;
end;
$$;

revoke all on function public.pilot_broker_provision_identity(text, uuid, text) from public, anon, authenticated;
grant execute on function public.pilot_broker_provision_identity(text, uuid, text) to service_role;
