-- KampüsGO hesaplı çok-kurum pilotu (eklemeli / legacy uyumlu)
-- Mevcut organizations, profiles, roles ve user_roles tablolarını yeniden kurmaz.
-- profiles.organization_id legacy birincil kurum alanı olarak korunur; yeni yetki
-- kaynağı aktif üyelik + user_roles + işlem kapsamının birlikte doğrulanmasıdır.

create schema if not exists private;

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'inactive', 'suspended', 'ended')),
  unit_name text,
  member_kind text not null default 'pilot' check (member_kind in ('student', 'staff', 'external_instructor', 'pilot')),
  mandate_starts_at timestamptz,
  mandate_ends_at timestamptz,
  decision_scope jsonb not null default '{}'::jsonb check (jsonb_typeof(decision_scope) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, organization_id),
  check (mandate_ends_at is null or mandate_starts_at is null or mandate_ends_at > mandate_starts_at)
);

comment on table public.organization_memberships is
  'Hesaplı pilot için çoklu kurum üyeliği. Legacy profiles.organization_id alanını değiştirmez.';

create table public.pilot_workspace_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  route_slug text not null unique check (route_slug ~ '^[a-z0-9-]+$'),
  display_name text not null,
  short_name text not null,
  workspace_version text not null,
  logo_path text not null,
  theme jsonb not null check (jsonb_typeof(theme) = 'object'),
  enabled_modules text[] not null default '{}',
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.pilot_institutional_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rule_key text not null,
  version_label text not null,
  status text not null check (status in ('verified_reference', 'institutional_confirmation_required', 'retired')),
  value_text text,
  numeric_value numeric,
  unit_label text,
  source_url text not null,
  source_title text not null,
  decision_owner text not null,
  effective_from date,
  effective_until date,
  calculation_basis text,
  is_synthetic boolean not null default true check (is_synthetic),
  created_at timestamptz not null default now(),
  unique (organization_id, rule_key, version_label),
  check (effective_until is null or effective_from is null or effective_until >= effective_from)
);

create table public.pilot_account_catalog (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  title text not null,
  unit_name text not null,
  summary text not null,
  delivery_label text not null,
  workload_label text not null,
  status text not null default 'pilot' check (status in ('pilot', 'archived')),
  is_synthetic boolean not null default true check (is_synthetic),
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, code)
);

create table public.pilot_account_cases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  owner_user_id uuid not null,
  kind text not null check (kind in ('student_application', 'program_proposal')),
  catalog_item_id uuid,
  code text not null,
  title text not null,
  summary text not null,
  unit_name text not null,
  status text not null check (status in ('submitted', 'coordinator_review', 'commission_review', 'approved', 'revision', 'rejected', 'credentialed')),
  provider_kind text not null default 'internal' check (provider_kind in ('student', 'internal', 'external')),
  is_synthetic boolean not null default true check (is_synthetic),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, code),
  foreign key (owner_user_id, organization_id)
    references public.organization_memberships(user_id, organization_id),
  foreign key (organization_id, catalog_item_id)
    references public.pilot_account_catalog(organization_id, id)
);

create table public.pilot_account_case_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  case_id uuid not null,
  actor_user_id uuid not null,
  actor_role_key text not null,
  action_key text not null,
  from_status text,
  to_status text not null,
  rationale text not null,
  is_synthetic boolean not null default true check (is_synthetic),
  created_at timestamptz not null default now(),
  foreign key (organization_id, case_id)
    references public.pilot_account_cases(organization_id, id) on delete cascade,
  foreign key (actor_user_id, organization_id)
    references public.organization_memberships(user_id, organization_id)
);

create table public.pilot_account_credentials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  case_id uuid not null,
  holder_user_id uuid not null,
  code text not null,
  title text not null,
  issue_status text not null default 'simulation_issued' check (issue_status in ('simulation_issued', 'simulation_revoked')),
  verification_status text not null default 'pilot_verified' check (verification_status in ('pilot_verified', 'pilot_revoked')),
  ects_recognition_status text not null default 'not_evaluated' check (ects_recognition_status in ('not_evaluated', 'separate_human_review_required')),
  course_substitution_status text not null default 'not_requested' check (course_substitution_status in ('not_requested', 'separate_human_review_required')),
  signing_mode text not null default 'simulation' check (signing_mode = 'simulation'),
  external_wallet_published boolean not null default false check (not external_wallet_published),
  is_synthetic boolean not null default true check (is_synthetic),
  issued_at timestamptz not null default now(),
  unique (organization_id, case_id),
  unique (organization_id, code),
  foreign key (organization_id, case_id)
    references public.pilot_account_cases(organization_id, id),
  foreign key (holder_user_id, organization_id)
    references public.organization_memberships(user_id, organization_id)
);

create table public.pilot_finance_dry_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  case_id uuid not null,
  actor_user_id uuid not null,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'TRY' check (currency = 'TRY'),
  status text not null default 'dry_run_complete' check (status = 'dry_run_complete'),
  real_transaction boolean not null default false check (not real_transaction),
  is_synthetic boolean not null default true check (is_synthetic),
  created_at timestamptz not null default now(),
  unique (organization_id, case_id),
  foreign key (organization_id, case_id)
    references public.pilot_account_cases(organization_id, id),
  foreign key (actor_user_id, organization_id)
    references public.organization_memberships(user_id, organization_id)
);

create table public.pilot_integration_dry_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid not null,
  integration_key text not null check (integration_key in ('obs', 'oys', 'yoksis', 'edevlet', 'gib', 'mys', 'mays', 'ebys')),
  result_status text not null default 'simulation_only' check (result_status = 'simulation_only'),
  real_data_sent boolean not null default false check (not real_data_sent),
  detail text not null,
  is_synthetic boolean not null default true check (is_synthetic),
  created_at timestamptz not null default now(),
  foreign key (actor_user_id, organization_id)
    references public.organization_memberships(user_id, organization_id)
);

create table public.pilot_admin_access_checks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid not null,
  check_key text not null default 'membership_integrity',
  result_status text not null default 'simulation_complete' check (result_status = 'simulation_complete'),
  detail text not null,
  is_synthetic boolean not null default true check (is_synthetic),
  created_at timestamptz not null default now(),
  foreign key (actor_user_id, organization_id)
    references public.organization_memberships(user_id, organization_id)
);

create table public.pilot_command_receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid not null,
  idempotency_key uuid not null,
  command_key text not null,
  response_body jsonb not null,
  created_at timestamptz not null default now(),
  unique (organization_id, actor_user_id, idempotency_key),
  foreign key (actor_user_id, organization_id)
    references public.organization_memberships(user_id, organization_id)
);

-- Sunucu aracılı kullanıcı adı eşleme, dağıtık hız sınırı ve iptal edilebilir
-- opaque oturumlar hiçbir istemci rolüne açılmaz.
create table private.pilot_login_identities (
  normalized_username text primary key check (normalized_username = lower(btrim(normalized_username)) and normalized_username ~ '^[a-z0-9._-]{3,64}$'),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  auth_email text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table private.pilot_login_attempts (
  fingerprint_hash text primary key check (fingerprint_hash ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null default now(),
  attempt_count integer not null default 1 check (attempt_count > 0),
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);

create table private.pilot_server_sessions (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  auth_expires_at timestamptz not null,
  absolute_expires_at timestamptz not null,
  revoked_at timestamptz,
  user_agent_hash text check (user_agent_hash is null or user_agent_hash ~ '^[a-f0-9]{64}$'),
  ip_hash text check (ip_hash is null or ip_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  check (absolute_expires_at > created_at)
);

alter table private.pilot_login_identities enable row level security;
alter table private.pilot_login_attempts enable row level security;
alter table private.pilot_server_sessions enable row level security;
alter table private.pilot_login_identities force row level security;
alter table private.pilot_login_attempts force row level security;
alter table private.pilot_server_sessions force row level security;

create index organization_memberships_org_user_idx on public.organization_memberships (organization_id, user_id) where status = 'active';
create index pilot_account_cases_org_status_idx on public.pilot_account_cases (organization_id, status, created_at desc);
create index pilot_account_cases_owner_idx on public.pilot_account_cases (owner_user_id, organization_id, created_at desc);
create index pilot_case_actions_case_idx on public.pilot_account_case_actions (organization_id, case_id, created_at);
create index pilot_sessions_user_idx on private.pilot_server_sessions (user_id, absolute_expires_at) where revoked_at is null;
create index pilot_login_attempts_cleanup_idx on private.pilot_login_attempts (updated_at);

alter table public.organization_memberships enable row level security;
alter table public.pilot_workspace_settings enable row level security;
alter table public.pilot_institutional_rules enable row level security;
alter table public.pilot_account_catalog enable row level security;
alter table public.pilot_account_cases enable row level security;
alter table public.pilot_account_case_actions enable row level security;
alter table public.pilot_account_credentials enable row level security;
alter table public.pilot_finance_dry_runs enable row level security;
alter table public.pilot_integration_dry_runs enable row level security;
alter table public.pilot_admin_access_checks enable row level security;
alter table public.pilot_command_receipts enable row level security;

alter table public.organization_memberships force row level security;
alter table public.pilot_workspace_settings force row level security;
alter table public.pilot_institutional_rules force row level security;
alter table public.pilot_account_catalog force row level security;
alter table public.pilot_account_cases force row level security;
alter table public.pilot_account_case_actions force row level security;
alter table public.pilot_account_credentials force row level security;
alter table public.pilot_finance_dry_runs force row level security;
alter table public.pilot_integration_dry_runs force row level security;
alter table public.pilot_admin_access_checks force row level security;
alter table public.pilot_command_receipts force row level security;

revoke all on all tables in schema private from public, anon, authenticated;
revoke all on table public.organization_memberships from public, anon, authenticated;
revoke all on table public.pilot_workspace_settings from public, anon, authenticated;
revoke all on table public.pilot_institutional_rules from public, anon, authenticated;
revoke all on table public.pilot_account_catalog from public, anon, authenticated;
revoke all on table public.pilot_account_cases from public, anon, authenticated;
revoke all on table public.pilot_account_case_actions from public, anon, authenticated;
revoke all on table public.pilot_account_credentials from public, anon, authenticated;
revoke all on table public.pilot_finance_dry_runs from public, anon, authenticated;
revoke all on table public.pilot_integration_dry_runs from public, anon, authenticated;
revoke all on table public.pilot_admin_access_checks from public, anon, authenticated;
revoke all on table public.pilot_command_receipts from public, anon, authenticated;

grant select on table public.organization_memberships to authenticated;
grant select on table public.pilot_workspace_settings to authenticated;
grant select on table public.pilot_institutional_rules to authenticated;
grant select on table public.pilot_account_catalog to authenticated;
grant select on table public.pilot_account_cases to authenticated;
grant select on table public.pilot_account_case_actions to authenticated;
grant select on table public.pilot_account_credentials to authenticated;
grant select on table public.pilot_finance_dry_runs to authenticated;
grant select on table public.pilot_integration_dry_runs to authenticated;
grant select on table public.pilot_admin_access_checks to authenticated;
grant select on table public.pilot_command_receipts to authenticated;

create or replace function private.pilot_active_membership(p_user_id uuid, p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    join public.organization_memberships m on m.user_id = p.id
    join public.organizations o on o.id = m.organization_id
    where p.id = p_user_id
      and p.is_active
      and m.organization_id = p_organization_id
      and m.status = 'active'
      and (m.mandate_starts_at is null or m.mandate_starts_at <= now())
      and (m.mandate_ends_at is null or m.mandate_ends_at > now())
      and o.is_active
  );
$$;

create or replace function private.pilot_has_any_role(p_user_id uuid, p_organization_id uuid, p_role_keys text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.pilot_active_membership(p_user_id, p_organization_id)
    and exists (
      select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = p_user_id
        and ur.organization_id = p_organization_id
        and r.key = any(p_role_keys)
    );
$$;

create or replace function private.pilot_has_scope(p_user_id uuid, p_organization_id uuid, p_scope text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.pilot_active_membership(p_user_id, p_organization_id)
    and exists (
      select 1
      from public.organization_memberships m
      where m.user_id = p_user_id
        and m.organization_id = p_organization_id
        and coalesce((m.decision_scope ->> p_scope)::boolean, false)
    );
$$;

revoke all on function private.pilot_active_membership(uuid, uuid) from public;
revoke all on function private.pilot_has_any_role(uuid, uuid, text[]) from public;
revoke all on function private.pilot_has_scope(uuid, uuid, text) from public;
grant execute on function private.pilot_active_membership(uuid, uuid) to authenticated, service_role;
grant execute on function private.pilot_has_any_role(uuid, uuid, text[]) to authenticated, service_role;
grant execute on function private.pilot_has_scope(uuid, uuid, text) to authenticated, service_role;
grant usage on schema private to authenticated, service_role;

create policy memberships_self_read on public.organization_memberships
for select to authenticated
using (user_id = (select auth.uid()));

create policy workspace_member_read on public.pilot_workspace_settings
for select to authenticated
using (private.pilot_active_membership((select auth.uid()), organization_id));

create policy institutional_rules_member_read on public.pilot_institutional_rules
for select to authenticated
using (private.pilot_active_membership((select auth.uid()), organization_id));

create policy catalog_member_read on public.pilot_account_catalog
for select to authenticated
using (private.pilot_active_membership((select auth.uid()), organization_id));

create policy cases_scoped_read on public.pilot_account_cases
for select to authenticated
using (
  owner_user_id = (select auth.uid())
  or (
    private.pilot_has_any_role((select auth.uid()), organization_id, array['koordinator','komisyon','komisyon-baskani'])
    and private.pilot_has_scope((select auth.uid()), organization_id, 'case_review')
  )
  or (
    private.pilot_has_any_role((select auth.uid()), organization_id, array['ogrenci-isleri'])
    and private.pilot_has_scope((select auth.uid()), organization_id, 'credential_issue')
  )
  or (
    private.pilot_has_any_role((select auth.uid()), organization_id, array['mali-isler'])
    and private.pilot_has_scope((select auth.uid()), organization_id, 'finance_dry_run')
  )
);

create policy case_actions_scoped_read on public.pilot_account_case_actions
for select to authenticated
using (exists (
  select 1 from public.pilot_account_cases c
  where c.organization_id = pilot_account_case_actions.organization_id
    and c.id = pilot_account_case_actions.case_id
));

create policy credentials_scoped_read on public.pilot_account_credentials
for select to authenticated
using (
  holder_user_id = (select auth.uid())
  or (
    private.pilot_has_any_role((select auth.uid()), organization_id, array['ogrenci-isleri','bilgi-islem'])
    and (
      private.pilot_has_scope((select auth.uid()), organization_id, 'credential_issue')
      or private.pilot_has_scope((select auth.uid()), organization_id, 'credential_verify')
    )
  )
);

create policy finance_role_read on public.pilot_finance_dry_runs
for select to authenticated
using (
  private.pilot_has_any_role((select auth.uid()), organization_id, array['mali-isler'])
  and private.pilot_has_scope((select auth.uid()), organization_id, 'finance_dry_run')
);

create policy integration_role_read on public.pilot_integration_dry_runs
for select to authenticated
using (
  actor_user_id = (select auth.uid())
  and private.pilot_has_any_role((select auth.uid()), organization_id, array['bilgi-islem'])
  and private.pilot_has_scope((select auth.uid()), organization_id, 'integration_dry_run')
);

create policy admin_checks_role_read on public.pilot_admin_access_checks
for select to authenticated
using (
  actor_user_id = (select auth.uid())
  and private.pilot_has_any_role((select auth.uid()), organization_id, array['sistem-yoneticisi'])
  and private.pilot_has_scope((select auth.uid()), organization_id, 'access_admin')
);

create policy command_receipts_self_read on public.pilot_command_receipts
for select to authenticated
using (actor_user_id = (select auth.uid()));

create or replace view public.pilot_my_catalog
with (security_invoker = true)
as
select id, organization_id, code, title, unit_name, summary, delivery_label, workload_label, status, is_synthetic
from public.pilot_account_catalog;

create or replace view public.pilot_my_cases
with (security_invoker = true)
as
select id, organization_id, owner_user_id, kind, catalog_item_id, code, title, summary, unit_name,
       status, provider_kind, is_synthetic, created_at, updated_at
from public.pilot_account_cases;

revoke all on public.pilot_my_catalog from public, anon;
revoke all on public.pilot_my_cases from public, anon;
grant select on public.pilot_my_catalog to authenticated;
grant select on public.pilot_my_cases to authenticated;

create or replace function public.pilot_my_context()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'authenticated', (select auth.uid()) is not null,
    'userId', (select auth.uid()),
    'profileActive', coalesce(p.is_active, false),
    'displayName', coalesce(p.full_name, 'Pilot kullanıcı'),
    'accessState', case
      when p.id is null then 'unassigned'
      when not p.is_active then 'inactive'
      when count(m.id) filter (where m.status = 'active' and o.is_active) = 0 then 'unassigned'
      else 'active'
    end,
    'memberships', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'organizationId', o.id,
          'databaseSlug', o.slug,
          'routeSlug', ws.route_slug,
          'organizationName', o.name,
          'shortName', ws.short_name,
          'logoPath', ws.logo_path,
          'unitName', m.unit_name,
          'memberKind', m.member_kind,
          'decisionScope', m.decision_scope,
          'roles', coalesce((
            select jsonb_agg(jsonb_build_object('key', r.key, 'name', r.name) order by r.name)
            from public.user_roles ur
            join public.roles r on r.id = ur.role_id
            where ur.user_id = m.user_id and ur.organization_id = m.organization_id
          ), '[]'::jsonb)
        ) order by o.name
      ) filter (
        where p.is_active
          and m.status = 'active'
          and (m.mandate_starts_at is null or m.mandate_starts_at <= now())
          and (m.mandate_ends_at is null or m.mandate_ends_at > now())
          and o.is_active and ws.is_active
      ),
      '[]'::jsonb
    )
  )
  from (select (select auth.uid()) as uid) current_user_id
  left join public.profiles p on p.id = current_user_id.uid
  left join public.organization_memberships m on m.user_id = p.id
  left join public.organizations o on o.id = m.organization_id
  left join public.pilot_workspace_settings ws on ws.organization_id = o.id
  group by p.id, p.is_active, p.full_name;
$$;

revoke all on function public.pilot_my_context() from public, anon;
grant execute on function public.pilot_my_context() to authenticated;

create or replace function public.pilot_workspace_snapshot(p_route_slug text, p_role_key text)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_org_id uuid;
  v_result jsonb;
begin
  select ws.organization_id into v_org_id
  from public.pilot_workspace_settings ws
  where ws.route_slug = p_route_slug and ws.is_active;

  if v_user_id is null or v_org_id is null
     or not private.pilot_has_any_role(v_user_id, v_org_id, array[p_role_key]) then
    raise exception 'PILOT_ACCESS_DENIED' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'workspace', (select to_jsonb(ws) - 'theme' || jsonb_build_object('theme', ws.theme)
                  from public.pilot_workspace_settings ws where ws.organization_id = v_org_id),
    'rules', coalesce((select jsonb_agg(to_jsonb(r) order by r.rule_key)
                       from public.pilot_institutional_rules r where r.organization_id = v_org_id), '[]'::jsonb),
    'catalog', coalesce((select jsonb_agg(to_jsonb(c) order by c.title)
                         from public.pilot_my_catalog c where c.organization_id = v_org_id and c.status = 'pilot'), '[]'::jsonb),
    'cases', coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at desc)
                       from public.pilot_my_cases c where c.organization_id = v_org_id), '[]'::jsonb),
    'actions', coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at desc)
                         from public.pilot_account_case_actions a where a.organization_id = v_org_id), '[]'::jsonb),
    'credentials', coalesce((select jsonb_agg(to_jsonb(c) order by c.issued_at desc)
                             from public.pilot_account_credentials c where c.organization_id = v_org_id), '[]'::jsonb),
    'financeDryRuns', coalesce((select jsonb_agg(to_jsonb(f) order by f.created_at desc)
                               from public.pilot_finance_dry_runs f where f.organization_id = v_org_id), '[]'::jsonb),
    'integrationDryRuns', coalesce((select jsonb_agg(to_jsonb(i) order by i.created_at desc)
                                   from public.pilot_integration_dry_runs i where i.organization_id = v_org_id), '[]'::jsonb),
    'adminChecks', coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at desc)
                            from public.pilot_admin_access_checks a where a.organization_id = v_org_id), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.pilot_workspace_snapshot(text, text) from public, anon;
grant execute on function public.pilot_workspace_snapshot(text, text) to authenticated;

create or replace function public.pilot_workspace_command(
  p_route_slug text,
  p_role_key text,
  p_command text,
  p_payload jsonb,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_org_id uuid;
  v_membership public.organization_memberships%rowtype;
  v_case public.pilot_account_cases%rowtype;
  v_catalog public.pilot_account_catalog%rowtype;
  v_response jsonb;
  v_target_status text;
  v_rationale text := btrim(coalesce(p_payload->>'rationale', ''));
  v_title text := btrim(coalesce(p_payload->>'title', ''));
  v_summary text := btrim(coalesce(p_payload->>'summary', ''));
begin
  if p_idempotency_key is null then
    raise exception 'PILOT_IDEMPOTENCY_REQUIRED' using errcode = '22023';
  end if;

  select ws.organization_id into v_org_id
  from public.pilot_workspace_settings ws
  where ws.route_slug = p_route_slug and ws.is_active;

  if v_user_id is null or v_org_id is null
     or not private.pilot_has_any_role(v_user_id, v_org_id, array[p_role_key]) then
    raise exception 'PILOT_ACCESS_DENIED' using errcode = '42501';
  end if;

  select * into v_membership
  from public.organization_memberships m
  where m.user_id = v_user_id and m.organization_id = v_org_id and m.status = 'active';

  select response_body into v_response
  from public.pilot_command_receipts
  where organization_id = v_org_id and actor_user_id = v_user_id and idempotency_key = p_idempotency_key;
  if found then return v_response; end if;

  if p_command = 'create_student_application' then
    if p_role_key <> 'ogrenci' then raise exception 'PILOT_ROLE_DENIED' using errcode = '42501'; end if;
    select * into v_catalog from public.pilot_account_catalog
      where organization_id = v_org_id and id = nullif(p_payload->>'catalogItemId', '')::uuid and status = 'pilot';
    if not found then raise exception 'PILOT_CATALOG_NOT_FOUND' using errcode = '22023'; end if;
    insert into public.pilot_account_cases
      (organization_id, owner_user_id, kind, catalog_item_id, code, title, summary, unit_name, status, provider_kind)
    values
      (v_org_id, v_user_id, 'student_application', v_catalog.id,
       'SNT-BSV-' || upper(substr(replace(p_idempotency_key::text, '-', ''), 1, 10)),
       v_catalog.title, coalesce(nullif(v_summary, ''), 'Sentetik katalog başvurusu'), v_catalog.unit_name, 'submitted', 'student')
    returning * into v_case;

  elsif p_command = 'create_program_proposal' then
    if p_role_key not in ('ic-egitici', 'dis-egitici') then raise exception 'PILOT_ROLE_DENIED' using errcode = '42501'; end if;
    if length(v_title) < 5 or length(v_summary) < 10 then raise exception 'PILOT_VALIDATION' using errcode = '22023'; end if;
    insert into public.pilot_account_cases
      (organization_id, owner_user_id, kind, code, title, summary, unit_name, status, provider_kind)
    values
      (v_org_id, v_user_id, 'program_proposal',
       'SNT-ONR-' || upper(substr(replace(p_idempotency_key::text, '-', ''), 1, 10)),
       left(v_title, 180), left(v_summary, 1200), coalesce(v_membership.unit_name, 'Pilot birim'), 'coordinator_review',
       case when p_role_key = 'dis-egitici' then 'external' else 'internal' end)
    returning * into v_case;

  elsif p_command = 'coordinator_forward' then
    if p_role_key <> 'koordinator'
       or not private.pilot_has_scope(v_user_id, v_org_id, 'case_review') then
      raise exception 'PILOT_SCOPE_DENIED' using errcode = '42501';
    end if;
    if length(v_rationale) < 8 then raise exception 'PILOT_RATIONALE_REQUIRED' using errcode = '22023'; end if;
    select * into v_case from public.pilot_account_cases
      where organization_id = v_org_id and id = nullif(p_payload->>'caseId', '')::uuid for update;
    if not found or v_case.status <> 'coordinator_review' then raise exception 'PILOT_INVALID_TRANSITION' using errcode = '22023'; end if;
    update public.pilot_account_cases set status = 'commission_review', updated_at = now() where id = v_case.id;
    insert into public.pilot_account_case_actions
      (organization_id, case_id, actor_user_id, actor_role_key, action_key, from_status, to_status, rationale)
    values (v_org_id, v_case.id, v_user_id, p_role_key, p_command, v_case.status, 'commission_review', left(v_rationale, 1200));
    v_case.status := 'commission_review';

  elsif p_command = 'commission_decide' then
    if p_role_key not in ('komisyon', 'komisyon-baskani')
       or not private.pilot_has_scope(v_user_id, v_org_id, 'case_review') then
      raise exception 'PILOT_SCOPE_DENIED' using errcode = '42501';
    end if;
    v_target_status := p_payload->>'decision';
    if v_target_status not in ('approved', 'revision', 'rejected') or length(v_rationale) < 12 then
      raise exception 'PILOT_REASONED_DECISION_REQUIRED' using errcode = '22023';
    end if;
    select * into v_case from public.pilot_account_cases
      where organization_id = v_org_id and id = nullif(p_payload->>'caseId', '')::uuid for update;
    if not found or v_case.status <> 'commission_review' then raise exception 'PILOT_INVALID_TRANSITION' using errcode = '22023'; end if;
    update public.pilot_account_cases set status = v_target_status, updated_at = now() where id = v_case.id;
    insert into public.pilot_account_case_actions
      (organization_id, case_id, actor_user_id, actor_role_key, action_key, from_status, to_status, rationale)
    values (v_org_id, v_case.id, v_user_id, p_role_key, p_command, v_case.status, v_target_status, left(v_rationale, 1200));
    v_case.status := v_target_status;

  elsif p_command = 'student_affairs_issue' then
    if p_role_key <> 'ogrenci-isleri'
       or not private.pilot_has_scope(v_user_id, v_org_id, 'credential_issue') then
      raise exception 'PILOT_SCOPE_DENIED' using errcode = '42501';
    end if;
    select * into v_case from public.pilot_account_cases
      where organization_id = v_org_id and id = nullif(p_payload->>'caseId', '')::uuid for update;
    if not found or v_case.status <> 'approved' then raise exception 'PILOT_INVALID_TRANSITION' using errcode = '22023'; end if;
    insert into public.pilot_account_credentials
      (organization_id, case_id, holder_user_id, code, title)
    values (v_org_id, v_case.id, v_case.owner_user_id,
            'SNT-BEL-' || upper(substr(replace(p_idempotency_key::text, '-', ''), 1, 10)), v_case.title);
    update public.pilot_account_cases set status = 'credentialed', updated_at = now() where id = v_case.id;
    insert into public.pilot_account_case_actions
      (organization_id, case_id, actor_user_id, actor_role_key, action_key, from_status, to_status, rationale)
    values (v_org_id, v_case.id, v_user_id, p_role_key, p_command, v_case.status, 'credentialed', 'SENTETİK belge üretim simülasyonu; gerçek belge değildir.');
    v_case.status := 'credentialed';

  elsif p_command = 'finance_dry_run' then
    if p_role_key <> 'mali-isler'
       or not private.pilot_has_scope(v_user_id, v_org_id, 'finance_dry_run') then
      raise exception 'PILOT_SCOPE_DENIED' using errcode = '42501';
    end if;
    select * into v_case from public.pilot_account_cases
      where organization_id = v_org_id and id = nullif(p_payload->>'caseId', '')::uuid;
    if not found or v_case.status not in ('approved', 'credentialed') then raise exception 'PILOT_INVALID_TRANSITION' using errcode = '22023'; end if;
    insert into public.pilot_finance_dry_runs (organization_id, case_id, actor_user_id, amount)
    values (v_org_id, v_case.id, v_user_id, greatest(0, least(coalesce((p_payload->>'amount')::numeric, 0), 1000000)))
    on conflict (organization_id, case_id) do update set actor_user_id = excluded.actor_user_id, amount = excluded.amount, created_at = now();

  elsif p_command = 'integration_dry_run' then
    if p_role_key <> 'bilgi-islem'
       or not private.pilot_has_scope(v_user_id, v_org_id, 'integration_dry_run') then
      raise exception 'PILOT_SCOPE_DENIED' using errcode = '42501';
    end if;
    insert into public.pilot_integration_dry_runs
      (organization_id, actor_user_id, integration_key, detail)
    values (v_org_id, v_user_id, p_payload->>'integrationKey', 'Bağlantı kurulmadan şema ve yetki kapısı simülasyonu tamamlandı.');

  elsif p_command = 'admin_access_check' then
    if p_role_key <> 'sistem-yoneticisi'
       or not private.pilot_has_scope(v_user_id, v_org_id, 'access_admin') then
      raise exception 'PILOT_SCOPE_DENIED' using errcode = '42501';
    end if;
    insert into public.pilot_admin_access_checks (organization_id, actor_user_id, detail)
    values (v_org_id, v_user_id, 'Aktif üyelik ve rol bağları kurum kapsamında doğrulandı; akademik veya mali karar üretilmedi.');

  else
    raise exception 'PILOT_COMMAND_NOT_ALLOWED' using errcode = '22023';
  end if;

  v_response := jsonb_build_object(
    'ok', true,
    'command', p_command,
    'caseId', v_case.id,
    'status', v_case.status,
    'simulation', true
  );

  insert into public.pilot_command_receipts
    (organization_id, actor_user_id, idempotency_key, command_key, response_body)
  values (v_org_id, v_user_id, p_idempotency_key, p_command, v_response);

  return v_response;
exception
  when unique_violation then
    select response_body into v_response
    from public.pilot_command_receipts
    where organization_id = v_org_id and actor_user_id = v_user_id and idempotency_key = p_idempotency_key;
    if found then return v_response; end if;
    raise;
end;
$$;

revoke all on function public.pilot_workspace_command(text, text, text, jsonb, uuid) from public, anon;
grant execute on function public.pilot_workspace_command(text, text, text, jsonb, uuid) to authenticated;

-- Aşağıdaki broker RPC'leri yalnız Supabase Edge Function'ın dar kapsamlı
-- servis istemcisine açıktır. Normal çalışma alanı sorguları kullanıcı JWT'siyle yapılır.
create or replace function public.pilot_broker_login_lookup(p_username text)
returns table (user_id uuid, auth_email text)
language sql
stable
security definer
set search_path = ''
as $$
  select i.user_id, i.auth_email
  from private.pilot_login_identities i
  where i.normalized_username = lower(btrim(p_username)) and i.is_active;
$$;

create or replace function public.pilot_broker_consume_attempt(p_fingerprint_hash text, p_max_attempts integer default 6)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_row private.pilot_login_attempts%rowtype;
begin
  if p_fingerprint_hash !~ '^[a-f0-9]{64}$' or p_max_attempts not between 3 and 100 then return false; end if;
  perform pg_advisory_xact_lock(hashtext(p_fingerprint_hash));
  delete from private.pilot_login_attempts where updated_at < now() - interval '2 days';
  select * into v_row from private.pilot_login_attempts where fingerprint_hash = p_fingerprint_hash for update;
  if not found then
    insert into private.pilot_login_attempts(fingerprint_hash) values (p_fingerprint_hash);
    return true;
  end if;
  if v_row.blocked_until is not null and v_row.blocked_until > now() then
    update private.pilot_login_attempts set attempt_count = attempt_count + 1, updated_at = now()
      where fingerprint_hash = p_fingerprint_hash;
    return false;
  end if;
  if v_row.window_started_at < now() - interval '15 minutes' then
    update private.pilot_login_attempts set window_started_at = now(), attempt_count = 1, blocked_until = null, updated_at = now()
      where fingerprint_hash = p_fingerprint_hash;
    return true;
  end if;
  if v_row.attempt_count >= p_max_attempts then
    update private.pilot_login_attempts set attempt_count = attempt_count + 1, blocked_until = now() + interval '15 minutes', updated_at = now()
      where fingerprint_hash = p_fingerprint_hash;
    return false;
  end if;
  update private.pilot_login_attempts set attempt_count = attempt_count + 1, updated_at = now()
    where fingerprint_hash = p_fingerprint_hash;
  return true;
end;
$$;

create or replace function public.pilot_broker_clear_attempt(p_fingerprint_hash text)
returns void
language sql
security definer
set search_path = ''
as $$ delete from private.pilot_login_attempts where fingerprint_hash = p_fingerprint_hash; $$;

create or replace function public.pilot_broker_create_session(
  p_token_hash text, p_user_id uuid, p_access_token text, p_refresh_token text,
  p_auth_expires_at timestamptz, p_absolute_expires_at timestamptz,
  p_user_agent_hash text, p_ip_hash text
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into private.pilot_server_sessions
    (token_hash, user_id, access_token, refresh_token, auth_expires_at, absolute_expires_at, user_agent_hash, ip_hash)
  values
    (p_token_hash, p_user_id, p_access_token, p_refresh_token, p_auth_expires_at,
     least(p_absolute_expires_at, now() + interval '8 hours'), p_user_agent_hash, p_ip_hash);
$$;

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
  update private.pilot_server_sessions set last_seen_at = now()
  where token_hash = p_token_hash and revoked_at is null and absolute_expires_at > now();
  return query
    select s.user_id, s.access_token, s.refresh_token, s.auth_expires_at, s.absolute_expires_at
    from private.pilot_server_sessions s
    where s.token_hash = p_token_hash and s.revoked_at is null and s.absolute_expires_at > now();
end;
$$;

create or replace function public.pilot_broker_refresh_session(
  p_token_hash text, p_access_token text, p_refresh_token text, p_auth_expires_at timestamptz
)
returns void
language sql
security definer
set search_path = ''
as $$
  update private.pilot_server_sessions
  set access_token = p_access_token, refresh_token = p_refresh_token,
      auth_expires_at = p_auth_expires_at, last_seen_at = now()
  where token_hash = p_token_hash and revoked_at is null and absolute_expires_at > now();
$$;

create or replace function public.pilot_broker_revoke_session(p_token_hash text)
returns void
language sql
security definer
set search_path = ''
as $$
  update private.pilot_server_sessions set revoked_at = coalesce(revoked_at, now()), access_token = '', refresh_token = ''
  where token_hash = p_token_hash;
$$;

do $$
declare f regprocedure;
begin
  foreach f in array array[
    'public.pilot_broker_login_lookup(text)'::regprocedure,
    'public.pilot_broker_consume_attempt(text,integer)'::regprocedure,
    'public.pilot_broker_clear_attempt(text)'::regprocedure,
    'public.pilot_broker_create_session(text,uuid,text,text,timestamp with time zone,timestamp with time zone,text,text)'::regprocedure,
    'public.pilot_broker_get_session(text)'::regprocedure,
    'public.pilot_broker_refresh_session(text,text,text,timestamp with time zone)'::regprocedure,
    'public.pilot_broker_revoke_session(text)'::regprocedure
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
