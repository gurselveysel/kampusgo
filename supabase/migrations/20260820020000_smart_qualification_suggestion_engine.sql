-- KDPÜ MYYS kontrollü pilot: açıklanabilir öğrenme çıktısı → TYÇ / AYÇ
-- öneri modeli. Bu şema yalnız salt-okunur sentetik katalog/veri sunar.
-- Otomatik akademik karar, resmî seviye yerleştirmesi veya diploma
-- eşdeğerliği üretmez.

create table if not exists public.qualification_higher_education_cycle_crosswalks (
  id text primary key check (btrim(id) <> ''),
  tyc_level smallint not null check (tyc_level between 5 and 8),
  eqf_level smallint not null check (eqf_level between 5 and 8),
  tyyc_cycle_tr text not null check (btrim(tyyc_cycle_tr) <> ''),
  bologna_cycle_tr text not null check (btrim(bologna_cycle_tr) <> ''),
  award_context_tr text not null check (btrim(award_context_tr) <> ''),
  mapping_status text not null default 'provisional_advisory_crosswalk'
    check (mapping_status = 'provisional_advisory_crosswalk'),
  equivalence_claim boolean not null default false check (not equivalence_claim),
  placement_claim boolean not null default false check (not placement_claim),
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  official_validation_required boolean not null default true check (official_validation_required),
  tyyc_source_url text not null check (tyyc_source_url ~ '^https://'),
  bologna_source_url text not null check (bologna_source_url ~ '^https://'),
  pilot_notice text not null check (btrim(pilot_notice) <> ''),
  unique (tyc_level),
  unique (eqf_level),
  unique (tyc_level, eqf_level)
);

create table if not exists public.pilot_qualification_suggestion_engine_profiles (
  id text primary key check (btrim(id) <> ''),
  engine_version text not null unique check (btrim(engine_version) <> ''),
  engine_mode text not null check (engine_mode = 'deterministic_explainable_pilot'),
  method_key text not null check (method_key = 'deterministic_weighted_rules_and_descriptor_overlap'),
  aggregation_method text not null check (aggregation_method = 'score_weighted_median'),
  advisory_notice text not null check (btrim(advisory_notice) <> ''),
  input_contract jsonb not null check (jsonb_typeof(input_contract) = 'object'),
  output_contract jsonb not null check (jsonb_typeof(output_contract) = 'object'),
  editable_roles jsonb not null check (jsonb_typeof(editable_roles) = 'array'),
  reviewer_roles jsonb not null check (jsonb_typeof(reviewer_roles) = 'array'),
  deterministic boolean not null default true check (deterministic),
  auto_decision_enabled boolean not null default false check (not auto_decision_enabled),
  final_decision_authority text not null default 'yetkili_kurul'
    check (final_decision_authority = 'yetkili_kurul'),
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic)
);

create table if not exists public.pilot_qualification_program_summaries (
  program_id text primary key check (btrim(program_id) <> ''),
  engine_profile_id text not null
    references public.pilot_qualification_suggestion_engine_profiles(id) on update cascade on delete restrict,
  suggested_tyc_level smallint not null check (suggested_tyc_level between 1 and 8),
  suggested_eqf_level smallint not null check (suggested_eqf_level between 1 and 8),
  level_summaries jsonb not null check (jsonb_typeof(level_summaries) = 'object'),
  dimension_coverage jsonb not null check (jsonb_typeof(dimension_coverage) = 'object'),
  coverage jsonb not null check (jsonb_typeof(coverage) = 'object'),
  consistency jsonb not null check (jsonb_typeof(consistency) = 'object'),
  cross_framework_consistency jsonb not null check (jsonb_typeof(cross_framework_consistency) = 'object'),
  higher_education_cycle_id text null
    references public.qualification_higher_education_cycle_crosswalks(id) on update cascade on delete restrict,
  rationale text not null check (btrim(rationale) <> ''),
  aggregation_method text not null check (aggregation_method = 'score_weighted_median'),
  advisory_notice text not null check (btrim(advisory_notice) <> ''),
  autonomous_decision boolean not null default false check (not autonomous_decision),
  final_board_decision boolean not null default false check (not final_board_decision),
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic),
  unique (program_id, engine_profile_id)
);

create table if not exists public.pilot_learning_outcome_suggestions (
  id text primary key check (btrim(id) <> ''),
  engine_profile_id text not null,
  program_id text not null check (btrim(program_id) <> ''),
  outcome_id text not null check (btrim(outcome_id) <> ''),
  outcome_text text not null check (char_length(btrim(outcome_text)) between 1 and 600),
  input_quality jsonb not null check (jsonb_typeof(input_quality) = 'object'),
  framework_id text not null references public.qualification_frameworks(id) on update cascade on delete restrict,
  descriptor_id text not null,
  proposed_level smallint not null check (proposed_level between 1 and 8),
  proposed_dimension text not null check (proposed_dimension in ('knowledge', 'skills', 'competence')),
  score smallint not null check (score between 0 and 100),
  confidence text not null check (confidence in ('low', 'medium', 'high')),
  rationale text not null check (btrim(rationale) <> ''),
  matched_signals jsonb not null check (jsonb_typeof(matched_signals) = 'array'),
  suggested_content jsonb not null check (jsonb_typeof(suggested_content) = 'array'),
  suggested_assessments jsonb not null check (jsonb_typeof(suggested_assessments) = 'array'),
  cross_framework_peer_level smallint not null check (cross_framework_peer_level between 1 and 8),
  cross_framework_status text not null check (cross_framework_status in ('aligned', 'adjacent_review', 'material_discrepancy')),
  cross_framework_rationale text not null check (btrim(cross_framework_rationale) <> ''),
  advisory_notice text not null check (btrim(advisory_notice) <> ''),
  selection_source text not null default 'engine_suggestion' check (selection_source = 'engine_suggestion'),
  editable_roles jsonb not null check (jsonb_typeof(editable_roles) = 'array'),
  reviewer_roles jsonb not null check (jsonb_typeof(reviewer_roles) = 'array'),
  autonomous_decision boolean not null default false check (not autonomous_decision),
  final_board_decision boolean not null default false check (not final_board_decision),
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic),
  foreign key (descriptor_id, framework_id, proposed_level)
    references public.qualification_level_descriptors(id, framework_id, level)
    on update cascade on delete restrict,
  foreign key (program_id, engine_profile_id)
    references public.pilot_qualification_program_summaries(program_id, engine_profile_id)
    on update cascade on delete cascade,
  unique (program_id, outcome_id, framework_id),
  unique (id, outcome_id, framework_id, proposed_level, proposed_dimension)
);

create table if not exists public.pilot_qualification_manual_override_examples (
  id text primary key check (btrim(id) <> ''),
  suggestion_id text not null,
  outcome_id text not null check (btrim(outcome_id) <> ''),
  framework_id text not null references public.qualification_frameworks(id) on update cascade on delete restrict,
  actor_role text not null check (actor_role in ('instructor', 'externalInstructor')),
  computed_level smallint not null check (computed_level between 1 and 8),
  computed_dimension text not null check (computed_dimension in ('knowledge', 'skills', 'competence')),
  selected_level smallint not null check (selected_level between 1 and 8),
  selected_dimension text not null check (selected_dimension in ('knowledge', 'skills', 'competence')),
  reason text not null check (char_length(btrim(reason)) >= 10),
  recorded_at timestamptz not null,
  selection_source text not null default 'manual_override' check (selection_source = 'manual_override'),
  is_human_selection boolean not null default true check (is_human_selection),
  final_board_decision boolean not null default false check (not final_board_decision),
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic),
  foreign key (suggestion_id, outcome_id, framework_id, computed_level, computed_dimension)
    references public.pilot_learning_outcome_suggestions
      (id, outcome_id, framework_id, proposed_level, proposed_dimension)
    on update cascade on delete cascade,
  unique (suggestion_id)
);

create table if not exists public.pilot_qualification_board_decision_examples (
  id text primary key check (btrim(id) <> ''),
  program_id text not null check (btrim(program_id) <> ''),
  engine_profile_id text not null,
  decision_status text not null check (decision_status in ('approved', 'revision_requested', 'rejected', 'deferred')),
  actor_role text not null check (actor_role = 'commission'),
  decided_by_label text not null check (btrim(decided_by_label) <> ''),
  rationale text not null check (char_length(btrim(rationale)) >= 10),
  decided_tyc_level smallint not null check (decided_tyc_level between 1 and 8),
  decided_eqf_level smallint not null check (decided_eqf_level between 1 and 8),
  decided_at timestamptz not null,
  meeting_reference text null check (meeting_reference is null or btrim(meeting_reference) <> ''),
  suggestion_snapshot jsonb not null check (jsonb_typeof(suggestion_snapshot) = 'object'),
  is_human_decision boolean not null default true check (is_human_decision),
  suggestion_mutated boolean not null default false check (not suggestion_mutated),
  autonomous_decision boolean not null default false check (not autonomous_decision),
  institutional_validation_required boolean not null default true check (institutional_validation_required),
  real_system_effect boolean not null default false check (not real_system_effect),
  is_synthetic boolean not null default true check (is_synthetic),
  foreign key (program_id, engine_profile_id)
    references public.pilot_qualification_program_summaries(program_id, engine_profile_id)
    on update cascade on delete restrict
);

comment on table public.qualification_higher_education_cycle_crosswalks is
  'TYÇ/AYÇ 5-8 ile TYYÇ/Bologna döngü dilini karşılaştıran provisional pilot köprü; eşdeğerlik veya yerleştirme değildir.';
comment on table public.pilot_qualification_suggestion_engine_profiles is
  'Karar vermeyen deterministik ve açıklanabilir pilot öneri motoru sözleşmesi.';
comment on table public.pilot_qualification_program_summaries is
  'Öğrenme çıktısı önerilerinden açıklanabilir biçimde toplulaştırılan sentetik program düzeyi TYÇ/AYÇ önerisi.';
comment on table public.pilot_learning_outcome_suggestions is
  'Her sentetik öğrenme çıktısı için ayrı TYÇ/AYÇ seviye, boyut, puan, gerekçe, içerik ve ölçme önerisi.';
comment on table public.pilot_qualification_manual_override_examples is
  'Yalnız eğitici rollerinin gerekçeli manuel seçim örneği; komisyon kararı değildir.';
comment on table public.pilot_qualification_board_decision_examples is
  'Motor önerisinden ayrı tutulan sentetik insan komisyon kararı örneği.';

alter table public.qualification_higher_education_cycle_crosswalks enable row level security;
alter table public.pilot_qualification_suggestion_engine_profiles enable row level security;
alter table public.pilot_qualification_program_summaries enable row level security;
alter table public.pilot_learning_outcome_suggestions enable row level security;
alter table public.pilot_qualification_manual_override_examples enable row level security;
alter table public.pilot_qualification_board_decision_examples enable row level security;

alter table public.qualification_higher_education_cycle_crosswalks force row level security;
alter table public.pilot_qualification_suggestion_engine_profiles force row level security;
alter table public.pilot_qualification_program_summaries force row level security;
alter table public.pilot_learning_outcome_suggestions force row level security;
alter table public.pilot_qualification_manual_override_examples force row level security;
alter table public.pilot_qualification_board_decision_examples force row level security;

revoke all on table public.qualification_higher_education_cycle_crosswalks from public, anon, authenticated;
revoke all on table public.pilot_qualification_suggestion_engine_profiles from public, anon, authenticated;
revoke all on table public.pilot_qualification_program_summaries from public, anon, authenticated;
revoke all on table public.pilot_learning_outcome_suggestions from public, anon, authenticated;
revoke all on table public.pilot_qualification_manual_override_examples from public, anon, authenticated;
revoke all on table public.pilot_qualification_board_decision_examples from public, anon, authenticated;

grant select on table public.qualification_higher_education_cycle_crosswalks to anon, authenticated;
grant select on table public.pilot_qualification_suggestion_engine_profiles to anon, authenticated;
grant select on table public.pilot_qualification_program_summaries to anon, authenticated;
grant select on table public.pilot_learning_outcome_suggestions to anon, authenticated;
grant select on table public.pilot_qualification_manual_override_examples to anon, authenticated;
grant select on table public.pilot_qualification_board_decision_examples to anon, authenticated;

drop policy if exists qualification_he_cycle_crosswalk_read on public.qualification_higher_education_cycle_crosswalks;
create policy qualification_he_cycle_crosswalk_read
on public.qualification_higher_education_cycle_crosswalks for select to anon, authenticated
using (
  mapping_status = 'provisional_advisory_crosswalk'
  and equivalence_claim = false
  and placement_claim = false
  and institutional_validation_required = true
  and official_validation_required = true
);

drop policy if exists pilot_qualification_engine_profile_read on public.pilot_qualification_suggestion_engine_profiles;
create policy pilot_qualification_engine_profile_read
on public.pilot_qualification_suggestion_engine_profiles for select to anon, authenticated
using (
  deterministic = true
  and auto_decision_enabled = false
  and final_decision_authority = 'yetkili_kurul'
  and institutional_validation_required = true
  and real_system_effect = false
  and is_synthetic = true
);

drop policy if exists pilot_learning_outcome_suggestion_read on public.pilot_learning_outcome_suggestions;
create policy pilot_learning_outcome_suggestion_read
on public.pilot_learning_outcome_suggestions for select to anon, authenticated
using (
  autonomous_decision = false
  and final_board_decision = false
  and institutional_validation_required = true
  and real_system_effect = false
  and is_synthetic = true
);

drop policy if exists pilot_qualification_program_summary_read on public.pilot_qualification_program_summaries;
create policy pilot_qualification_program_summary_read
on public.pilot_qualification_program_summaries for select to anon, authenticated
using (
  autonomous_decision = false
  and final_board_decision = false
  and institutional_validation_required = true
  and real_system_effect = false
  and is_synthetic = true
);

drop policy if exists pilot_qualification_manual_override_read on public.pilot_qualification_manual_override_examples;
create policy pilot_qualification_manual_override_read
on public.pilot_qualification_manual_override_examples for select to anon, authenticated
using (
  actor_role in ('instructor', 'externalInstructor')
  and is_human_selection = true
  and final_board_decision = false
  and institutional_validation_required = true
  and real_system_effect = false
  and is_synthetic = true
);

drop policy if exists pilot_qualification_board_decision_read on public.pilot_qualification_board_decision_examples;
create policy pilot_qualification_board_decision_read
on public.pilot_qualification_board_decision_examples for select to anon, authenticated
using (
  actor_role = 'commission'
  and is_human_decision = true
  and suggestion_mutated = false
  and autonomous_decision = false
  and institutional_validation_required = true
  and real_system_effect = false
  and is_synthetic = true
);

insert into public.qualification_higher_education_cycle_crosswalks
  (id, tyc_level, eqf_level, tyyc_cycle_tr, bologna_cycle_tr, award_context_tr,
   tyyc_source_url, bologna_source_url, pilot_notice)
values
  ('he-cycle-5', 5, 5, 'Kısa düzey — önlisans bağlamı', 'Kısa döngü (short cycle)', 'Önlisans türü yükseköğretim yeterlilikleri için karşılaştırma bağlamı', 'https://uluslararasi.yok.gov.tr/Sayfalar/avrupa-yuksekogretim-alani-ile-uyum-projesi/yeterlikler-cercevesi/yuksekogretim-yeterlilik-turleri.aspx', 'https://ehea.info/bologna-policy/qualification-frameworks/', 'Yalnız karşılaştırmalı TYYÇ/Bologna döngüsü önerisidir; diploma eşdeğerliği, resmî yerleştirme veya kurul kararı değildir. Kurumsal doğrulama gerekir.'),
  ('he-cycle-6', 6, 6, 'Birinci düzey — lisans bağlamı', 'Birinci döngü (first cycle)', 'Lisans türü yükseköğretim yeterlilikleri için karşılaştırma bağlamı', 'https://uluslararasi.yok.gov.tr/Sayfalar/avrupa-yuksekogretim-alani-ile-uyum-projesi/yeterlikler-cercevesi/yuksekogretim-yeterlilik-turleri.aspx', 'https://ehea.info/bologna-policy/qualification-frameworks/', 'Yalnız karşılaştırmalı TYYÇ/Bologna döngüsü önerisidir; diploma eşdeğerliği, resmî yerleştirme veya kurul kararı değildir. Kurumsal doğrulama gerekir.'),
  ('he-cycle-7', 7, 7, 'İkinci düzey — yüksek lisans bağlamı', 'İkinci döngü (second cycle)', 'Yüksek lisans türü yükseköğretim yeterlilikleri için karşılaştırma bağlamı', 'https://uluslararasi.yok.gov.tr/Sayfalar/avrupa-yuksekogretim-alani-ile-uyum-projesi/yeterlikler-cercevesi/yuksekogretim-yeterlilik-turleri.aspx', 'https://ehea.info/bologna-policy/qualification-frameworks/', 'Yalnız karşılaştırmalı TYYÇ/Bologna döngüsü önerisidir; diploma eşdeğerliği, resmî yerleştirme veya kurul kararı değildir. Kurumsal doğrulama gerekir.'),
  ('he-cycle-8', 8, 8, 'Üçüncü düzey — doktora bağlamı', 'Üçüncü döngü (third cycle)', 'Doktora türü yükseköğretim yeterlilikleri için karşılaştırma bağlamı', 'https://uluslararasi.yok.gov.tr/Sayfalar/avrupa-yuksekogretim-alani-ile-uyum-projesi/yeterlikler-cercevesi/yuksekogretim-yeterlilik-turleri.aspx', 'https://ehea.info/bologna-policy/qualification-frameworks/', 'Yalnız karşılaştırmalı TYYÇ/Bologna döngüsü önerisidir; diploma eşdeğerliği, resmî yerleştirme veya kurul kararı değildir. Kurumsal doğrulama gerekir.')
on conflict (id) do update set
  tyc_level = excluded.tyc_level,
  eqf_level = excluded.eqf_level,
  tyyc_cycle_tr = excluded.tyyc_cycle_tr,
  bologna_cycle_tr = excluded.bologna_cycle_tr,
  award_context_tr = excluded.award_context_tr,
  tyyc_source_url = excluded.tyyc_source_url,
  bologna_source_url = excluded.bologna_source_url,
  pilot_notice = excluded.pilot_notice;

insert into public.pilot_qualification_suggestion_engine_profiles
  (id, engine_version, engine_mode, method_key, aggregation_method, advisory_notice,
   input_contract, output_contract, editable_roles, reviewer_roles)
values (
  'qualification-engine-2026-08-20-1',
  '2026-08-20.1',
  'deterministic_explainable_pilot',
  'deterministic_weighted_rules_and_descriptor_overlap',
  'score_weighted_median',
  'Bu çıktı karar değil; öğrenme çıktısını TYÇ ve AYÇ/EQF tanımlayıcılarıyla karşılaştıran açıklanabilir, deterministik bir pilot öneridir. Nihai akademik seviye ve yeterlilik kararı yetkili kurulundur.',
  '{"maxOutcomeCount":40,"maxOutcomeLength":600,"outcome":{"id":"stable text id","text":"plain learning outcome"},"manualOverride":{"id":"OVR-{outcomeId}-{frameworkId}-{n}","level":"1..8","dimension":"knowledge|skills|competence","actorRole":"instructor|externalInstructor","reason":"required human rationale"}}'::jsonb,
  '{"perOutcome":["framework","level","dimension","score","confidence","rationale","content","assessment","crossFrameworkConsistency"],"program":["suggestedLevels","levelSummaries","dimensionCoverage","coverage","consistency","crossFrameworkConsistency","higherEducationCycleSuggestion"],"manualOverridesCanonical":["id","outcomeId","frameworkId","level","dimension","reason","actorRole"],"finalDecision":"separate human commission record"}'::jsonb,
  '["instructor","externalInstructor"]'::jsonb,
  '["coordinator","commission"]'::jsonb
)
on conflict (id) do update set
  engine_version = excluded.engine_version,
  advisory_notice = excluded.advisory_notice,
  input_contract = excluded.input_contract,
  output_contract = excluded.output_contract,
  editable_roles = excluded.editable_roles,
  reviewer_roles = excluded.reviewer_roles;

insert into public.pilot_qualification_program_summaries
  (program_id, engine_profile_id, suggested_tyc_level, suggested_eqf_level,
   level_summaries, dimension_coverage, coverage, consistency,
   cross_framework_consistency, higher_education_cycle_id, rationale,
   aggregation_method, advisory_notice)
values (
  'program-smart-alignment-demo',
  'qualification-engine-2026-08-20-1',
  6,
  6,
  '{"tyc":{"level":6,"averageScore":98,"confidence":"high","descriptorSetAvailable":true,"manualOverrideCount":0},"eqf":{"level":6,"averageScore":98,"confidence":"high","descriptorSetAvailable":true,"manualOverrideCount":0}}'::jsonb,
  '{"tyc":{"knowledge":0,"skills":1,"competence":1},"eqf":{"knowledge":0,"skills":1,"competence":1}}'::jsonb,
  '{"outcomeCount":2,"frameworkCoverage":{"tyc":{"suggestedOutcomeCount":2,"totalOutcomeCount":2,"percent":100},"eqf":{"suggestedOutcomeCount":2,"totalOutcomeCount":2,"percent":100}},"explainableSignalOutcomeCount":2,"explainableSignalPercent":100,"lowConfidenceOutcomeIds":[]}'::jsonb,
  '{"tyc":{"min":6,"max":7,"spread":1,"consistent":true,"warning":null},"eqf":{"min":6,"max":7,"spread":1,"consistent":true,"warning":null}}'::jsonb,
  '{"exactMatchCount":2,"adjacentReviewCount":0,"materialDiscrepancyCount":0,"discrepancyOutcomeIds":[],"allExact":true,"equalityForced":false,"institutionalValidationRequired":true}'::jsonb,
  'he-cycle-6',
  'Program düzeyi, 2 öğrenme çıktısının puanla ağırlıklandırılmış medyanından üretildi. TYÇ 6 ve AYÇ/EQF 6 önerileri karar değildir; tek tek çıktılar, ölçme kanıtları, iş yükü ve kurul değerlendirmesi birlikte incelenmelidir.',
  'score_weighted_median',
  'Bu çıktı karar değil; öğrenme çıktısını TYÇ ve AYÇ/EQF tanımlayıcılarıyla karşılaştıran açıklanabilir, deterministik bir pilot öneridir. Nihai akademik seviye ve yeterlilik kararı yetkili kurulundur.'
)
on conflict (program_id) do update set
  engine_profile_id = excluded.engine_profile_id,
  suggested_tyc_level = excluded.suggested_tyc_level,
  suggested_eqf_level = excluded.suggested_eqf_level,
  level_summaries = excluded.level_summaries,
  dimension_coverage = excluded.dimension_coverage,
  coverage = excluded.coverage,
  consistency = excluded.consistency,
  cross_framework_consistency = excluded.cross_framework_consistency,
  higher_education_cycle_id = excluded.higher_education_cycle_id,
  rationale = excluded.rationale,
  aggregation_method = excluded.aggregation_method,
  advisory_notice = excluded.advisory_notice,
  autonomous_decision = false,
  final_board_decision = false,
  institutional_validation_required = true,
  real_system_effect = false,
  is_synthetic = true;

insert into public.pilot_learning_outcome_suggestions
  (id, engine_profile_id, program_id, outcome_id, outcome_text, input_quality,
   framework_id, descriptor_id, proposed_level, proposed_dimension, score, confidence,
   rationale, matched_signals, suggested_content, suggested_assessments,
   cross_framework_peer_level, cross_framework_status, cross_framework_rationale,
   advisory_notice, editable_roles, reviewer_roles)
values
  (
    'SUG-DEMO-LO-1-TYC', 'qualification-engine-2026-08-20-1', 'program-smart-alignment-demo', 'LO-1',
    'Karmaşık ve öngörülemeyen bir veri sorununu eleştirel olarak analiz eder ve yenilikçi çözüm geliştirir.',
    '{"status":"sufficient","isMeasurable":true,"observableSignalCount":2,"warnings":[]}'::jsonb,
    'tyc', 'tyc-6', 6, 'skills', 98, 'high',
    'TYÇ 6 / Beceri önerisi; karmaşık, öngörülemeyen, eleştirel ve yenilik sinyalleriyle ilgili resmî tanımlayıcı karşılaştırılmıştır. Akademik karar değildir.',
    '[{"label":"analiz","category":"dimension"},{"label":"karmaşık problem/bağlam","category":"level"},{"label":"öngörülemeyen problem/bağlam","category":"level"},{"label":"yenilik","category":"level"}]'::jsonb,
    '["İleri veri kalitesi ve kanıt sınırları","Problem çözme, prototip ve doğrulama","Tanımlayıcıyla ilişkiyi görünür kılan kanıt etkinliği"]'::jsonb,
    '[{"method":"Karmaşık performans görevi + ürün dosyası","evidence":"Çalışan ürün, karar günlüğü ve analitik rubrik"},{"method":"Vaka çözümü + bağımsız uzman değerlendirmesi","evidence":"Gerekçeli çözüm ve değerlendirme tutanağı"}]'::jsonb,
    6, 'aligned', 'TYÇ ve AYÇ/EQF önerileri 6. seviyede aynı açıklanabilir sinyal kümesine yakınsamıştır.',
    'Bu çıktı karar değil; komisyon incelemesini destekleyen açıklanabilir pilot öneridir.',
    '["instructor","externalInstructor"]'::jsonb, '["coordinator","commission"]'::jsonb
  ),
  (
    'SUG-DEMO-LO-1-EQF', 'qualification-engine-2026-08-20-1', 'program-smart-alignment-demo', 'LO-1',
    'Karmaşık ve öngörülemeyen bir veri sorununu eleştirel olarak analiz eder ve yenilikçi çözüm geliştirir.',
    '{"status":"sufficient","isMeasurable":true,"observableSignalCount":2,"warnings":[]}'::jsonb,
    'eqf', 'eqf-6', 6, 'skills', 98, 'high',
    'AYÇ/EQF 6 / Skills önerisi; karmaşık, öngörülemeyen, eleştirel ve yenilik sinyalleriyle ilgili resmî tanımlayıcı karşılaştırılmıştır. Akademik karar değildir.',
    '[{"label":"analiz","category":"dimension"},{"label":"complex","category":"level"},{"label":"unpredictable","category":"level"},{"label":"innovation","category":"level"}]'::jsonb,
    '["Advanced data quality and evidence limits","Problem solving, prototype and validation","Descriptor-linked evidence activity"]'::jsonb,
    '[{"method":"Karmaşık performans görevi + ürün dosyası","evidence":"Çalışan ürün, karar günlüğü ve analitik rubrik"},{"method":"Vaka çözümü + bağımsız uzman değerlendirmesi","evidence":"Gerekçeli çözüm ve değerlendirme tutanağı"}]'::jsonb,
    6, 'aligned', 'TYÇ ve AYÇ/EQF önerileri 6. seviyede aynı açıklanabilir sinyal kümesine yakınsamıştır.',
    'Bu çıktı karar değil; komisyon incelemesini destekleyen açıklanabilir pilot öneridir.',
    '["instructor","externalInstructor"]'::jsonb, '["coordinator","commission"]'::jsonb
  ),
  (
    'SUG-DEMO-LO-2-TYC', 'qualification-engine-2026-08-20-1', 'program-smart-alignment-demo', 'LO-2',
    'Ekip performansını değerlendirir ve stratejik dönüşümü yönetir.',
    '{"status":"sufficient","isMeasurable":true,"observableSignalCount":3,"warnings":[]}'::jsonb,
    'tyc', 'tyc-7', 7, 'competence', 98, 'high',
    'TYÇ 7 / Yetkinlik önerisi; ekip performansı, stratejik yaklaşım, dönüşüm ve yönetim sinyalleri karşılaştırılmıştır. Akademik karar değildir.',
    '[{"label":"yönetim","category":"dimension"},{"label":"stratejik yaklaşım","category":"level"},{"label":"ekiplerin stratejik performansını değerlendirme","category":"level"}]'::jsonb,
    '["Stratejik değişim ve ekip performansı","Etik sorumluluk ve özerklik","Dönüşüm etkisini gösteren kanıt etkinliği"]'::jsonb,
    '[{"method":"Proje/ekip simülasyonu + çok kaynaklı rubrik","evidence":"Karar günlüğü, risk kaydı ve ekip geri bildirimi"},{"method":"Kurul savunması + stratejik etki dosyası","evidence":"Savunma tutanağı ve etki ölçütleri"}]'::jsonb,
    7, 'aligned', 'TYÇ ve AYÇ/EQF önerileri 7. seviyede aynı açıklanabilir sinyal kümesine yakınsamıştır.',
    'Bu çıktı karar değil; komisyon incelemesini destekleyen açıklanabilir pilot öneridir.',
    '["instructor","externalInstructor"]'::jsonb, '["coordinator","commission"]'::jsonb
  ),
  (
    'SUG-DEMO-LO-2-EQF', 'qualification-engine-2026-08-20-1', 'program-smart-alignment-demo', 'LO-2',
    'Ekip performansını değerlendirir ve stratejik dönüşümü yönetir.',
    '{"status":"sufficient","isMeasurable":true,"observableSignalCount":3,"warnings":[]}'::jsonb,
    'eqf', 'eqf-7', 7, 'competence', 98, 'high',
    'AYÇ/EQF 7 / Responsibility and autonomy önerisi; ekip performansı, stratejik yaklaşım, dönüşüm ve yönetim sinyalleri karşılaştırılmıştır. Akademik karar değildir.',
    '[{"label":"manage","category":"dimension"},{"label":"strategic approach","category":"level"},{"label":"strategic team performance","category":"level"}]'::jsonb,
    '["Strategic change and team performance","Ethical responsibility and autonomy","Transformation evidence activity"]'::jsonb,
    '[{"method":"Proje/ekip simülasyonu + çok kaynaklı rubrik","evidence":"Karar günlüğü, risk kaydı ve ekip geri bildirimi"},{"method":"Kurul savunması + stratejik etki dosyası","evidence":"Savunma tutanağı ve etki ölçütleri"}]'::jsonb,
    7, 'aligned', 'TYÇ ve AYÇ/EQF önerileri 7. seviyede aynı açıklanabilir sinyal kümesine yakınsamıştır.',
    'Bu çıktı karar değil; komisyon incelemesini destekleyen açıklanabilir pilot öneridir.',
    '["instructor","externalInstructor"]'::jsonb, '["coordinator","commission"]'::jsonb
  )
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
  cross_framework_status = excluded.cross_framework_status,
  cross_framework_rationale = excluded.cross_framework_rationale,
  advisory_notice = excluded.advisory_notice,
  editable_roles = excluded.editable_roles,
  reviewer_roles = excluded.reviewer_roles;

insert into public.pilot_qualification_manual_override_examples
  (id, suggestion_id, outcome_id, framework_id, actor_role, computed_level,
   computed_dimension, selected_level, selected_dimension, reason, recorded_at)
values (
  'OVR-DEMO-LO-1-TYC-1', 'SUG-DEMO-LO-1-TYC', 'LO-1', 'tyc', 'instructor',
  6, 'skills', 6, 'knowledge',
  'Aday eğitici, çıktının öncelikle eleştirel bilgi kanıtı ürettiğini gerekçelendirmiştir.',
  '2026-08-20 02:00:00+00'
)
on conflict (id) do update set
  suggestion_id = excluded.suggestion_id,
  outcome_id = excluded.outcome_id,
  framework_id = excluded.framework_id,
  actor_role = excluded.actor_role,
  computed_level = excluded.computed_level,
  computed_dimension = excluded.computed_dimension,
  selected_level = excluded.selected_level,
  selected_dimension = excluded.selected_dimension,
  reason = excluded.reason,
  recorded_at = excluded.recorded_at,
  selection_source = 'manual_override',
  is_human_selection = true,
  final_board_decision = false,
  institutional_validation_required = true,
  real_system_effect = false,
  is_synthetic = true;

insert into public.pilot_qualification_board_decision_examples
  (id, program_id, engine_profile_id, decision_status, actor_role, decided_by_label, rationale,
   decided_tyc_level, decided_eqf_level, decided_at, meeting_reference, suggestion_snapshot)
values (
  'DEC-DEMO-001', 'program-smart-alignment-demo', 'qualification-engine-2026-08-20-1', 'approved', 'commission',
  'Sentetik Mikro Yeterlilik Komisyonu',
  'Kurul; öğrenme çıktıları, ölçme kanıtları ve açıklanabilir öneri kayıtlarını insan incelemesiyle birlikte değerlendirmiştir.',
  6, 6, '2026-08-20 02:10:00+00', 'SENTETIK-TOPLANTI-2026-08',
  '{"engineVersion":"2026-08-20.1","suggestedLevels":{"tyc":6,"eqf":6},"suggestionMutated":false}'::jsonb
)
on conflict (id) do update set
  program_id = excluded.program_id,
  engine_profile_id = excluded.engine_profile_id,
  decision_status = excluded.decision_status,
  actor_role = excluded.actor_role,
  decided_by_label = excluded.decided_by_label,
  rationale = excluded.rationale,
  decided_tyc_level = excluded.decided_tyc_level,
  decided_eqf_level = excluded.decided_eqf_level,
  decided_at = excluded.decided_at,
  meeting_reference = excluded.meeting_reference,
  suggestion_snapshot = excluded.suggestion_snapshot,
  is_human_decision = true,
  suggestion_mutated = false,
  autonomous_decision = false,
  institutional_validation_required = true,
  real_system_effect = false,
  is_synthetic = true;

create index if not exists pilot_qualification_program_summaries_engine_profile_idx
  on public.pilot_qualification_program_summaries (engine_profile_id);
create index if not exists pilot_qualification_program_summaries_cycle_idx
  on public.pilot_qualification_program_summaries (higher_education_cycle_id);
create index if not exists pilot_learning_outcome_suggestions_program_engine_idx
  on public.pilot_learning_outcome_suggestions (program_id, engine_profile_id);
create index if not exists pilot_learning_outcome_suggestions_descriptor_idx
  on public.pilot_learning_outcome_suggestions (descriptor_id, framework_id, proposed_level);
create index if not exists pilot_learning_outcome_suggestions_framework_idx
  on public.pilot_learning_outcome_suggestions (framework_id);
create index if not exists pilot_qualification_manual_override_framework_idx
  on public.pilot_qualification_manual_override_examples (framework_id);
create index if not exists pilot_qualification_board_decision_program_engine_idx
  on public.pilot_qualification_board_decision_examples (program_id, engine_profile_id);

create or replace view public.qualification_higher_education_cycle_catalog
with (security_invoker = true, security_barrier = true)
as
select
  id, tyc_level, eqf_level, tyyc_cycle_tr, bologna_cycle_tr, award_context_tr,
  mapping_status, equivalence_claim, placement_claim,
  institutional_validation_required, official_validation_required,
  tyyc_source_url, bologna_source_url, pilot_notice
from public.qualification_higher_education_cycle_crosswalks;

create or replace view public.pilot_qualification_suggestion_profile_catalog
with (security_invoker = true, security_barrier = true)
as
select
  id, engine_version, engine_mode, method_key, aggregation_method, advisory_notice,
  input_contract, output_contract, editable_roles, reviewer_roles,
  deterministic, auto_decision_enabled, final_decision_authority,
  institutional_validation_required
from public.pilot_qualification_suggestion_engine_profiles;

create or replace view public.pilot_qualification_program_summary_catalog
with (security_invoker = true, security_barrier = true)
as
select
  p.program_id, p.engine_profile_id,
  p.suggested_tyc_level, p.suggested_eqf_level,
  p.level_summaries, p.dimension_coverage, p.coverage, p.consistency,
  p.cross_framework_consistency, p.higher_education_cycle_id,
  p.rationale, p.aggregation_method, p.advisory_notice,
  p.autonomous_decision, p.final_board_decision,
  p.institutional_validation_required,
  c.tyc_level as cycle_tyc_level,
  c.eqf_level as cycle_eqf_level,
  c.tyyc_cycle_tr, c.bologna_cycle_tr, c.award_context_tr,
  c.mapping_status as cycle_mapping_status,
  c.equivalence_claim as cycle_equivalence_claim,
  c.placement_claim as cycle_placement_claim,
  c.official_validation_required as cycle_official_validation_required,
  c.tyyc_source_url, c.bologna_source_url, c.pilot_notice as cycle_pilot_notice
from public.pilot_qualification_program_summaries p
left join public.qualification_higher_education_cycle_crosswalks c
  on c.id = p.higher_education_cycle_id;

create or replace view public.pilot_learning_outcome_suggestion_catalog
with (security_invoker = true, security_barrier = true)
as
select
  s.id, s.engine_profile_id, s.program_id, s.outcome_id, s.outcome_text, s.input_quality,
  s.framework_id, f.code as framework_code, s.descriptor_id,
  s.proposed_level, s.proposed_dimension, s.score, s.confidence, s.rationale,
  s.matched_signals, s.suggested_content, s.suggested_assessments,
  s.cross_framework_peer_level, s.cross_framework_status, s.cross_framework_rationale,
  s.advisory_notice, s.selection_source, s.editable_roles, s.reviewer_roles,
  s.autonomous_decision, s.final_board_decision, s.institutional_validation_required,
  d.knowledge_descriptor, d.skills_descriptor, d.competence_descriptor,
  d.official_source_url
from public.pilot_learning_outcome_suggestions s
join public.qualification_frameworks f on f.id = s.framework_id
join public.qualification_level_descriptors d
  on d.id = s.descriptor_id and d.framework_id = s.framework_id and d.level = s.proposed_level;

create or replace view public.pilot_qualification_manual_override_catalog
with (security_invoker = true, security_barrier = true)
as
select
  id, suggestion_id, outcome_id, framework_id, actor_role,
  computed_level, computed_dimension,
  selected_level as level, selected_dimension as dimension,
  selected_level, selected_dimension,
  reason, recorded_at, selection_source, is_human_selection,
  final_board_decision, institutional_validation_required
from public.pilot_qualification_manual_override_examples;

create or replace view public.pilot_qualification_board_decision_catalog
with (security_invoker = true, security_barrier = true)
as
select
  id, program_id, engine_profile_id, decision_status, actor_role, decided_by_label, rationale,
  decided_tyc_level, decided_eqf_level, decided_at, meeting_reference,
  suggestion_snapshot, is_human_decision, suggestion_mutated,
  autonomous_decision, institutional_validation_required
from public.pilot_qualification_board_decision_examples;

revoke all on table public.qualification_higher_education_cycle_catalog from public, anon, authenticated;
revoke all on table public.pilot_qualification_suggestion_profile_catalog from public, anon, authenticated;
revoke all on table public.pilot_qualification_program_summary_catalog from public, anon, authenticated;
revoke all on table public.pilot_learning_outcome_suggestion_catalog from public, anon, authenticated;
revoke all on table public.pilot_qualification_manual_override_catalog from public, anon, authenticated;
revoke all on table public.pilot_qualification_board_decision_catalog from public, anon, authenticated;

grant select on table public.qualification_higher_education_cycle_catalog to anon, authenticated;
grant select on table public.pilot_qualification_suggestion_profile_catalog to anon, authenticated;
grant select on table public.pilot_qualification_program_summary_catalog to anon, authenticated;
grant select on table public.pilot_learning_outcome_suggestion_catalog to anon, authenticated;
grant select on table public.pilot_qualification_manual_override_catalog to anon, authenticated;
grant select on table public.pilot_qualification_board_decision_catalog to anon, authenticated;
