-- KDPÜ MYYS controlled pilot: close the canonical smart/directive spine as a
-- single relational tuple and cover every foreign-key access path reported by
-- the post-32000/33000 performance advisor. Additive only; Production NO-GO.

begin;

-- A smart programme/profile pair and its directive programme/version pair are
-- one canonical mapping. The four-column key is the target for outcome rows.
do $spine_key$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pilot_qualification_spine_same_version_key'
      and conrelid = 'public.pilot_qualification_program_spine_links'::regclass
  ) then
    alter table public.pilot_qualification_program_spine_links
      add constraint pilot_qualification_spine_same_version_key
      unique (
        smart_program_id,
        engine_profile_id,
        directive_program_id,
        directive_program_version_no
      );
  end if;
end
$spine_key$;

do $outcome_spine_fk$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pilot_qualification_outcomes_same_spine_fkey'
      and conrelid = 'public.pilot_qualification_program_outcomes'::regclass
  ) then
    alter table public.pilot_qualification_program_outcomes
      add constraint pilot_qualification_outcomes_same_spine_fkey
      foreign key (
        smart_program_id,
        engine_profile_id,
        directive_program_id,
        directive_program_version_no
      )
      references public.pilot_qualification_program_spine_links (
        smart_program_id,
        engine_profile_id,
        directive_program_id,
        directive_program_version_no
      )
      on update cascade on delete cascade;
  end if;
end
$outcome_spine_fk$;

-- Preserve the outcome identity and its canonical directive mapping as one
-- candidate key. The constructive-alignment chain must reference this tuple.
do $outcome_spine_key$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pilot_qualification_outcomes_same_spine_key'
      and conrelid = 'public.pilot_qualification_program_outcomes'::regclass
  ) then
    alter table public.pilot_qualification_program_outcomes
      add constraint pilot_qualification_outcomes_same_spine_key
      unique (
        smart_program_id,
        engine_profile_id,
        outcome_id,
        directive_program_id,
        directive_program_version_no
      );
  end if;
end
$outcome_spine_key$;

do $alignment_spine_fk$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pilot_constructive_alignment_same_spine_outcome_fkey'
      and conrelid = 'public.pilot_directive_constructive_alignment_rows'::regclass
  ) then
    alter table public.pilot_directive_constructive_alignment_rows
      add constraint pilot_constructive_alignment_same_spine_outcome_fkey
      foreign key (
        smart_program_id,
        engine_profile_id,
        outcome_id,
        directive_program_id,
        directive_program_version_no
      )
      references public.pilot_qualification_program_outcomes (
        smart_program_id,
        engine_profile_id,
        outcome_id,
        directive_program_id,
        directive_program_version_no
      )
      on update cascade on delete cascade;
  end if;
end
$alignment_spine_fk$;

-- Foreign-key covering indexes. The five-column constructive index also
-- covers its pre-existing (smart_program_id, engine_profile_id, outcome_id)
-- foreign key by left prefix. The outcome four-column index prevents the new
-- same-spine FK from introducing a fresh advisor regression.
create index if not exists pilot_learning_outcome_suggestions_program_outcome_idx
  on public.pilot_learning_outcome_suggestions
    (program_id, engine_profile_id, outcome_id);

create index if not exists pilot_qualification_outcomes_same_spine_fk_idx
  on public.pilot_qualification_program_outcomes
    (smart_program_id, engine_profile_id, directive_program_id, directive_program_version_no);

create index if not exists pilot_constructive_alignment_same_spine_outcome_idx
  on public.pilot_directive_constructive_alignment_rows
    (smart_program_id, engine_profile_id, outcome_id, directive_program_id, directive_program_version_no);

create index if not exists pilot_constructive_alignment_workload_fk_idx
  on public.pilot_directive_constructive_alignment_rows
    (directive_program_id, directive_program_version_no, workload_component_type);

create index if not exists pilot_directive_credentials_correction_fk_idx
  on public.pilot_directive_credentials (correction_of_credential_id);

create index if not exists pilot_directive_source_links_version_fk_idx
  on public.pilot_directive_source_clause_links (directive_version_id);

create index if not exists qualification_tyyc_type_framework_fk_idx
  on public.qualification_tyyc_type_descriptors (framework_id);

comment on constraint pilot_qualification_outcomes_same_spine_fkey
  on public.pilot_qualification_program_outcomes is
  'Bir akıllı öneri çıktısı yalnız kendi kanonik yönerge programı/sürümü ile eşleşebilir.';

comment on constraint pilot_constructive_alignment_same_spine_outcome_fkey
  on public.pilot_directive_constructive_alignment_rows is
  'İçerik-ölçme-kanıt-iş yükü satırı, aynı akıllı çıktı ve aynı yönerge programı/sürümü omurgasına bağlıdır.';

commit;
