-- Foreign-key support indexes for the controlled-pilot directive schema.
-- This migration changes no data, RLS policy, grant, view or production flag.

begin;

create index if not exists pilot_directive_commission_meetings_body_unit_id_idx
  on public.pilot_directive_commission_meetings (body_unit_id);

create index if not exists pilot_directive_program_versions_program_type_idx
  on public.pilot_directive_program_versions (program_id, program_type);

create index if not exists pilot_directive_recognition_checks_rule_parameter_id_idx
  on public.pilot_directive_recognition_checks (rule_parameter_id);

create index if not exists pilot_directive_units_parent_unit_id_idx
  on public.pilot_directive_units (parent_unit_id);

commit;
