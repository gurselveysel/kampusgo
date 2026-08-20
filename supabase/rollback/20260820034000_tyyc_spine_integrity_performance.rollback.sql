-- Explicit down migration for 34000. DESTRUCTIVE: use only on a disposable
-- branch/local database after all dependent objects have been removed.

begin;

alter table public.pilot_directive_constructive_alignment_rows
  drop constraint if exists pilot_constructive_alignment_same_spine_outcome_fkey;
alter table public.pilot_qualification_program_outcomes
  drop constraint if exists pilot_qualification_outcomes_same_spine_fkey;
alter table public.pilot_qualification_program_outcomes
  drop constraint if exists pilot_qualification_outcomes_same_spine_key;
alter table public.pilot_qualification_program_spine_links
  drop constraint if exists pilot_qualification_spine_same_version_key;

drop index if exists public.qualification_tyyc_type_framework_fk_idx;
drop index if exists public.pilot_directive_source_links_version_fk_idx;
drop index if exists public.pilot_directive_credentials_correction_fk_idx;
drop index if exists public.pilot_constructive_alignment_workload_fk_idx;
drop index if exists public.pilot_constructive_alignment_same_spine_outcome_idx;
drop index if exists public.pilot_qualification_outcomes_same_spine_fk_idx;
drop index if exists public.pilot_learning_outcome_suggestions_program_outcome_idx;

commit;
