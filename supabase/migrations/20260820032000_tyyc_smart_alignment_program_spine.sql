-- KDPÜ MYYS controlled pilot: independent TYYÇ advisory suggestions and
-- canonical linkage of the smart-alignment records to the directive program
-- version spine. This migration is additive to the already-applied 20000 and
-- 30000 migrations; it performs no live integration, placement or award.

begin;

alter table public.qualification_level_descriptors
  drop constraint if exists qualification_level_descriptors_content_basis_check;
alter table public.qualification_level_descriptors
  add constraint qualification_level_descriptors_content_basis_check
  check (content_basis in (
    'official_verbatim',
    'official_translation',
    'official_form_operational_summary'
  ));

insert into public.qualification_frameworks
  (id, code, name_tr, name_en, jurisdiction_label, descriptor_dimensions,
   official_source_url, legal_source_url, verified_at, source_status, is_public_reference)
values (
  'tyyc', 'TYYÇ', 'Türkiye Yükseköğretim Yeterlilikleri Çerçevesi',
  'National Qualifications Framework for Higher Education in Türkiye',
  'Türkiye — yükseköğretim', '["Bilgi","Beceri","Yetkinlik"]'::jsonb,
  'https://uluslararasi.yok.gov.tr/Sayfalar/avrupa-yuksekogretim-alani-ile-uyum-projesi/yeterlikler-cercevesi/yuksekogretim-yeterlilik-turleri.aspx',
  'https://uluslararasi.yok.gov.tr/Sayfalar/avrupa-yuksekogretim-alani-ile-uyum-projesi/yeterlikler-cercevesi/yuksekogretim-yeterlilik-turleri.aspx',
  '2026-08-19 22:00:00+00', 'official', true
)
on conflict (id) do update set
  code = excluded.code,
  name_tr = excluded.name_tr,
  name_en = excluded.name_en,
  jurisdiction_label = excluded.jurisdiction_label,
  descriptor_dimensions = excluded.descriptor_dimensions,
  official_source_url = excluded.official_source_url,
  legal_source_url = excluded.legal_source_url,
  verified_at = excluded.verified_at,
  source_status = 'official',
  is_public_reference = true;

create table if not exists public.qualification_tyyc_type_descriptors (
  id text primary key check (id ~ '^tyyc-type-[a-z-]+$'),
  framework_id text not null default 'tyyc' check (framework_id = 'tyyc')
    references public.qualification_frameworks(id) on update cascade on delete restrict,
  level smallint not null check (level between 5 and 8),
  qualification_type text not null unique check (btrim(qualification_type) <> ''),
  title_tr text not null check (btrim(title_tr) <> ''),
  orientation text not null check (btrim(orientation) <> ''),
  context_signals jsonb not null check (jsonb_typeof(context_signals) = 'array'),
  official_source_url text not null check (official_source_url ~ '^https://'),
  official_form_registry_url text not null check (official_form_registry_url ~ '^https://'),
  source_publisher text not null check (btrim(source_publisher) <> ''),
  source_status text not null check (source_status = 'official_form_registry_verified'),
  operational_descriptor_status text not null
    check (operational_descriptor_status = 'advisory_summary_not_verbatim'),
  equivalence_claim boolean not null default false check (not equivalence_claim),
  placement_claim boolean not null default false check (not placement_claim),
  logo_right_claim boolean not null default false check (not logo_right_claim),
  autonomous_decision boolean not null default false check (not autonomous_decision),
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  verified_at timestamptz not null,
  is_public_reference boolean not null default true check (is_public_reference),
  unique (id, framework_id, level)
);

comment on table public.qualification_tyyc_type_descriptors is
  'YÖK/MYK resmî 5-8 düzey ve altı yeterlilik türü form sicili; form metni değildir, eşdeğerlik/yerleştirme/logo hakkı üretmez.';

alter table public.qualification_tyyc_type_descriptors enable row level security;
alter table public.qualification_tyyc_type_descriptors force row level security;
revoke all on table public.qualification_tyyc_type_descriptors from public, anon, authenticated;
grant select on table public.qualification_tyyc_type_descriptors to anon, authenticated;
drop policy if exists qualification_tyyc_type_public_reference_read
  on public.qualification_tyyc_type_descriptors;
create policy qualification_tyyc_type_public_reference_read
on public.qualification_tyyc_type_descriptors for select to anon, authenticated
using (
  is_public_reference = true
  and source_status = 'official_form_registry_verified'
  and operational_descriptor_status = 'advisory_summary_not_verbatim'
  and equivalence_claim = false
  and placement_claim = false
  and logo_right_claim = false
  and autonomous_decision = false
  and institutional_validation_required = true
);

insert into public.qualification_tyyc_type_descriptors
  (id, level, qualification_type, title_tr, orientation, context_signals,
   official_source_url, official_form_registry_url, source_publisher,
   source_status, operational_descriptor_status, verified_at)
values
  ('tyyc-type-associate-general', 5, 'associate_general', 'Önlisans Diploması (Genel)', 'genel/akademik', '["kuramsal","akademik","genel"]',
   'https://uluslararasi.yok.gov.tr/Sayfalar/avrupa-yuksekogretim-alani-ile-uyum-projesi/yeterlikler-cercevesi/yuksekogretim-yeterlilik-turleri.aspx', 'https://www.myk.gov.tr/tr/page/174', 'Yükseköğretim Kurulu / Mesleki Yeterlilik Kurumu', 'official_form_registry_verified', 'advisory_summary_not_verbatim', '2026-08-19 22:00:00+00'),
  ('tyyc-type-associate-vocational', 5, 'associate_vocational', 'Önlisans Diploması (Mesleki)', 'mesleki', '["uygulama","mesleki","iş","laboratuvar"]',
   'https://uluslararasi.yok.gov.tr/Sayfalar/avrupa-yuksekogretim-alani-ile-uyum-projesi/yeterlikler-cercevesi/yuksekogretim-yeterlilik-turleri.aspx', 'https://www.myk.gov.tr/tr/page/174', 'Yükseköğretim Kurulu / Mesleki Yeterlilik Kurumu', 'official_form_registry_verified', 'advisory_summary_not_verbatim', '2026-08-19 22:00:00+00'),
  ('tyyc-type-bachelor', 6, 'bachelor', 'Lisans Diploması', 'genel/mesleki program bağlamı', '["ileri","karmaşık","proje","uzmanlık"]',
   'https://uluslararasi.yok.gov.tr/Sayfalar/avrupa-yuksekogretim-alani-ile-uyum-projesi/yeterlikler-cercevesi/yuksekogretim-yeterlilik-turleri.aspx', 'https://www.myk.gov.tr/tr/page/174', 'Yükseköğretim Kurulu / Mesleki Yeterlilik Kurumu', 'official_form_registry_verified', 'advisory_summary_not_verbatim', '2026-08-19 22:00:00+00'),
  ('tyyc-type-master-thesis', 7, 'master_thesis', 'Yüksek Lisans Diploması (Tezli)', 'araştırma', '["araştırma","tez","yeni yöntem","literatür"]',
   'https://uluslararasi.yok.gov.tr/Sayfalar/avrupa-yuksekogretim-alani-ile-uyum-projesi/yeterlikler-cercevesi/yuksekogretim-yeterlilik-turleri.aspx', 'https://www.myk.gov.tr/tr/page/174', 'Yükseköğretim Kurulu / Mesleki Yeterlilik Kurumu', 'official_form_registry_verified', 'advisory_summary_not_verbatim', '2026-08-19 22:00:00+00'),
  ('tyyc-type-master-nonthesis', 7, 'master_nonthesis', 'Yüksek Lisans Diploması (Tezsiz)', 'mesleki/uygulamalı uzmanlık', '["mesleki","uygulama","stratejik","yönetim"]',
   'https://uluslararasi.yok.gov.tr/Sayfalar/avrupa-yuksekogretim-alani-ile-uyum-projesi/yeterlikler-cercevesi/yuksekogretim-yeterlilik-turleri.aspx', 'https://www.myk.gov.tr/tr/page/174', 'Yükseköğretim Kurulu / Mesleki Yeterlilik Kurumu', 'official_form_registry_verified', 'advisory_summary_not_verbatim', '2026-08-19 22:00:00+00'),
  ('tyyc-type-doctorate', 8, 'doctorate', 'Doktora Diploması', 'özgün araştırma ve ileri uzmanlık', '["özgün","doktora","yeni bilgi","yeniden tanımlama","ön cephe"]',
   'https://uluslararasi.yok.gov.tr/Sayfalar/avrupa-yuksekogretim-alani-ile-uyum-projesi/yeterlikler-cercevesi/yuksekogretim-yeterlilik-turleri.aspx', 'https://www.myk.gov.tr/tr/page/174', 'Yükseköğretim Kurulu / Mesleki Yeterlilik Kurumu', 'official_form_registry_verified', 'advisory_summary_not_verbatim', '2026-08-19 22:00:00+00')
on conflict (id) do update set
  level = excluded.level,
  qualification_type = excluded.qualification_type,
  title_tr = excluded.title_tr,
  orientation = excluded.orientation,
  context_signals = excluded.context_signals,
  official_source_url = excluded.official_source_url,
  official_form_registry_url = excluded.official_form_registry_url,
  source_publisher = excluded.source_publisher,
  source_status = excluded.source_status,
  operational_descriptor_status = excluded.operational_descriptor_status,
  equivalence_claim = false,
  placement_claim = false,
  logo_right_claim = false,
  autonomous_decision = false,
  institutional_validation_required = true,
  verified_at = excluded.verified_at,
  is_public_reference = true;

insert into public.qualification_level_descriptors
  (id, framework_id, level, knowledge_descriptor, skills_descriptor,
   competence_descriptor, competence_label, source_language, content_basis,
   official_source_url, verified_at, is_public_reference)
values
  ('tyyc-5', 'tyyc', 5,
   'Önlisans bağlamında bir alanın temel kuramsal ve olgusal bilgi tabanını, uygulama araçlarını ve bilginin sınırlarını ilişkilendirebilme',
   'Sınırları belirli yükseköğretim problemlerinde uygun veri, yöntem ve araçları seçerek bilişsel ve uygulamalı çözüm geliştirebilme',
   'Tanımlı bir çalışma veya öğrenme bağlamında bağımsız görev yürütebilme; sorumluluk alma, öğrenmeyi sürdürme, iletişim kurma ve etik sonuçları gözetme',
   'Yetkinlik', 'tr', 'official_form_operational_summary',
   'https://uluslararasi.yok.gov.tr/Sayfalar/avrupa-yuksekogretim-alani-ile-uyum-projesi/yeterlikler-cercevesi/yuksekogretim-yeterlilik-turleri.aspx', '2026-08-19 22:00:00+00', true),
  ('tyyc-6', 'tyyc', 6,
   'Lisans bağlamında ileri kuramsal, olgusal ve metodolojik bilgiyi eleştirel bakışla ilişkilendirebilme',
   'Uzmanlık gerektiren karmaşık ve öngörülemeyen problemlerde yöntem seçme, uygulama, analiz, tasarım ve doğrulama becerisi gösterebilme',
   'Bağımsız çalışma ve karar sorumluluğu üstlenebilme; karmaşık proje/etkinlikleri yönetme, meslekî gelişimi, iletişimi, toplumsal ve etik sonuçları gözetme',
   'Yetkinlik', 'tr', 'official_form_operational_summary',
   'https://uluslararasi.yok.gov.tr/Sayfalar/avrupa-yuksekogretim-alani-ile-uyum-projesi/yeterlikler-cercevesi/yuksekogretim-yeterlilik-turleri.aspx', '2026-08-19 22:00:00+00', true),
  ('tyyc-7', 'tyyc', 7,
   'Yüksek lisans bağlamında uzmanlık bilgisini, farklı alanların arayüzlerini ve araştırma/uygulama sorunlarını eleştirel biçimde bütünleştirebilme',
   'Yeni bilgi veya yöntem geliştirmek, alanlar arası bilgiyi bütünleştirmek ve karmaşık sorunları çözmek için ileri araştırma ve uygulama becerileri gösterebilme',
   'Karmaşık ve öngörülemeyen bağlamları yönetip dönüştürebilme; stratejik sorumluluk, etik yargı, uzman iletişimi ve bağımsız öğrenme gösterebilme',
   'Yetkinlik', 'tr', 'official_form_operational_summary',
   'https://uluslararasi.yok.gov.tr/Sayfalar/avrupa-yuksekogretim-alani-ile-uyum-projesi/yeterlikler-cercevesi/yuksekogretim-yeterlilik-turleri.aspx', '2026-08-19 22:00:00+00', true),
  ('tyyc-8', 'tyyc', 8,
   'Doktora bağlamında bir alanın en ileri sistematik bilgisini ve alanlar arası arayüzleri özgün araştırma soruları üzerinden eleştirel değerlendirebilme',
   'Bilginin ve uygulamanın sınırlarını genişleten özgün araştırmayı tasarlama, yürütme, sentezleme, doğrulama ve yeniden tanımlama becerileri gösterebilme',
   'Bilimsel ve meslekî bütünlükle yüksek özerklik ve liderlik gösterebilme; yeni fikir/süreç üretme, etik/toplumsal etkiyi gözetme ve alana özgün katkı sağlama',
   'Yetkinlik', 'tr', 'official_form_operational_summary',
   'https://uluslararasi.yok.gov.tr/Sayfalar/avrupa-yuksekogretim-alani-ile-uyum-projesi/yeterlikler-cercevesi/yuksekogretim-yeterlilik-turleri.aspx', '2026-08-19 22:00:00+00', true)
on conflict (framework_id, level) do update set
  id = excluded.id,
  knowledge_descriptor = excluded.knowledge_descriptor,
  skills_descriptor = excluded.skills_descriptor,
  competence_descriptor = excluded.competence_descriptor,
  competence_label = excluded.competence_label,
  source_language = excluded.source_language,
  content_basis = excluded.content_basis,
  official_source_url = excluded.official_source_url,
  verified_at = excluded.verified_at,
  is_public_reference = true;

insert into public.pilot_matrix_templates
  (id, framework_id, level, title, candidate_instructions, columns_schema,
   example_scope, official_source_url, source_verified_at)
select
  'matrix-tyyc-' || level, 'tyyc', level,
  'TYYÇ ' || level || '. seviye — yeterlilik/öğrenme hedefi/içerik/ölçme matrisi',
  'Her öğrenme çıktısını YÖK/MYK form siciliyle ilişkili advisory özete bağlayın; içerik, etkinlik, ölçme, rubrik, eşik, kanıt ve iş yükünü insan gerekçesiyle kaydedin. Bu seçim resmî yerleştirme veya eşdeğerlik değildir.',
  '[{"key":"frameworkDescriptor","label":"Seviye tanımlayıcısı","required":true,"input":"reference"},{"key":"learningOutcome","label":"Öğrenme hedefi / çıktısı","required":true,"input":"textarea"},{"key":"learningLevel","label":"Öğrenme düzeyi ve eylem fiili","required":true,"input":"text"},{"key":"courseContent","label":"Ders içeriği / öğrenme etkinliği","required":true,"input":"textarea"},{"key":"assessmentMethod","label":"Ölçme-değerlendirme yöntemi","required":true,"input":"textarea"},{"key":"evidence","label":"Başarı ölçütü ve kanıt","required":true,"input":"textarea"},{"key":"alignmentRationale","label":"Uyum gerekçesi","required":true,"input":"textarea"}]'::jsonb,
  'YÖK/MYK resmî form siciline dayalı, form metninin yerine geçmeyen sentetik örnek',
  'https://www.myk.gov.tr/tr/page/174', '2026-08-19 22:00:00+00'
from generate_series(5, 8) as levels(level)
on conflict (framework_id, level) do update set
  id = excluded.id,
  title = excluded.title,
  candidate_instructions = excluded.candidate_instructions,
  columns_schema = excluded.columns_schema,
  example_scope = excluded.example_scope,
  official_source_url = excluded.official_source_url,
  source_verified_at = excluded.source_verified_at,
  institutional_validation_required = true,
  real_system_effect = false,
  is_synthetic = true;

insert into public.pilot_matrix_example_rows
  (id, template_id, row_order, framework_dimension, learning_outcome_code,
   learning_outcome_sample, learning_level_sample, course_content_sample,
   assessment_method_sample, evidence_sample, alignment_rationale_sample, pilot_notice)
values
  ('example-tyyc-5', 'matrix-tyyc-5', 1, 'skills', 'ÖÇ-1', 'Sınırları belirli bir uygulama probleminde uygun yöntemi seçer ve sonucu kanıtla doğrular.', 'Uygulama ve doğrulama', 'Yöntem seçimi, kontrollü uygulama ve sonuç doğrulama', 'Uygulama görevi + analitik rubrik', 'Süreç kaydı, ürün ve rubrik sonucu', 'Önlisans genel/mesleki tür seçimi ayrıca insan gerekçesiyle yapılır.', 'YÖK/MYK resmî form siciline dayalı advisory örnektir; diploma eşdeğerliği değildir.'),
  ('example-tyyc-6', 'matrix-tyyc-6', 1, 'skills', 'ÖÇ-1', 'Karmaşık ve öngörülemeyen bir veri sorununa yenilikçi çözüm tasarlar ve doğrular.', 'Analiz, tasarım ve doğrulama', 'İleri yöntem seçimi, prototipleme ve kanıt değerlendirme', 'Performans görevi + ürün dosyası + savunma', 'Çalışan ürün, karar günlüğü, rubrik ve savunma tutanağı', 'Lisans türü için önerilen pedagojik referans düzeyi bağlamında ileri beceri kanıtı sunar.', 'TYYÇ tür formunun yerine geçmeyen pilot özettir; kurumsal doğrulama gerekir.'),
  ('example-tyyc-7', 'matrix-tyyc-7', 1, 'knowledge', 'ÖÇ-1', 'Alanlar arası uzmanlık bilgisini bütünleştirerek yeni bir yöntem önerir ve araştırma/uygulama gerekçesini savunur.', 'Sentez, araştırma ve savunma', 'Uzmanlık literatürü, yöntem geliştirme ve alanlar arası bütünleştirme', 'Araştırma/uygulama tasarısı + kurul savunması', 'Kaynak izi, yöntem protokolü, rubrik ve savunma tutanağı', 'Tezli/tezsiz yüksek lisans türü seçimi ayrı insan gerekçesi gerektirir.', 'Resmî derece veya tez eşdeğerliği iddiası taşımaz.'),
  ('example-tyyc-8', 'matrix-tyyc-8', 1, 'competence', 'ÖÇ-1', 'Alan sınırlarını genişleten özgün bir yaklaşım geliştirir, bağımsız doğrular ve bilimsel/etik etkisine liderlik eder.', 'Özgün üretim, doğrulama ve liderlik', 'En ileri araştırma, özgün katkı, bilimsel bütünlük ve etik etki', 'Özgün araştırma ürünü + bağımsız jüri savunması', 'Tekrarlanabilir yöntem, bağımsız doğrulama, etik analiz ve jüri kaydı', 'Yalnız önerilen TYYÇ doktora pedagojik referans düzeyi bağlamıdır.', 'Doktora derecesi, eşdeğerliği veya resmî yerleştirme iddiası değildir.')
on conflict (id) do update set
  template_id = excluded.template_id,
  row_order = excluded.row_order,
  framework_dimension = excluded.framework_dimension,
  learning_outcome_code = excluded.learning_outcome_code,
  learning_outcome_sample = excluded.learning_outcome_sample,
  learning_level_sample = excluded.learning_level_sample,
  course_content_sample = excluded.course_content_sample,
  assessment_method_sample = excluded.assessment_method_sample,
  evidence_sample = excluded.evidence_sample,
  alignment_rationale_sample = excluded.alignment_rationale_sample,
  pilot_notice = excluded.pilot_notice,
  is_example = true,
  real_system_effect = false,
  is_synthetic = true;

alter table public.pilot_qualification_program_summaries
  add column if not exists suggested_tyyc_level smallint;
update public.pilot_qualification_program_summaries
set suggested_tyyc_level = coalesce(suggested_tyyc_level, suggested_tyc_level)
where suggested_tyyc_level is null;
alter table public.pilot_qualification_program_summaries
  alter column suggested_tyyc_level set not null;
alter table public.pilot_qualification_program_summaries
  drop constraint if exists pilot_qualification_program_summaries_suggested_tyyc_level_check;
alter table public.pilot_qualification_program_summaries
  add constraint pilot_qualification_program_summaries_suggested_tyyc_level_check
  check (suggested_tyyc_level between 5 and 8);

alter table public.pilot_learning_outcome_suggestions
  add column if not exists cross_framework_levels jsonb not null default '{}'::jsonb;
alter table public.pilot_learning_outcome_suggestions
  drop constraint if exists pilot_learning_outcome_suggestions_tyyc_level_check;
alter table public.pilot_learning_outcome_suggestions
  add constraint pilot_learning_outcome_suggestions_tyyc_level_check
  check (framework_id <> 'tyyc' or proposed_level between 5 and 8);

alter table public.pilot_qualification_board_decision_examples
  add column if not exists decided_tyyc_level smallint;
update public.pilot_qualification_board_decision_examples
set decided_tyyc_level = coalesce(decided_tyyc_level, decided_tyc_level)
where decided_tyyc_level is null;
alter table public.pilot_qualification_board_decision_examples
  alter column decided_tyyc_level set not null;
alter table public.pilot_qualification_board_decision_examples
  drop constraint if exists pilot_qualification_board_decision_examples_decided_tyyc_level_check;
alter table public.pilot_qualification_board_decision_examples
  add constraint pilot_qualification_board_decision_examples_decided_tyyc_level_check
  check (decided_tyyc_level between 5 and 8);

create table if not exists public.pilot_qualification_program_spine_links (
  smart_program_id text not null,
  engine_profile_id text not null,
  directive_program_id text not null,
  directive_program_version_no integer not null,
  link_status text not null default 'canonical_demo_mapping'
    check (link_status = 'canonical_demo_mapping'),
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  production_allowed boolean not null default false check (not production_allowed),
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic),
  primary key (smart_program_id, engine_profile_id),
  foreign key (smart_program_id, engine_profile_id)
    references public.pilot_qualification_program_summaries(program_id, engine_profile_id)
    on update cascade on delete cascade,
  foreign key (directive_program_id, directive_program_version_no)
    references public.pilot_directive_program_versions(program_id, version_no)
    on update cascade on delete cascade,
  unique (directive_program_id, directive_program_version_no)
);

create table if not exists public.pilot_qualification_program_outcomes (
  smart_program_id text not null,
  engine_profile_id text not null,
  outcome_id text not null check (btrim(outcome_id) <> ''),
  directive_program_id text not null,
  directive_program_version_no integer not null,
  outcome_order smallint not null check (outcome_order > 0),
  outcome_text text not null check (char_length(btrim(outcome_text)) between 1 and 600),
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  production_allowed boolean not null default false check (not production_allowed),
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic),
  primary key (smart_program_id, engine_profile_id, outcome_id),
  foreign key (smart_program_id, engine_profile_id)
    references public.pilot_qualification_program_spine_links(smart_program_id, engine_profile_id)
    on update cascade on delete cascade,
  foreign key (directive_program_id, directive_program_version_no)
    references public.pilot_directive_program_versions(program_id, version_no)
    on update cascade on delete cascade,
  unique (directive_program_id, directive_program_version_no, outcome_id),
  unique (smart_program_id, engine_profile_id, outcome_order)
);

insert into public.pilot_qualification_program_spine_links
  (smart_program_id, engine_profile_id, directive_program_id, directive_program_version_no)
values ('program-smart-alignment-demo', 'qualification-engine-2026-08-20-1', 'PROGRAM-DATA-LITERACY', 1)
on conflict (smart_program_id, engine_profile_id) do update set
  directive_program_id = excluded.directive_program_id,
  directive_program_version_no = excluded.directive_program_version_no,
  link_status = 'canonical_demo_mapping',
  institutional_validation_required = true,
  production_allowed = false,
  real_system_effect = false,
  is_synthetic = true;

insert into public.pilot_qualification_program_outcomes
  (smart_program_id, engine_profile_id, outcome_id, directive_program_id,
   directive_program_version_no, outcome_order, outcome_text)
values
  ('program-smart-alignment-demo', 'qualification-engine-2026-08-20-1', 'LO-1', 'PROGRAM-DATA-LITERACY', 1, 1,
   'Karmaşık ve öngörülemeyen bir veri sorununu eleştirel olarak analiz eder ve yenilikçi çözüm geliştirir.'),
  ('program-smart-alignment-demo', 'qualification-engine-2026-08-20-1', 'LO-2', 'PROGRAM-DATA-LITERACY', 1, 2,
   'Ekip performansını değerlendirir ve stratejik dönüşümü yönetir.')
on conflict (smart_program_id, engine_profile_id, outcome_id) do update set
  directive_program_id = excluded.directive_program_id,
  directive_program_version_no = excluded.directive_program_version_no,
  outcome_order = excluded.outcome_order,
  outcome_text = excluded.outcome_text,
  institutional_validation_required = true,
  production_allowed = false,
  real_system_effect = false,
  is_synthetic = true;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'pilot_learning_outcome_suggestions_program_outcome_fkey'
      and conrelid = 'public.pilot_learning_outcome_suggestions'::regclass
  ) then
    alter table public.pilot_learning_outcome_suggestions
      add constraint pilot_learning_outcome_suggestions_program_outcome_fkey
      foreign key (program_id, engine_profile_id, outcome_id)
      references public.pilot_qualification_program_outcomes
        (smart_program_id, engine_profile_id, outcome_id)
      on update cascade on delete cascade;
  end if;
end $$;

create table if not exists public.pilot_learning_outcome_tyyc_type_candidates (
  suggestion_id text not null references public.pilot_learning_outcome_suggestions(id)
    on update cascade on delete cascade,
  type_descriptor_id text not null references public.qualification_tyyc_type_descriptors(id)
    on update cascade on delete restrict,
  candidate_rank smallint not null check (candidate_rank > 0),
  score smallint not null check (score between 0 and 100),
  rationale text not null check (btrim(rationale) <> ''),
  selection_status text not null default 'advisory_candidate'
    check (selection_status = 'advisory_candidate'),
  autonomous_decision boolean not null default false check (not autonomous_decision),
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic),
  primary key (suggestion_id, type_descriptor_id),
  unique (suggestion_id, candidate_rank)
);

create table if not exists public.pilot_directive_constructive_alignment_rows (
  id text primary key check (btrim(id) <> ''),
  smart_program_id text not null,
  engine_profile_id text not null,
  outcome_id text not null,
  directive_program_id text not null,
  directive_program_version_no integer not null,
  content_item text not null check (btrim(content_item) <> ''),
  learning_activity text not null check (btrim(learning_activity) <> ''),
  assessment_task text not null check (btrim(assessment_task) <> ''),
  rubric_reference text not null check (btrim(rubric_reference) <> ''),
  success_threshold text not null check (btrim(success_threshold) <> ''),
  evidence_requirement text not null check (btrim(evidence_requirement) <> ''),
  workload_component_type text not null,
  workload_hours numeric(6,1) not null check (workload_hours > 0),
  chain_status text not null default 'human_review_required'
    check (chain_status = 'human_review_required'),
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  production_allowed boolean not null default false check (not production_allowed),
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic),
  foreign key (smart_program_id, engine_profile_id, outcome_id)
    references public.pilot_qualification_program_outcomes
      (smart_program_id, engine_profile_id, outcome_id)
    on update cascade on delete cascade,
  foreign key (directive_program_id, directive_program_version_no, workload_component_type)
    references public.pilot_directive_workload_items
      (program_id, program_version_no, component_type)
    on update cascade on delete restrict,
  unique (directive_program_id, directive_program_version_no, outcome_id)
);

alter table public.pilot_matrix_drafts
  add column if not exists program_id text,
  add column if not exists program_version_no integer;
update public.pilot_matrix_drafts
set program_id = 'PROGRAM-DATA-LITERACY', program_version_no = 1
where program_id is null or program_version_no is null;
alter table public.pilot_matrix_drafts
  alter column program_id set not null,
  alter column program_version_no set not null;
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'pilot_matrix_drafts_program_version_fkey'
      and conrelid = 'public.pilot_matrix_drafts'::regclass
  ) then
    alter table public.pilot_matrix_drafts
      add constraint pilot_matrix_drafts_program_version_fkey
      foreign key (program_id, program_version_no)
      references public.pilot_directive_program_versions(program_id, version_no)
      on update cascade on delete cascade;
  end if;
end $$;

insert into public.pilot_matrix_drafts
  (id, title, framework_id, target_level, template_id, owner_role, owner_label,
   status, updated_at, source_url, source_verified_at, validation_status,
   program_id, program_version_no)
values (
  'DRF-MAT-TYYC-6-001', 'Veri ile karar verme — TYYÇ lisans türü pilot matrisi',
  'tyyc', 6, 'matrix-tyyc-6', 'instructor', 'Dr. Öğr. Üyesi Ekin Demir',
  'pilot_draft', '2026-08-20 16:00:00+00', 'https://www.myk.gov.tr/tr/page/174',
  '2026-08-19 22:00:00+00', 'institutional_validation_pending',
  'PROGRAM-DATA-LITERACY', 1
)
on conflict (id) do update set
  title = excluded.title, framework_id = excluded.framework_id,
  target_level = excluded.target_level, template_id = excluded.template_id,
  owner_role = excluded.owner_role, owner_label = excluded.owner_label,
  status = excluded.status, updated_at = excluded.updated_at,
  source_url = excluded.source_url, source_verified_at = excluded.source_verified_at,
  validation_status = excluded.validation_status,
  program_id = excluded.program_id, program_version_no = excluded.program_version_no,
  institutional_validation_required = true, real_system_effect = false, is_synthetic = true;

insert into public.pilot_matrix_draft_rows
  (id, draft_id, row_order, framework_dimension, learning_outcome_code,
   learning_outcome, learning_level, course_content, assessment_method,
   evidence, alignment_rationale, validation_status)
values
  ('DRF-TYYC6-ROW-1', 'DRF-MAT-TYYC-6-001', 1, 'knowledge', 'ÖÇ-1',
   'Karmaşık bir veri probleminin ileri kuramsal ve metodolojik bileşenlerini eleştirel biçimde ilişkilendirir.',
   'Analiz ve gerekçelendirme', 'Lisans bağlamında kuram, yöntem, kaynak güvenilirliği ve kanıt sınırları',
   'Gerekçeli vaka analizi ve analitik rubrik', 'Kaynak izli rapor, rubrik ve insan değerlendirici kaydı',
   'TYYÇ lisans türü için yalnız önerilen pedagojik referans düzeyi bağlamında ileri bilgi kanıtı sunar.',
   'institutional_validation_pending'),
  ('DRF-TYYC6-ROW-2', 'DRF-MAT-TYYC-6-001', 2, 'skills', 'ÖÇ-2',
   'Öngörülemeyen bir veri sorununa yöntem seçerek yenilikçi ve doğrulanabilir çözüm tasarlar.',
   'Değerlendirme ve üretme', 'Yöntem seçimi, prototip, doğrulama ve hata analizi',
   'Karmaşık performans görevi, ürün dosyası ve analitik rubrik', 'Çalışan prototip, karar günlüğü ve doğrulama sonucu',
   'TYYÇ lisans türü için karmaşık problem, ileri beceri ve doğrulama kanıtı arasında açıklanabilir pilot bağ kurar.',
   'institutional_validation_pending'),
  ('DRF-TYYC6-ROW-3', 'DRF-MAT-TYYC-6-001', 3, 'competence', 'ÖÇ-3',
   'Belirsiz proje koşullarında bağımsız karar alır; ekip gelişimi ile etik sonuçlar için sorumluluk üstlenir.',
   'Bağımsız karar ve sorumluluk', 'Proje yönetimi, ekip gelişimi, erişilebilirlik ve etik risk',
   'Ekip simülasyonu, karar savunması ve çok kaynaklı rubrik', 'Karar günlüğü, risk kaydı, savunma tutanağı ve rubrik',
   'TYYÇ lisans türü bağlamında bağımsızlık, sorumluluk ve etik yargı için gözlenebilir pilot kanıt üretir.',
   'institutional_validation_pending')
on conflict (id) do update set
  draft_id = excluded.draft_id, row_order = excluded.row_order,
  framework_dimension = excluded.framework_dimension,
  learning_outcome_code = excluded.learning_outcome_code,
  learning_outcome = excluded.learning_outcome,
  learning_level = excluded.learning_level,
  course_content = excluded.course_content,
  assessment_method = excluded.assessment_method,
  evidence = excluded.evidence,
  alignment_rationale = excluded.alignment_rationale,
  validation_status = excluded.validation_status,
  institutional_validation_required = true, real_system_effect = false, is_synthetic = true;

update public.pilot_qualification_suggestion_engine_profiles
set engine_version = '2026-08-20.2',
    advisory_notice = 'Bu çıktı karar değildir; TYÇ, AYÇ/EQF ve resmî TYYÇ form siciline dayalı advisory yükseköğretim katmanını ayrı ayrı karşılaştırır. Resmî yerleştirme, eşdeğerlik, akreditasyon veya logo hakkı üretmez; nihai akademik karar yetkili insan kurulundur.',
    input_contract = jsonb_set(input_contract, '{manualOverride,level}', '"framework-specific: TYÇ/AYÇ 1..8; TYYÇ 5..8"'::jsonb, true),
    output_contract = '{"perOutcome":["framework","level","dimension","score","confidence","descriptor","qualificationTypeCandidates","rationale","content","assessment","evidenceGaps","threeFrameworkConsistency"],"frameworks":["tyc","eqf","tyyc"],"program":["suggestedLevels","levelSummaries","dimensionCoverage","coverage","consistency","crossFrameworkConsistency","higherEducationCycleSuggestion"],"manualOverridesCanonical":["id","outcomeId","frameworkId","level","dimension","reason","actorRole"],"finalDecision":"separate human commission record"}'::jsonb,
    editable_roles = '["instructor","externalInstructor"]'::jsonb,
    reviewer_roles = '["coordinator","commission"]'::jsonb,
    deterministic = true,
    auto_decision_enabled = false,
    institutional_validation_required = true,
    real_system_effect = false,
    is_synthetic = true
where id = 'qualification-engine-2026-08-20-1';

update public.pilot_qualification_program_summaries
set suggested_tyyc_level = 6,
    level_summaries = level_summaries || '{"tyyc":{"level":6,"averageScore":98,"confidence":"high","descriptorSetAvailable":true,"manualOverrideCount":0,"descriptorStatus":"advisory_summary_not_verbatim"}}'::jsonb,
    dimension_coverage = dimension_coverage || '{"tyyc":{"knowledge":0,"skills":1,"competence":1}}'::jsonb,
    coverage = jsonb_set(coverage, '{frameworkCoverage,tyyc}', '{"suggestedOutcomeCount":2,"totalOutcomeCount":2,"percent":100}'::jsonb, true),
    consistency = consistency || '{"tyyc":{"min":6,"max":7,"spread":1,"consistent":true,"warning":null}}'::jsonb,
    cross_framework_consistency = cross_framework_consistency || '{"threeFrameworkExactMatchCount":2,"threeFrameworkAdjacentReviewCount":0,"threeFrameworkMaterialDiscrepancyCount":0,"allExact":true,"equalityForced":false,"institutionalValidationRequired":true}'::jsonb,
    rationale = 'Program düzeyi, iki öğrenme çıktısının puanla ağırlıklandırılmış medyanından üretildi. TYÇ 6, AYÇ/EQF 6 ve TYYÇ 6 önerileri birbirinden ayrı advisory kayıtlardır; resmî yerleştirme/eşdeğerlik değildir.',
    advisory_notice = 'Üç çerçeveli pilot öneridir; TYYÇ metni form siciline dayalı, verbatim olmayan operational özettir. Nihai akademik karar yetkili insan kurulundur.'
where program_id = 'program-smart-alignment-demo'
  and engine_profile_id = 'qualification-engine-2026-08-20-1';

update public.pilot_learning_outcome_suggestions
set cross_framework_levels = case outcome_id
  when 'LO-1' then '{"tyc":6,"eqf":6,"tyyc":6}'::jsonb
  when 'LO-2' then '{"tyc":7,"eqf":7,"tyyc":7}'::jsonb
  else jsonb_build_object('tyc', cross_framework_peer_level, 'eqf', cross_framework_peer_level, 'tyyc', greatest(5, cross_framework_peer_level))
end,
cross_framework_rationale = 'TYÇ, AYÇ/EQF ve TYYÇ önerileri aynı açıklanabilir sinyal kümesi üzerinden ayrı ayrı değerlendirilmiştir; eşitlik zorlanmamış, insan incelemesi korunmuştur.';

insert into public.pilot_learning_outcome_suggestions
  (id, engine_profile_id, program_id, outcome_id, outcome_text, input_quality,
   framework_id, descriptor_id, proposed_level, proposed_dimension, score, confidence,
   rationale, matched_signals, suggested_content, suggested_assessments,
   cross_framework_peer_level, cross_framework_levels, cross_framework_status,
   cross_framework_rationale, advisory_notice, editable_roles, reviewer_roles)
values
  ('SUG-DEMO-LO-1-TYYC', 'qualification-engine-2026-08-20-1', 'program-smart-alignment-demo', 'LO-1',
   'Karmaşık ve öngörülemeyen bir veri sorununu eleştirel olarak analiz eder ve yenilikçi çözüm geliştirir.',
   '{"status":"sufficient","isMeasurable":true,"observableSignalCount":2,"warnings":[]}'::jsonb,
   'tyyc', 'tyyc-6', 6, 'skills', 98, 'high',
   'TYYÇ 6 / Beceri önerisi; karmaşık, öngörülemeyen ve yenilik sinyalleri lisans türü advisory özetle karşılaştırılmıştır. Resmî yerleştirme veya eşdeğerlik değildir.',
   '[{"label":"analiz","category":"dimension"},{"label":"karmaşık ve öngörülemeyen bağlam","category":"level"},{"label":"yenilik","category":"level"}]'::jsonb,
   '["İleri veri kalitesi ve kanıt sınırları","Problem çözme, prototip ve doğrulama","TYYÇ form türü bağlamını görünür kılan kanıt etkinliği"]'::jsonb,
   '[{"method":"Karmaşık performans görevi + ürün dosyası","evidence":"Çalışan ürün, karar günlüğü ve analitik rubrik"},{"method":"Vaka çözümü + insan savunması","evidence":"Gerekçeli çözüm ve değerlendirme tutanağı"}]'::jsonb,
   6, '{"tyc":6,"eqf":6,"tyyc":6}'::jsonb, 'aligned',
   'TYÇ, AYÇ/EQF ve TYYÇ 6 önerileri aynı kanıt kümesi üzerinden ayrı hesaplanmıştır; eşitlik zorlanmamıştır.',
   'TYYÇ form siciline dayalı advisory öneridir; diploma türü, resmî eşdeğerlik, yerleştirme, akreditasyon veya logo hakkı değildir.',
   '["instructor","externalInstructor"]'::jsonb, '["coordinator","commission"]'::jsonb),
  ('SUG-DEMO-LO-2-TYYC', 'qualification-engine-2026-08-20-1', 'program-smart-alignment-demo', 'LO-2',
   'Ekip performansını değerlendirir ve stratejik dönüşümü yönetir.',
   '{"status":"sufficient","isMeasurable":true,"observableSignalCount":3,"warnings":[]}'::jsonb,
   'tyyc', 'tyyc-7', 7, 'competence', 98, 'high',
   'TYYÇ 7 / Yetkinlik önerisi; stratejik dönüşüm, ekip performansı, yönetim ve sorumluluk sinyalleri yüksek lisans türü advisory özetle karşılaştırılmıştır.',
   '[{"label":"yönetim","category":"dimension"},{"label":"stratejik dönüşüm","category":"level"},{"label":"ekip performansı","category":"level"}]'::jsonb,
   '["Stratejik değişim ve ekip performansı","Etik sorumluluk ve özerklik","Tezli/tezsiz tür ayrımını insan incelemesine bırakan kanıt etkinliği"]'::jsonb,
   '[{"method":"Proje/ekip simülasyonu + çok kaynaklı rubrik","evidence":"Karar günlüğü, risk kaydı ve ekip geri bildirimi"},{"method":"Kurul savunması + stratejik etki dosyası","evidence":"Savunma tutanağı ve etki ölçütleri"}]'::jsonb,
   7, '{"tyc":7,"eqf":7,"tyyc":7}'::jsonb, 'aligned',
   'TYÇ, AYÇ/EQF ve TYYÇ 7 önerileri aynı kanıt kümesi üzerinden ayrı hesaplanmıştır; eşitlik zorlanmamıştır.',
   'TYYÇ form siciline dayalı advisory öneridir; tezli/tezsiz diploma veya eşdeğerlik kararı değildir.',
   '["instructor","externalInstructor"]'::jsonb, '["coordinator","commission"]'::jsonb)
on conflict (id) do update set
  engine_profile_id = excluded.engine_profile_id,
  program_id = excluded.program_id,
  outcome_id = excluded.outcome_id,
  outcome_text = excluded.outcome_text,
  input_quality = excluded.input_quality,
  framework_id = excluded.framework_id,
  descriptor_id = excluded.descriptor_id,
  proposed_level = excluded.proposed_level,
  proposed_dimension = excluded.proposed_dimension,
  score = excluded.score,
  confidence = excluded.confidence,
  rationale = excluded.rationale,
  matched_signals = excluded.matched_signals,
  suggested_content = excluded.suggested_content,
  suggested_assessments = excluded.suggested_assessments,
  cross_framework_peer_level = excluded.cross_framework_peer_level,
  cross_framework_levels = excluded.cross_framework_levels,
  cross_framework_status = excluded.cross_framework_status,
  cross_framework_rationale = excluded.cross_framework_rationale,
  advisory_notice = excluded.advisory_notice,
  editable_roles = excluded.editable_roles,
  reviewer_roles = excluded.reviewer_roles,
  autonomous_decision = false,
  final_board_decision = false,
  institutional_validation_required = true,
  real_system_effect = false,
  is_synthetic = true;

insert into public.pilot_learning_outcome_tyyc_type_candidates
  (suggestion_id, type_descriptor_id, candidate_rank, score, rationale)
values
  ('SUG-DEMO-LO-1-TYYC', 'tyyc-type-bachelor', 1, 98, 'Düzey 6 ile karmaşık problem, ileri beceri ve proje bağlamı lisans türü adayını destekler.'),
  ('SUG-DEMO-LO-2-TYYC', 'tyyc-type-master-nonthesis', 1, 91, 'Stratejik yönetim ve uygulamalı uzmanlık sinyalleri tezsiz yüksek lisans türünü birinci aday yapar.'),
  ('SUG-DEMO-LO-2-TYYC', 'tyyc-type-master-thesis', 2, 72, 'Araştırma ve tez kanıtı eksik olduğundan tezli tür yalnız alternatif adaydır.')
on conflict (suggestion_id, type_descriptor_id) do update set
  candidate_rank = excluded.candidate_rank,
  score = excluded.score,
  rationale = excluded.rationale,
  selection_status = 'advisory_candidate',
  autonomous_decision = false,
  institutional_validation_required = true,
  real_system_effect = false,
  is_synthetic = true;

update public.pilot_qualification_board_decision_examples
set decided_tyyc_level = 6,
    suggestion_snapshot = '{"engineVersion":"2026-08-20.2","suggestedLevels":{"tyc":6,"eqf":6,"tyyc":6},"suggestionMutated":false,"autonomousDecision":false}'::jsonb,
    suggestion_mutated = false,
    autonomous_decision = false,
    institutional_validation_required = true,
    real_system_effect = false,
    is_synthetic = true
where id = 'DEC-DEMO-001';

insert into public.pilot_directive_constructive_alignment_rows
  (id, smart_program_id, engine_profile_id, outcome_id, directive_program_id,
   directive_program_version_no, content_item, learning_activity, assessment_task,
   rubric_reference, success_threshold, evidence_requirement,
   workload_component_type, workload_hours)
values
  ('ALIGN-LO-1', 'program-smart-alignment-demo', 'qualification-engine-2026-08-20-1', 'LO-1',
   'PROGRAM-DATA-LITERACY', 1, 'Veri kalitesi, kaynak güvenilirliği, çözüm tasarımı ve doğrulama',
   'Karmaşık vaka laboratuvarı, prototipleme ve insan geri bildirimi',
   'Performans görevi, ürün dosyası ve sözlü savunma', 'RUBRIC-DATA-LO1-V1 — SENTETİK',
   'Analitik rubrikte en az %70 — kurumsal doğrulama gerekir',
   'Çalışan ürün, karar günlüğü, kaynak izi, rubrik ve savunma tutanağı',
   'project_assignment_portfolio', 16),
  ('ALIGN-LO-2', 'program-smart-alignment-demo', 'qualification-engine-2026-08-20-1', 'LO-2',
   'PROGRAM-DATA-LITERACY', 1, 'Stratejik dönüşüm, ekip performansı, etik ve erişilebilirlik',
   'Ekip simülasyonu, değişim senaryosu ve yansıtıcı değerlendirme',
   'Stratejik etki dosyası, ekip savunması ve çok kaynaklı rubrik', 'RUBRIC-TEAM-LO2-V1 — SENTETİK',
   'Rubrikte yeterli düzey ve kritik etik ölçütlerde başarısızlık bulunmaması — doğrulama gerekir',
   'Karar günlüğü, risk kaydı, ekip geri bildirimi, rubrik ve savunma tutanağı',
   'feedback_and_revision', 4.5)
on conflict (id) do update set
  content_item = excluded.content_item,
  learning_activity = excluded.learning_activity,
  assessment_task = excluded.assessment_task,
  rubric_reference = excluded.rubric_reference,
  success_threshold = excluded.success_threshold,
  evidence_requirement = excluded.evidence_requirement,
  workload_component_type = excluded.workload_component_type,
  workload_hours = excluded.workload_hours,
  chain_status = 'human_review_required',
  institutional_validation_required = true,
  production_allowed = false,
  real_system_effect = false,
  is_synthetic = true;

update public.pilot_directive_program_versions
set information_package = information_package || jsonb_build_object(
  'constructive_alignment_contract',
  jsonb_build_object(
    'relational_source', 'pilot_directive_constructive_alignment_rows',
    'chain', jsonb_build_array('outcome','content','activity','assessment','rubric','threshold','evidence','workload'),
    'smart_program_id', 'program-smart-alignment-demo',
    'engine_profile_id', 'qualification-engine-2026-08-20-1',
    'institutional_validation_required', true,
    'official_placement_claim', false
  )
)
where program_id = 'PROGRAM-DATA-LITERACY' and version_no = 1;

alter table public.pilot_qualification_program_spine_links enable row level security;
alter table public.pilot_qualification_program_outcomes enable row level security;
alter table public.pilot_learning_outcome_tyyc_type_candidates enable row level security;
alter table public.pilot_directive_constructive_alignment_rows enable row level security;
alter table public.pilot_qualification_program_spine_links force row level security;
alter table public.pilot_qualification_program_outcomes force row level security;
alter table public.pilot_learning_outcome_tyyc_type_candidates force row level security;
alter table public.pilot_directive_constructive_alignment_rows force row level security;

revoke all on table public.pilot_qualification_program_spine_links from public, anon, authenticated;
revoke all on table public.pilot_qualification_program_outcomes from public, anon, authenticated;
revoke all on table public.pilot_learning_outcome_tyyc_type_candidates from public, anon, authenticated;
revoke all on table public.pilot_directive_constructive_alignment_rows from public, anon, authenticated;
grant select on table public.pilot_qualification_program_spine_links to authenticated;
grant select on table public.pilot_qualification_program_outcomes to authenticated;
grant select on table public.pilot_learning_outcome_tyyc_type_candidates to authenticated;
grant select on table public.pilot_directive_constructive_alignment_rows to authenticated;

drop policy if exists pilot_qualification_program_spine_authenticated_read
  on public.pilot_qualification_program_spine_links;
create policy pilot_qualification_program_spine_authenticated_read
on public.pilot_qualification_program_spine_links for select to authenticated
using (is_synthetic and institutional_validation_required and not production_allowed and not real_system_effect);

drop policy if exists pilot_qualification_program_outcomes_authenticated_read
  on public.pilot_qualification_program_outcomes;
create policy pilot_qualification_program_outcomes_authenticated_read
on public.pilot_qualification_program_outcomes for select to authenticated
using (is_synthetic and institutional_validation_required and not production_allowed and not real_system_effect);

drop policy if exists pilot_tyyc_type_candidates_authenticated_read
  on public.pilot_learning_outcome_tyyc_type_candidates;
create policy pilot_tyyc_type_candidates_authenticated_read
on public.pilot_learning_outcome_tyyc_type_candidates for select to authenticated
using (is_synthetic and institutional_validation_required and not autonomous_decision and not real_system_effect);

drop policy if exists pilot_constructive_alignment_authenticated_read
  on public.pilot_directive_constructive_alignment_rows;
create policy pilot_constructive_alignment_authenticated_read
on public.pilot_directive_constructive_alignment_rows for select to authenticated
using (is_synthetic and institutional_validation_required and not production_allowed and not real_system_effect);

create or replace view public.qualification_tyyc_type_descriptor_catalog
with (security_invoker = true, security_barrier = true)
as
select id, framework_id, level, qualification_type, title_tr, orientation,
  context_signals, official_source_url, official_form_registry_url,
  source_publisher, source_status, operational_descriptor_status,
  equivalence_claim, placement_claim, logo_right_claim, autonomous_decision,
  institutional_validation_required, verified_at
from public.qualification_tyyc_type_descriptors;

create or replace view public.pilot_qualification_program_summary_v2_catalog
with (security_invoker = true, security_barrier = true)
as
select p.program_id, p.engine_profile_id,
  p.suggested_tyc_level, p.suggested_eqf_level, p.suggested_tyyc_level,
  p.level_summaries, p.dimension_coverage, p.coverage, p.consistency,
  p.cross_framework_consistency, p.higher_education_cycle_id,
  p.rationale, p.aggregation_method, p.advisory_notice,
  p.autonomous_decision, p.final_board_decision, p.institutional_validation_required,
  l.directive_program_id, l.directive_program_version_no,
  c.tyyc_cycle_tr, c.bologna_cycle_tr, c.award_context_tr,
  c.mapping_status as cycle_mapping_status,
  c.equivalence_claim as cycle_equivalence_claim,
  c.placement_claim as cycle_placement_claim,
  c.official_validation_required as cycle_official_validation_required,
  c.tyyc_source_url, c.bologna_source_url, c.pilot_notice as cycle_pilot_notice
from public.pilot_qualification_program_summaries p
join public.pilot_qualification_program_spine_links l
  on l.smart_program_id = p.program_id and l.engine_profile_id = p.engine_profile_id
left join public.qualification_higher_education_cycle_crosswalks c
  on c.id = p.higher_education_cycle_id;

create or replace view public.pilot_learning_outcome_suggestion_v2_catalog
with (security_invoker = true, security_barrier = true)
as
select s.id, s.engine_profile_id, s.program_id, s.outcome_id, s.outcome_text,
  o.directive_program_id, o.directive_program_version_no, o.outcome_order,
  s.input_quality, s.framework_id, f.code as framework_code, s.descriptor_id,
  s.proposed_level, s.proposed_dimension, s.score, s.confidence, s.rationale,
  s.matched_signals, s.suggested_content, s.suggested_assessments,
  s.cross_framework_peer_level, s.cross_framework_levels,
  s.cross_framework_status, s.cross_framework_rationale,
  s.advisory_notice, s.selection_source, s.editable_roles, s.reviewer_roles,
  s.autonomous_decision, s.final_board_decision, s.institutional_validation_required,
  d.knowledge_descriptor, d.skills_descriptor, d.competence_descriptor,
  d.content_basis as descriptor_content_basis, d.official_source_url,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', t.id,
      'level', t.level,
      'qualificationType', t.qualification_type,
      'titleTr', t.title_tr,
      'orientation', t.orientation,
      'score', c.score,
      'rank', c.candidate_rank,
      'rationale', c.rationale,
      'operationalDescriptorStatus', t.operational_descriptor_status,
      'equivalenceClaim', t.equivalence_claim,
      'placementClaim', t.placement_claim,
      'logoRightClaim', t.logo_right_claim
    ) order by c.candidate_rank)
    from public.pilot_learning_outcome_tyyc_type_candidates c
    join public.qualification_tyyc_type_descriptors t on t.id = c.type_descriptor_id
    where c.suggestion_id = s.id
  ), '[]'::jsonb) as qualification_type_candidates
from public.pilot_learning_outcome_suggestions s
join public.pilot_qualification_program_outcomes o
  on o.smart_program_id = s.program_id
 and o.engine_profile_id = s.engine_profile_id
 and o.outcome_id = s.outcome_id
join public.qualification_frameworks f on f.id = s.framework_id
join public.qualification_level_descriptors d
  on d.id = s.descriptor_id and d.framework_id = s.framework_id and d.level = s.proposed_level;

create or replace view public.pilot_qualification_board_decision_v2_catalog
with (security_invoker = true, security_barrier = true)
as
select b.id, b.program_id, b.engine_profile_id, b.decision_status,
  b.actor_role, b.decided_by_label, b.rationale,
  b.decided_tyc_level, b.decided_eqf_level, b.decided_tyyc_level,
  b.decided_at, b.meeting_reference, b.suggestion_snapshot,
  b.is_human_decision, b.suggestion_mutated, b.autonomous_decision,
  b.institutional_validation_required,
  l.directive_program_id, l.directive_program_version_no
from public.pilot_qualification_board_decision_examples b
join public.pilot_qualification_program_spine_links l
  on l.smart_program_id = b.program_id and l.engine_profile_id = b.engine_profile_id;

create or replace view public.pilot_qualification_program_spine_catalog
with (security_invoker = true, security_barrier = true)
as
select l.smart_program_id, l.engine_profile_id, l.directive_program_id,
  l.directive_program_version_no, l.link_status,
  count(distinct o.outcome_id)::integer as outcome_count,
  count(distinct s.id)::integer as suggestion_count,
  count(distinct m.id)::integer as manual_override_count,
  count(distinct d.id)::integer as matrix_draft_count,
  count(distinct a.id)::integer as constructive_alignment_row_count,
  count(distinct b.id)::integer as board_decision_count,
  l.institutional_validation_required
from public.pilot_qualification_program_spine_links l
join public.pilot_qualification_program_outcomes o
  on o.smart_program_id = l.smart_program_id and o.engine_profile_id = l.engine_profile_id
join public.pilot_learning_outcome_suggestions s
  on s.program_id = o.smart_program_id and s.engine_profile_id = o.engine_profile_id and s.outcome_id = o.outcome_id
left join public.pilot_qualification_manual_override_examples m
  on m.suggestion_id = s.id and m.outcome_id = s.outcome_id and m.framework_id = s.framework_id
join public.pilot_matrix_drafts d
  on d.program_id = l.directive_program_id and d.program_version_no = l.directive_program_version_no
join public.pilot_directive_constructive_alignment_rows a
  on a.smart_program_id = o.smart_program_id and a.engine_profile_id = o.engine_profile_id and a.outcome_id = o.outcome_id
left join public.pilot_qualification_board_decision_examples b
  on b.program_id = l.smart_program_id and b.engine_profile_id = l.engine_profile_id
group by l.smart_program_id, l.engine_profile_id, l.directive_program_id,
  l.directive_program_version_no, l.link_status, l.institutional_validation_required;

create or replace view public.pilot_constructive_alignment_catalog
with (security_invoker = true, security_barrier = true)
as
select a.id, a.smart_program_id, a.engine_profile_id, a.outcome_id,
  o.outcome_order, o.outcome_text, a.directive_program_id,
  a.directive_program_version_no, a.content_item, a.learning_activity,
  a.assessment_task, a.rubric_reference, a.success_threshold,
  a.evidence_requirement, a.workload_component_type, a.workload_hours,
  w.planned_hours as component_planned_hours,
  a.chain_status, a.institutional_validation_required
from public.pilot_directive_constructive_alignment_rows a
join public.pilot_qualification_program_outcomes o
  on o.smart_program_id = a.smart_program_id
 and o.engine_profile_id = a.engine_profile_id
 and o.outcome_id = a.outcome_id
join public.pilot_directive_workload_items w
  on w.program_id = a.directive_program_id
 and w.program_version_no = a.directive_program_version_no
 and w.component_type = a.workload_component_type;

revoke all on table public.qualification_tyyc_type_descriptor_catalog from public, anon, authenticated;
revoke all on table public.pilot_qualification_program_summary_v2_catalog from public, anon, authenticated;
revoke all on table public.pilot_learning_outcome_suggestion_v2_catalog from public, anon, authenticated;
revoke all on table public.pilot_qualification_board_decision_v2_catalog from public, anon, authenticated;
revoke all on table public.pilot_qualification_program_spine_catalog from public, anon, authenticated;
revoke all on table public.pilot_constructive_alignment_catalog from public, anon, authenticated;
grant select on table public.qualification_tyyc_type_descriptor_catalog to anon, authenticated;
grant select on table public.pilot_qualification_program_summary_v2_catalog to authenticated;
grant select on table public.pilot_learning_outcome_suggestion_v2_catalog to authenticated;
grant select on table public.pilot_qualification_board_decision_v2_catalog to authenticated;
grant select on table public.pilot_qualification_program_spine_catalog to authenticated;
grant select on table public.pilot_constructive_alignment_catalog to authenticated;

create index if not exists pilot_qualification_program_spine_directive_idx
  on public.pilot_qualification_program_spine_links (directive_program_id, directive_program_version_no);
create index if not exists pilot_qualification_program_outcomes_directive_idx
  on public.pilot_qualification_program_outcomes (directive_program_id, directive_program_version_no, outcome_order);
create index if not exists pilot_tyyc_type_candidates_type_idx
  on public.pilot_learning_outcome_tyyc_type_candidates (type_descriptor_id);
create index if not exists pilot_constructive_alignment_program_idx
  on public.pilot_directive_constructive_alignment_rows (directive_program_id, directive_program_version_no, outcome_id);
create index if not exists pilot_matrix_drafts_program_version_idx
  on public.pilot_matrix_drafts (program_id, program_version_no);

commit;
