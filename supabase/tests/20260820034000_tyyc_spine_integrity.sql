-- Rollback-only acceptance probe. Run after 34000. It builds a second valid
-- smart/directive spine entirely from synthetic rows, then proves that an
-- outcome from spine A cannot be paired with the valid directive version from
-- spine B. No row survives this transaction.

begin;

insert into public.pilot_directive_programs
  (id, myd_code, owner_unit_id, program_type, title, awarding_body_role, status)
values
  ('PROGRAM-SPINE-PROBE', 'MYD-2026-SPINE-999', 'UNIT-MYKOORD', 'formal_elective',
   'Kanonik omurga negatif testi — SENTETİK', 'dpu_awarding_body', 'draft');

insert into public.pilot_directive_program_versions
  (program_id, version_no, program_type, directive_version_id, version_label,
   ects, total_learner_workload_hours, delivery_mode,
   pedagogical_reference_level, information_package, status)
values
  ('PROGRAM-SPINE-PROBE', 1, 'formal_elective', 'DIR-DPU-MY-2026-DRAFT',
   'SPINE-PROBE-SENTETIK', 1, 25, 'hybrid', 6,
   '{"probe":"same-spine foreign-key rejection","is_synthetic":true}'::jsonb,
   'draft');

insert into public.pilot_directive_workload_items
  (id, program_id, program_version_no, component_type, planned_hours,
   realized_feedback_hours, calculation_note)
values
  ('WL-SPINE-PROBE', 'PROGRAM-SPINE-PROBE', 1,
   'project_assignment_portfolio', 1, null,
   'SENTETİK: yalnız rollback negatif FK testi için geçerli iş yükü hedefi');

insert into public.pilot_qualification_program_summaries
  (program_id, engine_profile_id, suggested_tyc_level, suggested_eqf_level,
   suggested_tyyc_level, level_summaries, dimension_coverage, coverage,
   consistency, cross_framework_consistency, higher_education_cycle_id,
   rationale, aggregation_method, advisory_notice)
select
  'program-smart-spine-probe', engine_profile_id, suggested_tyc_level,
  suggested_eqf_level, suggested_tyyc_level, level_summaries,
  dimension_coverage, coverage, consistency, cross_framework_consistency,
  higher_education_cycle_id,
  'SENTETİK: kanonik omurga negatif testi için ikinci akıllı program.',
  aggregation_method,
  'SENTETİK rollback testi; akademik karar veya resmî yerleştirme değildir.'
from public.pilot_qualification_program_summaries
where program_id = 'program-smart-alignment-demo'
  and engine_profile_id = 'qualification-engine-2026-08-20-1';

insert into public.pilot_qualification_program_spine_links
  (smart_program_id, engine_profile_id, directive_program_id,
   directive_program_version_no)
values
  ('program-smart-spine-probe', 'qualification-engine-2026-08-20-1',
   'PROGRAM-SPINE-PROBE', 1);

do $same_spine_probe$
declare
  rejected_constraint text;
begin
  begin
    update public.pilot_qualification_program_outcomes
    set directive_program_id = 'PROGRAM-SPINE-PROBE',
        directive_program_version_no = 1
    where smart_program_id = 'program-smart-alignment-demo'
      and engine_profile_id = 'qualification-engine-2026-08-20-1'
      and outcome_id = 'LO-1';

    if not found then
      raise exception 'canonical smart outcome fixture is missing';
    end if;
    raise exception 'mismatched valid directive spine was accepted by outcome row';
  exception
    when foreign_key_violation then
      get stacked diagnostics rejected_constraint = constraint_name;
      if rejected_constraint <> 'pilot_qualification_outcomes_same_spine_fkey' then
        raise;
      end if;
  end;

  begin
    insert into public.pilot_directive_constructive_alignment_rows
      (id, smart_program_id, engine_profile_id, outcome_id,
       directive_program_id, directive_program_version_no, content_item,
       learning_activity, assessment_task, rubric_reference,
       success_threshold, evidence_requirement, workload_component_type,
       workload_hours)
    values
      ('ALIGN-SPINE-MISMATCH-PROBE', 'program-smart-alignment-demo',
       'qualification-engine-2026-08-20-1', 'LO-1',
       'PROGRAM-SPINE-PROBE', 1,
       'SENTETİK farklı omurga içerik öğesi',
       'SENTETİK farklı omurga öğrenme etkinliği',
       'SENTETİK farklı omurga ölçme görevi',
       'RUBRIC-SPINE-MISMATCH-PROBE',
       'SENTETİK eşik', 'SENTETİK kanıt',
       'project_assignment_portfolio', 1);

    raise exception 'mismatched valid directive spine was accepted by alignment row';
  exception
    when foreign_key_violation then
      get stacked diagnostics rejected_constraint = constraint_name;
      if rejected_constraint <> 'pilot_constructive_alignment_same_spine_outcome_fkey' then
        raise;
      end if;
  end;
end
$same_spine_probe$;

select
  1 as mismatched_valid_outcome_spine_rejected,
  1 as mismatched_valid_alignment_spine_rejected;

rollback;
