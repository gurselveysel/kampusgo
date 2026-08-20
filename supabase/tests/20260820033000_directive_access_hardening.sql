-- Read-only post-migration acceptance probe. Run only after 33000 is applied.
-- Every assertion returns 1; any failed assertion raises division_by_zero or a
-- permission error. The transaction is always rolled back.

begin;

set local role anon;

-- Anon can see exactly S01-S27 official-source metadata.
select 1 / case when (select count(*) from public.pilot_directive_source_registry) = 27 then 1 else 0 end as anon_source_registry_27;
select 1 / case when (select count(*) from public.pilot_directive_public_source_catalog) = 27 then 1 else 0 end as anon_source_view_27;
select 1 / case when (select count(*) from public.pilot_directive_source_clause_links) = 33 then 1 else 0 end as anon_source_links_33;
select 1 / case when (select count(*) from public.pilot_directive_public_source_support_catalog) = 33 then 1 else 0 end as anon_source_support_view_33;

-- Anon has no table privilege at all on operational objects.
select 1 / case when not has_table_privilege(current_user, 'public.pilot_directive_programs', 'select') then 1 else 0 end as anon_program_select_denied;
select 1 / case when not has_table_privilege(current_user, 'public.pilot_directive_recognition_cases', 'select') then 1 else 0 end as anon_recognition_select_denied;
select 1 / case when not has_table_privilege(current_user, 'public.pilot_directive_commission_meetings', 'select') then 1 else 0 end as anon_commission_select_denied;
select 1 / case when not has_table_privilege(current_user, 'public.pilot_directive_finance_cases', 'select') then 1 else 0 end as anon_finance_select_denied;
select 1 / case when not has_table_privilege(current_user, 'public.pilot_directive_audit_events', 'select') then 1 else 0 end as anon_audit_select_denied;
select 1 / case when not has_table_privilege(current_user, 'public.pilot_directive_program_compliance_catalog', 'select') then 1 else 0 end as anon_old_operational_view_denied;

reset role;
set local role authenticated;

-- A generic authenticated token with no trusted app_metadata claims sees zero.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{}}', true);
select 1 / case when (select count(*) from public.pilot_directive_units) = 0 then 1 else 0 end as generic_authenticated_denied;
select 1 / case when (select count(*) from public.pilot_directive_finance_cases) = 0 then 1 else 0 end as generic_finance_denied;
select 1 / case when (select count(*) from public.pilot_qualification_program_spine_links) = 0 then 1 else 0 end as generic_smart_spine_denied;

-- A scoped finance token can read only its unit/program-linked finance row.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated","app_metadata":{"myys_role":"finance","unit_ids":["UNIT-MALI","UNIT-MYKOORD"],"decision_scopes":["pilot_read"]}}', true);
select 1 / case when (select count(*) from public.pilot_directive_finance_cases) = 1 then 1 else 0 end as scoped_finance_read_allowed;
select 1 / case when (select count(*) from public.pilot_directive_commission_resolutions) = 0 then 1 else 0 end as finance_academic_read_denied;
select 1 / case when not has_table_privilege(current_user, 'public.pilot_directive_finance_cases', 'insert') then 1 else 0 end as finance_write_denied;

-- An instructor with the canonical programme unit can read the linked smart
-- programme/outcome/constructive-alignment spine, but still cannot write it.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000004","role":"authenticated","app_metadata":{"myys_role":"instructor","unit_ids":["UNIT-MYKOORD"],"decision_scopes":["pilot_read"]}}', true);
select 1 / case when (select count(*) from public.pilot_qualification_program_spine_links) = 1 then 1 else 0 end as scoped_instructor_smart_spine_allowed;
select 1 / case when (select count(*) from public.pilot_directive_constructive_alignment_rows) >= 1 then 1 else 0 end as scoped_instructor_alignment_allowed;
select 1 / case when not has_table_privilege(current_user, 'public.pilot_qualification_program_spine_links', 'insert') then 1 else 0 end as instructor_smart_write_denied;

-- Admin is technical/configuration-only: audit allowed, academic/finance denied.
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated","app_metadata":{"myys_role":"admin","unit_ids":["UNIT-DPU","UNIT-BIDB"],"decision_scopes":["pilot_read","configuration_only"]}}', true);
select 1 / case when (select count(*) from public.pilot_directive_audit_events) >= 1 then 1 else 0 end as scoped_admin_audit_allowed;
select 1 / case when (select count(*) from public.pilot_directive_programs) = 0 then 1 else 0 end as admin_academic_read_denied;
select 1 / case when (select count(*) from public.pilot_directive_finance_cases) = 0 then 1 else 0 end as admin_finance_read_denied;
select 1 / case when not has_table_privilege(current_user, 'public.pilot_directive_audit_events', 'insert') then 1 else 0 end as admin_write_denied;

reset role;
rollback;
