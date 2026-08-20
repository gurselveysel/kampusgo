-- Explicit down migration for the independent TYYÇ advisory layer and smart
-- program-spine bridge. DESTRUCTIVE: use only on a disposable branch/local DB.

begin;

drop view if exists public.pilot_constructive_alignment_catalog;
drop view if exists public.pilot_qualification_program_spine_catalog;
drop view if exists public.pilot_qualification_board_decision_v2_catalog;
drop view if exists public.pilot_learning_outcome_suggestion_v2_catalog;
drop view if exists public.pilot_qualification_program_summary_v2_catalog;
drop view if exists public.qualification_tyyc_type_descriptor_catalog;

drop index if exists public.pilot_matrix_drafts_program_version_idx;
drop index if exists public.pilot_constructive_alignment_program_idx;
drop index if exists public.pilot_tyyc_type_candidates_type_idx;
drop index if exists public.pilot_qualification_program_outcomes_directive_idx;
drop index if exists public.pilot_qualification_program_spine_directive_idx;

update public.pilot_directive_program_versions
set information_package = information_package - 'constructive_alignment_contract'
where program_id = 'PROGRAM-DATA-LITERACY' and version_no = 1;

delete from public.pilot_matrix_draft_rows
where draft_id = 'DRF-MAT-TYYC-6-001';
delete from public.pilot_matrix_drafts
where id = 'DRF-MAT-TYYC-6-001';

alter table public.pilot_matrix_drafts
  drop constraint if exists pilot_matrix_drafts_program_version_fkey;
alter table public.pilot_matrix_drafts
  drop column if exists program_version_no,
  drop column if exists program_id;

delete from public.pilot_learning_outcome_tyyc_type_candidates;
drop table if exists public.pilot_learning_outcome_tyyc_type_candidates;

delete from public.pilot_directive_constructive_alignment_rows;
drop table if exists public.pilot_directive_constructive_alignment_rows;

delete from public.pilot_learning_outcome_suggestions
where framework_id = 'tyyc';
alter table public.pilot_learning_outcome_suggestions
  drop constraint if exists pilot_learning_outcome_suggestions_program_outcome_fkey;
drop table if exists public.pilot_qualification_program_outcomes;
drop table if exists public.pilot_qualification_program_spine_links;

update public.pilot_learning_outcome_suggestions
set cross_framework_rationale = case outcome_id
  when 'LO-1' then 'TYÇ ve AYÇ/EQF önerileri 6. seviyede aynı açıklanabilir sinyal kümesine yakınsamıştır.'
  when 'LO-2' then 'TYÇ ve AYÇ/EQF önerileri 7. seviyede aynı açıklanabilir sinyal kümesine yakınsamıştır.'
  else cross_framework_rationale
end;
alter table public.pilot_learning_outcome_suggestions
  drop constraint if exists pilot_learning_outcome_suggestions_tyyc_level_check;
alter table public.pilot_learning_outcome_suggestions
  drop column if exists cross_framework_levels;

update public.pilot_qualification_board_decision_examples
set suggestion_snapshot = '{"engineVersion":"2026-08-20.1","suggestedLevels":{"tyc":6,"eqf":6},"suggestionMutated":false}'::jsonb
where id = 'DEC-DEMO-001';
alter table public.pilot_qualification_board_decision_examples
  drop constraint if exists pilot_qualification_board_decision_examples_decided_tyyc_level_check;
alter table public.pilot_qualification_board_decision_examples
  drop column if exists decided_tyyc_level;

update public.pilot_qualification_program_summaries
set level_summaries = level_summaries - 'tyyc',
    dimension_coverage = dimension_coverage - 'tyyc',
    coverage = jsonb_set(coverage, '{frameworkCoverage}', (coverage -> 'frameworkCoverage') - 'tyyc', true),
    consistency = consistency - 'tyyc',
    cross_framework_consistency = cross_framework_consistency
      - 'threeFrameworkExactMatchCount'
      - 'threeFrameworkAdjacentReviewCount'
      - 'threeFrameworkMaterialDiscrepancyCount',
    rationale = 'Program düzeyi, 2 öğrenme çıktısının puanla ağırlıklandırılmış medyanından üretildi. TYÇ 6 ve AYÇ/EQF 6 önerileri karar değildir; tek tek çıktılar, ölçme kanıtları, iş yükü ve kurul değerlendirmesi birlikte incelenmelidir.',
    advisory_notice = 'Bu çıktı karar değil; öğrenme çıktısını TYÇ ve AYÇ/EQF tanımlayıcılarıyla karşılaştıran açıklanabilir, deterministik bir pilot öneridir. Nihai akademik seviye ve yeterlilik kararı yetkili kurulundur.'
where program_id = 'program-smart-alignment-demo';
alter table public.pilot_qualification_program_summaries
  drop constraint if exists pilot_qualification_program_summaries_suggested_tyyc_level_check;
alter table public.pilot_qualification_program_summaries
  drop column if exists suggested_tyyc_level;

update public.pilot_qualification_suggestion_engine_profiles
set engine_version = '2026-08-20.1',
    advisory_notice = 'Bu çıktı karar değil; öğrenme çıktısını TYÇ ve AYÇ/EQF tanımlayıcılarıyla karşılaştıran açıklanabilir, deterministik bir pilot öneridir. Nihai akademik seviye ve yeterlilik kararı yetkili kurulundur.',
    input_contract = jsonb_set(input_contract, '{manualOverride,level}', '"1..8"'::jsonb, true),
    output_contract = '{"perOutcome":["framework","level","dimension","score","confidence","rationale","content","assessment","crossFrameworkConsistency"],"program":["suggestedLevels","levelSummaries","dimensionCoverage","coverage","consistency","crossFrameworkConsistency","higherEducationCycleSuggestion"],"manualOverridesCanonical":["id","outcomeId","frameworkId","level","dimension","reason","actorRole"],"finalDecision":"separate human commission record"}'::jsonb
where id = 'qualification-engine-2026-08-20-1';

delete from public.pilot_matrix_example_rows
where template_id in ('matrix-tyyc-5', 'matrix-tyyc-6', 'matrix-tyyc-7', 'matrix-tyyc-8');
delete from public.pilot_matrix_templates
where framework_id = 'tyyc';
drop table if exists public.qualification_tyyc_type_descriptors;
delete from public.qualification_level_descriptors
where framework_id = 'tyyc';
delete from public.qualification_frameworks
where id = 'tyyc';

alter table public.qualification_level_descriptors
  drop constraint if exists qualification_level_descriptors_content_basis_check;
alter table public.qualification_level_descriptors
  add constraint qualification_level_descriptors_content_basis_check
  check (content_basis in ('official_verbatim', 'official_translation'));

commit;
