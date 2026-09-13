-- Gazi hesaplı pilotunda dokuz rolün temel işlemleri ve ayrı karar yetkileri.
-- Tüm sentetik kayıtlar test sonunda geri alınır.
begin;

select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('pilot.test.catalog_id', (
  select c.id::text from public.pilot_account_catalog c
  join public.organizations o on o.id = c.organization_id
  where o.slug = 'gazi' order by c.code limit 1
), true);

-- Öğrenen: katalogdan kendi başvurusu.
select set_config('request.jwt.claim.sub', (select user_id::text from private.pilot_login_identities where normalized_username='gazi.ogrenci'), true);
set local role authenticated;
select public.pilot_workspace_command(
  'gazi','ogrenci','create_student_application',
  jsonb_build_object('catalogItemId', current_setting('pilot.test.catalog_id'), 'summary', 'Dokuz rol testi için SENTETİK başvuru.'),
  gen_random_uuid()
);
reset role;

-- Üniversite içi eğitici: program önerisi.
select set_config('request.jwt.claim.sub', (select user_id::text from private.pilot_login_identities where normalized_username='gazi.ic.egitici'), true);
set local role authenticated;
select set_config('pilot.test.case_id', (
  public.pilot_workspace_command(
    'gazi','ic-egitici','create_program_proposal',
    '{"title":"Dokuz Rol Zinciri — SENTETİK","summary":"Eğitici, koordinatör ve komisyon paylaşımını doğrulayan sentetik öneri."}'::jsonb,
    gen_random_uuid()
  )->>'caseId'
), true);
reset role;

-- Kurum dışı eğitici: kendi sağlayıcı kapsamıyla ayrı öneri.
select set_config('request.jwt.claim.sub', (select user_id::text from private.pilot_login_identities where normalized_username='gazi.dis.egitici'), true);
set local role authenticated;
select public.pilot_workspace_command(
  'gazi','dis-egitici','create_program_proposal',
  '{"title":"Kurum Dışı Dokuz Rol Önerisi — SENTETİK","summary":"Kurum dışı eğitici sahipliğini doğrulayan sentetik öneri."}'::jsonb,
  gen_random_uuid()
);
reset role;

-- Koordinatör: aynı kurum içindeki eğitici önerisini komisyona aktarır.
select set_config('request.jwt.claim.sub', (select user_id::text from private.pilot_login_identities where normalized_username='gazi.koordinator'), true);
set local role authenticated;
select public.pilot_workspace_command(
  'gazi','koordinator','coordinator_forward',
  jsonb_build_object('caseId', current_setting('pilot.test.case_id'), 'rationale', 'Kapsam ve kanıt alanları pilot ön incelemesinde doğrulandı.'),
  gen_random_uuid()
);
reset role;

-- Komisyon: öneriden ayrı, gerekçeli insan kararı.
select set_config('request.jwt.claim.sub', (select user_id::text from private.pilot_login_identities where normalized_username='gazi.komisyon'), true);
set local role authenticated;
select public.pilot_workspace_command(
  'gazi','komisyon','commission_decide',
  jsonb_build_object('caseId', current_setting('pilot.test.case_id'), 'decision', 'approved', 'rationale', 'İnsan değerlendirmesi sonucu yalnız sentetik pilot kapsamı için onaylandı.'),
  gen_random_uuid()
);
reset role;

-- Finans: gerçek tahsilat yapmayan dry-run.
select set_config('request.jwt.claim.sub', (select user_id::text from private.pilot_login_identities where normalized_username='gazi.finans'), true);
set local role authenticated;
select public.pilot_workspace_command(
  'gazi','mali-isler','finance_dry_run',
  jsonb_build_object('caseId', current_setting('pilot.test.case_id'), 'amount', '1250.00'),
  gen_random_uuid()
);
reset role;

-- Öğrenci işleri: simülasyon belgesi; tanıma ve ders yerine sayma ayrı kalır.
select set_config('request.jwt.claim.sub', (select user_id::text from private.pilot_login_identities where normalized_username='gazi.ogrenci.isleri'), true);
set local role authenticated;
select public.pilot_workspace_command(
  'gazi','ogrenci-isleri','student_affairs_issue',
  jsonb_build_object('caseId', current_setting('pilot.test.case_id')),
  gen_random_uuid()
);
reset role;

-- Bilgi işlem: bağlantısız entegrasyon dry-run.
select set_config('request.jwt.claim.sub', (select user_id::text from private.pilot_login_identities where normalized_username='gazi.bilgi.islem'), true);
set local role authenticated;
select public.pilot_workspace_command(
  'gazi','bilgi-islem','integration_dry_run',
  '{"integrationKey":"yoksis"}'::jsonb,
  gen_random_uuid()
);
reset role;

-- Sistem yöneticisi: yalnız erişim bağ kontrolü; akademik karar reddedilir.
select set_config('request.jwt.claim.sub', (select user_id::text from private.pilot_login_identities where normalized_username='gazi.sistem'), true);
set local role authenticated;
select public.pilot_workspace_command('gazi','sistem-yoneticisi','admin_access_check','{}'::jsonb,gen_random_uuid());
do $$
begin
  begin
    perform public.pilot_workspace_command(
      'gazi','sistem-yoneticisi','commission_decide',
      jsonb_build_object('caseId', current_setting('pilot.test.case_id'), 'decision', 'approved', 'rationale', 'Bu karar verilmemelidir.'),
      gen_random_uuid()
    );
    raise exception 'SYSTEM_ADMIN_ACADEMIC_DECISION_ALLOWED';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Oluşturulan çalışma zincirinin beklenen son durumunu owner olarak gör.
select set_config('request.jwt.claim.sub', (select user_id::text from private.pilot_login_identities where normalized_username='gazi.ic.egitici'), true);
set local role authenticated;
do $$
begin
  if not exists (
    select 1 from public.pilot_account_cases
    where id = current_setting('pilot.test.case_id')::uuid and status = 'credentialed'
  ) then raise exception 'NINE_ROLE_CHAIN_FINAL_STATE_FAILED'; end if;
end $$;
reset role;

rollback;
select 'PASS' as accounted_pilot_role_workflow;
