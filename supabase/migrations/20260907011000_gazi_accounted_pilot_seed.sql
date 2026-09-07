-- Kurum çalışma alanları ve yalnız sentetik katalog başlangıcı.
-- Kişi, gerçek eğitim, karar veya resmî belge içermez.

insert into public.organizations (name, slug, is_active)
values ('Gazi Üniversitesi', 'gazi', true)
on conflict (slug) do update
set name = excluded.name,
    is_active = excluded.is_active;

insert into public.pilot_workspace_settings
  (organization_id, route_slug, display_name, short_name, workspace_version, logo_path, theme, enabled_modules)
select
  o.id,
  'dpu',
  'Kütahya Dumlupınar Üniversitesi',
  'DPÜ',
  'accounted-pilot-1',
  '/assets/brand/kdpu-logo-web.png',
  '{"primary":"#10233F","secondary":"#D9A928","surface":"#F4F6F9","source":"Mevcut DPÜ pilot görünümü"}'::jsonb,
  array['home','catalog','application','proposal','review','commission','student-affairs','wallet','integration','finance','administration']
from public.organizations o
where o.slug = 'kdpu'
on conflict (organization_id) do update
set route_slug = excluded.route_slug,
    display_name = excluded.display_name,
    short_name = excluded.short_name,
    workspace_version = excluded.workspace_version,
    logo_path = excluded.logo_path,
    theme = excluded.theme,
    enabled_modules = excluded.enabled_modules,
    is_active = true,
    updated_at = now();

insert into public.pilot_workspace_settings
  (organization_id, route_slug, display_name, short_name, workspace_version, logo_path, theme, enabled_modules)
select
  o.id,
  'gazi',
  'Gazi Üniversitesi',
  'Gazi',
  'accounted-pilot-1',
  '/assets/brand/gazi/gazi-universitesi-logo.png',
  '{"primary":"#113971","secondary":"#BBE3FA","ink":"#13233A","surface":"#F5F8FC","source":"Gazi Üniversitesi Kurumsal Kimlik Kılavuzu, Aralık 2017"}'::jsonb,
  array['home','catalog','application','proposal','review','commission','student-affairs','wallet','integration','finance','administration']
from public.organizations o
where o.slug = 'gazi'
on conflict (organization_id) do update
set route_slug = excluded.route_slug,
    display_name = excluded.display_name,
    short_name = excluded.short_name,
    workspace_version = excluded.workspace_version,
    logo_path = excluded.logo_path,
    theme = excluded.theme,
    enabled_modules = excluded.enabled_modules,
    is_active = true,
    updated_at = now();

insert into public.pilot_account_catalog
  (organization_id, code, title, unit_name, summary, delivery_label, workload_label)
select o.id, seed.code, seed.title, seed.unit_name, seed.summary, seed.delivery_label, seed.workload_label
from public.organizations o
cross join (values
  ('DPU-SNT-001', 'Dijital Üretimde Veri Okuryazarlığı — SENTETİK', 'Pilot akademik birim', 'DPÜ hesaplı pilotunda başvuru akışını sınamak için sentetik katalog kaydıdır.', 'Karma • SİMÜLASYON', 'İş yükü kurumsal doğrulama bekliyor'),
  ('DPU-SNT-002', 'Proje Temelli Öğrenme Tasarımı — SENTETİK', 'Pilot eğitim birimi', 'Mevcut DPÜ pilot temasını ve temel hesaplı akışı sınamak için sentetik kayıttır.', 'Yüz yüze • SİMÜLASYON', 'İş yükü kurumsal doğrulama bekliyor')
) as seed(code, title, unit_name, summary, delivery_label, workload_label)
where o.slug = 'kdpu'
on conflict (organization_id, code) do update
set title = excluded.title,
    unit_name = excluded.unit_name,
    summary = excluded.summary,
    delivery_label = excluded.delivery_label,
    workload_label = excluded.workload_label,
    status = 'pilot';

insert into public.pilot_account_catalog
  (organization_id, code, title, unit_name, summary, delivery_label, workload_label)
select o.id, seed.code, seed.title, seed.unit_name, seed.summary, seed.delivery_label, seed.workload_label
from public.organizations o
cross join (values
  ('GAZI-SNT-001', 'Erişilebilir Dijital İçerik Tasarımı — SENTETİK', 'GAZİSEM pilot bağlamı', 'Gazi Üniversitesi tarafından gerçekten sunulduğu iddia edilmeyen, yalnız MYYS iş akışını sınayan sentetik program.', 'Karma • SİMÜLASYON', 'İş yükü ve AKTS değeri kurumsal doğrulama bekliyor'),
  ('GAZI-SNT-002', 'Sürdürülebilir Kampüs Veri Atölyesi — SENTETİK', 'Pilot disiplinlerarası birim', 'Katalog, başvuru ve izleme ekranlarını sınamak için oluşturulmuş sentetik içerik.', 'Yüz yüze • SİMÜLASYON', 'İş yükü ve AKTS değeri kurumsal doğrulama bekliyor'),
  ('GAZI-SNT-003', 'Öğrenme Kanıtı ve Dijital Rozet — SENTETİK', 'GAZİSEM pilot bağlamı', 'Belge doğrulama simülasyonunu göstermek için sentetik içerik; resmî eğitim veya belge değildir.', 'Uzaktan • SİMÜLASYON', 'İş yükü ve AKTS değeri kurumsal doğrulama bekliyor')
) as seed(code, title, unit_name, summary, delivery_label, workload_label)
where o.slug = 'gazi'
on conflict (organization_id, code) do update
set title = excluded.title,
    unit_name = excluded.unit_name,
    summary = excluded.summary,
    delivery_label = excluded.delivery_label,
    workload_label = excluded.workload_label,
    status = 'pilot';

insert into public.pilot_institutional_rules
  (organization_id, rule_key, version_label, status, value_text, source_url, source_title, decision_owner, effective_from, calculation_basis)
select o.id, seed.rule_key, seed.version_label, seed.status, seed.value_text, seed.source_url, seed.source_title, seed.decision_owner, seed.effective_from, seed.calculation_basis
from public.organizations o
cross join (values
  ('brand_primary', '2017-12', 'verified_reference', '#113971', 'https://basin.gazi.edu.tr/view/page/197633', 'Gazi Üniversitesi Kurumsal Kimlik Kılavuzu (Kaynak Dosyalar)', 'Gazi Üniversitesi kurumsal iletişim birimi', date '2017-12-01', 'Kılavuz Pantone 534C / c100 m80 y20 k20; resmî PNG baskın piksel rengi.'),
  ('brand_secondary', '2017-12', 'verified_reference', '#BBE3FA', 'https://basin.gazi.edu.tr/view/page/197633', 'Gazi Üniversitesi Kurumsal Kimlik Kılavuzu (Kaynak Dosyalar)', 'Gazi Üniversitesi kurumsal iletişim birimi', date '2017-12-01', 'Kılavuz Pantone 7457C / c30 m0 y0 k0; resmî PNG baskın piksel rengi.'),
  ('gazi_logo', '2022-04-04', 'verified_reference', 'Türkçe resmî amblem; oran ve renk değiştirilemez.', 'https://sosyalisler.gazi.edu.tr/view/page/288205/universitemiz-logosu', 'Üniversitemiz Logosu', 'Gazi Üniversitesi', date '2022-04-04', 'Kaynak sayfadaki Türkçe PNG varlığı doğrudan kullanılır.'),
  ('gazisem_unit', '2026-09-07-check', 'verified_reference', 'Gazi Üniversitesi Sürekli Eğitim Uygulama ve Araştırma Merkezi (GAZİSEM)', 'https://gazisem.gazi.edu.tr/view/page/192445', 'GAZİSEM Hakkında', 'Gazi Üniversitesi', null::date, 'Birim adı resmî GAZİSEM sayfasından doğrulandı.'),
  ('microcredential_governance', 'pilot-1', 'institutional_confirmation_required', 'Pilot koordinasyon/komisyon akışı; resmî kurul veya Senato kararı iddiası değildir.', 'https://gazisem.gazi.edu.tr/view/page/192445', 'GAZİSEM resmî başlangıç kaynağı', 'Gazi Üniversitesi yetkili organı — doğrulanacak', null::date, 'Yetki, süre ve karar zinciri kurumsal onay bekler.'),
  ('credit_recognition', 'pilot-1', 'institutional_confirmation_required', 'Belge doğrulama, AKTS tanıma ve ders yerine sayma ayrı insan kararlarıdır.', 'https://www.tyc.gov.tr/haber/mikro-yeterliliklerde-ulusal-yaklasimin-belirlenmesi-calistayi-gerceklestirildi-i89.html', 'Mikro Yeterliliklerde Ulusal Yaklaşımın Belirlenmesi Çalıştayı', 'Gazi Üniversitesi yetkili organı — doğrulanacak', null::date, 'Pilot önerileri TYÇ/TYYÇ/AYÇ referanslarından ve kurumsal karardan ayrı tutulur.')
) as seed(rule_key, version_label, status, value_text, source_url, source_title, decision_owner, effective_from, calculation_basis)
where o.slug = 'gazi'
on conflict (organization_id, rule_key, version_label) do update
set status = excluded.status,
    value_text = excluded.value_text,
    source_url = excluded.source_url,
    source_title = excluded.source_title,
    decision_owner = excluded.decision_owner,
    effective_from = excluded.effective_from,
    calculation_basis = excluded.calculation_basis;

insert into public.pilot_institutional_rules
  (organization_id, rule_key, version_label, status, value_text, source_url, source_title, decision_owner, calculation_basis)
select o.id, seed.rule_key, 'pilot-1', 'institutional_confirmation_required', seed.value_text,
       'https://kampusgo.uzemgo.com/pilot.html', 'Mevcut DPÜ v15 açık pilotu',
       'Kütahya Dumlupınar Üniversitesi yetkili organı — doğrulanacak', seed.calculation_basis
from public.organizations o
cross join (values
  ('accounted_pilot_boundary', 'Yeni hesaplı alan eski açık DPÜ v15 demosundan ayrıdır.', 'Eski demo verileri yeni hesaba otomatik sahiplenilmez.'),
  ('credit_recognition', 'Belge doğrulama, AKTS tanıma ve ders yerine sayma ayrı insan kararlarıdır.', 'Sayısal eşikler kurumsal karar olarak aktarılmaz.')
) as seed(rule_key, value_text, calculation_basis)
where o.slug = 'kdpu'
on conflict (organization_id, rule_key, version_label) do update
set status = excluded.status,
    value_text = excluded.value_text,
    calculation_basis = excluded.calculation_basis;
