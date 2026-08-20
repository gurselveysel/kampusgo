-- KDPÜ MYYS directive reference/access/lifecycle hardening follow-up.
--
-- PUBLIC ANONYMOUS DATA API SURFACE (EXACT):
--   underlying metadata tables:
--     * pilot_directive_source_registry
--     * pilot_directive_source_clause_links
--   security-invoker catalog views:
--     * pilot_directive_public_source_catalog
--     * pilot_directive_public_source_support_catalog
-- All operational, application, commission, finance, credential and audit
-- objects are authenticated SELECT-only. No API role receives a write grant
-- or write policy. Every row remains synthetic/dry-run and Production NO-GO.

begin;

alter table public.pilot_directive_source_registry
  add column if not exists source_date_label text;

create table if not exists public.pilot_directive_source_clause_links (
  id text primary key check (btrim(id) <> ''),
  source_id text not null references public.pilot_directive_source_registry(id) on update cascade on delete cascade,
  directive_version_id text not null references public.pilot_directive_versions(id) on update cascade on delete cascade,
  rule_parameter_id text references public.pilot_directive_rule_parameters(id) on update cascade on delete restrict,
  link_type text not null check (link_type in ('inventory_support', 'rule_support')),
  clause_reference text not null check (btrim(clause_reference) <> ''),
  supported_topics jsonb not null check (jsonb_typeof(supported_topics) = 'array' and jsonb_array_length(supported_topics) > 0),
  traceability_note text not null check (btrim(traceability_note) <> ''),
  public_reference boolean not null default true check (public_reference),
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  production_allowed boolean not null default false check (not production_allowed),
  real_system_effect boolean not null default false check (not real_system_effect),
  created_at timestamptz not null default now(),
  unique (source_id, directive_version_id, clause_reference, link_type),
  check ((link_type = 'rule_support') = (rule_parameter_id is not null))
);

create index if not exists pilot_directive_source_links_source_idx
  on public.pilot_directive_source_clause_links(source_id, directive_version_id);
create index if not exists pilot_directive_source_links_rule_idx
  on public.pilot_directive_source_clause_links(rule_parameter_id)
  where rule_parameter_id is not null;

-- S01-S27 mirror workstreams/directive/sources.json exactly at metadata level.
-- Source content, draft text and internal opinions are deliberately excluded.
insert into public.pilot_directive_source_registry
  (id, source_key, title, issuing_institution, publication_date, version_or_decision_no,
   source_url, accessed_on, supported_clauses, source_hash, hash_basis,
   official_primary_source, verification_status, public_reference,
   production_allowed, real_system_effect, institutional_validation_required)
values
  ('S01', 'directive_primary_s01', '2547 sayılı Yükseköğretim Kanunu', 'Mevzuat Bilgi Sistemi', '1981-11-04', 'güncel konsolide metin', 'https://www.mevzuat.gov.tr/MevzuatMetin/1.5.2547.pdf', '2026-08-20', '["Senato yetkisi","kredi","ölçme-değerlendirme","kalite"]', 'sha256:d94e8b5122fcef83f9d39c192c011b79c91343b7681c4dceaed67237b73911de', 'canonical_source_url', true, 'official_file_verified', true, false, false, true),
  ('S02', 'directive_primary_s02', 'Türkiye Yeterlilikler Çerçevesi Kapsamında Mikro Yeterliliklere İlişkin Usul ve Esaslar', 'Mesleki Yeterlilik Kurumu', '2025-05-26', '2025/02', 'https://myk.gov.tr/tr/page/81', '2026-08-20', '["ulusal mikro-yeterlilik politikası","sorumlu kurum politika belgesi"]', 'sha256:c59c5321ab1f9c46249400fd24b391771aa13cacdca150c18c3eba4e7a21bfc6', 'canonical_source_url', true, 'official_page_verified', true, false, false, true),
  ('S03', 'directive_primary_s03', '2025/02 yürürlük duyurusu', 'Mesleki Yeterlilik Kurumu', '2025-05-30', 'TYÇ Koordinasyon Kurulu 7. toplantı', 'https://myk.gov.tr/tr/haberler/resimli-haberler-anasayfa/turkiye-yeterlilikler-cercevesi-kapsaminda-mikro-yeterliliklere-iliskin-usul-ve-esaslar-yururluge-girdi-174858994', '2026-08-20', '["yürürlük","politika belgesi"]', 'sha256:065227001104bf9444a360ee0501dbd92a0e3c54bbe1da64bed3171038989ff0', 'canonical_source_url', true, 'official_page_verified', true, false, false, true),
  ('S04', 'directive_primary_s04', 'Türkiye Yeterlilikler Çerçevesinin Uygulanmasına İlişkin Usul ve Esaslar Hakkında Yönetmelik', 'MYK/Resmî Gazete', '2015-11-19', 'RG 29537; BKK 2015/8213', 'https://myk.gov.tr/tr/page/83', '2026-08-20', '["TYÇ yönetimi","sorumlu kurum","kalite"]', 'sha256:56fa8cc7faa4763ee67a6ba0aa2a96b43a53f9606c34f432fba9ba3e15858bee', 'canonical_source_url', true, 'official_page_verified', true, false, false, true),
  ('S05', 'directive_primary_s05', 'Türkiye Yeterlilikler Çerçevesine Dair Tebliğ ve eki TYÇ', 'MYK/Resmî Gazete', '2016-01-02', 'RG 29581', 'https://myk.gov.tr/tr/page/90', '2026-08-20', '["TYÇ seviye ve boyut tanımlayıcıları"]', 'sha256:93c68f1d98b633876323d2be1522a565dad624dd73a44755464a8e047c69a47d', 'canonical_source_url', true, 'official_page_verified', true, false, false, true),
  ('S06', 'directive_primary_s06', 'TYÇ''de Yer Alacak Yeterliliklerin Kalite Güvencesinin Sağlanmasına İlişkin Yönetmelik', 'MYK/Resmî Gazete', '2018-03-25', 'RG 30371', 'https://myk.gov.tr/tr/page/90', '2026-08-20', '["kalite güvencesi"]', 'sha256:93c68f1d98b633876323d2be1522a565dad624dd73a44755464a8e047c69a47d', 'canonical_source_url', true, 'official_page_verified', true, false, false, true),
  ('S07', 'directive_primary_s07', 'Türkiye Yeterlilikler Çerçevesi resmî bilgi sayfası', 'Türkiye Yeterlilikler Çerçevesi/MYK', null, 'resmî katalog', 'https://www.tyc.gov.tr/sayfa/turkiye-yeterlilikler-cercevesi-i0eaefe9f-2ecf-439c-a7af-f40d15fcc1a2.html', '2026-08-20', '["TYÇ tanımı","seviye ve boyut referansları"]', 'sha256:c34528f1c69188cba01f33cdb608a53fae910e1058211ccbb0e1aec2b862043d', 'canonical_source_url', true, 'official_page_verified', true, false, false, true),
  ('S08', 'directive_primary_s08', 'Yükseköğretim Yeterlilik Türleri', 'Yükseköğretim Kurulu', null, 'resmî tür belirleyicileri sayfası', 'https://uluslararasi.yok.gov.tr/Sayfalar/avrupa-yuksekogretim-alani-ile-uyum-projesi/yeterlikler-cercevesi/yuksekogretim-yeterlilik-turleri.aspx', '2026-08-20', '["TYYÇ tür belirleyicileri"]', 'sha256:cdc2e8476da7b7e7cb44c0bb3bfc27323eb639aa3db6ad78aac352d79e9914f2', 'canonical_source_url', true, 'official_page_verified', true, false, false, true),
  ('S09', 'directive_primary_s09', 'Türkiye Yeterlilikler Çerçevesi Logosu', 'Yükseköğretim Kurulu', '2024-06-26', 'resmî duyuru', 'https://www.yok.gov.tr/Sayfalar/Haberler/2024/turkiye-yeterlilik-cercevesi-logosu.aspx', '2026-08-20', '["resmî yerleştirme ve logo sınırı"]', 'sha256:440e6f399d0fcc826e6e97736bf749e0a527f7d223ce5c2f0274a77537577ee9', 'canonical_source_url', true, 'official_page_verified', true, false, false, true),
  ('S10', 'directive_primary_s10', 'European Qualifications Framework Recommendation', 'Council of the European Union', '2017-05-22', '2017/C 189/03', 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32017H0615(01)', '2026-08-20', '["EQF descriptors"]', 'sha256:826db17a0e3fb124ce46d7c67e8d674de691c560e47afe78358dbc688ead3447', 'canonical_source_url', true, 'official_page_verified', true, false, false, true),
  ('S11', 'directive_primary_s11', 'Key Competences for Lifelong Learning', 'Council of the European Union', '2018-05-22', '2018/C 189/01', 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32018H0604(01)', '2026-08-20', '["eight key competences"]', 'sha256:b342ab9cd35af4467f4ade44a251dea68cad0ec1c1673a5d16f92877c539bafd', 'canonical_source_url', true, 'official_page_verified', true, false, false, true),
  ('S12', 'directive_primary_s12', 'European approach to micro-credentials', 'Council of the European Union', '2022-06-16', '2022/C 243/02', 'https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32022H0627(02)', '2026-08-20', '["11 mandatory elements","10 design principles","recognition limits","portability"]', 'sha256:fcd5b23857a41e8391ea2f89e96fd94c055324ce2c4f6deef88e11168630745a', 'canonical_source_url', true, 'official_page_verified', true, false, false, true),
  ('S13', 'directive_primary_s13', 'ECTS Users'' Guide 2015', 'European Commission', null, 'PDF ISBN 978-92-79-43559-1, DOI 10.2766/87192; paper ISBN 978-92-79-43562-1, DOI 10.2766/87592', 'https://op.europa.eu/publication/doi/10.2766/87592', '2026-08-20', '["learning outcomes and workload"]', 'sha256:6cec6306a238a31af40646cb6f0379cc78d0bfe14190f5758c16fa201e028234', 'canonical_source_url', true, 'official_page_verified', true, false, false, true),
  ('S14', 'directive_primary_s14', 'ESG 2015', 'EHEA/ENQA', null, 'current approved version; 2027 revision is draft', 'https://www.enqa.eu/esg-standards-and-guidelines-for-quality-assurance-in-the-european-higher-education-area/', '2026-08-20', '["internal quality assurance","programme review"]', 'sha256:a7ccfc801919f3aa9392ec985fde37acf73f6e0a13dd7c65339c935db60155c0', 'canonical_source_url', true, 'official_page_verified', true, false, false, true),
  ('S15', 'directive_primary_s15', 'Yükseköğretim Kalite Kurulu kurumsal yetki sayfası', 'Yükseköğretim Kalite Kurulu', null, '2547 ek madde 35 dayanaklı', 'https://www.yokak.gov.tr/y-hakkimizda/', '2026-08-20', '["iç ve dış kalite güvencesi"]', 'sha256:dc6f8258e482f7b2265eeb411116cb783e78ff0ed54f6b780c273ed636e7bfb9', 'canonical_source_url', true, 'official_page_verified', true, false, false, true),
  ('S16', 'directive_primary_s16', '6698 sayılı Kişisel Verilerin Korunması Kanunu', 'Mevzuat Bilgi Sistemi', '2016-03-24', 'güncel konsolide metin', 'https://www.mevzuat.gov.tr/MevzuatMetin/1.5.6698.pdf', '2026-08-20', '["data minimisation","retention","security"]', 'sha256:fab52c94dcef08b03262d36048b02a41df99d455fda11ccd52ca1160e0f19cbe', 'canonical_source_url', true, 'official_file_verified', true, false, false, true),
  ('S17', 'directive_primary_s17', 'Türkiye Cumhuriyeti Kimlik Numaralarının İşlenmesi Hakkında Rehber', 'Kişisel Verileri Koruma Kurumu', null, 'resmî rehber', 'https://www.kvkk.gov.tr/Icerik/7798/Turkiye-Cumhuriyeti-Kimlik-Numaralarinin-Islenmesi-Hakkinda-Rehber', '2026-08-20', '["data minimisation","less intrusive identifiers"]', 'sha256:8b2493fdda47ddf31d1e9c02ce1fa2678d59bd2cfd6b0cfcbae04f6282c1db8b', 'canonical_source_url', true, 'official_page_verified', true, false, false, true),
  ('S18', 'directive_primary_s18', 'Kişisel Verilerin Silinmesi, Yok Edilmesi veya Anonim Hale Getirilmesi Hakkında Yönetmelik', 'Kişisel Verileri Koruma Kurumu', '2017-10-28', 'RG 30224; 2019 amendment', 'https://www.kvkk.gov.tr/Icerik/5441/KISISEL-VERILERIN-SILINMESI-YOK-EDILMESI-VEYA-ANONIM-HALE-GETIRILMESI-HAKKINDA-YONETMELIK', '2026-08-20', '["retention","destruction","audit"]', 'sha256:eb42d80a23d83b5a44b003de34867bfb84a76556d225760e52d1808a30f84d27', 'canonical_source_url', true, 'official_page_verified', true, false, false, true),
  ('S19', 'directive_primary_s19', 'Kamu tüzel kişiliğini haiz veri sorumlularının internet ortamında veri paylaşımı', 'Kişisel Verileri Koruma Kurulu', '2026-07-01', '2026/1301', 'https://www.kvkk.gov.tr/Icerik/8835/kamu-tuzel-kisiligini-haiz-veri-sorumlulari-tarafindan-kisisel-verilerin-internet-ortaminda-paylasilmasi-hakkinda-kisisel-verileri-koruma-kurulunun-01-07-2026-tarihli-ve-2026-1301-sayili-ilke-kararina-iliskin-kamuoyu-duyurusu', '2026-08-20', '["public verification privacy","masking","publication duration"]', 'sha256:e40ca695f067efcd1e2cdb089d07171e6a72810c88e794853e34962876decbb5', 'canonical_source_url', true, 'official_page_verified', true, false, false, true),
  ('S20', 'directive_primary_s20', 'Mevzuat Düzenleme İlkeleri', 'Kütahya Dumlupınar Üniversitesi', '2019-03-22', 'resmî kurum sayfası', 'https://oidb.dpu.edu.tr/tr/index/sayfa/3842/mevzuat-duzenleme-ilkeleri', '2026-08-20', '["drafting","comparison","opinions","Senate submission"]', 'sha256:9f21cffdc67883b218111d1fc514e0d0fb456c58358a3229a1514fe7dd6c329b', 'canonical_source_url', true, 'official_page_verified', true, false, false, true),
  ('S21', 'directive_primary_s21', 'Ön Lisans ve Lisans Eğitim-Öğretim Yönetmeliği', 'Kütahya Dumlupınar Üniversitesi/Mevzuat Bilgi Sistemi', null, 'MevzuatNo 23978', 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=23978&MevzuatTertip=5&MevzuatTur=8', '2026-08-20', '["course","credit","assessment","graduation"]', 'sha256:3469b3187424a2ad119f8197343dc29abb0ec26b127a3e8d5dcc97c1abb30470', 'canonical_source_url', true, 'official_page_verified', true, false, false, true),
  ('S22', 'directive_primary_s22', 'Lisansüstü Eğitim ve Öğretim Yönetmeliği', 'Kütahya Dumlupınar Üniversitesi/Mevzuat Bilgi Sistemi', null, 'MevzuatNo 34660', 'https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=34660&MevzuatTertip=5&MevzuatTur=8', '2026-08-20', '["graduate course and assessment"]', 'sha256:6f398b1d5ca15fa1624e87638a22a6d5c0596a689d80ba24e00c235fba444dcd', 'canonical_source_url', true, 'official_page_verified', true, false, false, true),
  ('S23', 'directive_primary_s23', 'Yönergeler, Esaslar, Senato Kararları dizini', 'Kütahya Dumlupınar Üniversitesi Öğrenci İşleri Daire Başkanlığı', null, 'güncel resmî liste', 'https://oidb.dpu.edu.tr/tr/index/sayfa/6846/yonergeler-esaslar-senato-kararlari', '2026-08-20', '["kurum içi çapraz norm kontrolü"]', 'sha256:83cc399afae1f424d12be74d829be293a2b8ab205787a983bb47a3d9ed4b9142', 'canonical_source_url', true, 'official_page_verified', true, false, false, true),
  ('S24', 'directive_primary_s24', 'Diploma, Sertifika ve Belgeler ile İlgili Yönerge', 'Kütahya Dumlupınar Üniversitesi', '2022-04-14', 'Senato 14; 2024 amendment', 'https://birimler.dpu.edu.tr/app/views/panel/ckfinder/userfiles/27/files/Kuetahya_Dumlup_nar_Ueniversitesi_Diploma%2C_Sertifika_ve_Belgeler__le__lgili_Yoenerge%281%29.pdf', '2026-08-20', '["issuer","document number","correction","replacement"]', 'sha256:87fcdbfc5397554e540424f2464a830ced213217cfb567fed9e862f5317221ce', 'canonical_source_url', true, 'official_file_verified', true, false, false, true),
  ('S25', 'directive_primary_s25', 'Sürekli Eğitim Uygulama ve Araştırma Merkezi Yönetmeliği', 'Kütahya Dumlupınar Üniversitesi', '2020-02-05', 'resmî yönetmelik', 'https://birimler.dpu.edu.tr/app/views/panel/ckfinder/userfiles/38/files/20200205_DPUSEM_Yonetmelik.pdf', '2026-08-20', '["non-formal provision","centre governance","fees"]', 'sha256:a44d0d92aff049960038c00ceefe6cc69c27e221433347b82efb66d0da2c5353', 'canonical_source_url', true, 'official_file_verified', true, false, false, true),
  ('S26', 'directive_primary_s26', 'Uzaktan Eğitim Uygulama ve Araştırma Merkezi mevzuat sayfası', 'Kütahya Dumlupınar Üniversitesi UZEM', '2025-11-20', 'resmî sayfa son güncelleme', 'https://uzem.dpu.edu.tr/tr/index/sayfa/3565/mevzuat', '2026-08-20', '["uzaktan öğretim","ÖYS/ALMS"]', 'sha256:717d6c0c4ce099a4b60f8a79ae83defa5bcacd7117512ce454a978d01e371362', 'canonical_source_url', true, 'official_page_verified', true, false, false, true),
  ('S27', 'directive_primary_s27', 'DPÜSEM resmî mevzuat ve kalite/ödeme bağlantıları sayfası', 'Kütahya Dumlupınar Üniversitesi DPÜSEM', '2025-11-21', 'resmî sayfa son güncelleme', 'https://dpusem.dpu.edu.tr/tr/index/sayfa/11161/mevzuat', '2026-08-20', '["programme offer","fees","quality cycle"]', 'sha256:2c4722aedae028e70c904cf86d989f2d97ff2701e32d62ab392031047f157279', 'canonical_source_url', true, 'official_page_verified', true, false, false, true)
on conflict (id) do update set
  source_key = excluded.source_key,
  title = excluded.title,
  issuing_institution = excluded.issuing_institution,
  publication_date = excluded.publication_date,
  version_or_decision_no = excluded.version_or_decision_no,
  source_url = excluded.source_url,
  accessed_on = excluded.accessed_on,
  supported_clauses = excluded.supported_clauses,
  source_hash = excluded.source_hash,
  hash_basis = excluded.hash_basis,
  official_primary_source = excluded.official_primary_source,
  verification_status = excluded.verification_status,
  public_reference = true,
  production_allowed = false,
  real_system_effect = false,
  institutional_validation_required = true;

update public.pilot_directive_source_registry
set source_date_label = case id
  when 'S01' then '1981-11-04' when 'S02' then '2025-05-26'
  when 'S03' then '2025-05-30' when 'S04' then '2015-11-19'
  when 'S05' then '2016-01-02' when 'S06' then '2018-03-25'
  when 'S07' then 'güncel' when 'S08' then 'güncel'
  when 'S09' then '2024-06-26' when 'S10' then '2017-05-22'
  when 'S11' then '2018-05-22' when 'S12' then '2022-06-16'
  when 'S13' then '2015' when 'S14' then '2015'
  when 'S15' then 'güncel' when 'S16' then '2016-03-24'
  when 'S17' then 'güncel' when 'S18' then '2017-10-28'
  when 'S19' then '2026-07-01' when 'S20' then '2019-03-22'
  when 'S21' then 'güncel' when 'S22' then 'güncel'
  when 'S23' then '2026' when 'S24' then '2022-04-14'
  when 'S25' then '2020-02-05' when 'S26' then '2025-11-20'
  when 'S27' then '2025-11-21' else source_date_label
end
where id ~ '^S(0[1-9]|1[0-9]|2[0-7])$';

do $source_date_constraint$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'pilot_directive_source_date_label_check'
      and conrelid = 'public.pilot_directive_source_registry'::regclass
  ) then
    alter table public.pilot_directive_source_registry
      add constraint pilot_directive_source_date_label_check
      check (id !~ '^S(0[1-9]|1[0-9]|2[0-7])$' or (source_date_label is not null and btrim(source_date_label) <> ''));
  end if;
end
$source_date_constraint$;

insert into public.pilot_directive_source_clause_links
  (id, source_id, directive_version_id, rule_parameter_id, link_type,
   clause_reference, supported_topics, traceability_note)
select
  'SOURCE-LINK-' || s.id,
  s.id,
  'DIR-DPU-MY-2026-DRAFT',
  null,
  'inventory_support',
  'Uyum paketi resmî kaynak envanteri ' || s.id,
  s.supported_clauses,
  'Yalnız resmî kaynak üst verisi ve destek kapsamı; kaynak metni ya da kurum içi görüş içermez.'
from public.pilot_directive_source_registry s
where s.id ~ '^S(0[1-9]|1[0-9]|2[0-7])$'
on conflict (id) do update set
  source_id = excluded.source_id,
  directive_version_id = excluded.directive_version_id,
  rule_parameter_id = excluded.rule_parameter_id,
  link_type = excluded.link_type,
  clause_reference = excluded.clause_reference,
  supported_topics = excluded.supported_topics,
  traceability_note = excluded.traceability_note,
  public_reference = true,
  institutional_validation_required = true,
  production_allowed = false,
  real_system_effect = false;

insert into public.pilot_directive_source_clause_links
  (id, source_id, directive_version_id, rule_parameter_id, link_type,
   clause_reference, supported_topics, traceability_note)
values
  ('SOURCE-RULE-S02-10PCT', 'S02', 'DIR-DPU-MY-2026-DRAFT', 'RULE-CREDIT-TEN-PERCENT', 'rule_support', 'Taslak Madde 7 / yüzde 10 aday kuralı', '["ulusal kaynak tam madde doğrulaması bekliyor"]', 'Kural kesinleştirilmez; 2025/02 tam metin ve kurumsal yorum doğrulaması gerekir.'),
  ('SOURCE-RULE-S02-REMOTE', 'S02', 'DIR-DPU-MY-2026-DRAFT', 'RULE-REMOTE-FIFTY-PERCENT', 'rule_support', 'Taslak Madde 7 / uzaktan tanıma aday kuralı', '["uzaktan sunum ve tanıma"]', 'Sunum biçimi tek başına otomatik ret doğurmaz; payda ve kapsam doğrulaması gerekir.'),
  ('SOURCE-RULE-S02-TERM', 'S02', 'DIR-DPU-MY-2026-DRAFT', 'RULE-TERM-FIVE-ECTS', 'rule_support', 'Taslak Madde 7 / dönem AKTS aday kuralı', '["kredi tanıma sınırı"]', 'Kısmi tanıma ve 6 AKTS edge-case için kurumsal karar gerekir.'),
  ('SOURCE-RULE-S13-ECTS', 'S13', 'DIR-DPU-MY-2026-DRAFT', 'RULE-TERM-FIVE-ECTS', 'rule_support', 'AKTS ve toplam öğrenen iş yükü ilişkisi', '["learning outcomes and workload"]', 'ECTS Users'' Guide iş yükü yaklaşımını destekler; taslaktaki sayısal dönem sınırını doğrulamaz.'),
  ('SOURCE-RULE-S21-CREDIT', 'S21', 'DIR-DPU-MY-2026-DRAFT', 'RULE-CREDIT-TEN-PERCENT', 'rule_support', 'Örgün kredi ve ders tanıma çapraz norm kontrolü', '["course","credit","assessment","graduation"]', 'Payda, program türü ve intibak etkisi kurumsal doğrulama bekler.'),
  ('SOURCE-RULE-S25-FINANCE', 'S25', 'DIR-DPU-MY-2026-DRAFT', 'RULE-REVIEW-THIRTY-DAYS', 'rule_support', 'DPÜSEM süreç ve görev ayrımı', '["non-formal provision","centre governance","fees"]', 'Süreyi doğrulamaz; DPÜSEM süreç ayrımı ve yetkili organ kontrolü için bağlanmıştır.')
on conflict (id) do update set
  source_id = excluded.source_id,
  directive_version_id = excluded.directive_version_id,
  rule_parameter_id = excluded.rule_parameter_id,
  link_type = excluded.link_type,
  clause_reference = excluded.clause_reference,
  supported_topics = excluded.supported_topics,
  traceability_note = excluded.traceability_note,
  public_reference = true,
  institutional_validation_required = true,
  production_allowed = false,
  real_system_effect = false;

-- Credential privacy and correction/reissue/retention lifecycle.
alter table public.pilot_directive_credentials
  add column if not exists retention_until date,
  add column if not exists retention_policy_status text not null default 'institutional_decision_required',
  add column if not exists correction_of_credential_id text references public.pilot_directive_credentials(id) on update cascade on delete restrict,
  add column if not exists reissued_at timestamptz,
  add column if not exists reissue_reason text,
  add column if not exists lifecycle_version integer not null default 1;

update public.pilot_directive_credentials
set
  retention_until = coalesce(retention_until, date '2031-08-20'),
  retention_policy_status = 'pilot_placeholder_not_authoritative',
  lifecycle_version = greatest(lifecycle_version, 1)
where is_synthetic;

insert into public.pilot_directive_credentials
  (id, public_document_id, holder_internal_ref, holder_display_masked,
   credential_title, issuing_country_or_region, awarding_body, issue_date,
   learning_outcomes, learner_workload_hours, pedagogical_reference_level,
   participation_form, assessment_type, quality_assurance_basis,
   program_id, program_version_no, status, retention_until,
   retention_policy_status, correction_of_credential_id, reissued_at,
   reissue_reason, lifecycle_version)
values
  ('CRED-V2-REISSUE', 'MYD-VERIFY-R3I5S7U9E2D4', 'SENTETIK-OGRENEN-002',
   'A***** D*****', 'Veri Okuryazarlığı Mikro Yeterliliği — DÜZELTME SİMÜLASYONU',
   'Türkiye', 'Kütahya Dumlupınar Üniversitesi — SENTETİK PİLOT', '2026-08-20',
   '["Veri problemini kanıta dayalı analiz eder"]', 82.5, 6,
   'Hibrit — SENTETİK', 'Proje, rubrik ve sözlü savunma — SENTETİK',
   'Düzeltme ve yeniden düzenleme bağlantısını sınayan sentetik pilot kayıt.',
   'PROGRAM-DATA-LITERACY', 1, 'issued_simulation', '2031-08-20',
   'pilot_placeholder_not_authoritative', 'CRED-V2-REVOKED',
   '2026-08-20T12:25:00Z', 'Önceki sentetik belgedeki gösterim düzeltildi.', 2)
on conflict (id) do update set
  retention_until = excluded.retention_until,
  retention_policy_status = excluded.retention_policy_status,
  correction_of_credential_id = excluded.correction_of_credential_id,
  reissued_at = excluded.reissued_at,
  reissue_reason = excluded.reissue_reason,
  lifecycle_version = excluded.lifecycle_version,
  status = 'issued_simulation',
  public_verification_enabled = true;

update public.pilot_directive_credential_revocations
set replacement_credential_id = 'CRED-V2-REISSUE'
where id = 'REVOCATION-001' and credential_id = 'CRED-V2-REVOKED';

do $credential_constraints$
begin
  if not exists (select 1 from pg_constraint where conname = 'pilot_directive_credentials_masked_no_digits_check' and conrelid = 'public.pilot_directive_credentials'::regclass) then
    alter table public.pilot_directive_credentials
      add constraint pilot_directive_credentials_masked_no_digits_check
      check (holder_display_masked ~ '\*' and holder_display_masked !~ '[0-9]');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'pilot_directive_credentials_public_text_no_national_id_check' and conrelid = 'public.pilot_directive_credentials'::regclass) then
    alter table public.pilot_directive_credentials
      add constraint pilot_directive_credentials_public_text_no_national_id_check
      check (concat_ws(' ', public_document_id, holder_display_masked, credential_title,
        issuing_country_or_region, awarding_body, learning_outcomes::text,
        participation_form, assessment_type, quality_assurance_basis, status)
        !~ '(^|[^0-9])[0-9]{11}([^0-9]|$)');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'pilot_directive_credentials_retention_check' and conrelid = 'public.pilot_directive_credentials'::regclass) then
    alter table public.pilot_directive_credentials
      add constraint pilot_directive_credentials_retention_check
      check (
        (retention_policy_status = 'institutional_decision_required' and retention_until is null)
        or
        (retention_policy_status = 'pilot_placeholder_not_authoritative' and retention_until >= issue_date)
      );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'pilot_directive_credentials_reissue_check' and conrelid = 'public.pilot_directive_credentials'::regclass) then
    alter table public.pilot_directive_credentials
      add constraint pilot_directive_credentials_reissue_check
      check (
        (correction_of_credential_id is null and reissued_at is null and reissue_reason is null and lifecycle_version = 1)
        or
        (correction_of_credential_id is not null and correction_of_credential_id <> id
          and reissued_at is not null and reissued_at::date >= issue_date and reissue_reason is not null
          and char_length(btrim(reissue_reason)) >= 10 and lifecycle_version > 1)
      );
  end if;
end
$credential_constraints$;

-- Independent appeal panel, notification and time-window model. The deadline
-- is explicitly a synthetic placeholder; it is not encoded as a final rule.
alter table public.pilot_directive_recognition_appeals
  add column if not exists notified_at timestamptz,
  add column if not exists filing_deadline_at timestamptz,
  add column if not exists review_started_at timestamptz,
  add column if not exists decided_at timestamptz,
  add column if not exists notification_channel text not null default 'pilot_in_app_simulation',
  add column if not exists deadline_rule_status text not null default 'institutional_validation_required',
  add column if not exists original_panel_reference text not null default 'SENTETIK-ILK-INCELEME-KURULU',
  add column if not exists appellate_panel_reference text not null default 'SENTETIK-UST-INCELEME-KURULU';

update public.pilot_directive_recognition_appeals
set
  notified_at = coalesce(notified_at, '2026-08-20T11:30:00Z'),
  filing_deadline_at = coalesce(filing_deadline_at, '2026-09-19T11:30:00Z'),
  review_started_at = coalesce(review_started_at, '2026-08-20T12:05:00Z'),
  notification_channel = 'pilot_in_app_simulation',
  deadline_rule_status = 'institutional_validation_required',
  original_panel_reference = 'SENTETIK-BIRIM-KOMISYONU',
  appellate_panel_reference = 'SENTETIK-EGITIM-OGRETIM-KOMISYONU'
where id = 'REC-APPEAL-001';

do $appeal_constraints$
begin
  if not exists (select 1 from pg_constraint where conname = 'pilot_directive_appeals_notification_deadline_check' and conrelid = 'public.pilot_directive_recognition_appeals'::regclass) then
    alter table public.pilot_directive_recognition_appeals
      add constraint pilot_directive_appeals_notification_deadline_check
      check (
        deadline_rule_status = 'institutional_validation_required'
        and notification_channel = 'pilot_in_app_simulation'
        and notified_at is not null
        and filing_deadline_at is not null
        and notified_at <= filed_at
        and filed_at <= filing_deadline_at
        and (review_started_at is null or review_started_at >= filed_at)
      );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'pilot_directive_appeals_decision_state_check' and conrelid = 'public.pilot_directive_recognition_appeals'::regclass) then
    alter table public.pilot_directive_recognition_appeals
      add constraint pilot_directive_appeals_decision_state_check
      check (
        (status = 'decided' and decided_at is not null and outcome is not null)
        or
        (status <> 'decided' and decided_at is null and outcome is null)
      );
  end if;
end
$appeal_constraints$;

create table if not exists public.pilot_directive_appeal_panel_members (
  appeal_id text not null references public.pilot_directive_recognition_appeals(id) on update cascade on delete cascade,
  panel_stage text not null check (panel_stage in ('original', 'appellate')),
  membership_id text not null references public.pilot_directive_body_memberships(id) on update cascade on delete restrict,
  participation_role text not null check (participation_role in ('chair', 'member', 'rapporteur')),
  conflict_screened boolean not null default true check (conflict_screened),
  recused boolean not null default false check (not recused),
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  production_allowed boolean not null default false check (not production_allowed),
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic),
  primary key (appeal_id, panel_stage, membership_id),
  unique (appeal_id, membership_id)
);

create index if not exists pilot_directive_appeal_panel_membership_idx
  on public.pilot_directive_appeal_panel_members(membership_id, appeal_id);

insert into public.pilot_directive_units
  (id, parent_unit_id, unit_code, unit_name, unit_type, decision_scope)
values
  ('UNIT-EOK', 'UNIT-DPU', 'EOK-SIM', 'Eğitim-Öğretim Komisyonu — SENTETİK', 'board', '["independent_appeal_review"]')
on conflict (id) do update set
  unit_name = excluded.unit_name,
  decision_scope = excluded.decision_scope,
  institutional_validation_required = true,
  production_allowed = false,
  real_system_effect = false,
  is_synthetic = true;

insert into public.pilot_directive_body_memberships
  (id, unit_id, body_type, synthetic_actor_ref, role_key, mandate_from,
   mandate_to, membership_role, decision_scope, may_vote,
   may_make_academic_decision, may_make_financial_decision)
values
  ('MEM-APPEAL-REVIEWER', 'UNIT-EOK', 'education_commission',
   'SENTETIK-ROL-APPEAL-REVIEWER', 'commission', '2026-08-20',
   '2027-08-19', 'reviewer', '["independent_appeal_review"]', true, true, false)
on conflict (id) do update set
  unit_id = excluded.unit_id,
  body_type = excluded.body_type,
  decision_scope = excluded.decision_scope,
  may_vote = true,
  may_make_academic_decision = true,
  may_make_financial_decision = false,
  system_admin_restriction = true,
  institutional_validation_required = true,
  production_allowed = false,
  real_system_effect = false,
  is_synthetic = true;

insert into public.pilot_directive_appeal_panel_members
  (appeal_id, panel_stage, membership_id, participation_role)
values
  ('REC-APPEAL-001', 'original', 'MEM-COMM-CHAIR', 'chair'),
  ('REC-APPEAL-001', 'appellate', 'MEM-APPEAL-REVIEWER', 'rapporteur')
on conflict (appeal_id, panel_stage, membership_id) do update set
  participation_role = excluded.participation_role,
  conflict_screened = true,
  recused = false;

-- Audit/outbox one-to-one atomicity for events that explicitly request a
-- dry-run integration projection.
alter table public.pilot_directive_audit_events
  add column if not exists outbox_required boolean not null default false;

update public.pilot_directive_audit_events
set outbox_required = true
where id = 'AUDIT-DIR-001';

create unique index if not exists pilot_directive_outbox_audit_event_unique_idx
  on public.pilot_directive_outbox(audit_event_id);

create or replace function public.pilot_assert_directive_workload(
  p_program_id text,
  p_version_no integer
) returns void
language plpgsql
security invoker
set search_path = pg_catalog, public
as $workload_assert$
declare
  v_status text;
  v_ects numeric;
  v_total numeric;
  v_component_count integer;
  v_component_type_count integer;
  v_component_sum numeric;
begin
  if p_program_id is null or p_version_no is null then
    return;
  end if;

  select status, ects, total_learner_workload_hours
  into v_status, v_ects, v_total
  from public.pilot_directive_program_versions
  where program_id = p_program_id and version_no = p_version_no;

  if not found or v_status <> 'simulation_ready' then
    return;
  end if;

  select count(*)::integer, count(distinct component_type)::integer,
    coalesce(sum(planned_hours), 0)
  into v_component_count, v_component_type_count, v_component_sum
  from public.pilot_directive_workload_items
  where program_id = p_program_id and program_version_no = p_version_no;

  if v_component_count <> 8 or v_component_type_count <> 8 then
    raise exception using
      errcode = '23514',
      message = format('simulation_ready requires exact workload 8/8 for %s:%s', p_program_id, p_version_no);
  end if;
  if v_component_sum <> v_total then
    raise exception using
      errcode = '23514',
      message = format('workload component sum must equal total for %s:%s', p_program_id, p_version_no);
  end if;
  if v_total < 25 * v_ects or v_total > 30 * v_ects then
    raise exception using
      errcode = '23514',
      message = format('ECTS/workload band invalid for %s:%s', p_program_id, p_version_no);
  end if;
end
$workload_assert$;

create or replace function public.pilot_enforce_directive_workload()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $workload_trigger$
begin
  if tg_table_name = 'pilot_directive_program_versions' then
    if tg_op <> 'INSERT' then
      perform public.pilot_assert_directive_workload(old.program_id, old.version_no);
    end if;
    if tg_op <> 'DELETE' then
      perform public.pilot_assert_directive_workload(new.program_id, new.version_no);
    end if;
  else
    if tg_op <> 'INSERT' then
      perform public.pilot_assert_directive_workload(old.program_id, old.program_version_no);
    end if;
    if tg_op <> 'DELETE' then
      perform public.pilot_assert_directive_workload(new.program_id, new.program_version_no);
    end if;
  end if;
  return null;
end
$workload_trigger$;

drop trigger if exists pilot_directive_program_workload_integrity on public.pilot_directive_program_versions;
create constraint trigger pilot_directive_program_workload_integrity
after insert or update or delete on public.pilot_directive_program_versions
deferrable initially deferred for each row
execute function public.pilot_enforce_directive_workload();

drop trigger if exists pilot_directive_workload_item_integrity on public.pilot_directive_workload_items;
create constraint trigger pilot_directive_workload_item_integrity
after insert or update or delete on public.pilot_directive_workload_items
deferrable initially deferred for each row
execute function public.pilot_enforce_directive_workload();

create or replace function public.pilot_assert_credential_lifecycle(p_credential_id text)
returns void
language plpgsql
security invoker
set search_path = pg_catalog, public
as $credential_assert$
declare
  v_status text;
  v_correction_of text;
  v_revocation_count integer;
begin
  if p_credential_id is null then
    return;
  end if;

  select status, correction_of_credential_id
  into v_status, v_correction_of
  from public.pilot_directive_credentials
  where id = p_credential_id;

  if not found then
    return;
  end if;

  select count(*)::integer into v_revocation_count
  from public.pilot_directive_credential_revocations
  where credential_id = p_credential_id;

  if (v_status = 'revoked_simulation') <> (v_revocation_count = 1) then
    raise exception using
      errcode = '23514',
      message = format('credential status/revocation mismatch for %s', p_credential_id);
  end if;

  if exists (
    select 1
    from public.pilot_directive_credential_revocations r
    left join public.pilot_directive_credentials replacement
      on replacement.id = r.replacement_credential_id
    where r.credential_id = p_credential_id
      and r.replacement_credential_id is not null
      and replacement.correction_of_credential_id is distinct from p_credential_id
  ) then
    raise exception using
      errcode = '23514',
      message = format('revocation replacement must point back through correction linkage for %s', p_credential_id);
  end if;

  if v_correction_of is not null and not exists (
    select 1
    from public.pilot_directive_credential_revocations r
    where r.credential_id = v_correction_of
      and r.replacement_credential_id = p_credential_id
  ) then
    raise exception using
      errcode = '23514',
      message = format('reissued credential must be linked atomically from revocation for %s', p_credential_id);
  end if;
end
$credential_assert$;

create or replace function public.pilot_enforce_credential_lifecycle()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $credential_trigger$
begin
  if tg_table_name = 'pilot_directive_credentials' then
    if tg_op <> 'INSERT' then
      perform public.pilot_assert_credential_lifecycle(old.id);
    end if;
    if tg_op <> 'DELETE' then
      perform public.pilot_assert_credential_lifecycle(new.id);
    end if;
  else
    if tg_op <> 'INSERT' then
      perform public.pilot_assert_credential_lifecycle(old.credential_id);
      perform public.pilot_assert_credential_lifecycle(old.replacement_credential_id);
    end if;
    if tg_op <> 'DELETE' then
      perform public.pilot_assert_credential_lifecycle(new.credential_id);
      perform public.pilot_assert_credential_lifecycle(new.replacement_credential_id);
    end if;
  end if;
  return null;
end
$credential_trigger$;

drop trigger if exists pilot_directive_credential_lifecycle_integrity on public.pilot_directive_credentials;
create constraint trigger pilot_directive_credential_lifecycle_integrity
after insert or update or delete on public.pilot_directive_credentials
deferrable initially deferred for each row
execute function public.pilot_enforce_credential_lifecycle();

drop trigger if exists pilot_directive_revocation_lifecycle_integrity on public.pilot_directive_credential_revocations;
create constraint trigger pilot_directive_revocation_lifecycle_integrity
after insert or update or delete on public.pilot_directive_credential_revocations
deferrable initially deferred for each row
execute function public.pilot_enforce_credential_lifecycle();

create or replace function public.pilot_assert_appeal_panel(p_appeal_id text)
returns void
language plpgsql
security invoker
set search_path = pg_catalog, public
as $appeal_assert$
declare
  v_status text;
  v_original_count integer;
  v_appellate_count integer;
begin
  if p_appeal_id is null then
    return;
  end if;

  select status into v_status
  from public.pilot_directive_recognition_appeals
  where id = p_appeal_id;

  if not found or v_status not in ('independent_review', 'decided') then
    return;
  end if;

  select
    count(*) filter (where panel_stage = 'original')::integer,
    count(*) filter (where panel_stage = 'appellate')::integer
  into v_original_count, v_appellate_count
  from public.pilot_directive_appeal_panel_members
  where appeal_id = p_appeal_id;

  if v_original_count < 1 or v_appellate_count < 1 then
    raise exception using
      errcode = '23514',
      message = format('independent appeal requires original and appellate panel records for %s', p_appeal_id);
  end if;

  if exists (
    select 1
    from public.pilot_directive_appeal_panel_members original_member
    join public.pilot_directive_body_memberships original_membership
      on original_membership.id = original_member.membership_id
    join public.pilot_directive_appeal_panel_members appellate_member
      on appellate_member.appeal_id = original_member.appeal_id
      and appellate_member.panel_stage = 'appellate'
    join public.pilot_directive_body_memberships appellate_membership
      on appellate_membership.id = appellate_member.membership_id
    where original_member.appeal_id = p_appeal_id
      and original_member.panel_stage = 'original'
      and original_membership.unit_id = appellate_membership.unit_id
  ) then
    raise exception using
      errcode = '23514',
      message = format('original and appellate panel units must be independent for %s', p_appeal_id);
  end if;
end
$appeal_assert$;

create or replace function public.pilot_enforce_appeal_panel()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $appeal_trigger$
begin
  if tg_table_name = 'pilot_directive_recognition_appeals' then
    if tg_op <> 'INSERT' then
      perform public.pilot_assert_appeal_panel(old.id);
    end if;
    if tg_op <> 'DELETE' then
      perform public.pilot_assert_appeal_panel(new.id);
    end if;
  else
    if tg_op <> 'INSERT' then
      perform public.pilot_assert_appeal_panel(old.appeal_id);
    end if;
    if tg_op <> 'DELETE' then
      perform public.pilot_assert_appeal_panel(new.appeal_id);
    end if;
  end if;
  return null;
end
$appeal_trigger$;

create or replace function public.pilot_enforce_appeal_membership_unit()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $appeal_membership_trigger$
declare
  v_appeal_id text;
begin
  for v_appeal_id in
    select distinct panel.appeal_id
    from public.pilot_directive_appeal_panel_members panel
    where panel.membership_id = any(array[old.id, new.id])
  loop
    perform public.pilot_assert_appeal_panel(v_appeal_id);
  end loop;
  return null;
end
$appeal_membership_trigger$;

drop trigger if exists pilot_directive_appeal_state_panel_integrity on public.pilot_directive_recognition_appeals;
create constraint trigger pilot_directive_appeal_state_panel_integrity
after insert or update or delete on public.pilot_directive_recognition_appeals
deferrable initially deferred for each row
execute function public.pilot_enforce_appeal_panel();

drop trigger if exists pilot_directive_appeal_member_panel_integrity on public.pilot_directive_appeal_panel_members;
create constraint trigger pilot_directive_appeal_member_panel_integrity
after insert or update or delete on public.pilot_directive_appeal_panel_members
deferrable initially deferred for each row
execute function public.pilot_enforce_appeal_panel();

drop trigger if exists pilot_directive_appeal_membership_unit_integrity on public.pilot_directive_body_memberships;
create constraint trigger pilot_directive_appeal_membership_unit_integrity
after update of unit_id on public.pilot_directive_body_memberships
deferrable initially deferred for each row
execute function public.pilot_enforce_appeal_membership_unit();

create or replace function public.pilot_assert_audit_outbox(p_audit_event_id text)
returns void
language plpgsql
security invoker
set search_path = pg_catalog, public
as $audit_assert$
declare
  v_required boolean;
  v_outbox_count integer;
begin
  if p_audit_event_id is null then
    return;
  end if;
  select outbox_required into v_required
  from public.pilot_directive_audit_events
  where id = p_audit_event_id;
  if not found then
    return;
  end if;
  select count(*)::integer into v_outbox_count
  from public.pilot_directive_outbox
  where audit_event_id = p_audit_event_id;
  if v_required and v_outbox_count <> 1 then
    raise exception using
      errcode = '23514',
      message = format('audit event requires exactly one dry-run outbox row for %s', p_audit_event_id);
  end if;
end
$audit_assert$;

create or replace function public.pilot_enforce_audit_outbox()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $audit_trigger$
begin
  if tg_table_name = 'pilot_directive_audit_events' then
    if tg_op <> 'INSERT' then perform public.pilot_assert_audit_outbox(old.id); end if;
    if tg_op <> 'DELETE' then perform public.pilot_assert_audit_outbox(new.id); end if;
  else
    if tg_op <> 'INSERT' then perform public.pilot_assert_audit_outbox(old.audit_event_id); end if;
    if tg_op <> 'DELETE' then perform public.pilot_assert_audit_outbox(new.audit_event_id); end if;
  end if;
  return null;
end
$audit_trigger$;

drop trigger if exists pilot_directive_audit_outbox_integrity on public.pilot_directive_audit_events;
create constraint trigger pilot_directive_audit_outbox_integrity
after insert or update or delete on public.pilot_directive_audit_events
deferrable initially deferred for each row
execute function public.pilot_enforce_audit_outbox();

drop trigger if exists pilot_directive_outbox_audit_integrity on public.pilot_directive_outbox;
create constraint trigger pilot_directive_outbox_audit_integrity
after insert or update or delete on public.pilot_directive_outbox
deferrable initially deferred for each row
execute function public.pilot_enforce_audit_outbox();

-- Public official-reference metadata views. These are the only anonymous
-- directive views and contain no draft text, internal opinion or actor data.
create or replace view public.pilot_directive_public_source_catalog
with (security_invoker = true)
as
select
  id as source_id,
  title,
  issuing_institution,
  source_date_label,
  publication_date,
  version_or_decision_no,
  source_url,
  accessed_on,
  supported_clauses as supported_topics,
  source_hash,
  hash_basis,
  official_primary_source,
  verification_status,
  institutional_validation_required
from public.pilot_directive_source_registry
where id ~ '^S(0[1-9]|1[0-9]|2[0-7])$'
  and public_reference
  and not production_allowed
  and not real_system_effect;

create or replace view public.pilot_directive_public_source_support_catalog
with (security_invoker = true)
as
select
  l.id,
  l.source_id,
  s.title as source_title,
  l.directive_version_id,
  l.rule_parameter_id,
  l.link_type,
  l.clause_reference,
  l.supported_topics,
  l.traceability_note,
  l.institutional_validation_required
from public.pilot_directive_source_clause_links l
join public.pilot_directive_source_registry s on s.id = l.source_id
where l.public_reference and s.public_reference
  and s.id ~ '^S(0[1-9]|1[0-9]|2[0-7])$'
  and s.official_primary_source
  and s.institutional_validation_required
  and not l.production_allowed and not l.real_system_effect
  and not s.production_allowed and not s.real_system_effect;

-- Exactly one canonical DTO row for each of the nine demo roles. Additional
-- committee members remain in the membership table but cannot duplicate the
-- role catalog contract.
create or replace view public.pilot_directive_role_scope_catalog
with (security_invoker = true)
as
with ranked_memberships as (
  select
    m.*,
    row_number() over (
      partition by m.role_key
      order by
        case m.id
          when 'MEM-LEARNER' then 1
          when 'MEM-INSTRUCTOR' then 1
          when 'MEM-EXTERNAL' then 1
          when 'MEM-COORD' then 1
          when 'MEM-COMM-CHAIR' then 1
          when 'MEM-STUDENT-AFFAIRS' then 1
          when 'MEM-IT' then 1
          when 'MEM-FINANCE' then 1
          when 'MEM-ADMIN' then 1
          else 99
        end,
        m.id
    ) as role_rank
  from public.pilot_directive_body_memberships m
  where m.is_synthetic and m.institutional_validation_required
    and not m.production_allowed and not m.real_system_effect
)
select
  m.id,
  m.unit_id,
  u.unit_name,
  u.unit_type,
  m.body_type,
  m.synthetic_actor_ref,
  m.role_key,
  case m.role_key
    when 'learner' then 'Öğrenen / Öğrenci'
    when 'instructor' then 'Üniversite içi eğitici'
    when 'externalInstructor' then 'Kurum dışı eğitici'
    when 'coordinator' then 'Koordinatörlük / SEM'
    when 'commission' then 'Komisyon üyesi'
    when 'studentAffairs' then 'Öğrenci İşleri'
    when 'it' then 'Bilgi İşlem'
    when 'finance' then 'Finans / Döner Sermaye'
    when 'admin' then 'Sistem yöneticisi'
  end as role_label,
  m.membership_role,
  m.mandate_from,
  m.mandate_to,
  m.decision_scope,
  m.may_vote,
  m.may_make_academic_decision,
  m.may_make_financial_decision,
  m.system_admin_restriction,
  m.institutional_validation_required
from ranked_memberships m
join public.pilot_directive_units u on u.id = m.unit_id
where m.role_rank = 1
  and u.is_synthetic and not u.production_allowed and not u.real_system_effect;

create or replace view public.pilot_directive_credential_lifecycle_catalog
with (security_invoker = true)
as
select
  c.id,
  c.public_document_id,
  c.status,
  c.issue_date,
  c.expires_on,
  c.retention_until,
  c.retention_policy_status,
  c.correction_of_credential_id,
  c.reissued_at,
  c.reissue_reason,
  c.lifecycle_version,
  r.id as revocation_id,
  r.revoked_at,
  r.reason as revocation_reason,
  r.replacement_credential_id,
  (c.status = 'revoked_simulation') = (r.id is not null) as status_link_consistent,
  c.institutional_validation_required
from public.pilot_directive_credentials c
left join public.pilot_directive_credential_revocations r on r.credential_id = c.id
where c.is_synthetic and not c.production_allowed and not c.real_system_effect;

create or replace view public.pilot_directive_appeal_integrity_catalog
with (security_invoker = true)
as
select
  a.id,
  a.original_decision_id,
  a.original_deciding_body,
  a.appellate_body,
  a.status,
  a.notified_at,
  a.filed_at,
  a.filing_deadline_at,
  a.review_started_at,
  a.decided_at,
  a.notification_channel,
  a.deadline_rule_status,
  a.original_panel_reference,
  a.appellate_panel_reference,
  (select count(*)::integer from public.pilot_directive_appeal_panel_members p where p.appeal_id = a.id and p.panel_stage = 'original') as original_panel_member_count,
  (select count(*)::integer from public.pilot_directive_appeal_panel_members p where p.appeal_id = a.id and p.panel_stage = 'appellate') as appellate_panel_member_count,
  not exists (
    select 1
    from public.pilot_directive_appeal_panel_members op
    join public.pilot_directive_appeal_panel_members ap
      on ap.appeal_id = op.appeal_id and ap.membership_id = op.membership_id
    where op.appeal_id = a.id and op.panel_stage = 'original' and ap.panel_stage = 'appellate'
  ) as no_member_overlap,
  a.filed_at between a.notified_at and a.filing_deadline_at as filing_within_window,
  a.institutional_validation_required
from public.pilot_directive_recognition_appeals a
where a.is_synthetic and not a.production_allowed and not a.real_system_effect;

-- Trusted JWT claim helpers. Authorization uses app_metadata only; missing,
-- malformed or generic authenticated claims fail closed. SECURITY DEFINER is
-- intentionally not used.
create or replace function public.pilot_directive_has_read_claim(
  p_allowed_roles text[],
  p_required_scope text
) returns boolean
language sql
stable
security invoker
set search_path = ''
as $claim_check$
  select
    (select auth.uid()) is not null
    and coalesce((select auth.jwt()) -> 'app_metadata' ->> 'myys_role', '') = any(p_allowed_roles)
    and jsonb_typeof(coalesce((select auth.jwt()) -> 'app_metadata' -> 'decision_scopes', '[]'::jsonb)) = 'array'
    and coalesce((select auth.jwt()) -> 'app_metadata' -> 'decision_scopes', '[]'::jsonb) ? p_required_scope
$claim_check$;

create or replace function public.pilot_directive_has_unit_claim(p_unit_id text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $unit_claim_check$
  select
    p_unit_id is not null
    and jsonb_typeof(coalesce((select auth.jwt()) -> 'app_metadata' -> 'unit_ids', '[]'::jsonb)) = 'array'
    and coalesce((select auth.jwt()) -> 'app_metadata' -> 'unit_ids', '[]'::jsonb) ? p_unit_id
$unit_claim_check$;

revoke all on function public.pilot_directive_has_read_claim(text[], text) from public, anon, authenticated;
revoke all on function public.pilot_directive_has_unit_claim(text) from public, anon, authenticated;
grant execute on function public.pilot_directive_has_read_claim(text[], text) to authenticated;
grant execute on function public.pilot_directive_has_unit_claim(text) to authenticated;

-- Remove the former broad anon/authenticated operational policy and replace it
-- with per-table role allowlists plus unit/body scope whenever the schema has a
-- relational unit path. There is still no INSERT/UPDATE/DELETE grant or policy.
do $scoped_security$
declare
  spec record;
begin
  for spec in
    select * from (values
      ('pilot_directive_versions', '{coordinator,commission}', 'true'),
      ('pilot_directive_rule_parameters', '{coordinator,commission}', 'true'),
      ('pilot_directive_decision_register', '{coordinator,commission}', 'true'),
      ('pilot_directive_units', '{coordinator,commission,studentAffairs,it,finance,admin}', 'public.pilot_directive_has_unit_claim(id)'),
      ('pilot_directive_body_memberships', '{coordinator,commission,studentAffairs,it,finance,admin}', 'public.pilot_directive_has_unit_claim(unit_id)'),
      ('pilot_directive_programs', '{instructor,externalInstructor,coordinator,commission,studentAffairs,it,finance}', 'public.pilot_directive_has_unit_claim(owner_unit_id)'),
      ('pilot_directive_program_versions', '{instructor,externalInstructor,coordinator,commission,studentAffairs,it,finance}', 'exists (select 1 from public.pilot_directive_programs p where p.id = pilot_directive_program_versions.program_id and public.pilot_directive_has_unit_claim(p.owner_unit_id))'),
      ('pilot_directive_workload_items', '{instructor,externalInstructor,coordinator,commission,studentAffairs,it,finance}', 'exists (select 1 from public.pilot_directive_programs p where p.id = pilot_directive_workload_items.program_id and public.pilot_directive_has_unit_claim(p.owner_unit_id))'),
      ('pilot_directive_terms', '{coordinator,studentAffairs}', 'true'),
      ('pilot_directive_offerings', '{coordinator,studentAffairs}', 'exists (select 1 from public.pilot_directive_programs p where p.id = pilot_directive_offerings.program_id and public.pilot_directive_has_unit_claim(p.owner_unit_id))'),
      ('pilot_directive_enrollment_queue', '{coordinator,studentAffairs}', 'exists (select 1 from public.pilot_directive_offerings o join public.pilot_directive_programs p on p.id = o.program_id where o.id = pilot_directive_enrollment_queue.offering_id and public.pilot_directive_has_unit_claim(p.owner_unit_id))'),
      ('pilot_directive_recognition_cases', '{coordinator,commission,studentAffairs}', 'true'),
      ('pilot_directive_recognition_checks', '{coordinator,commission,studentAffairs}', 'true'),
      ('pilot_directive_recognition_decisions', '{coordinator,commission,studentAffairs}', 'true'),
      ('pilot_directive_recognition_appeals', '{coordinator,commission,studentAffairs}', 'true'),
      ('pilot_directive_appeal_panel_members', '{coordinator,commission,studentAffairs}', 'exists (select 1 from public.pilot_directive_body_memberships m where m.id = pilot_directive_appeal_panel_members.membership_id and public.pilot_directive_has_unit_claim(m.unit_id))'),
      ('pilot_directive_double_counting_registry', '{coordinator,commission,studentAffairs}', 'true'),
      ('pilot_directive_commission_meetings', '{coordinator,commission}', 'public.pilot_directive_has_unit_claim(body_unit_id)'),
      ('pilot_directive_meeting_participants', '{coordinator,commission}', 'exists (select 1 from public.pilot_directive_commission_meetings m where m.id = pilot_directive_meeting_participants.meeting_id and public.pilot_directive_has_unit_claim(m.body_unit_id))'),
      ('pilot_directive_commission_votes', '{coordinator,commission}', 'exists (select 1 from public.pilot_directive_commission_meetings m where m.id = pilot_directive_commission_votes.meeting_id and public.pilot_directive_has_unit_claim(m.body_unit_id))'),
      ('pilot_directive_commission_resolutions', '{coordinator,commission}', 'exists (select 1 from public.pilot_directive_commission_meetings m where m.id = pilot_directive_commission_resolutions.meeting_id and public.pilot_directive_has_unit_claim(m.body_unit_id))'),
      ('pilot_directive_credentials', '{studentAffairs,it}', 'exists (select 1 from public.pilot_directive_programs p where p.id = pilot_directive_credentials.program_id and public.pilot_directive_has_unit_claim(p.owner_unit_id))'),
      ('pilot_directive_credential_revocations', '{studentAffairs,it}', 'exists (select 1 from public.pilot_directive_credentials c join public.pilot_directive_programs p on p.id = c.program_id where c.id = pilot_directive_credential_revocations.credential_id and public.pilot_directive_has_unit_claim(p.owner_unit_id))'),
      ('pilot_directive_verification_events', '{studentAffairs,it}', 'exists (select 1 from public.pilot_directive_credentials c join public.pilot_directive_programs p on p.id = c.program_id where c.id = pilot_directive_verification_events.credential_id and public.pilot_directive_has_unit_claim(p.owner_unit_id))'),
      ('pilot_directive_award_states', '{studentAffairs,it}', 'exists (select 1 from public.pilot_directive_programs p where p.id = pilot_directive_award_states.program_id and public.pilot_directive_has_unit_claim(p.owner_unit_id))'),
      ('pilot_directive_quality_reviews', '{coordinator,commission}', 'exists (select 1 from public.pilot_directive_programs p where p.id = pilot_directive_quality_reviews.program_id and public.pilot_directive_has_unit_claim(p.owner_unit_id))'),
      ('pilot_directive_sunset_plans', '{coordinator,commission,studentAffairs}', 'exists (select 1 from public.pilot_directive_programs p where p.id = pilot_directive_sunset_plans.program_id and public.pilot_directive_has_unit_claim(p.owner_unit_id))'),
      ('pilot_directive_finance_cases', '{finance}', 'exists (select 1 from public.pilot_directive_programs p where p.id = pilot_directive_finance_cases.program_id and public.pilot_directive_has_unit_claim(p.owner_unit_id))'),
      ('pilot_directive_rule_evaluations', '{coordinator,commission,studentAffairs}', 'true'),
      ('pilot_directive_audit_events', '{it,admin}', 'true'),
      ('pilot_directive_outbox', '{it,admin}', 'true')
    ) as policy_spec(table_name, roles_sql, unit_predicate)
  loop
    execute format('alter table public.%I enable row level security', spec.table_name);
    execute format('alter table public.%I force row level security', spec.table_name);
    execute format('revoke all on table public.%I from public, anon, authenticated', spec.table_name);
    execute format('grant select on table public.%I to authenticated', spec.table_name);
    execute format('drop policy if exists %I on public.%I', spec.table_name || '_synthetic_read', spec.table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.pilot_directive_has_read_claim(%L::text[], %L) and (%s) and is_synthetic = true and institutional_validation_required = true and production_allowed = false and real_system_effect = false)',
      spec.table_name || '_synthetic_read', spec.table_name,
      spec.roles_sql, 'pilot_read', spec.unit_predicate
    );
  end loop;
end
$scoped_security$;

-- Migration 32000 intentionally establishes these four tables before the JWT
-- helper exists. Replace its temporary generic authenticated policies now;
-- PostgreSQL permissive policies are OR'ed, so the predecessors must be
-- dropped rather than merely supplemented.
alter table public.pilot_qualification_program_spine_links enable row level security;
alter table public.pilot_qualification_program_spine_links force row level security;
revoke all on table public.pilot_qualification_program_spine_links from public, anon, authenticated;
grant select on table public.pilot_qualification_program_spine_links to authenticated;
drop policy if exists pilot_qualification_program_spine_authenticated_read on public.pilot_qualification_program_spine_links;
create policy pilot_qualification_program_spine_authenticated_read
on public.pilot_qualification_program_spine_links for select to authenticated
using (
  public.pilot_directive_has_read_claim(array['instructor','externalInstructor','coordinator','commission','studentAffairs','it']::text[], 'pilot_read')
  and exists (
    select 1 from public.pilot_directive_programs p
    where p.id = pilot_qualification_program_spine_links.directive_program_id
      and public.pilot_directive_has_unit_claim(p.owner_unit_id)
  )
  and is_synthetic and institutional_validation_required
  and not production_allowed and not real_system_effect
);

alter table public.pilot_qualification_program_outcomes enable row level security;
alter table public.pilot_qualification_program_outcomes force row level security;
revoke all on table public.pilot_qualification_program_outcomes from public, anon, authenticated;
grant select on table public.pilot_qualification_program_outcomes to authenticated;
drop policy if exists pilot_qualification_program_outcomes_authenticated_read on public.pilot_qualification_program_outcomes;
create policy pilot_qualification_program_outcomes_authenticated_read
on public.pilot_qualification_program_outcomes for select to authenticated
using (
  public.pilot_directive_has_read_claim(array['instructor','externalInstructor','coordinator','commission','studentAffairs','it']::text[], 'pilot_read')
  and exists (
    select 1 from public.pilot_directive_programs p
    where p.id = pilot_qualification_program_outcomes.directive_program_id
      and public.pilot_directive_has_unit_claim(p.owner_unit_id)
  )
  and is_synthetic and institutional_validation_required
  and not production_allowed and not real_system_effect
);

alter table public.pilot_learning_outcome_tyyc_type_candidates enable row level security;
alter table public.pilot_learning_outcome_tyyc_type_candidates force row level security;
revoke all on table public.pilot_learning_outcome_tyyc_type_candidates from public, anon, authenticated;
grant select on table public.pilot_learning_outcome_tyyc_type_candidates to authenticated;
drop policy if exists pilot_tyyc_type_candidates_authenticated_read on public.pilot_learning_outcome_tyyc_type_candidates;
create policy pilot_tyyc_type_candidates_authenticated_read
on public.pilot_learning_outcome_tyyc_type_candidates for select to authenticated
using (
  public.pilot_directive_has_read_claim(array['instructor','externalInstructor','coordinator','commission']::text[], 'pilot_read')
  and exists (
    select 1
    from public.pilot_learning_outcome_suggestions s
    join public.pilot_qualification_program_spine_links spine
      on spine.smart_program_id = s.program_id
      and spine.engine_profile_id = s.engine_profile_id
    join public.pilot_directive_programs p on p.id = spine.directive_program_id
    where s.id = pilot_learning_outcome_tyyc_type_candidates.suggestion_id
      and public.pilot_directive_has_unit_claim(p.owner_unit_id)
  )
  and is_synthetic and institutional_validation_required
  and not autonomous_decision and not real_system_effect
);

alter table public.pilot_directive_constructive_alignment_rows enable row level security;
alter table public.pilot_directive_constructive_alignment_rows force row level security;
revoke all on table public.pilot_directive_constructive_alignment_rows from public, anon, authenticated;
grant select on table public.pilot_directive_constructive_alignment_rows to authenticated;
drop policy if exists pilot_constructive_alignment_authenticated_read on public.pilot_directive_constructive_alignment_rows;
create policy pilot_constructive_alignment_authenticated_read
on public.pilot_directive_constructive_alignment_rows for select to authenticated
using (
  public.pilot_directive_has_read_claim(array['instructor','externalInstructor','coordinator','commission']::text[], 'pilot_read')
  and exists (
    select 1 from public.pilot_directive_programs p
    where p.id = pilot_directive_constructive_alignment_rows.directive_program_id
      and public.pilot_directive_has_unit_claim(p.owner_unit_id)
  )
  and is_synthetic and institutional_validation_required
  and not production_allowed and not real_system_effect
);

-- Anonymous access is restricted to official-source reference metadata only.
alter table public.pilot_directive_source_registry enable row level security;
alter table public.pilot_directive_source_registry force row level security;
revoke all on table public.pilot_directive_source_registry from public, anon, authenticated;
grant select on table public.pilot_directive_source_registry to anon, authenticated;
drop policy if exists pilot_directive_source_public_read on public.pilot_directive_source_registry;
drop policy if exists pilot_directive_source_authenticated_read on public.pilot_directive_source_registry;
create policy pilot_directive_source_public_read
on public.pilot_directive_source_registry for select to anon
using (
  id ~ '^S(0[1-9]|1[0-9]|2[0-7])$'
  and official_primary_source
  and public_reference
  and not production_allowed
  and not real_system_effect
);
create policy pilot_directive_source_authenticated_read
on public.pilot_directive_source_registry for select to authenticated
using (public_reference and not production_allowed and not real_system_effect);

alter table public.pilot_directive_source_clause_links enable row level security;
alter table public.pilot_directive_source_clause_links force row level security;
revoke all on table public.pilot_directive_source_clause_links from public, anon, authenticated;
grant select on table public.pilot_directive_source_clause_links to anon, authenticated;
drop policy if exists pilot_directive_source_links_public_read on public.pilot_directive_source_clause_links;
create policy pilot_directive_source_links_public_read
on public.pilot_directive_source_clause_links for select to anon, authenticated
using (
  public_reference
  and institutional_validation_required
  and not production_allowed
  and not real_system_effect
  and exists (
    select 1
    from public.pilot_directive_source_registry source
    where source.id = pilot_directive_source_clause_links.source_id
      and source.id ~ '^S(0[1-9]|1[0-9]|2[0-7])$'
      and source.official_primary_source
      and source.public_reference
      and source.institutional_validation_required
      and not source.production_allowed
      and not source.real_system_effect
  )
);

do $view_security$
declare
  view_name text;
begin
  foreach view_name in array array[
    'pilot_directive_policy_catalog',
    'pilot_directive_rule_catalog',
    'pilot_directive_governance_catalog',
    'pilot_directive_program_compliance_catalog',
    'pilot_directive_recognition_catalog',
    'pilot_directive_commission_catalog',
    'pilot_directive_credential_public_catalog',
    'pilot_directive_award_state_catalog',
    'pilot_directive_quality_finance_catalog',
    'pilot_directive_readiness_catalog',
    'pilot_directive_role_scope_catalog',
    'pilot_directive_credential_lifecycle_catalog',
    'pilot_directive_appeal_integrity_catalog'
  ]
  loop
    execute format('revoke all on table public.%I from public, anon, authenticated', view_name);
    execute format('grant select on table public.%I to authenticated', view_name);
  end loop;

  foreach view_name in array array[
    'pilot_directive_public_source_catalog',
    'pilot_directive_public_source_support_catalog'
  ]
  loop
    execute format('revoke all on table public.%I from public, anon, authenticated', view_name);
    execute format('grant select on table public.%I to anon, authenticated', view_name);
  end loop;
end
$view_security$;

-- Trigger helpers are not API functions. Only the table owner/trigger runtime
-- may execute them; API roles retain SELECT-only table permissions.
revoke all on function public.pilot_assert_directive_workload(text, integer) from public, anon, authenticated;
revoke all on function public.pilot_enforce_directive_workload() from public, anon, authenticated;
revoke all on function public.pilot_assert_credential_lifecycle(text) from public, anon, authenticated;
revoke all on function public.pilot_enforce_credential_lifecycle() from public, anon, authenticated;
revoke all on function public.pilot_assert_appeal_panel(text) from public, anon, authenticated;
revoke all on function public.pilot_enforce_appeal_panel() from public, anon, authenticated;
revoke all on function public.pilot_enforce_appeal_membership_unit() from public, anon, authenticated;
revoke all on function public.pilot_assert_audit_outbox(text) from public, anon, authenticated;
revoke all on function public.pilot_enforce_audit_outbox() from public, anon, authenticated;

comment on table public.pilot_directive_source_clause_links is
  'S01-S27 resmî kaynak üst verisini taslak madde/kural kimliklerine bağlayan, kaynak metni içermeyen izlenebilirlik tablosu.';
comment on view public.pilot_directive_role_scope_catalog is
  'Dokuz demo rolü için unit_id, unit_type, body membership, mandate ve decision_scope DTO sözleşmesi.';
comment on view public.pilot_directive_public_source_catalog is
  'Anon erişime açık resmî kaynak üst verisi; metin, kişisel veri veya kurum içi görüş içermez.';
comment on view public.pilot_directive_public_source_support_catalog is
  'Anon erişime açık kaynak-destek izlenebilirliği; kesin norm yorumu değildir.';
comment on view public.pilot_directive_credential_lifecycle_catalog is
  'Yetkili personel için sentetik saklama, düzeltme, yeniden düzenleme ve iptal bağlantısı.';
comment on view public.pilot_directive_appeal_integrity_catalog is
  'Yetkili personel için sentetik tebliğ/süre ve bağımsız panel bütünlük göstergeleri.';

commit;
