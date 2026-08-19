-- KDPÜ MYYS kontrollü pilot: resmî TYÇ/AYÇ referansı, matris şablonları,
-- mali yönlendirme ve dokuz rolün operasyon görünümü.
--
-- Güvenlik sınırı:
--   * TYÇ/AYÇ satırları yalnız kamuya açık resmî çerçeve verisidir.
--   * Diğer bütün satırlar sentetik, salt-okunur pilot verisidir.
--   * Gerçek kişi, ödeme, kart, fatura, entegrasyon sırrı veya canlı sistem
--     etkisi yoktur.
--   * Migration tekrar çalıştırılabilir; seed kayıtları doğal anahtarlarıyla
--     upsert edilir.

create table if not exists public.qualification_frameworks (
  id text primary key,
  code text not null unique,
  name_tr text not null,
  name_en text not null,
  jurisdiction_label text not null,
  descriptor_dimensions jsonb not null,
  official_source_url text not null check (official_source_url ~ '^https://'),
  legal_source_url text not null check (legal_source_url ~ '^https://'),
  verified_at timestamptz not null,
  source_status text not null default 'official' check (source_status = 'official'),
  is_public_reference boolean not null default true check (is_public_reference),
  check (jsonb_typeof(descriptor_dimensions) = 'array')
);

create table if not exists public.qualification_level_descriptors (
  id text primary key,
  framework_id text not null references public.qualification_frameworks(id) on update cascade on delete restrict,
  level smallint not null check (level between 1 and 8),
  knowledge_descriptor text not null,
  skills_descriptor text not null,
  competence_descriptor text not null,
  competence_label text not null,
  source_language text not null check (source_language in ('tr', 'en')),
  content_basis text not null check (content_basis in ('official_verbatim', 'official_translation')),
  official_source_url text not null check (official_source_url ~ '^https://'),
  verified_at timestamptz not null,
  is_public_reference boolean not null default true check (is_public_reference),
  unique (framework_id, level),
  unique (id, framework_id, level)
);

create table if not exists public.pilot_matrix_templates (
  id text primary key,
  framework_id text not null references public.qualification_frameworks(id) on update cascade on delete restrict,
  level smallint not null check (level between 1 and 8),
  title text not null,
  candidate_instructions text not null,
  columns_schema jsonb not null,
  example_scope text not null,
  official_source_url text not null check (official_source_url ~ '^https://'),
  source_verified_at timestamptz not null,
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic),
  unique (framework_id, level),
  unique (id, framework_id, level),
  check (jsonb_typeof(columns_schema) = 'array')
);

create table if not exists public.pilot_matrix_example_rows (
  id text primary key,
  template_id text not null references public.pilot_matrix_templates(id) on update cascade on delete cascade,
  row_order smallint not null check (row_order > 0),
  framework_dimension text not null check (framework_dimension in ('knowledge', 'skills', 'competence')),
  learning_outcome_code text not null,
  learning_outcome_sample text not null,
  learning_level_sample text not null,
  course_content_sample text not null,
  assessment_method_sample text not null,
  evidence_sample text not null,
  alignment_rationale_sample text not null,
  pilot_notice text not null,
  is_example boolean not null default true check (is_example),
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic),
  unique (template_id, row_order)
);

create table if not exists public.pilot_finance_routes (
  id text primary key,
  trigger_key text not null unique,
  route_order smallint not null check (route_order > 0),
  title text not null,
  source_page text not null,
  destination_page text not null,
  from_role text not null,
  to_role text not null,
  learner_action_label text not null,
  learner_message text not null,
  finance_message text not null,
  gib_explanation text not null,
  mys_mays_explanation text not null,
  status_path jsonb not null,
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  real_payment_enabled boolean not null default false check (not real_payment_enabled),
  real_invoice_enabled boolean not null default false check (not real_invoice_enabled),
  real_transfer_enabled boolean not null default false check (not real_transfer_enabled),
  real_data_sent boolean not null default false check (not real_data_sent),
  is_synthetic boolean not null default true check (is_synthetic),
  check (jsonb_typeof(status_path) = 'array')
);

create table if not exists public.pilot_role_overviews (
  role_id text primary key check (role_id in (
    'learner', 'instructor', 'externalInstructor', 'coordinator', 'commission',
    'studentAffairs', 'it', 'finance', 'admin'
  )),
  role_label text not null,
  overview_title text not null,
  overview_summary text not null,
  primary_page text not null,
  responsibilities jsonb not null,
  allowed_actions jsonb not null,
  prohibited_actions jsonb not null,
  finance_handoff_visibility boolean not null default false,
  real_system_write_enabled boolean not null default false check (not real_system_write_enabled),
  is_synthetic boolean not null default true check (is_synthetic),
  check (jsonb_typeof(responsibilities) = 'array'),
  check (jsonb_typeof(allowed_actions) = 'array'),
  check (jsonb_typeof(prohibited_actions) = 'array')
);

create table if not exists public.pilot_role_workflow_steps (
  id text primary key,
  role_id text not null references public.pilot_role_overviews(role_id) on update cascade on delete cascade,
  step_order smallint not null check (step_order > 0),
  page_key text not null,
  title text not null,
  description text not null,
  action_label text not null,
  next_role text null references public.pilot_role_overviews(role_id) on update cascade on delete restrict,
  finance_related boolean not null default false,
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic),
  unique (role_id, step_order)
);

comment on table public.qualification_frameworks is
  'Kamuya açık resmî TYÇ ve AYÇ/EQF çerçeve üst verisi; kişisel veri içermez.';
comment on table public.qualification_level_descriptors is
  'Resmî kaynaklardan doğrulanmış 1-8 seviye tanımlayıcıları ve kaynak izi.';
comment on table public.pilot_matrix_templates is
  'Aday eğitici tarafından doldurulacak, karar üretmeyen TYÇ/AYÇ uyum matrisi şablonları.';
comment on table public.pilot_matrix_example_rows is
  'Resmî yeterlilik olmayan, yalnız form kullanımını açıklayan sentetik örnek satırlar.';
comment on table public.pilot_finance_routes is
  'Gerçek tahsilat/fatura/aktarım yapmayan ödeme ve Mali İşler yönlendirme senaryoları.';
comment on table public.pilot_role_overviews is
  'Dokuz demo rolünün birbirinden ayrışan, salt-okunur operasyon özetleri.';
comment on table public.pilot_role_workflow_steps is
  'Her demo rolü için görünür iş akışı adımları; canlı kurumsal sistem etkisi yoktur.';

alter table public.qualification_frameworks enable row level security;
alter table public.qualification_level_descriptors enable row level security;
alter table public.pilot_matrix_templates enable row level security;
alter table public.pilot_matrix_example_rows enable row level security;
alter table public.pilot_finance_routes enable row level security;
alter table public.pilot_role_overviews enable row level security;
alter table public.pilot_role_workflow_steps enable row level security;

alter table public.qualification_frameworks force row level security;
alter table public.qualification_level_descriptors force row level security;
alter table public.pilot_matrix_templates force row level security;
alter table public.pilot_matrix_example_rows force row level security;
alter table public.pilot_finance_routes force row level security;
alter table public.pilot_role_overviews force row level security;
alter table public.pilot_role_workflow_steps force row level security;

revoke all on table public.qualification_frameworks from public, anon, authenticated;
revoke all on table public.qualification_level_descriptors from public, anon, authenticated;
revoke all on table public.pilot_matrix_templates from public, anon, authenticated;
revoke all on table public.pilot_matrix_example_rows from public, anon, authenticated;
revoke all on table public.pilot_finance_routes from public, anon, authenticated;
revoke all on table public.pilot_role_overviews from public, anon, authenticated;
revoke all on table public.pilot_role_workflow_steps from public, anon, authenticated;

grant select on table public.qualification_frameworks to anon, authenticated;
grant select on table public.qualification_level_descriptors to anon, authenticated;
grant select on table public.pilot_matrix_templates to anon, authenticated;
grant select on table public.pilot_matrix_example_rows to anon, authenticated;
grant select on table public.pilot_finance_routes to anon, authenticated;
grant select on table public.pilot_role_overviews to anon, authenticated;
grant select on table public.pilot_role_workflow_steps to anon, authenticated;

drop policy if exists qualification_frameworks_public_reference_read on public.qualification_frameworks;
create policy qualification_frameworks_public_reference_read
on public.qualification_frameworks for select to anon, authenticated
using (
  is_public_reference = true
  and source_status = 'official'
  and official_source_url ~ '^https://'
  and verified_at is not null
);

drop policy if exists qualification_level_descriptors_public_reference_read on public.qualification_level_descriptors;
create policy qualification_level_descriptors_public_reference_read
on public.qualification_level_descriptors for select to anon, authenticated
using (
  is_public_reference = true
  and official_source_url ~ '^https://'
  and verified_at is not null
);

drop policy if exists pilot_matrix_templates_synthetic_read on public.pilot_matrix_templates;
create policy pilot_matrix_templates_synthetic_read
on public.pilot_matrix_templates for select to anon, authenticated
using (
  is_synthetic = true
  and real_system_effect = false
  and institutional_validation_required = true
);

drop policy if exists pilot_matrix_example_rows_synthetic_read on public.pilot_matrix_example_rows;
create policy pilot_matrix_example_rows_synthetic_read
on public.pilot_matrix_example_rows for select to anon, authenticated
using (is_synthetic = true and is_example = true and real_system_effect = false);

drop policy if exists pilot_finance_routes_synthetic_read on public.pilot_finance_routes;
create policy pilot_finance_routes_synthetic_read
on public.pilot_finance_routes for select to anon, authenticated
using (
  is_synthetic = true
  and institutional_validation_required = true
  and real_payment_enabled = false
  and real_invoice_enabled = false
  and real_transfer_enabled = false
  and real_data_sent = false
);

drop policy if exists pilot_role_overviews_synthetic_read on public.pilot_role_overviews;
create policy pilot_role_overviews_synthetic_read
on public.pilot_role_overviews for select to anon, authenticated
using (is_synthetic = true and real_system_write_enabled = false);

drop policy if exists pilot_role_workflow_steps_synthetic_read on public.pilot_role_workflow_steps;
create policy pilot_role_workflow_steps_synthetic_read
on public.pilot_role_workflow_steps for select to anon, authenticated
using (is_synthetic = true and real_system_effect = false);

insert into public.qualification_frameworks
  (id, code, name_tr, name_en, jurisdiction_label, descriptor_dimensions,
   official_source_url, legal_source_url, verified_at)
values
  (
    'tyc',
    'TYÇ',
    'Türkiye Yeterlilikler Çerçevesi',
    'Turkish Qualifications Framework',
    'Türkiye',
    '["Bilgi", "Beceri", "Yetkinlik"]'::jsonb,
    'https://myk.gov.tr/tr/page/90',
    'https://www.myk.gov.tr/images/articles/TYC/Tyc_bilgi_merkezi/mevzuat_duzenlemeleri/TYC_Belgesi.pdf',
    '2026-08-19 22:00:00+00'
  ),
  (
    'eqf',
    'AYÇ/EQF',
    'Avrupa Yeterlilikler Çerçevesi',
    'European Qualifications Framework',
    'Avrupa Birliği',
    '["Knowledge", "Skills", "Responsibility and autonomy"]'::jsonb,
    'https://europass.europa.eu/en/description-eight-eqf-levels',
    'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32017H0615(01)',
    '2026-08-19 22:00:00+00'
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

insert into public.qualification_level_descriptors
  (id, framework_id, level, knowledge_descriptor, skills_descriptor, competence_descriptor,
   competence_label, source_language, content_basis, official_source_url, verified_at)
values
  (
    'tyc-1', 'tyc', 1,
    $$Kendisi ve çevresine ilişkin genel bilgiye sahip olma$$,
    $$Basit görevleri yerine getirmek için gerekli temel beceriye sahip olma$$,
    $$Basit görevleri rehberlik ve gözetim altında gerçekleştirme$$,
    'Yetkinlik', 'tr', 'official_verbatim',
    'https://www.myk.gov.tr/images/articles/TYC/Tyc_bilgi_merkezi/Seviye_Tanimlay%C4%B1cilari/TYC_Seviye_Tanimlayicilari2.pdf',
    '2026-08-19 22:00:00+00'
  ),
  (
    'tyc-2', 'tyc', 2,
    $$Bir iş veya öğrenme alanına ait başlangıç düzeyinde olgusal bilgiye sahip olma$$,
    $$Görevleri yerine getirmek ve olası basit sorunları çözmek için gerekli bilgiyi kullanma temel becerisine sahip olma$$,
    $$Basit görevleri gözetim altında sınırlı özerklik ile gerçekleştirme

Hayat boyu öğrenme yaklaşımı kapsamında öğrenme ihtiyaçlarının farkında olma$$,
    'Yetkinlik', 'tr', 'official_verbatim',
    'https://www.myk.gov.tr/images/articles/TYC/Tyc_bilgi_merkezi/Seviye_Tanimlay%C4%B1cilari/TYC_Seviye_Tanimlayicilari2.pdf',
    '2026-08-19 22:00:00+00'
  ),
  (
    'tyc-3', 'tyc', 3,
    $$Bir iş veya öğrenme alanına ait başlangıç düzeyinde kuramsal, orta düzeyde olgusal bilgiye sahip olma$$,
    $$Görevleri yerine getirmek ve problem çözmek için, gerekli veri, yöntem ve araç-gereçleri seçip kullanma becerisine sahip olma$$,
    $$Görevleri yerine getirmede sorumluluk alma

Değişen şartları dikkate alarak görevi tamamlama

Hayat boyu öğrenme yaklaşımı kapsamında öğrenme ihtiyaçlarını rehberlik eşliğinde belirleme ve karşılama$$,
    'Yetkinlik', 'tr', 'official_verbatim',
    'https://www.myk.gov.tr/images/articles/TYC/Tyc_bilgi_merkezi/Seviye_Tanimlay%C4%B1cilari/TYC_Seviye_Tanimlayicilari2.pdf',
    '2026-08-19 22:00:00+00'
  ),
  (
    'tyc-4', 'tyc', 4,
    $$Bir iş veya öğrenme alanına ait orta düzeyde kuramsal ve işlemsel, orta düzeyin üzerinde olgusal bilgiye sahip olma$$,
    $$Bir iş veya öğrenme alanına özgü iş ve işlemleri yerine getirmek ve sorunlara çözüm üretmek amacıyla bilişsel ve uygulamalı becerilere sahip olma$$,
    $$Öngörülebilir, ancak değişime açık ortamlarda, görevleri tamamlamak için tam sorumluluk alma

Başkalarının yürüttüğü sıradan görevlerin gözetimini yapma, bu görevlerin değerlendirilmesinde ve iyileştirilmesinde sınırlı sorumluluk alma

Hayat boyu öğrenme yaklaşımı kapsamında öğrenme ihtiyaçlarını karşılama ve rehberlik eşliğinde ileriye yönelik öğrenme hedeflerini belirleme

Bir iş veya öğrenme alanındaki bilgi, beceri, tutum ve davranışlar ile etik meseleler ve toplumsal sorunların ilişkisi konusunda farkındalığa sahip olma$$,
    'Yetkinlik', 'tr', 'official_verbatim',
    'https://www.myk.gov.tr/images/articles/TYC/Tyc_bilgi_merkezi/Seviye_Tanimlay%C4%B1cilari/TYC_Seviye_Tanimlayicilari2.pdf',
    '2026-08-19 22:00:00+00'
  ),
  (
    'tyc-5', 'tyc', 5,
    $$Bir iş veya öğrenme alanının sınırlarının farkında olarak, bu alana özgü, kapsamlı, kuramsal ve olgusal bilgilere sahip olma$$,
    $$Sınırları belirlenmiş soyut ve somut sorunlara yaratıcı çözümler geliştirmede gerekli, kapsamlı, bilişsel ve uygulamalı becerilere sahip olma$$,
    $$Öngörülemeyen değişikliklerin olduğu ortamlarda yönetim ve gözetim görevi yapma

Kendisinin ve başkalarının başarım düzeyini değerlendirme ve geliştirme

Projelerin yönetimi dâhil iş veya öğrenme ortamlarında işleme dair etkileşimde bulunma

Bir iş veya öğrenme alanına yönelik hayat boyu öğrenme yaklaşımının kapsamına ve bu kapsamın örgün ve yaygın eğitim ile serbest öğrenme yollarıyla ilişkisi konusunda genel farkındalığa sahip olma

Bir iş veya öğrenme alanındaki bilgi, beceri, tutum ve davranışlar ile toplumsal ve etik meseleler ve sorumluluklar ilişkisinin farkında olma$$,
    'Yetkinlik', 'tr', 'official_verbatim',
    'https://www.myk.gov.tr/images/articles/TYC/Tyc_bilgi_merkezi/Seviye_Tanimlay%C4%B1cilari/TYC_Seviye_Tanimlayicilari2.pdf',
    '2026-08-19 22:00:00+00'
  ),
  (
    'tyc-6', 'tyc', 6,
    $$Bir iş veya öğrenme alanında sorgulayıcı bakış açısını kapsayacak şekilde ileri düzeyde kuramsal, metodolojik ve olgusal bilgiye sahip olma$$,
    $$Uzmanlık gerektiren bir iş veya öğrenme alanında, karmaşık ve öngörülemeyen sorunları çözmek için gerekli, uzmanlık ve yenilik niteliği gösteren ileri düzeyde becerilere sahip olma$$,
    $$Öngörülemeyen iş veya öğrenme ortamlarında sorumluluk alarak karar verme ve bu ortamlarda karmaşık teknik veya meslekî faaliyet veya projeleri yönetme

Kişilerin ve grupların meslekî gelişiminin yönetiminde sorumluluk alma

Bir iş veya öğrenme alanına yönelik hayat boyu öğrenme yaklaşımının kavramları, politikaları, araçlarının uygulaması ve bunların örgün ve yaygın eğitim ile serbest öğrenme yollarıyla ilişkisi konusunda deneyim sahibi olma

Bir iş veya öğrenme değerlendirmesinde bulunurken toplumsal ve etik değerlerin farkında olma$$,
    'Yetkinlik', 'tr', 'official_verbatim',
    'https://www.myk.gov.tr/images/articles/TYC/Tyc_bilgi_merkezi/Seviye_Tanimlay%C4%B1cilari/TYC_Seviye_Tanimlayicilari2.pdf',
    '2026-08-19 22:00:00+00'
  ),
  (
    'tyc-7', 'tyc', 7,
    $$Bir iş veya öğrenme alanında, özgün fikirlerin ve/veya araştırmanın temelini oluşturan ve bir kısmı en ileri düzeydeki ihtisas bilgisine sahip olma

Alanındaki ve alanının ilişkili olduğu değişik alanların arayüzündeki bilgi meselelerinde sorgulayıcı yaklaşıma sahip olma$$,
    $$Bir iş veya öğrenme alanında yeni bilgi ve yöntemleri geliştirmek ve farklı alanlardan bilgiyi bütünleştirmek için yürütülen araştırma ve/veya yenilik faaliyetlerinde sorun çözmede ileri düzeyde beceriye sahip olma

İleri araştırma işlemlerinin kavranılması, tasarlanması, uygulanması ve uyarlanmasını yapma becerisine ekip üyesi veya kısmen özerk olarak sahip olma$$,
    $$Öngörülemeyen, karmaşık ve yeni stratejik yaklaşımlar gerektiren iş veya öğrenme ortamlarını yönetme ve dönüştürme

Karmaşık bir ortamda değişimi yönetme tecrübesine sahip olma

Meslekî bilgi ve uygulamaya katkı yapmak ve/veya takımların stratejik başarım düzeyini değerlendirmek için sorumluluk alma

Bir iş veya öğrenme alanına ve alanlar arasındaki arayüz bilgisine yönelik hayat boyu öğrenme yaklaşımının kavram, politika, araçlar ve uygulaması ve bunların örgün ve yaygın eğitim ile serbest öğrenme yollarıyla ilişkisi konusunda liderlik yapma

Bir iş veya öğrenme alanında, toplumsal ve etik meseleleri ve sorumlulukları dikkate alarak bilgiyi bütünleştirme ve yargıda bulunma$$,
    'Yetkinlik', 'tr', 'official_verbatim',
    'https://www.myk.gov.tr/images/articles/TYC/Tyc_bilgi_merkezi/Seviye_Tanimlay%C4%B1cilari/TYC_Seviye_Tanimlayicilari2.pdf',
    '2026-08-19 22:00:00+00'
  ),
  (
    'tyc-8', 'tyc', 8,
    $$Bir iş veya öğrenme alanındaki kuram, uygulama, yöntem ve tekniklerin en ileri düzeydeki sistematik bilgisine ve sorgulayıcı analiz yapacak kapasiteye sahip olma

Bir iş veya öğrenme alanıyla ilişkili olarak farklı iş veya öğrenme alanlarında en ileri düzeydeki arayüz bilgisine sahip olma$$,
    $$Bir iş veya öğrenme alanındaki en ileri düzeydeki araştırma ve/veya yenilikte kritik sorunları çözmek, mevcut bilgiyi veya meslekî uygulamayı genişletmek ve yeniden tanımlamak için sentez ve değerlendirmeyi de kapsayan en ileri düzeydeki bilgi, yöntem ve teknikleri kullanmayı gerektiren uzmanlaşmış becerilere sahip olma

İleri araştırma süreçlerinin kavranılması, tasarlanması, uygulanması ve uyarlanmasını yapma becerisine özerk olarak sahip olma

Alanında ortaya çıkan, farklı alanlardaki yöntem ve yaklaşımların kullanımını da gerektiren yeni ve karmaşık sorunları çözme becerisine sahip olma$$,
    $$Güçlü bir yetkinlik, yenilik, özerklik, bilimsel ve meslekî tutarlılığa sahip olma ve araştırma dâhil iş veya öğrenme ortamlarındaki en ileri seviyedeki yeni fikirlerin ve süreçlerin geliştirilmesinde yetkin olduğunu gösterme

Bir iş veya öğrenme alanındaki mevcut bilgi veya meslekî uygulamanın yeniden tanımlanmasına veya genişletilmesine imkân veren yeni ve özgün yaklaşımların geliştirilmesinde liderlik yapma

Bir iş veya öğrenme alanına ve alanlar arasındaki arayüz bilgisine yönelik hayat boyu öğrenme yaklaşımının öngörülmeyen, karmaşık ve yenilik gerektiren ortamlarda geliştirilmesine, örgün ve yaygın eğitim ile serbest öğrenme yollarıyla desteklenmesine ilişkin konularda özgün politika ve uygulamalar geliştirme

Bir iş veya öğrenme alanında, toplumsal ve etik meseleleri ve sorumlulukları dikkate alarak yeni bilgi üretme$$,
    'Yetkinlik', 'tr', 'official_verbatim',
    'https://www.myk.gov.tr/images/articles/TYC/Tyc_bilgi_merkezi/Seviye_Tanimlay%C4%B1cilari/TYC_Seviye_Tanimlayicilari2.pdf',
    '2026-08-19 22:00:00+00'
  ),
  (
    'eqf-1', 'eqf', 1,
    $$Basic general knowledge$$,
    $$Basic skills required to carry out simple tasks$$,
    $$Work or study under direct supervision in a structured context$$,
    'Responsibility and autonomy', 'en', 'official_verbatim',
    'https://europass.europa.eu/en/description-eight-eqf-levels',
    '2026-08-19 22:00:00+00'
  ),
  (
    'eqf-2', 'eqf', 2,
    $$Basic factual knowledge of a field of work or study$$,
    $$Basic cognitive and practical skills required to use relevant information in order to carry out tasks and to solve routine problems using simple rules and tools$$,
    $$Work or study under supervision with some autonomy$$,
    'Responsibility and autonomy', 'en', 'official_verbatim',
    'https://europass.europa.eu/en/description-eight-eqf-levels',
    '2026-08-19 22:00:00+00'
  ),
  (
    'eqf-3', 'eqf', 3,
    $$Knowledge of facts, principles, processes and general concepts, in a field of work or study$$,
    $$A range of cognitive and practical skills required to accomplish tasks and solve problems by selecting and applying basic methods, tools, materials and information$$,
    $$Take responsibility for completion of tasks in work or study; adapt own behaviour to circumstances in solving problems$$,
    'Responsibility and autonomy', 'en', 'official_verbatim',
    'https://europass.europa.eu/en/description-eight-eqf-levels',
    '2026-08-19 22:00:00+00'
  ),
  (
    'eqf-4', 'eqf', 4,
    $$Factual and theoretical knowledge in broad contexts within a field of work or study$$,
    $$A range of cognitive and practical skills required to generate solutions to specific problems in a field of work or study$$,
    $$Exercise self-management within the guidelines of work or study contexts that are usually predictable, but are subject to change; supervise the routine work of others, taking some responsibility for the evaluation and improvement of work or study activities$$,
    'Responsibility and autonomy', 'en', 'official_verbatim',
    'https://europass.europa.eu/en/description-eight-eqf-levels',
    '2026-08-19 22:00:00+00'
  ),
  (
    'eqf-5', 'eqf', 5,
    $$Comprehensive, specialised, factual and theoretical knowledge within a field of work or study and an awareness of the boundaries of that knowledge$$,
    $$A comprehensive range of cognitive and practical skills required to develop creative solutions to abstract problems$$,
    $$Exercise management and supervision in contexts of work or study activities where there is unpredictable change; review and develop performance of self and others$$,
    'Responsibility and autonomy', 'en', 'official_verbatim',
    'https://europass.europa.eu/en/description-eight-eqf-levels',
    '2026-08-19 22:00:00+00'
  ),
  (
    'eqf-6', 'eqf', 6,
    $$Advanced knowledge of a field of work or study, involving a critical understanding of theories and principles$$,
    $$Advanced skills, demonstrating mastery and innovation, required to solve complex and unpredictable problems in a specialised field of work or study$$,
    $$Manage complex technical or professional activities or projects, taking responsibility for decision-making in unpredictable work or study contexts; take responsibility for managing professional development of individuals and groups$$,
    'Responsibility and autonomy', 'en', 'official_verbatim',
    'https://europass.europa.eu/en/description-eight-eqf-levels',
    '2026-08-19 22:00:00+00'
  ),
  (
    'eqf-7', 'eqf', 7,
    $$Highly specialised knowledge, some of which is at the forefront of knowledge in a field of work or study, as the basis for original thinking and/or research. Critical awareness of knowledge issues in a field and at the interface between different fields$$,
    $$Specialised problem-solving skills required in research and/or innovation in order to develop new knowledge and procedures and to integrate knowledge from different fields$$,
    $$Manage and transform work or study contexts that are complex, unpredictable and require new strategic approaches; take responsibility for contributing to professional knowledge and practice and/or for reviewing the strategic performance of teams$$,
    'Responsibility and autonomy', 'en', 'official_verbatim',
    'https://europass.europa.eu/en/description-eight-eqf-levels',
    '2026-08-19 22:00:00+00'
  ),
  (
    'eqf-8', 'eqf', 8,
    $$Knowledge at the most advanced frontier of a field of work or study and at the interface between fields$$,
    $$The most advanced and specialised skills and techniques, including synthesis and evaluation, required to solve critical problems in research and/or innovation and to extend and redefine existing knowledge or professional practice$$,
    $$Demonstrate substantial authority, innovation, autonomy, scholarly and professional integrity and sustained commitment to the development of new ideas or processes at the forefront of work or study contexts including research$$,
    'Responsibility and autonomy', 'en', 'official_verbatim',
    'https://europass.europa.eu/en/description-eight-eqf-levels',
    '2026-08-19 22:00:00+00'
  )
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
  'matrix-' || d.framework_id || '-' || d.level::text,
  d.framework_id,
  d.level,
  f.code || ' ' || d.level::text || '. seviye — yeterlilik/öğrenme hedefi/içerik/ölçme matrisi',
  'Aday eğitici; her öğrenme hedefini seçilen seviye tanımlayıcısıyla ilişkilendirmeli, ders içeriğini ve ölçme-değerlendirme yöntemini yazmalı, gözlenebilir kanıtı belirtmeli ve uyum gerekçesini açıklamalıdır. Otomatik eşleşme akademik karar değildir.',
  '[
    {"key":"framework_descriptor","label":"Seviye tanımlayıcısı","required":true,"input":"reference"},
    {"key":"learning_outcome","label":"Öğrenme hedefi / çıktısı","required":true,"input":"textarea"},
    {"key":"learning_level","label":"Öğrenme düzeyi ve eylem fiili","required":true,"input":"text"},
    {"key":"course_content","label":"Ders içeriği / öğrenme etkinliği","required":true,"input":"textarea"},
    {"key":"assessment_method","label":"Ölçme-değerlendirme yöntemi","required":true,"input":"textarea"},
    {"key":"evidence","label":"Başarı ölçütü ve kanıt","required":true,"input":"textarea"},
    {"key":"alignment_rationale","label":"Uyum gerekçesi","required":true,"input":"textarea"}
  ]'::jsonb,
  case when d.framework_id = 'tyc'
    then 'TYÇ için Bilgi, Beceri ve Yetkinlik boyutları ayrı ayrı ele alınır.'
    else 'AYÇ/EQF için Knowledge, Skills ve Responsibility and autonomy boyutları ayrı ayrı ele alınır.'
  end,
  d.official_source_url,
  d.verified_at
from public.qualification_level_descriptors d
join public.qualification_frameworks f on f.id = d.framework_id
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
  ('example-tyc-5', 'matrix-tyc-5', 1, 'skills', 'ÖÇ-1',
   'Sınırları belirlenmiş bir veri setindeki temel kalite sorunlarını saptar ve uygun düzeltme işlemini uygular.',
   'Uygulama ve çözüm geliştirme',
   'Eksik değer, tutarlılık ve temel veri temizleme uygulaması',
   'Uygulama görevi + analitik rubrik',
   'Temizlenmiş veri seti, işlem günlüğü ve rubrikte en az yeterli düzey',
   'Sınırları belirli somut bir soruna bilişsel ve uygulamalı beceriyle yaratıcı çözüm üretildiği gözlenebilir.',
   'Örnek satırdır; resmî yeterlilik veya kurumsal onay değildir.'),
  ('example-tyc-6', 'matrix-tyc-6', 1, 'skills', 'ÖÇ-1',
   'Karmaşık bir veri setinin güvenilirliğini eleştirel ölçütlerle değerlendirir ve kanıta dayalı bir görselleştirme üretir.',
   'Analiz, değerlendirme ve üretme',
   'Kaynak güvenilirliği, veri kalite ölçütleri ve görsel anlatım ilkeleri',
   'Vaka analizi + ürün dosyası + analitik rubrik',
   'Gerekçeli analiz raporu, görselleştirme ve en az %70 rubrik başarısı (pilot eşik)',
   'Karmaşık ve öngörülemeyen sorunlarda uzmanlık ve yenilik niteliği gösteren ileri beceri kanıtı üretir.',
   'Örnek satırdır; başarı eşiği pilot parametredir ve kurumsal doğrulama gerekir.'),
  ('example-tyc-7', 'matrix-tyc-7', 1, 'skills', 'ÖÇ-1',
   'Farklı disiplinlerden veri kaynaklarını bütünleştirerek yeni bir analiz yöntemi tasarlar ve gerekçelendirir.',
   'Sentez, tasarım ve gerekçelendirme',
   'Disiplinler arası veri modelleme ve yöntem karşılaştırması',
   'Araştırma tasarısı + jüri sunumu + rubrik',
   'Yöntem protokolü, karşılaştırmalı gerekçe ve değerlendirme tutanağı',
   'Yeni bilgi/yöntem geliştirme ve farklı alanlardan bilgiyi bütünleştirme becerisiyle ilişkilidir.',
   'Örnek satırdır; resmî yeterlilik veya komisyon kararı değildir.'),
  ('example-tyc-8', 'matrix-tyc-8', 1, 'competence', 'ÖÇ-1',
   'Alan sınırlarını genişleten özgün bir veri kalite yaklaşımı geliştirir, bağımsız olarak doğrular ve etik etkilerini tartışır.',
   'Özgün üretim, doğrulama ve etik yargı',
   'İleri araştırma tasarımı, yöntem doğrulama ve araştırma etiği',
   'Özgün araştırma ürünü + bağımsız savunma + uzman rubriği',
   'Tekrarlanabilir yöntem, doğrulama kanıtı, etik etki analizi ve jüri kaydı',
   'Özerklik, bilimsel tutarlılık, özgün yaklaşım geliştirme ve yeni bilgi üretme boyutlarını birlikte kanıtlar.',
   'Örnek satırdır; doktora veya resmî derece eşdeğerliği iddiası taşımaz.'),
  ('example-eqf-5', 'matrix-eqf-5', 1, 'skills', 'LO-1',
   'Sınırları belirlenmiş soyut bir veri problemi için uygulanabilir ve yaratıcı bir çözüm geliştirir.',
   'Apply and develop',
   'Veri problemi tanımlama, çözüm seçenekleri ve uygulama deneyi',
   'Performans görevi + analitik rubrik',
   'Çalışan çözüm prototipi, süreç kaydı ve rubrik kanıtı',
   'EQF 5 düzeyindeki kapsamlı bilişsel/uygulamalı beceri ve soyut problemlere yaratıcı çözüm beklentisini örnekler.',
   'Türkçe pilot örneğidir; resmî AYÇ çevirisi veya yeterlilik kararı değildir.'),
  ('example-eqf-6', 'matrix-eqf-6', 1, 'skills', 'LO-1',
   'Uzmanlık alanındaki karmaşık ve öngörülemeyen bir veri sorununa yenilikçi çözüm üretir.',
   'Analyse, evaluate and create',
   'İleri veri kalite analizi ve yenilikçi görselleştirme',
   'Vaka analizi + ürün dosyası + akran/uzman rubriği',
   'Gerekçeli çözüm, çalışan ürün ve değerlendirme kaydı',
   'EQF 6 mastery, innovation ve complex/unpredictable problem çözme beklentisiyle ilişkilidir.',
   'Türkçe pilot örneğidir; resmî AYÇ çevirisi veya yeterlilik kararı değildir.'),
  ('example-eqf-7', 'matrix-eqf-7', 1, 'competence', 'LO-1',
   'Karmaşık bir öğrenme bağlamını yeni stratejik yaklaşımla dönüştürür ve ekip performansını değerlendirir.',
   'Transform and review',
   'Stratejik öğrenme analitiği tasarımı ve değişim yönetimi',
   'Strateji dosyası + kurul simülasyonu + rubrik',
   'Dönüşüm planı, risk kaydı, performans ölçütleri ve gerekçeli değerlendirme',
   'EQF 7 complex/unpredictable contexts ile strategic performance review beklentisini örnekler.',
   'Türkçe pilot örneğidir; resmî AYÇ çevirisi veya yeterlilik kararı değildir.'),
  ('example-eqf-8', 'matrix-eqf-8', 1, 'competence', 'LO-1',
   'Araştırmanın ön cephesinde yeni bir yöntem geliştirir ve bilimsel/meslekî bütünlükle sürdürülebilir biçimde doğrular.',
   'Originate, validate and lead',
   'En ileri araştırma yöntemi, sentez, değerlendirme ve bilimsel bütünlük',
   'Özgün araştırma ürünü + bağımsız savunma + uzman değerlendirmesi',
   'Tekrarlanabilir yöntem, bağımsız doğrulama, etik analiz ve uzman tutanağı',
   'EQF 8 authority, innovation, autonomy, integrity ve sustained commitment beklentilerini örnekler.',
   'Türkçe pilot örneğidir; resmî AYÇ çevirisi veya yeterlilik kararı değildir.')
on conflict (template_id, row_order) do update set
  id = excluded.id,
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

insert into public.pilot_finance_routes
  (id, trigger_key, route_order, title, source_page, destination_page, from_role, to_role,
   learner_action_label, learner_message, finance_message, gib_explanation, mys_mays_explanation, status_path)
values
  (
    'finance-route-catalog', 'paid-program-enrollment', 1,
    'Ücretli programa başvuru ve ödeme simülasyonuna yönlendirme',
    'catalog', 'finance', 'learner', 'finance',
    'Ödeme adımına geç • Simülasyon',
    'Başvuru kaydı taslak olarak oluşturulur; gerçek tahsilat yapılmadan Mali İşler pilot kuyruğuna yönlendirilir.',
    'Mali İşler rolü örnek ücret, ödeme kanalı, dekont üst verisi ve mutabakat durumunu yalnız simülasyon olarak inceler.',
    'GİB / e-Arşiv kartı yalnız fatura taslağı ve onay kapısını gösterir; gerçek belge numarası üretmez ve GİB’e veri göndermez.',
    'MYS / MAYS kartı bütçe, harcama ve muhasebe aktarımının önerilen onay adımlarını gösterir; canlı sisteme bağlanmaz.',
    '["Başvuru taslağı", "Ödeme simülasyonu bekleniyor", "Mali İşler incelemesi", "Mutabakat taslağı", "Kayıt uygunluğu"]'::jsonb
  ),
  (
    'finance-route-transfer', 'bank-transfer-simulation', 2,
    'Havale/EFT dekont üst verisi ve mali inceleme',
    'applications', 'finance', 'learner', 'finance',
    'Havale/EFT simülasyonu oluştur',
    'Yalnız sentetik referans numarası ve örnek tutar kaydedilir; banka hesabı veya gerçek dekont yüklenmez.',
    'Mali İşler, sentetik kayıt ile program ücret taslağını eşleştirir ve gerekirse revizyon ister.',
    'Eşleşen kayıt için yalnız e-Arşiv taslak ön izlemesi oluşturulur; mali birim doğrulaması gerekir.',
    'Mutabakat sonucu MYS / MAYS aktarım simülasyonu günlüğüne eklenir; gerçek muhasebe fişi oluşmaz.',
    '["Sentetik dekont", "Eşleştirme bekleniyor", "Mali kontrol", "Taslak mutabakat"]'::jsonb
  ),
  (
    'finance-route-pos', 'virtual-pos-simulation', 3,
    'Sanal POS ödeme ekranı simülasyonu',
    'applications', 'finance', 'learner', 'finance',
    'Sanal POS demosunu aç',
    'Kart alanları gösterilmez ve Payment Request API çağrılmaz; başarı/ret senaryosu kullanıcı seçimiyle örneklenir.',
    'Mali İşler yalnız sentetik işlem sonucunu, programı ve örnek tutarı görür; gerçek provizyon yoktur.',
    'Başarılı demo sonucu fatura taslağı kuyruğuna alınabilir; GİB servisine istek yapılmaz.',
    'Örnek tahsilat durumu muhasebe aktarım taslağında gösterilir; MYS / MAYS bağlantısı kapalıdır.',
    '["Kanal seçimi", "Başarı/ret simülasyonu", "Mali kontrol", "Fatura taslağı"]'::jsonb
  ),
  (
    'finance-route-invoice', 'invoice-and-accounting-draft', 4,
    'Fatura ve MYS / MAYS aktarım taslağı',
    'finance', 'integrations', 'finance', 'it',
    'Entegrasyon taslağını incele',
    'Öğrenen yalnız durum mesajını görür; gerçek fatura veya muhasebe belgesi sunulmaz.',
    'Mali İşler yapılandırılabilir pilot parametreleri doğrular ve Bilgi İşlem onay kapısına gönderilecek taslağı inceler.',
    'GİB / e-Arşiv yalnız kapalı entegrasyon kartı, örnek istek ve hata/yeniden deneme günlüğü sunar.',
    'MYS / MAYS yalnız kapalı entegrasyon kartı ve önerilen onay sırasını sunar; gerçek aktarım yapılmaz.',
    '["Mali parametre doğrulaması", "GİB taslağı", "MYS/MAYS taslağı", "Bilgi İşlem kontrolü", "Kapalı entegrasyon"]'::jsonb
  )
on conflict (trigger_key) do update set
  id = excluded.id,
  route_order = excluded.route_order,
  title = excluded.title,
  source_page = excluded.source_page,
  destination_page = excluded.destination_page,
  from_role = excluded.from_role,
  to_role = excluded.to_role,
  learner_action_label = excluded.learner_action_label,
  learner_message = excluded.learner_message,
  finance_message = excluded.finance_message,
  gib_explanation = excluded.gib_explanation,
  mys_mays_explanation = excluded.mys_mays_explanation,
  status_path = excluded.status_path,
  institutional_validation_required = true,
  real_payment_enabled = false,
  real_invoice_enabled = false,
  real_transfer_enabled = false,
  real_data_sent = false,
  is_synthetic = true;

insert into public.pilot_role_overviews
  (role_id, role_label, overview_title, overview_summary, primary_page,
   responsibilities, allowed_actions, prohibited_actions, finance_handoff_visibility)
values
  ('learner', 'Öğrenen / Öğrenci', 'Öğrenen / Öğrenci genel bakışı',
   'Katalog, başvuru, eğitim, değerlendirme, ödeme simülasyonu ve dijital yeterlilik durumlarını tek yerden izler.',
   'catalog',
   '["Mikro yeterlilikleri inceleme", "Başvuru ve dış kazanım talebi oluşturma", "Eğitim/değerlendirme durumunu izleme", "Ödeme simülasyonu ve mali durum mesajını görme", "Pilot belgeyi doğrulama"]'::jsonb,
   '["catalog.read", "application.create_own", "recognition.create_own", "payment.simulate_own", "credential.verify_own"]'::jsonb,
   '["commission.decide", "finance.reconcile", "integration.enable", "real_payment.send"]'::jsonb,
   true),
  ('instructor', 'Üniversite içi eğitici', 'Üniversite içi eğitici genel bakışı',
   'Program önerisini TYÇ/AYÇ matrisi, AKTS iş yükü, ölçme planı ve kalite kanıtlarıyla hazırlar; kendi başvurularını izler.',
   'proposal',
   '["Program taslağı hazırlama", "TYÇ/AYÇ matrisi doldurma", "AKTS ve iş yükü gerekçesi sunma", "Revizyon yanıtı verme"]'::jsonb,
   '["proposal.create_own", "matrix.fill_own", "proposal.submit_own", "revision.respond_own"]'::jsonb,
   '["commission.decide", "finance.collect", "integration.enable", "other_application.read"]'::jsonb,
   false),
  ('externalInstructor', 'Kurum dışı eğitici', 'Kurum dışı eğitici genel bakışı',
   'Kendi program önerisini, eğitici yeterlilik kanıtlarının sentetik üst verisini ve TYÇ/AYÇ uyum matrisini yönetir.',
   'proposal',
   '["Program önerisi hazırlama", "TYÇ/AYÇ matrisi doldurma", "Eğitici kanıt üst verisi ekleme", "Kendi revizyonlarını yanıtlama"]'::jsonb,
   '["proposal.create_own", "matrix.fill_own", "evidence.metadata_add_own", "revision.respond_own"]'::jsonb,
   '["commission.decide", "student_record.write", "finance.collect", "other_application.read"]'::jsonb,
   false),
  ('coordinator', 'Koordinatörlük / SEM', 'Koordinatörlük / SEM genel bakışı',
   'Gelen başvuruların eksik belge, süre ve idari ön kontrollerini yürütür; komisyon ve Mali İşler yönlendirmelerini koordine eder.',
   'applications',
   '["Başvuru ön kontrolü", "Eksik belge/revizyon isteme", "30 günlük sayaç ve SLA izleme", "Komisyon gündemine sevk", "Ücretli programı Mali İşlere yönlendirme"]'::jsonb,
   '["application.review", "revision.request", "commission.queue", "finance.handoff", "report.read"]'::jsonb,
   '["commission.final_decision", "finance.reconcile", "integration.enable", "real_notification.send"]'::jsonb,
   true),
  ('commission', 'Mikro Yeterlilik Komisyonu üyesi', 'Mikro Yeterlilik Komisyonu genel bakışı',
   'Karşılaştırılabilir kanıtları, TYÇ/AYÇ matrislerini ve insan görüşlerini inceler; gerekçeli akademik pilot kararı kaydeder.',
   'commission',
   '["Kanıt ve matris inceleme", "AI destekli karşılaştırmayı karar olmayan çıktı olarak değerlendirme", "Onay/revizyon/ret/çekimser görüş kaydı", "Karar geçmişi inceleme"]'::jsonb,
   '["evidence.review", "matrix.review", "commission.vote", "commission.reason", "audit.read"]'::jsonb,
   '["ai.autonomous_decision", "finance.collect", "integration.enable", "real_board_decision.publish"]'::jsonb,
   false),
  ('studentAffairs', 'Öğrenci İşleri', 'Öğrenci İşleri genel bakışı',
   'Onaylanmış pilot kayıtların AKTS, program/kazanım ve belge alanlarını kontrol eder; ÖBİS/YÖKSİS aktarımını yalnız dry-run olarak görür.',
   'applications',
   '["AKTS ve kayıt ön kontrolü", "Belge alanı doğrulama", "ÖBİS/YÖKSİS aktarım taslağı inceleme", "Kayıt istisnası raporlama"]'::jsonb,
   '["student_record.review", "ects.validate", "credential.fields_review", "transfer.dry_run"]'::jsonb,
   '["commission.decide", "integration.enable", "real_student_record.write", "real_transfer.send"]'::jsonb,
   false),
  ('it', 'Bilgi İşlem', 'Bilgi İşlem genel bakışı',
   'Bağlı olmayan entegrasyon kartlarını, onay kapılarını, hata/yeniden deneme senaryolarını ve rol/erişim denetimini yönetir.',
   'integrations',
   '["Entegrasyon durum ve sağlık kontrolü", "Örnek istek/hata senaryosu", "Yetki matrisi denetimi", "Audit log inceleme", "Mali entegrasyon taslağı kontrolü"]'::jsonb,
   '["integration.simulate", "integration.retry_dry_run", "rbac.audit", "audit.read", "finance.integration_review"]'::jsonb,
   '["commission.decide", "real_endpoint.call", "secret.store_in_client", "production.promote"]'::jsonb,
   true),
  ('finance', 'Finans / Döner Sermaye', 'Finans / Döner Sermaye genel bakışı',
   'Örnek ücret, tahsilat, mutabakat, fatura ve hak ediş taslaklarını inceler; GİB ile MYS/MAYS adımlarını kapalı entegrasyon olarak görür.',
   'finance',
   '["Ödeme simülasyonu inceleme", "Mutabakat taslağı", "Fatura/e-Arşiv taslağı", "Hak ediş özeti", "GİB ve MYS/MAYS onay kapıları"]'::jsonb,
   '["payment.simulate", "finance.reconcile_draft", "invoice.draft", "entitlement.review", "finance.parameters_configure"]'::jsonb,
   '["real_payment.collect", "real_invoice.issue", "real_tax_rule.assert", "real_accounting_transfer.send"]'::jsonb,
   true),
  ('admin', 'Sistem yöneticisi', 'Sistem yöneticisi genel bakışı',
   'Dokuz rolün yetki matrisini, pilot parametreleri, denetim izini ve sistem sağlığını izler; akademik veya mali karar vermez.',
   'reports',
   '["Rol ve yetki matrisi", "Pilot veri/parametre sağlığı", "Denetim izi", "Boş/hata durumu kontrolü", "Preview sürüm bilgisi"]'::jsonb,
   '["rbac.audit", "pilot.parameters_review", "audit.read", "system.health_read", "preview.version_read"]'::jsonb,
   '["commission.decide", "finance.approve", "real_user.impersonate", "production.promote"]'::jsonb,
   true)
on conflict (role_id) do update set
  role_label = excluded.role_label,
  overview_title = excluded.overview_title,
  overview_summary = excluded.overview_summary,
  primary_page = excluded.primary_page,
  responsibilities = excluded.responsibilities,
  allowed_actions = excluded.allowed_actions,
  prohibited_actions = excluded.prohibited_actions,
  finance_handoff_visibility = excluded.finance_handoff_visibility,
  real_system_write_enabled = false,
  is_synthetic = true;

insert into public.pilot_role_workflow_steps
  (id, role_id, step_order, page_key, title, description, action_label, next_role, finance_related)
values
  ('learner-1', 'learner', 1, 'catalog', 'Programı incele', 'Program detayını, AKTS iş yükünü, TYÇ önerisini ve ücret durumunu inceler.', 'Program ayrıntısını aç', null, false),
  ('learner-2', 'learner', 2, 'applications', 'Başvuruyu oluştur', 'Ücretli programda gerçek ödeme almayan mali yönlendirme görünür.', 'Başvuruya geç', 'finance', true),
  ('learner-3', 'learner', 3, 'finance', 'Ödeme simülasyonunu tamamla', 'Sanal POS veya havale/EFT senaryosu seçilir; gerçek kart/banka verisi alınmaz.', 'Ödeme demosunu aç', 'finance', true),
  ('learner-4', 'learner', 4, 'wallet', 'Başarı ve belge durumunu izle', 'İnsan değerlendirmesi sonrasında pilot yeterlilik ve doğrulama sayfası görüntülenir.', 'Cüzdanımı aç', null, false),
  ('instructor-1', 'instructor', 1, 'proposal', 'Program önerisini hazırla', 'Program adı, hedef kitle, öğrenme çıktısı, iş yükü ve yöntem alanlarını doldurur.', 'Taslağı aç', null, false),
  ('instructor-2', 'instructor', 2, 'proposal', 'TYÇ/AYÇ matrisini doldur', 'Seviye tanımlayıcısı, hedef, içerik, ölçme ve kanıt alanlarını eşler.', 'Matrisi düzenle', null, false),
  ('instructor-3', 'instructor', 3, 'applications', 'Koordinatörlüğe gönder', 'Zorunlu alan doğrulamasından sonra kendi taslağını idari ön kontrole iletir.', 'Ön kontrole gönder', 'coordinator', false),
  ('externalInstructor-1', 'externalInstructor', 1, 'proposal', 'Dış eğitici önerisini hazırla', 'Kendi programını ve sentetik yeterlilik kanıt üst verisini oluşturur.', 'Öneriyi aç', null, false),
  ('externalInstructor-2', 'externalInstructor', 2, 'proposal', 'TYÇ/AYÇ matrisini doldur', 'Seçilen seviyeye göre öğrenme hedefi, içerik ve ölçme kanıtını açıklar.', 'Matrisi düzenle', null, false),
  ('externalInstructor-3', 'externalInstructor', 3, 'applications', 'Kanıt kontrolüne gönder', 'Gerçek belge aktarılmadan üst veri ve kontrol listesi koordinatörlüğe iletilir.', 'Ön kontrole gönder', 'coordinator', false),
  ('coordinator-1', 'coordinator', 1, 'applications', 'İdari ön kontrol', 'Eksik alan, kanıt ve değerlendirme süresi kontrol edilir.', 'Kontrolü başlat', null, false),
  ('coordinator-2', 'coordinator', 2, 'applications', 'Mali yönlendirme', 'Ücretli program başvurusu ödeme simülasyonu için Mali İşler kuyruğuna yönlendirilir.', 'Mali İşlere yönlendir', 'finance', true),
  ('coordinator-3', 'coordinator', 3, 'commission', 'Komisyon gündemi', 'Tamamlanan dosya karar yetkisi korunarak komisyon incelemesine sevk edilir.', 'Komisyona sevk et', 'commission', false),
  ('commission-1', 'commission', 1, 'commission', 'Kanıt ve matris incelemesi', 'TYÇ/AYÇ, Bologna, AKTS ve ölçme kanıtları karşılaştırılır.', 'İncelemeyi aç', null, false),
  ('commission-2', 'commission', 2, 'commission', 'Gerekçeli görüş', 'Onay, revizyon, ret veya çekimser görüş insan üye tarafından gerekçelendirilir.', 'Görüş kaydet', null, false),
  ('commission-3', 'commission', 3, 'audit', 'Karar geçmişi', 'Pilot karar ve gerekçe değişiklikleri denetim izinde görüntülenir.', 'Geçmişi aç', null, false),
  ('studentAffairs-1', 'studentAffairs', 1, 'applications', 'Kayıt ve AKTS kontrolü', 'Onaylanmış pilot kaydın AKTS ve belge alanları incelenir.', 'Kaydı incele', null, false),
  ('studentAffairs-2', 'studentAffairs', 2, 'integrations', 'Aktarım dry-run', 'ÖBİS/YÖKSİS için gerçek veri göndermeyen örnek istek günlüğü görüntülenir.', 'Dry-run aç', 'it', false),
  ('it-1', 'it', 1, 'integrations', 'Entegrasyon sağlığı', 'ÖBİS, YÖKSİS, e-Devlet, GİB, MYS/MAYS ve bildirim kartları bağlı değil olarak doğrulanır.', 'Durumu denetle', null, true),
  ('it-2', 'it', 2, 'integrations', 'Hata ve yeniden deneme', 'Örnek istek, onay kapısı ve güvenli yeniden deneme senaryosu çalıştırılır.', 'Dry-run çalıştır', null, true),
  ('finance-1', 'finance', 1, 'finance', 'Ödeme simülasyonu kuyruğu', 'Ücretli program başvurularının sentetik ödeme durumu incelenir.', 'Kuyruğu aç', null, true),
  ('finance-2', 'finance', 2, 'finance', 'Mutabakat ve hak ediş taslağı', 'Yapılandırılabilir örnek mali parametrelerle taslak hesap oluşturulur.', 'Taslak oluştur', null, true),
  ('finance-3', 'finance', 3, 'integrations', 'GİB ve MYS/MAYS kapıları', 'Gerçek belge/aktarım oluşturmayan entegrasyon taslağı Bilgi İşleme yönlendirilir.', 'Entegrasyon taslağını gönder', 'it', true),
  ('admin-1', 'admin', 1, 'reports', 'Sistem ve rol matrisi', 'Dokuz rolün ekran, işlem ve yasaklı eylem ayrımı incelenir.', 'Yetki matrisini aç', null, false),
  ('admin-2', 'admin', 2, 'audit', 'Denetim ve veri sınırı', 'Sentetik veri, kapalı entegrasyon ve Preview sınırları doğrulanır.', 'Denetim izini aç', null, true)
on conflict (role_id, step_order) do update set
  id = excluded.id,
  page_key = excluded.page_key,
  title = excluded.title,
  description = excluded.description,
  action_label = excluded.action_label,
  next_role = excluded.next_role,
  finance_related = excluded.finance_related,
  real_system_effect = false,
  is_synthetic = true;

create or replace view public.qualification_level_catalog
with (security_invoker = true, security_barrier = true)
as
select
  d.id,
  f.code as framework_code,
  f.name_tr as framework_name,
  d.level,
  d.knowledge_descriptor,
  d.skills_descriptor,
  d.competence_label,
  d.competence_descriptor,
  d.source_language,
  d.content_basis,
  d.official_source_url,
  d.verified_at
from public.qualification_level_descriptors d
join public.qualification_frameworks f on f.id = d.framework_id
where d.is_public_reference = true
  and f.is_public_reference = true;

create or replace view public.pilot_matrix_template_catalog
with (security_invoker = true, security_barrier = true)
as
select
  t.id,
  f.code as framework_code,
  t.level,
  t.title,
  t.candidate_instructions,
  t.columns_schema,
  t.example_scope,
  t.official_source_url,
  t.source_verified_at,
  t.institutional_validation_required
from public.pilot_matrix_templates t
join public.qualification_frameworks f on f.id = t.framework_id
where t.is_synthetic = true
  and t.real_system_effect = false;

create or replace view public.pilot_role_workflow_catalog
with (security_invoker = true, security_barrier = true)
as
select
  r.role_id,
  r.role_label,
  r.overview_title,
  r.overview_summary,
  r.primary_page,
  r.responsibilities,
  r.allowed_actions,
  r.prohibited_actions,
  r.finance_handoff_visibility,
  s.step_order,
  s.page_key,
  s.title as step_title,
  s.description as step_description,
  s.action_label,
  s.next_role,
  s.finance_related
from public.pilot_role_overviews r
join public.pilot_role_workflow_steps s on s.role_id = r.role_id
where r.is_synthetic = true
  and r.real_system_write_enabled = false
  and s.is_synthetic = true
  and s.real_system_effect = false;

create or replace view public.pilot_finance_handoff_catalog
with (security_invoker = true, security_barrier = true)
as
select
  id,
  trigger_key,
  route_order,
  title,
  source_page,
  destination_page,
  from_role,
  to_role,
  learner_action_label,
  learner_message,
  finance_message,
  gib_explanation,
  mys_mays_explanation,
  status_path,
  institutional_validation_required
from public.pilot_finance_routes
where is_synthetic = true
  and real_payment_enabled = false
  and real_invoice_enabled = false
  and real_transfer_enabled = false
  and real_data_sent = false;

revoke all on table public.qualification_level_catalog from public, anon, authenticated;
revoke all on table public.pilot_matrix_template_catalog from public, anon, authenticated;
revoke all on table public.pilot_role_workflow_catalog from public, anon, authenticated;
revoke all on table public.pilot_finance_handoff_catalog from public, anon, authenticated;

grant select on table public.qualification_level_catalog to anon, authenticated;
grant select on table public.pilot_matrix_template_catalog to anon, authenticated;
grant select on table public.pilot_role_workflow_catalog to anon, authenticated;
grant select on table public.pilot_finance_handoff_catalog to anon, authenticated;

comment on view public.qualification_level_catalog is
  'security_invoker: yalnız doğrulanmış kamu referans alanlarını sunan salt-okunur katalog.';
comment on view public.pilot_matrix_template_catalog is
  'security_invoker: aday eğitici için karar üretmeyen sentetik matris şablonu kataloğu.';
comment on view public.pilot_role_workflow_catalog is
  'security_invoker: dokuz rolün salt-okunur operasyon ve adım kataloğu.';
comment on view public.pilot_finance_handoff_catalog is
  'security_invoker: gerçek ödeme/fatura/aktarım içermeyen mali yönlendirme kataloğu.';

-- Kaynak kütüğü, sınırlı KDPÜ yeterlilik üst verisi ve doldurulmuş
-- pilot örnekleri. Buradaki yeterlilik kayıtları tam içerik kopyası değildir;
-- kamu portalında görülen kod, başlık, kurum ve geçici seviye bilgisinin
-- kaynak izli bir anık görüntüsüdür.

create table if not exists public.qualification_dataset_registry (
  id text primary key,
  dataset_name text not null,
  publisher_name text not null,
  coverage_note text not null,
  access_url text not null check (access_url ~ '^https://'),
  documentation_url text not null check (documentation_url ~ '^https://'),
  data_formats jsonb not null,
  licence_status text not null check (licence_status in (
    'reuse_terms_not_stated',
    'open_data_declared_terms_check_required'
  )),
  licence_note text not null,
  ingestion_status text not null default 'manual_snapshot_only'
    check (ingestion_status = 'manual_snapshot_only'),
  automated_ingestion_enabled boolean not null default false
    check (not automated_ingestion_enabled),
  verified_at timestamptz not null,
  is_public_reference boolean not null default true check (is_public_reference),
  check (jsonb_typeof(data_formats) = 'array')
);

create table if not exists public.official_qualification_references (
  qualification_code text primary key check (qualification_code ~ '^TR[0-9]{10}$'),
  qualification_title text not null,
  responsible_institution text not null,
  qualification_type text not null,
  orientation text not null check (orientation in ('Akademik', 'Mesleki')),
  tyc_level smallint not null check (tyc_level between 1 and 8),
  eqf_level smallint null check (eqf_level between 1 and 8),
  credit_value_ects numeric(6, 1) null check (credit_value_ects is null or credit_value_ects > 0),
  placement_status text not null check (placement_status in (
    'not_placed',
    'placement_not_verified'
  )),
  level_status text not null check (level_status in (
    'portal_detail_provisional',
    'portal_list_provisional'
  )),
  source_registry_id text not null
    references public.qualification_dataset_registry(id) on update cascade on delete restrict,
  source_url text not null check (source_url ~ '^https://'),
  retrieved_at timestamptz not null,
  metadata_scope text not null default 'minimal_public_metadata'
    check (metadata_scope = 'minimal_public_metadata'),
  institutional_validation_required boolean not null default true
    check (institutional_validation_required),
  is_public_reference boolean not null default true check (is_public_reference)
);

create table if not exists public.qualification_level_descriptor_translations (
  id text primary key,
  descriptor_id text not null,
  framework_id text not null,
  level smallint not null check (level between 1 and 8),
  language_code text not null check (language_code = 'tr'),
  knowledge_descriptor text not null,
  skills_descriptor text not null,
  competence_descriptor text not null,
  competence_label text not null,
  knowledge_basis text not null check (knowledge_basis in (
    'official_display_translation', 'institutional_operational_translation'
  )),
  skills_basis text not null check (skills_basis in (
    'official_display_translation', 'institutional_operational_translation'
  )),
  competence_basis text not null check (competence_basis in (
    'official_display_translation', 'institutional_operational_translation'
  )),
  display_source_url text not null check (display_source_url ~ '^https://'),
  verified_at timestamptz not null,
  institutional_validation_required boolean not null default true
    check (institutional_validation_required),
  is_public_reference boolean not null default true check (is_public_reference),
  foreign key (descriptor_id, framework_id, level)
    references public.qualification_level_descriptors(id, framework_id, level)
    on update cascade on delete cascade,
  unique (framework_id, level, language_code)
);

create table if not exists public.pilot_matrix_drafts (
  id text primary key,
  title text not null,
  framework_id text not null
    references public.qualification_frameworks(id) on update cascade on delete restrict,
  target_level smallint not null check (target_level between 1 and 8),
  template_id text not null,
  owner_role text not null check (owner_role in ('instructor', 'externalInstructor')),
  owner_label text not null,
  status text not null check (status = 'pilot_draft'),
  updated_at timestamptz not null,
  source_url text not null check (source_url ~ '^https://'),
  source_verified_at timestamptz not null,
  institutional_validation_required boolean not null default true
    check (institutional_validation_required),
  validation_status text not null default 'institutional_validation_pending'
    check (validation_status in (
      'institutional_validation_pending',
      'pilot_reviewed_not_approved'
    )),
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic),
  foreign key (template_id, framework_id, target_level)
    references public.pilot_matrix_templates(id, framework_id, level)
    on update cascade on delete restrict
);

create table if not exists public.pilot_matrix_draft_rows (
  id text primary key,
  draft_id text not null
    references public.pilot_matrix_drafts(id) on update cascade on delete cascade,
  row_order smallint not null check (row_order > 0),
  framework_dimension text not null check (framework_dimension in ('knowledge', 'skills', 'competence')),
  learning_outcome_code text not null,
  learning_outcome text not null,
  learning_level text not null,
  course_content text not null,
  assessment_method text not null,
  evidence text not null,
  alignment_rationale text not null,
  institutional_validation_required boolean not null default true
    check (institutional_validation_required),
  validation_status text not null default 'institutional_validation_pending'
    check (validation_status in (
      'institutional_validation_pending',
      'pilot_reviewed_not_approved'
    )),
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic),
  unique (draft_id, row_order)
);

create table if not exists public.pilot_payment_requests (
  id text primary key check (id ~ '^PAY-[0-9]{4,6}$'),
  application_id text null
    references public.pilot_applications(id) on update cascade on delete restrict,
  program_id text not null
    references public.pilot_programs(id) on update cascade on delete restrict,
  program_code text not null,
  program_title text not null,
  learner_label text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'TRY' check (currency = 'TRY'),
  channel text not null check (channel in (
    'Seçilmedi • simülasyon',
    'Havale/EFT simülasyonu',
    'Sanal POS simülasyonu'
  )),
  status text not null check (status in (
    'draft', 'pending_finance', 'approved', 'revision', 'reconciled'
  )),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  review_note text null,
  enrollment_created boolean not null default false,
  real_payment boolean not null default false check (not real_payment),
  has_financial_identifiers boolean not null default false check (not has_financial_identifiers),
  real_data_sent boolean not null default false check (not real_data_sent),
  institutional_validation_required boolean not null default true
    check (institutional_validation_required),
  is_synthetic boolean not null default true check (is_synthetic),
  check (updated_at >= created_at)
);

create table if not exists public.pilot_payment_events (
  id text primary key,
  payment_request_id text not null
    references public.pilot_payment_requests(id) on update cascade on delete cascade,
  event_order smallint not null check (event_order > 0),
  occurred_at timestamptz not null,
  actor_role text not null check (actor_role in ('learner', 'coordinator', 'finance', 'it', 'system')),
  action_label text not null,
  from_status text null check (from_status is null or from_status in (
    'draft', 'pending_finance', 'approved', 'revision', 'reconciled'
  )),
  to_status text not null check (to_status in (
    'draft', 'pending_finance', 'approved', 'revision', 'reconciled'
  )),
  reason text not null,
  real_payment boolean not null default false check (not real_payment),
  has_financial_identifiers boolean not null default false check (not has_financial_identifiers),
  real_data_sent boolean not null default false check (not real_data_sent),
  is_synthetic boolean not null default true check (is_synthetic),
  unique (payment_request_id, event_order)
);

comment on table public.qualification_dataset_registry is
  'TYÇ portalı ve Europass QDR için kaynak, format, lisans ve kontrollü alım durumu kütüğü.';
comment on table public.official_qualification_references is
  'KDPÜ için kamu portalında doğrulanan sınırlı yeterlilik üst verisi; tam program içeriği değildir.';
comment on table public.qualification_level_descriptor_translations is
  'AYÇ/EQF kanonik İngilizce tanımlayıcılarından ayrı Türkçe gösterim katmanı; 7. seviye beceri metni kurumsal operasyonel çeviri olarak etiketlidir.';
comment on table public.pilot_matrix_drafts is
  'Aday eğiticiye ait olduğu varsayılan sentetik, salt-okunur doldurulmuş matris taslakları.';
comment on table public.pilot_matrix_draft_rows is
  'Kurumsal doğrulama bekleyen sentetik matris satırları; resmî yeterlilik veya karar değildir.';
comment on table public.pilot_payment_requests is
  'Gerçek finansal tanımlayıcı veya tahsilat içermeyen sentetik ödeme talebi kayıtları.';
comment on table public.pilot_payment_events is
  'Sentetik ödeme talebinin gerçek sistem etkisi olmayan durum olay zinciri.';

alter table public.qualification_dataset_registry enable row level security;
alter table public.official_qualification_references enable row level security;
alter table public.qualification_level_descriptor_translations enable row level security;
alter table public.pilot_matrix_drafts enable row level security;
alter table public.pilot_matrix_draft_rows enable row level security;
alter table public.pilot_payment_requests enable row level security;
alter table public.pilot_payment_events enable row level security;

alter table public.qualification_dataset_registry force row level security;
alter table public.official_qualification_references force row level security;
alter table public.qualification_level_descriptor_translations force row level security;
alter table public.pilot_matrix_drafts force row level security;
alter table public.pilot_matrix_draft_rows force row level security;
alter table public.pilot_payment_requests force row level security;
alter table public.pilot_payment_events force row level security;

revoke all on table public.qualification_dataset_registry from public, anon, authenticated;
revoke all on table public.official_qualification_references from public, anon, authenticated;
revoke all on table public.qualification_level_descriptor_translations from public, anon, authenticated;
revoke all on table public.pilot_matrix_drafts from public, anon, authenticated;
revoke all on table public.pilot_matrix_draft_rows from public, anon, authenticated;
revoke all on table public.pilot_payment_requests from public, anon, authenticated;
revoke all on table public.pilot_payment_events from public, anon, authenticated;

grant select on table public.qualification_dataset_registry to anon, authenticated;
grant select on table public.official_qualification_references to anon, authenticated;
grant select on table public.qualification_level_descriptor_translations to anon, authenticated;
grant select on table public.pilot_matrix_drafts to anon, authenticated;
grant select on table public.pilot_matrix_draft_rows to anon, authenticated;
grant select on table public.pilot_payment_requests to anon, authenticated;
grant select on table public.pilot_payment_events to anon, authenticated;

drop policy if exists qualification_dataset_registry_public_read on public.qualification_dataset_registry;
create policy qualification_dataset_registry_public_read
on public.qualification_dataset_registry for select to anon, authenticated
using (
  is_public_reference = true
  and automated_ingestion_enabled = false
  and ingestion_status = 'manual_snapshot_only'
  and verified_at is not null
);

drop policy if exists official_qualification_references_public_read on public.official_qualification_references;
create policy official_qualification_references_public_read
on public.official_qualification_references for select to anon, authenticated
using (
  is_public_reference = true
  and institutional_validation_required = true
  and metadata_scope = 'minimal_public_metadata'
  and retrieved_at is not null
);

drop policy if exists qualification_level_descriptor_translations_public_read on public.qualification_level_descriptor_translations;
create policy qualification_level_descriptor_translations_public_read
on public.qualification_level_descriptor_translations for select to anon, authenticated
using (
  is_public_reference = true
  and language_code = 'tr'
  and institutional_validation_required = true
  and display_source_url ~ '^https://'
  and verified_at is not null
);

drop policy if exists pilot_matrix_drafts_synthetic_read on public.pilot_matrix_drafts;
create policy pilot_matrix_drafts_synthetic_read
on public.pilot_matrix_drafts for select to anon, authenticated
using (
  is_synthetic = true
  and real_system_effect = false
  and institutional_validation_required = true
);

drop policy if exists pilot_matrix_draft_rows_synthetic_read on public.pilot_matrix_draft_rows;
create policy pilot_matrix_draft_rows_synthetic_read
on public.pilot_matrix_draft_rows for select to anon, authenticated
using (
  is_synthetic = true
  and real_system_effect = false
  and institutional_validation_required = true
);

drop policy if exists pilot_payment_requests_synthetic_read on public.pilot_payment_requests;
create policy pilot_payment_requests_synthetic_read
on public.pilot_payment_requests for select to anon, authenticated
using (
  is_synthetic = true
  and real_payment = false
  and has_financial_identifiers = false
  and real_data_sent = false
  and institutional_validation_required = true
);

drop policy if exists pilot_payment_events_synthetic_read on public.pilot_payment_events;
create policy pilot_payment_events_synthetic_read
on public.pilot_payment_events for select to anon, authenticated
using (
  is_synthetic = true
  and real_payment = false
  and has_financial_identifiers = false
  and real_data_sent = false
);

insert into public.qualification_dataset_registry
  (id, dataset_name, publisher_name, coverage_note, access_url, documentation_url,
   data_formats, licence_status, licence_note, verified_at)
values
  (
    'tyc-portal',
    'Türkiye Yeterlilikler Veri Tabanı',
    'Mesleki Yeterlilik Kurumu',
    'Türkiye''de düzenlenen yeterliliklerin kamuya açık portal üst verisi; bu pilot seçki eksiksiz değildir ve portalda bulunmak TYÇ''ye yerleştirildiği anlamına gelmez.',
    'https://portal.tyc.gov.tr/',
    'https://www.tyc.gov.tr/sayfa/turkiye-yeterlilikler-veri-tabani-i2d7fe7ae-2bef-4c53-bf91-1b8a02259823.html',
    '["HTML portal", "manual verified snapshot"]'::jsonb,
    'reuse_terms_not_stated',
    'Bu pilotta yalnız kod, başlık, kurum, seviye ve yerleştirme durumu üst verisi tutulur; otomatik veya tam içerik alımı kapalıdır.',
    '2026-08-19 23:30:00+00'
  ),
  (
    'europass-qdr',
    'Qualifications Dataset Register / European Data Portal',
    'European Commission / Europass',
    'Ülke ve veri sağlayıcı kapsamı değişebilir; ELM tabanlı yeterlilik ve öğrenme fırsatı veri setleri.',
    'https://europa.eu/europass/qdr/',
    'https://europass.europa.eu/en/stakeholders/qdr',
    '["ELM v3", "JSON-LD", "TTL", "SPARQL"]'::jsonb,
    'open_data_declared_terms_check_required',
    'Europass veriyi açık veri olarak tanımlar; her dağıtımın kapsamı ve yeniden kullanım koşulları canlı alımdan önce ayrıca doğrulanmalıdır.',
    '2026-08-19 23:30:00+00'
  )
on conflict (id) do update set
  dataset_name = excluded.dataset_name,
  publisher_name = excluded.publisher_name,
  coverage_note = excluded.coverage_note,
  access_url = excluded.access_url,
  documentation_url = excluded.documentation_url,
  data_formats = excluded.data_formats,
  licence_status = excluded.licence_status,
  licence_note = excluded.licence_note,
  ingestion_status = 'manual_snapshot_only',
  automated_ingestion_enabled = false,
  verified_at = excluded.verified_at,
  is_public_reference = true;

insert into public.official_qualification_references
  (qualification_code, qualification_title, responsible_institution,
   qualification_type, orientation, tyc_level, eqf_level, placement_status,
   level_status, source_registry_id, source_url, retrieved_at)
values
  (
    'TR0030009160',
    'Makine Resim ve Konstrüksiyon Ön Lisans Diploması',
    'Kütahya Dumlupınar Üniversitesi',
    'Ön Lisans Diploması (Mesleki)',
    'Mesleki', 5, 5, 'not_placed', 'portal_detail_provisional', 'tyc-portal',
    'https://portal.tyc.gov.tr/yeterlilik/makine-resim-ve-konstruksiyon-on-lisans-diplomasi-TR00309160.html',
    '2026-08-19 23:30:00+00'
  ),
  (
    'TR0030008977',
    'Büro Yönetimi ve Yönetici Asistanlığı Ön Lisans Diploması',
    'Kütahya Dumlupınar Üniversitesi',
    'Ön Lisans Diploması',
    'Mesleki', 5, null, 'placement_not_verified', 'portal_list_provisional', 'tyc-portal',
    'https://portal.tyc.gov.tr/yeterlilikarama?belgetipi=9&page=46',
    '2026-08-19 23:30:00+00'
  ),
  (
    'TR0030009146',
    'İç Mimarlık Lisans Diploması',
    'Kütahya Dumlupınar Üniversitesi',
    'Lisans Diploması',
    'Akademik', 6, null, 'placement_not_verified', 'portal_list_provisional', 'tyc-portal',
    'https://portal.tyc.gov.tr/yeterlilik/ic-mimarlik-lisans-diplomasi-TR00309146.html',
    '2026-08-19 23:30:00+00'
  ),
  (
    'TR0030009011',
    'Devreler ve Sistemler Doktora Diploması',
    'Kütahya Dumlupınar Üniversitesi',
    'Doktora Diploması',
    'Akademik', 8, 8, 'not_placed', 'portal_detail_provisional', 'tyc-portal',
    'https://portal.tyc.gov.tr/yeterlilik/devreler-ve-sistemler-doktora-diplomasi-TR00309011.html',
    '2026-08-19 23:30:00+00'
  )
on conflict (qualification_code) do update set
  qualification_title = excluded.qualification_title,
  responsible_institution = excluded.responsible_institution,
  qualification_type = excluded.qualification_type,
  orientation = excluded.orientation,
  tyc_level = excluded.tyc_level,
  eqf_level = excluded.eqf_level,
  placement_status = excluded.placement_status,
  level_status = excluded.level_status,
  source_registry_id = excluded.source_registry_id,
  source_url = excluded.source_url,
  retrieved_at = excluded.retrieved_at,
  metadata_scope = 'minimal_public_metadata',
  institutional_validation_required = true,
  is_public_reference = true;

insert into public.official_qualification_references
  (qualification_code, qualification_title, responsible_institution,
   qualification_type, orientation, tyc_level, eqf_level, credit_value_ects,
   placement_status, level_status, source_registry_id, source_url, retrieved_at)
values
  (
    'TR0030009064', 'Biyokimya Lisans Diploması',
    'Kütahya Dumlupınar Üniversitesi', 'Lisans Diploması',
    'Akademik', 6, 6, 240, 'not_placed', 'portal_detail_provisional',
    'tyc-portal',
    'https://tyc.gov.tr/yeterlilik/biyokimya-lisans-diplomasi-TR0030009064.html',
    '2026-08-19 23:55:00+00'
  ),
  (
    'TR0030009057', 'Cebir ve Sayılar Teorisi Doktora Diploması',
    'Kütahya Dumlupınar Üniversitesi', 'Doktora Diploması',
    'Akademik', 8, 8, 240, 'not_placed', 'portal_detail_provisional',
    'tyc-portal',
    'https://tyc.gov.tr/yeterlilik/cebir-ve-sayilar-teorisi-doktora-diplomasi-TR00309057.html',
    '2026-08-19 23:55:00+00'
  )
on conflict (qualification_code) do update set
  qualification_title = excluded.qualification_title,
  responsible_institution = excluded.responsible_institution,
  qualification_type = excluded.qualification_type,
  orientation = excluded.orientation,
  tyc_level = excluded.tyc_level,
  eqf_level = excluded.eqf_level,
  credit_value_ects = excluded.credit_value_ects,
  placement_status = excluded.placement_status,
  level_status = excluded.level_status,
  source_registry_id = excluded.source_registry_id,
  source_url = excluded.source_url,
  retrieved_at = excluded.retrieved_at,
  metadata_scope = 'minimal_public_metadata',
  institutional_validation_required = true,
  is_public_reference = true;

update public.official_qualification_references
set credit_value_ects = 240
where qualification_code = 'TR0030009011'
  and credit_value_ects is distinct from 240;

insert into public.qualification_level_descriptor_translations
  (id, descriptor_id, framework_id, level, language_code,
   knowledge_descriptor, skills_descriptor, competence_descriptor,
   competence_label, knowledge_basis, skills_basis, competence_basis,
   display_source_url, verified_at)
values
  (
    'eqf-1-tr', 'eqf-1', 'eqf', 1, 'tr',
    $$Temel genel bilgiler$$,
    $$Basit görevleri yerine getirmek için gerekli temel beceriler$$,
    $$Yapılandırılmış bir çalışma veya öğrenim bağlamında, doğrudan gözetim altında çalışabilme$$,
    'Sorumluluk alabilme ve otonomi',
    'official_display_translation', 'official_display_translation', 'official_display_translation',
    'https://europass.europa.eu/tr/description-eight-eqf-levels',
    '2026-08-19 23:45:00+00'
  ),
  (
    'eqf-2-tr', 'eqf-2', 'eqf', 2, 'tr',
    $$Bir çalışma veya öğrenim alanına ilişkin temel olgusal bilgi$$,
    $$Basit kurallar ve araçlardan yararlanarak rutin sorunları çözmek ve bir görevi yerine getirmek amacıyla konuya ilişkin bilgileri kullanmak için gerekli temel bilişsel ve pratik beceriler$$,
    $$Çalışırken veya öğrenirken gözetim altında ve belli düzeyde bağımsız çalışabilme$$,
    'Sorumluluk alabilme ve otonomi',
    'official_display_translation', 'official_display_translation', 'official_display_translation',
    'https://europass.europa.eu/tr/description-eight-eqf-levels',
    '2026-08-19 23:45:00+00'
  ),
  (
    'eqf-3-tr', 'eqf-3', 'eqf', 3, 'tr',
    $$Bir çalışma veya öğrenim alanındaki olgular, ilkeler, süreçler ve genel kavramlara ilişkin bilgi$$,
    $$Temel yöntemler, araçlar, materyaller ve bilgiler arasından seçim yaparak ve bunları uygulayarak görevleri başarıyla tamamlamak ve sorunları çözebilmek için gerekli bilişsel ve pratik beceriler$$,
    $$Çalışırken veya öğrenirken görevleri tamamlamak için sorumluluk alma; sorunları çözerken kendi davranışlarını duruma göre uyarlama$$,
    'Sorumluluk alabilme ve otonomi',
    'official_display_translation', 'official_display_translation', 'official_display_translation',
    'https://europass.europa.eu/tr/description-eight-eqf-levels',
    '2026-08-19 23:45:00+00'
  ),
  (
    'eqf-4-tr', 'eqf-4', 'eqf', 4, 'tr',
    $$Bir çalışma veya öğrenim alanındaki geniş bağlamlara ilişkin olgusal ve kavramsal bilgi$$,
    $$Bir çalışma veya öğrenim alanındaki belirli sorunlara çözüm üretebilmek için gerekli bilişsel ve pratik beceriler$$,
    $$Öngörülebilir olsa da değişiklik gösterebilecek çalışma veya öğrenim bağlamlarında yönergeler dahilinde öz yönetim uygulama; çalışma veya öğrenim etkinliklerinin değerlendirilmesi ve geliştirilmesi konusunda sınırlı düzeyde sorumluluk alarak başkalarının rutin işlerinin gözetimini yapabilme$$,
    'Sorumluluk alabilme ve otonomi',
    'official_display_translation', 'official_display_translation', 'official_display_translation',
    'https://europass.europa.eu/tr/description-eight-eqf-levels',
    '2026-08-19 23:45:00+00'
  ),
  (
    'eqf-5-tr', 'eqf-5', 'eqf', 5, 'tr',
    $$Bir çalışma veya öğrenim alanında kapsamlı, o alana mahsus, olgusal ve kavramsal bilgiye ve bu bilginin sınırlarına ilişkin farkındalığa sahip olma$$,
    $$Soyut sorunlara yaratıcı çözümler geliştirmek için gereken kapsamlı bilişsel ve pratik beceriler$$,
    $$Öngörülemeyen değişikliklerin olabileceği çalışma ve öğrenim etkinliklerinin olduğu bağlamlarda yönetim ve gözetim uygulama; kendinin ve başkalarının performansını değerlendirme ve geliştirme$$,
    'Sorumluluk alabilme ve otonomi',
    'official_display_translation', 'official_display_translation', 'official_display_translation',
    'https://europass.europa.eu/tr/description-eight-eqf-levels',
    '2026-08-19 23:45:00+00'
  ),
  (
    'eqf-6-tr', 'eqf-6', 'eqf', 6, 'tr',
    $$Bir çalışma veya öğrenim alanındaki kuram ve ilkelere eleştirel düzeyde hakim olmayı kapsayan ileri düzeyde bilgi$$,
    $$Uzmanlık odaklı bir çalışma veya öğrenim alanında karşılaşılan karmaşık ve öngörülemeyen sorunları çözebilmek için gerekli ustalığın ve inovasyonun sergilenmesini içeren ileri düzeyde beceriler$$,
    $$Öngörülemeyen çalışma veya öğrenim bağlamlarındaki karar verme süreçlerinde sorumluluk alarak karmaşık teknik ve mesleki uzmanlık gerektiren etkinlikleri ve projeleri yönetme; bireylerin ve grupların mesleki gelişimlerinin yönetilmesinde sorumluluk alma$$,
    'Sorumluluk alabilme ve otonomi',
    'official_display_translation', 'official_display_translation', 'official_display_translation',
    'https://europass.europa.eu/tr/description-eight-eqf-levels',
    '2026-08-19 23:45:00+00'
  ),
  (
    'eqf-7-tr', 'eqf-7', 'eqf', 7, 'tr',
    $$Belli bir çalışma veya öğrenim alanında önde gelen bilgiler de dahil olmak üzere, özgün düşünme ve/veya araştırma becerilerinin temelini oluşturan yüksek düzeyde uzmanlık bilgisi. Belli bir alandaki bilgiye veya farklı alanlar arasındaki etkileşime ilişkin konular hakkında eleştirel farkındalık$$,
    $$Araştırma ve/veya inovasyonda yeni bilgi ve usuller geliştirmek ve farklı alanlardan gelen bilgileri bütünleştirmek için gerekli uzmanlaşmış problem çözme becerileri$$,
    $$Karmaşık, öngörülemeyen ve yeni stratejik yaklaşımlar gerektiren çalışma veya öğrenim bağlamlarını yönetme ve dönüştürme; mesleki bilgi ve uygulamaya katkı sağlanmasında ve/veya ekiplerin stratejik performansının değerlendirilmesinde sorumluluk alma$$,
    'Sorumluluk alabilme ve otonomi',
    'official_display_translation', 'institutional_operational_translation', 'official_display_translation',
    'https://europass.europa.eu/tr/description-eight-eqf-levels',
    '2026-08-19 23:45:00+00'
  ),
  (
    'eqf-8-tr', 'eqf-8', 'eqf', 8, 'tr',
    $$Belli bir çalışma veya öğrenim alanına veya farklı alanların etkileşimine ilişkin en ileri düzey bilgi$$,
    $$Araştırma ve/veya inovasyona ilişkin kritik sorunları çözmek için ve mevcut bilgi veya mesleki uygulamayı genişletmek ve yeniden tanımlamak için gerekli sentezleme ve değerlendirme gibi ileri düzeyde ve uzmanlık gerektiren beceri ve teknikler$$,
    $$Araştırma içeren çalışma veya öğrenim bağlamlarının ön planında kayda değer yetki, inovasyon, otonomi, akademik ve mesleki bütünlüğün yanı sıra yeni fikir ve süreçlerin geliştirilmesi konusunda sürekli kararlılık gösterme$$,
    'Sorumluluk alabilme ve otonomi',
    'official_display_translation', 'official_display_translation', 'official_display_translation',
    'https://europass.europa.eu/tr/description-eight-eqf-levels',
    '2026-08-19 23:45:00+00'
  )
on conflict (framework_id, level, language_code) do update set
  id = excluded.id,
  descriptor_id = excluded.descriptor_id,
  knowledge_descriptor = excluded.knowledge_descriptor,
  skills_descriptor = excluded.skills_descriptor,
  competence_descriptor = excluded.competence_descriptor,
  competence_label = excluded.competence_label,
  knowledge_basis = excluded.knowledge_basis,
  skills_basis = excluded.skills_basis,
  competence_basis = excluded.competence_basis,
  display_source_url = excluded.display_source_url,
  verified_at = excluded.verified_at,
  institutional_validation_required = true,
  is_public_reference = true;

insert into public.pilot_matrix_drafts
  (id, title, framework_id, target_level, template_id, owner_role, owner_label,
   status, updated_at, source_url, source_verified_at, validation_status)
values
  (
    'DRF-MAT-TYC-6-001',
    'Veri ile karar verme — TYÇ 6 pilot matrisi',
    'tyc', 6, 'matrix-tyc-6', 'instructor', 'Dr. Öğr. Üyesi Ekin Demir',
    'pilot_draft', '2026-08-19 23:50:00+00',
    'https://www.myk.gov.tr/images/articles/TYC/Tyc_bilgi_merkezi/Seviye_Tanimlay%C4%B1cilari/TYC_Seviye_Tanimlayicilari2.pdf',
    '2026-08-19 22:00:00+00',
    'institutional_validation_pending'
  ),
  (
    'DRF-MAT-EQF-6-001',
    'Veri ile karar verme — AYÇ/EQF 6 pilot matrisi',
    'eqf', 6, 'matrix-eqf-6', 'externalInstructor', 'Uzman Eğitici Selin Ada',
    'pilot_draft', '2026-08-19 23:50:00+00',
    'https://europass.europa.eu/en/description-eight-eqf-levels',
    '2026-08-19 22:00:00+00',
    'pilot_reviewed_not_approved'
  )
on conflict (id) do update set
  title = excluded.title,
  framework_id = excluded.framework_id,
  target_level = excluded.target_level,
  template_id = excluded.template_id,
  owner_role = excluded.owner_role,
  owner_label = excluded.owner_label,
  status = excluded.status,
  updated_at = excluded.updated_at,
  source_url = excluded.source_url,
  source_verified_at = excluded.source_verified_at,
  institutional_validation_required = true,
  validation_status = excluded.validation_status,
  real_system_effect = false,
  is_synthetic = true;

insert into public.pilot_matrix_draft_rows
  (id, draft_id, row_order, framework_dimension, learning_outcome_code,
   learning_outcome, learning_level, course_content, assessment_method,
   evidence, alignment_rationale, validation_status)
values
  (
    'DRF-TYC6-ROW-1', 'DRF-MAT-TYC-6-001', 1, 'knowledge', 'ÖÇ-1',
    'Karmaşık bir veri probleminin kuramsal ve olgusal bileşenlerini eleştirel olarak açıklar.',
    'Analiz', 'Veri kalitesi, gösterge tasarımı ve kanıt sınırları',
    'Gerekçeli vaka analizi ve analitik rubrik',
    'Vaka raporu, kaynak izi ve rubrik kaydı',
    'Bilgi boyutu seviye 6 sorgulayıcı bakış beklentisiyle ilişkilendirilmiştir.',
    'institutional_validation_pending'
  ),
  (
    'DRF-TYC6-ROW-2', 'DRF-MAT-TYC-6-001', 2, 'skills', 'ÖÇ-2',
    'Karmaşık ve öngörülemeyen bir veri sorununa yenilikçi ve izlenebilir bir çözüm geliştirir.',
    'Değerlendirme ve üretme', 'Çözüm seçenekleri, prototip ve doğrulama planı',
    'Performans görevi, ürün dosyası ve analitik rubrik',
    'Çalışan prototip, karar günlüğü ve doğrulama sonucu',
    'Beceri boyutu uzmanlık ve yenilik niteliği gösteren ileri becerilerle eşlenmiştir.',
    'institutional_validation_pending'
  ),
  (
    'DRF-TYC6-ROW-3', 'DRF-MAT-TYC-6-001', 3, 'competence', 'ÖÇ-3',
    'Belirsiz bir pilot proje bağlamında gerekçeli karar alır ve ekip gelişimi için sorumluluk üstlenir.',
    'Değerlendirme ve sorumluluk', 'Proje yönetimi, karar izi ve mesleki gelişim planı',
    'Ekip simülasyonu, gözlem kontrol listesi ve yansıtıcı rapor',
    'Karar günlüğü, gözlem kaydı ve gelişim önerisi',
    'Yetkinlik boyutu öngörülemeyen ortamda sorumluluk alma ve gelişimi yönetme beklentisiyle eşlenmiştir.',
    'institutional_validation_pending'
  ),
  (
    'DRF-EQF6-ROW-1', 'DRF-MAT-EQF-6-001', 1, 'knowledge', 'LO-1',
    'Explains complex data-quality assumptions from an advanced and critical perspective.',
    'Analysis', 'Data-quality dimensions, indicator validity and evidence limits',
    'Reasoned case analysis with an analytic rubric',
    'Case report, source trace and rubric record',
    'Mapped to advanced knowledge involving a critical understanding at EQF level 6.',
    'pilot_reviewed_not_approved'
  ),
  (
    'DRF-EQF6-ROW-2', 'DRF-MAT-EQF-6-001', 2, 'competence', 'LO-2',
    'Manages a complex pilot task and takes responsibility for reviewing team performance.',
    'Evaluation and responsibility', 'Project controls, review criteria and improvement cycles',
    'Team simulation, observation checklist and reflective brief',
    'Decision log, observation record and improvement proposal',
    'Mapped to managing complex activities and responsibility for professional development at EQF level 6.',
    'pilot_reviewed_not_approved'
  ),
  (
    'DRF-EQF6-ROW-3', 'DRF-MAT-EQF-6-001', 3, 'skills', 'LO-3',
    'Develops and validates an innovative response to an unpredictable data-quality problem.',
    'Evaluate and create', 'Solution alternatives, prototype construction and validation planning',
    'Performance task, product portfolio and analytic rubric',
    'Working prototype, decision trace and validation result',
    'Mapped to advanced skills demonstrating mastery and innovation at EQF level 6.',
    'pilot_reviewed_not_approved'
  )
on conflict (draft_id, row_order) do update set
  id = excluded.id,
  framework_dimension = excluded.framework_dimension,
  learning_outcome_code = excluded.learning_outcome_code,
  learning_outcome = excluded.learning_outcome,
  learning_level = excluded.learning_level,
  course_content = excluded.course_content,
  assessment_method = excluded.assessment_method,
  evidence = excluded.evidence,
  alignment_rationale = excluded.alignment_rationale,
  institutional_validation_required = true,
  validation_status = excluded.validation_status,
  real_system_effect = false,
  is_synthetic = true;

insert into public.pilot_payment_requests
  (id, application_id, program_id, program_code, program_title, learner_label,
   amount, currency, channel, status, created_at, updated_at, review_note,
   enrollment_created)
values
  (
    'PAY-2401', null, 'program-green-skills', 'MY-PRG-2026-011',
    'Yeşil Dönüşüm İçin Temel Yetkinlikler',
    'Derya Örnek',
    1750.00, 'TRY', 'Havale/EFT simülasyonu', 'pending_finance',
    '2026-08-19 15:20:00+00', '2026-08-19 15:20:00+00',
    'Gerçek tahsilat, banka/kart tanımlayıcısı veya canlı mali aktarım yoktur.',
    false
  )
on conflict (id) do update set
  application_id = excluded.application_id,
  program_id = excluded.program_id,
  program_code = excluded.program_code,
  program_title = excluded.program_title,
  learner_label = excluded.learner_label,
  amount = excluded.amount,
  currency = excluded.currency,
  channel = excluded.channel,
  status = excluded.status,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at,
  review_note = excluded.review_note,
  enrollment_created = false,
  real_payment = false,
  has_financial_identifiers = false,
  real_data_sent = false,
  institutional_validation_required = true,
  is_synthetic = true;

insert into public.pilot_payment_events
  (id, payment_request_id, event_order, occurred_at, actor_role, action_label,
   from_status, to_status, reason)
values
  (
    'PAY-2401-EVT-01', 'PAY-2401', 1, '2026-08-19 15:18:00+00',
    'learner', 'Sentetik ödeme taslağı oluşturuldu', null, 'draft',
    'Havale/EFT kanalı yalnız demo senaryosu olarak seçildi; finansal tanımlayıcı alınmadı.'
  ),
  (
    'PAY-2401-EVT-02', 'PAY-2401', 2, '2026-08-19 15:20:00+00',
    'coordinator', 'Mali İşler pilot kuyruğuna yönlendirildi', 'draft', 'pending_finance',
    'Gerçek ödeme alınmadı; yalnız rol bazlı inceleme ve durum geçişi örneklendi.'
  )
on conflict (payment_request_id, event_order) do update set
  id = excluded.id,
  occurred_at = excluded.occurred_at,
  actor_role = excluded.actor_role,
  action_label = excluded.action_label,
  from_status = excluded.from_status,
  to_status = excluded.to_status,
  reason = excluded.reason,
  real_payment = false,
  has_financial_identifiers = false,
  real_data_sent = false,
  is_synthetic = true;

create index if not exists pilot_role_workflow_steps_next_role_idx
  on public.pilot_role_workflow_steps (next_role) where next_role is not null;
create index if not exists official_qualification_references_registry_idx
  on public.official_qualification_references (source_registry_id);
create index if not exists qualification_level_translations_descriptor_idx
  on public.qualification_level_descriptor_translations (descriptor_id);
create index if not exists pilot_matrix_drafts_framework_idx
  on public.pilot_matrix_drafts (framework_id, target_level);
create index if not exists pilot_matrix_drafts_template_idx
  on public.pilot_matrix_drafts (template_id, framework_id, target_level);
create index if not exists pilot_payment_requests_status_idx
  on public.pilot_payment_requests (status, updated_at desc);
create index if not exists pilot_payment_requests_program_idx
  on public.pilot_payment_requests (program_id);
create index if not exists pilot_payment_requests_application_idx
  on public.pilot_payment_requests (application_id) where application_id is not null;

create or replace view public.qualification_dataset_catalog
with (security_invoker = true, security_barrier = true)
as
select
  id,
  dataset_name,
  publisher_name,
  coverage_note,
  access_url,
  documentation_url,
  data_formats,
  licence_status,
  licence_note,
  ingestion_status,
  automated_ingestion_enabled,
  verified_at
from public.qualification_dataset_registry
where is_public_reference = true
  and automated_ingestion_enabled = false;

create or replace view public.official_qualification_reference_catalog
with (security_invoker = true, security_barrier = true)
as
select
  q.qualification_code,
  q.qualification_title,
  q.responsible_institution,
  q.qualification_type,
  q.orientation,
  q.tyc_level,
  q.eqf_level,
  q.credit_value_ects,
  q.placement_status,
  q.level_status,
  q.source_url,
  q.retrieved_at,
  d.dataset_name as source_dataset,
  q.institutional_validation_required
from public.official_qualification_references q
join public.qualification_dataset_registry d on d.id = q.source_registry_id
where q.is_public_reference = true
  and d.is_public_reference = true;

create or replace view public.qualification_level_bilingual_catalog
with (security_invoker = true, security_barrier = true)
as
select
  d.id as descriptor_id,
  f.code as framework_code,
  d.level,
  d.source_language as canonical_language,
  d.knowledge_descriptor as canonical_knowledge_descriptor,
  d.skills_descriptor as canonical_skills_descriptor,
  d.competence_descriptor as canonical_competence_descriptor,
  d.official_source_url as canonical_source_url,
  t.language_code as display_language,
  t.knowledge_descriptor as display_knowledge_descriptor,
  t.skills_descriptor as display_skills_descriptor,
  t.competence_descriptor as display_competence_descriptor,
  t.competence_label as display_competence_label,
  t.knowledge_basis,
  t.skills_basis,
  t.competence_basis,
  t.display_source_url,
  t.institutional_validation_required,
  greatest(d.verified_at, t.verified_at) as verified_at
from public.qualification_level_descriptors d
join public.qualification_frameworks f on f.id = d.framework_id
join public.qualification_level_descriptor_translations t on t.descriptor_id = d.id
where d.framework_id = 'eqf'
  and d.source_language = 'en'
  and d.content_basis = 'official_verbatim'
  and d.is_public_reference = true
  and t.language_code = 'tr'
  and t.is_public_reference = true;

create or replace view public.pilot_matrix_draft_catalog
with (security_invoker = true, security_barrier = true)
as
select
  d.id as draft_id,
  d.title,
  f.code as framework_code,
  d.target_level,
  d.owner_role,
  d.owner_label,
  d.status,
  d.updated_at,
  d.validation_status,
  d.source_url,
  d.source_verified_at,
  r.row_order,
  r.framework_dimension,
  r.learning_outcome_code,
  r.learning_outcome,
  r.learning_level,
  r.course_content,
  r.assessment_method,
  r.evidence,
  r.alignment_rationale,
  r.institutional_validation_required
from public.pilot_matrix_drafts d
join public.qualification_frameworks f on f.id = d.framework_id
join public.pilot_matrix_draft_rows r on r.draft_id = d.id
where d.is_synthetic = true
  and d.real_system_effect = false
  and r.is_synthetic = true
  and r.real_system_effect = false;

create or replace view public.pilot_payment_request_catalog
with (security_invoker = true, security_barrier = true)
as
select
  id,
  application_id,
  program_id,
  program_code,
  program_title,
  learner_label,
  amount,
  currency,
  channel,
  status,
  created_at,
  updated_at,
  review_note,
  enrollment_created,
  institutional_validation_required
from public.pilot_payment_requests
where is_synthetic = true
  and real_payment = false
  and has_financial_identifiers = false
  and real_data_sent = false;

create or replace view public.pilot_payment_event_catalog
with (security_invoker = true, security_barrier = true)
as
select
  e.id,
  e.payment_request_id,
  e.event_order,
  e.occurred_at,
  e.actor_role,
  e.action_label,
  e.from_status,
  e.to_status,
  e.reason
from public.pilot_payment_events e
join public.pilot_payment_requests p on p.id = e.payment_request_id
where e.is_synthetic = true
  and e.real_payment = false
  and e.has_financial_identifiers = false
  and e.real_data_sent = false
  and p.is_synthetic = true
  and p.real_payment = false;

revoke all on table public.qualification_dataset_catalog from public, anon, authenticated;
revoke all on table public.official_qualification_reference_catalog from public, anon, authenticated;
revoke all on table public.qualification_level_bilingual_catalog from public, anon, authenticated;
revoke all on table public.pilot_matrix_draft_catalog from public, anon, authenticated;
revoke all on table public.pilot_payment_request_catalog from public, anon, authenticated;
revoke all on table public.pilot_payment_event_catalog from public, anon, authenticated;

grant select on table public.qualification_dataset_catalog to anon, authenticated;
grant select on table public.official_qualification_reference_catalog to anon, authenticated;
grant select on table public.qualification_level_bilingual_catalog to anon, authenticated;
grant select on table public.pilot_matrix_draft_catalog to anon, authenticated;
grant select on table public.pilot_payment_request_catalog to anon, authenticated;
grant select on table public.pilot_payment_event_catalog to anon, authenticated;

comment on view public.qualification_dataset_catalog is
  'security_invoker: kaynak, format ve yeniden kullanım doğrulama durumunu sunan salt-okunur katalog.';
comment on view public.official_qualification_reference_catalog is
  'security_invoker: KDPÜ için sınırlı kamu yeterlilik üst verisi ve kaynak izi.';
comment on view public.qualification_level_bilingual_catalog is
  'security_invoker: AYÇ/EQF kanonik İngilizce metni ve ayrı kaynak/baz etiketi taşıyan Türkçe gösterim katmanı.';
comment on view public.pilot_matrix_draft_catalog is
  'security_invoker: kurumsal doğrulama bekleyen sentetik doldurulmuş matris satırları.';
comment on view public.pilot_payment_request_catalog is
  'security_invoker: gerçek tahsilat veya finansal tanımlayıcı içermeyen sentetik ödeme talepleri.';
comment on view public.pilot_payment_event_catalog is
  'security_invoker: PAY-2401 için gerçek sistem etkisi olmayan salt-okunur durum olayları.';
