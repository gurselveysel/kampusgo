create sequence if not exists public.gazi_badge_index minvalue 0 maxvalue 131071 start 0 no cycle;
create table if not exists public.gazi_badge_records (
 scope text not null check(scope in ('production','preview')),
 id uuid not null,
 status_index integer not null unique check(status_index>=0 and status_index<131072),
 record jsonb not null,
 digest text not null check(digest ~ '^[a-f0-9]{64}$'),
 created_at timestamptz not null default now(),
 revoked_at timestamptz,
 primary key(scope,id)
);
alter table public.gazi_badge_records enable row level security;
revoke all on public.gazi_badge_records from public,anon,authenticated;
grant select,insert,update on public.gazi_badge_records to service_role;
revoke all on sequence public.gazi_badge_index from public,anon,authenticated;
grant usage on sequence public.gazi_badge_index to service_role;
create or replace function public.gazi_badge_next_index() returns bigint language sql security invoker set search_path='' as $$ select nextval('public.gazi_badge_index'); $$;
revoke all on function public.gazi_badge_next_index() from public,anon,authenticated;
grant execute on function public.gazi_badge_next_index() to service_role;
create or replace function public.gazi_badge_allow_attempt(p_scope text,p_hash text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare n integer; w bigint:=floor(extract(epoch from now())/60);
begin
 if not exists(select 1 from public.gazi_gate_sessions where token_hash=p_hash and scope=p_scope and expires_at>now()) then return false; end if;
 delete from public.gazi_gate_limits where expires_at<now();
 insert into public.gazi_gate_limits(bucket,attempts,expires_at) values(p_scope||':badges:'||p_hash||':'||w,1,to_timestamp((w+1)*60))
 on conflict(bucket) do update set attempts=least(public.gazi_gate_limits.attempts+1,10000) returning attempts into n;
 return n<=30;
end; $$;
revoke all on function public.gazi_badge_allow_attempt(text,text) from public,anon,authenticated;
grant execute on function public.gazi_badge_allow_attempt(text,text) to service_role;
