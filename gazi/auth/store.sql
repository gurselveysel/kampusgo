-- Only the authenticated server-side gateway can operate these tables and RPCs.
create table if not exists public.gazi_gate_state (
 scope text primary key check (scope in ('production','preview')),
 last_step bigint not null default -1
);
create table if not exists public.gazi_gate_sessions (
 token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
 scope text not null check (scope in ('production','preview')),
 expires_at timestamptz not null,
 created_at timestamptz not null default now()
);
create index if not exists gazi_gate_sessions_expiry on public.gazi_gate_sessions(expires_at);
create table if not exists public.gazi_gate_limits (
 bucket text primary key,
 attempts integer not null,
 expires_at timestamptz not null
);
create index if not exists gazi_gate_limits_expiry on public.gazi_gate_limits(expires_at);
alter table public.gazi_gate_state enable row level security;
alter table public.gazi_gate_sessions enable row level security;
alter table public.gazi_gate_limits enable row level security;
revoke all on public.gazi_gate_state, public.gazi_gate_sessions, public.gazi_gate_limits from public, anon, authenticated;
grant select,insert,update,delete on public.gazi_gate_state, public.gazi_gate_sessions, public.gazi_gate_limits to service_role;

create or replace function public.gazi_gate_allow_attempt(p_scope text,p_ip text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare n integer; w bigint; allowed boolean:=true;
begin
 if p_scope not in ('production','preview') or p_ip !~ '^[a-f0-9]{64}$' then return false; end if;
 delete from public.gazi_gate_limits where expires_at<now();
 delete from public.gazi_gate_sessions where expires_at<now();
 w:=floor(extract(epoch from now())/300);
 insert into public.gazi_gate_limits(bucket,attempts,expires_at)
 values(p_scope||':ip:'||p_ip||':'||w,1,to_timestamp((w+1)*300))
 on conflict(bucket) do update set attempts=least(public.gazi_gate_limits.attempts+1,10000)
 returning attempts into n;
 if n>5 then allowed:=false; end if;
 w:=floor(extract(epoch from now())/60);
 insert into public.gazi_gate_limits(bucket,attempts,expires_at)
 values(p_scope||':global:'||w,1,to_timestamp((w+1)*60))
 on conflict(bucket) do update set attempts=least(public.gazi_gate_limits.attempts+1,10000)
 returning attempts into n;
 if n>100 then allowed:=false; end if;
 return allowed;
end; $$;
revoke all on function public.gazi_gate_allow_attempt(text,text) from public,anon,authenticated;
grant execute on function public.gazi_gate_allow_attempt(text,text) to service_role;

create or replace function public.gazi_gate_consume(p_scope text,p_step bigint,p_hash text)
returns timestamptz language plpgsql security invoker set search_path='' as $$
declare accepted bigint; expiry timestamptz:=now()+interval '60 minutes'; current_step bigint:=floor(extract(epoch from now())/30);
begin
 if p_scope not in ('production','preview') or p_hash !~ '^[a-f0-9]{64}$' or p_step<current_step-1 or p_step>current_step+1 then return null; end if;
 insert into public.gazi_gate_state(scope,last_step) values(p_scope,-1) on conflict do nothing;
 update public.gazi_gate_state set last_step=p_step where scope=p_scope and last_step<p_step returning last_step into accepted;
 if accepted is null then return null; end if;
 insert into public.gazi_gate_sessions(token_hash,scope,expires_at) values(p_hash,p_scope,expiry);
 return expiry;
end; $$;
revoke all on function public.gazi_gate_consume(text,bigint,text) from public,anon,authenticated;
grant execute on function public.gazi_gate_consume(text,bigint,text) to service_role;
