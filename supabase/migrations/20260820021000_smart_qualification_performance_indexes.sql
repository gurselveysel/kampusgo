begin;

-- Composite child-side index for the five-column suggestion provenance FK.
-- This keeps override-to-suggestion joins and parent updates/deletes index-backed
-- without changing RLS, grants, policies, or the controlled-pilot data model.
create index if not exists pilot_qualification_manual_override_suggestion_provenance_idx
  on public.pilot_qualification_manual_override_examples
    (suggestion_id, outcome_id, framework_id, computed_level, computed_dimension);

commit;
