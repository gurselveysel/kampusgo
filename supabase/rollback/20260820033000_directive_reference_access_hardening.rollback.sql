-- Roll back only migration 20260820033000.
-- This intentionally restores the 20260820030000 anonymous synthetic-read
-- posture; apply the forward hardening migration again for the stricter model.

begin;

drop view if exists public.pilot_directive_appeal_integrity_catalog;
drop view if exists public.pilot_directive_credential_lifecycle_catalog;
drop view if exists public.pilot_directive_role_scope_catalog;
drop view if exists public.pilot_directive_public_source_support_catalog;
drop view if exists public.pilot_directive_public_source_catalog;

-- Remove scoped-policy dependencies and restore the predecessor policy/grants.
do $restore_security$
declare
  table_name text;
begin
  foreach table_name in array array[
    'pilot_directive_versions',
    'pilot_directive_rule_parameters',
    'pilot_directive_decision_register',
    'pilot_directive_units',
    'pilot_directive_body_memberships',
    'pilot_directive_programs',
    'pilot_directive_program_versions',
    'pilot_directive_workload_items',
    'pilot_directive_terms',
    'pilot_directive_offerings',
    'pilot_directive_enrollment_queue',
    'pilot_directive_recognition_cases',
    'pilot_directive_recognition_checks',
    'pilot_directive_recognition_decisions',
    'pilot_directive_recognition_appeals',
    'pilot_directive_double_counting_registry',
    'pilot_directive_commission_meetings',
    'pilot_directive_meeting_participants',
    'pilot_directive_commission_votes',
    'pilot_directive_commission_resolutions',
    'pilot_directive_credentials',
    'pilot_directive_credential_revocations',
    'pilot_directive_verification_events',
    'pilot_directive_award_states',
    'pilot_directive_quality_reviews',
    'pilot_directive_sunset_plans',
    'pilot_directive_finance_cases',
    'pilot_directive_rule_evaluations',
    'pilot_directive_audit_events',
    'pilot_directive_outbox'
  ]
  loop
    execute format('revoke all on table public.%I from public, anon, authenticated', table_name);
    execute format('grant select on table public.%I to anon, authenticated', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_synthetic_read', table_name);
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (is_synthetic = true and institutional_validation_required = true and production_allowed = false and real_system_effect = false)',
      table_name || '_synthetic_read', table_name
    );
  end loop;
end
$restore_security$;

do $restore_views$
declare
  view_name text;
begin
  foreach view_name in array array[
    'pilot_directive_policy_catalog',
    'pilot_directive_rule_catalog',
    'pilot_directive_governance_catalog',
    'pilot_directive_program_compliance_catalog',
    'pilot_directive_recognition_catalog',
    'pilot_directive_commission_catalog',
    'pilot_directive_credential_public_catalog',
    'pilot_directive_award_state_catalog',
    'pilot_directive_quality_finance_catalog',
    'pilot_directive_readiness_catalog'
  ]
  loop
    execute format('revoke all on table public.%I from public, anon, authenticated', view_name);
    execute format('grant select on table public.%I to anon, authenticated', view_name);
  end loop;
end
$restore_views$;

-- Restore migration 32000's predecessor authenticated policies.
drop policy if exists pilot_qualification_program_spine_authenticated_read on public.pilot_qualification_program_spine_links;
create policy pilot_qualification_program_spine_authenticated_read
on public.pilot_qualification_program_spine_links for select to authenticated
using (is_synthetic and institutional_validation_required and not production_allowed and not real_system_effect);

drop policy if exists pilot_qualification_program_outcomes_authenticated_read on public.pilot_qualification_program_outcomes;
create policy pilot_qualification_program_outcomes_authenticated_read
on public.pilot_qualification_program_outcomes for select to authenticated
using (is_synthetic and institutional_validation_required and not production_allowed and not real_system_effect);

drop policy if exists pilot_tyyc_type_candidates_authenticated_read on public.pilot_learning_outcome_tyyc_type_candidates;
create policy pilot_tyyc_type_candidates_authenticated_read
on public.pilot_learning_outcome_tyyc_type_candidates for select to authenticated
using (is_synthetic and institutional_validation_required and not autonomous_decision and not real_system_effect);

drop policy if exists pilot_constructive_alignment_authenticated_read on public.pilot_directive_constructive_alignment_rows;
create policy pilot_constructive_alignment_authenticated_read
on public.pilot_directive_constructive_alignment_rows for select to authenticated
using (is_synthetic and institutional_validation_required and not production_allowed and not real_system_effect);

drop policy if exists pilot_directive_source_public_read on public.pilot_directive_source_registry;
drop policy if exists pilot_directive_source_authenticated_read on public.pilot_directive_source_registry;
create policy pilot_directive_source_public_read
on public.pilot_directive_source_registry for select to anon, authenticated
using (public_reference and not production_allowed and not real_system_effect);

drop policy if exists pilot_directive_source_links_public_read on public.pilot_directive_source_clause_links;
revoke all on table public.pilot_directive_source_clause_links from public, anon, authenticated;
drop policy if exists pilot_directive_appeal_panel_members_synthetic_read on public.pilot_directive_appeal_panel_members;
revoke all on table public.pilot_directive_appeal_panel_members from public, anon, authenticated;

drop function if exists public.pilot_directive_has_read_claim(text[], text);
drop function if exists public.pilot_directive_has_unit_claim(text);

drop trigger if exists pilot_directive_program_workload_integrity on public.pilot_directive_program_versions;
drop trigger if exists pilot_directive_workload_item_integrity on public.pilot_directive_workload_items;
drop trigger if exists pilot_directive_credential_lifecycle_integrity on public.pilot_directive_credentials;
drop trigger if exists pilot_directive_revocation_lifecycle_integrity on public.pilot_directive_credential_revocations;
drop trigger if exists pilot_directive_appeal_state_panel_integrity on public.pilot_directive_recognition_appeals;
drop trigger if exists pilot_directive_appeal_member_panel_integrity on public.pilot_directive_appeal_panel_members;
drop trigger if exists pilot_directive_appeal_membership_unit_integrity on public.pilot_directive_body_memberships;
drop trigger if exists pilot_directive_audit_outbox_integrity on public.pilot_directive_audit_events;
drop trigger if exists pilot_directive_outbox_audit_integrity on public.pilot_directive_outbox;

drop function if exists public.pilot_enforce_directive_workload();
drop function if exists public.pilot_assert_directive_workload(text, integer);
drop function if exists public.pilot_enforce_credential_lifecycle();
drop function if exists public.pilot_assert_credential_lifecycle(text);
drop function if exists public.pilot_enforce_appeal_panel();
drop function if exists public.pilot_enforce_appeal_membership_unit();
drop function if exists public.pilot_assert_appeal_panel(text);
drop function if exists public.pilot_enforce_audit_outbox();
drop function if exists public.pilot_assert_audit_outbox(text);

drop index if exists public.pilot_directive_outbox_audit_event_unique_idx;

update public.pilot_directive_credential_revocations
set replacement_credential_id = null
where replacement_credential_id = 'CRED-V2-REISSUE';

delete from public.pilot_directive_credentials where id = 'CRED-V2-REISSUE';
delete from public.pilot_directive_appeal_panel_members where appeal_id = 'REC-APPEAL-001';
drop table if exists public.pilot_directive_appeal_panel_members;

delete from public.pilot_directive_body_memberships where id = 'MEM-APPEAL-REVIEWER';
delete from public.pilot_directive_units where id = 'UNIT-EOK';

alter table public.pilot_directive_recognition_appeals
  drop constraint if exists pilot_directive_appeals_notification_deadline_check,
  drop constraint if exists pilot_directive_appeals_decision_state_check,
  drop column if exists notified_at,
  drop column if exists filing_deadline_at,
  drop column if exists review_started_at,
  drop column if exists decided_at,
  drop column if exists notification_channel,
  drop column if exists deadline_rule_status,
  drop column if exists original_panel_reference,
  drop column if exists appellate_panel_reference;

alter table public.pilot_directive_credentials
  drop constraint if exists pilot_directive_credentials_masked_no_digits_check,
  drop constraint if exists pilot_directive_credentials_public_text_no_national_id_check,
  drop constraint if exists pilot_directive_credentials_retention_check,
  drop constraint if exists pilot_directive_credentials_reissue_check,
  drop column if exists retention_until,
  drop column if exists retention_policy_status,
  drop column if exists correction_of_credential_id,
  drop column if exists reissued_at,
  drop column if exists reissue_reason,
  drop column if exists lifecycle_version;

alter table public.pilot_directive_audit_events
  drop column if exists outbox_required;

drop table if exists public.pilot_directive_source_clause_links;

delete from public.pilot_directive_source_registry
where id ~ '^S(0[1-9]|1[0-9]|2[0-7])$';

alter table public.pilot_directive_source_registry
  drop constraint if exists pilot_directive_source_date_label_check,
  drop column if exists source_date_label;

commit;
