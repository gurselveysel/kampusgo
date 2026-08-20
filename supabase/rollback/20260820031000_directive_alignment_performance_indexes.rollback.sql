-- Down migration for 20260820031000. Index removal does not alter pilot data.

begin;

drop index if exists public.pilot_directive_units_parent_unit_id_idx;
drop index if exists public.pilot_directive_recognition_checks_rule_parameter_id_idx;
drop index if exists public.pilot_directive_program_versions_program_type_idx;
drop index if exists public.pilot_directive_commission_meetings_body_unit_id_idx;

commit;
