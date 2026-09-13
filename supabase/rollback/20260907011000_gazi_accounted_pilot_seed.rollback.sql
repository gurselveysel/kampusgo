-- Çalıştırma önkoşulu: sentetik pilot hesapları ve bunlara bağlı kayıtlar önce
-- kontrollü deprovision işlemiyle kaldırılmış olmalıdır. Bu dosya gerçek kullanıcı silmez.
begin;

do $$
begin
  if exists (
    select 1
    from public.pilot_account_cases c
    join public.organizations o on o.id = c.organization_id
    where o.slug in ('gazi', 'kdpu')
  ) then
    raise exception 'PILOT_ROLLBACK_BLOCKED_ACTIVE_CASES';
  end if;
end $$;

delete from public.pilot_institutional_rules
where organization_id in (select id from public.organizations where slug in ('gazi', 'kdpu'))
  and version_label in ('2017-12', '2022-04-04', '2026-09-07-check', 'pilot-1');

delete from public.pilot_account_catalog
where organization_id in (select id from public.organizations where slug in ('gazi', 'kdpu'))
  and code like any (array['GAZI-SNT-%', 'DPU-SNT-%']);

delete from public.pilot_workspace_settings
where route_slug in ('gazi', 'dpu');

delete from public.organizations o
where o.slug = 'gazi'
  and not exists (select 1 from public.profiles p where p.organization_id = o.id)
  and not exists (select 1 from public.user_roles ur where ur.organization_id = o.id);

commit;
