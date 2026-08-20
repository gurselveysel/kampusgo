-- Explicit down migration for the controlled-pilot directive alignment schema.
-- DESTRUCTIVE: run only on a disposable Supabase branch/local database after
-- confirming that the 20260820030000 migration is the intended target.

begin;

drop view if exists public.pilot_directive_readiness_catalog;
drop view if exists public.pilot_directive_quality_finance_catalog;
drop view if exists public.pilot_directive_award_state_catalog;
drop view if exists public.pilot_directive_credential_public_catalog;
drop view if exists public.pilot_directive_commission_catalog;
drop view if exists public.pilot_directive_recognition_catalog;
drop view if exists public.pilot_directive_program_compliance_catalog;
drop view if exists public.pilot_directive_governance_catalog;
drop view if exists public.pilot_directive_rule_catalog;
drop view if exists public.pilot_directive_policy_catalog;

drop table if exists public.pilot_directive_outbox;
drop table if exists public.pilot_directive_audit_events;
drop table if exists public.pilot_directive_rule_evaluations;
drop table if exists public.pilot_directive_finance_cases;
drop table if exists public.pilot_directive_sunset_plans;
drop table if exists public.pilot_directive_quality_reviews;
drop table if exists public.pilot_directive_award_states;
drop table if exists public.pilot_directive_verification_events;
drop table if exists public.pilot_directive_credential_revocations;
drop table if exists public.pilot_directive_credentials;
drop table if exists public.pilot_directive_commission_resolutions;
drop table if exists public.pilot_directive_commission_votes;
drop table if exists public.pilot_directive_meeting_participants;
drop table if exists public.pilot_directive_commission_meetings;
drop table if exists public.pilot_directive_double_counting_registry;
drop table if exists public.pilot_directive_recognition_appeals;
drop table if exists public.pilot_directive_recognition_decisions;
drop table if exists public.pilot_directive_recognition_checks;
drop table if exists public.pilot_directive_recognition_cases;
drop table if exists public.pilot_directive_enrollment_queue;
drop table if exists public.pilot_directive_offerings;
drop table if exists public.pilot_directive_terms;
drop table if exists public.pilot_directive_workload_items;
drop table if exists public.pilot_directive_program_versions;
drop table if exists public.pilot_directive_programs;
drop table if exists public.pilot_directive_body_memberships;
drop table if exists public.pilot_directive_units;
drop table if exists public.pilot_directive_decision_register;
drop table if exists public.pilot_directive_rule_parameters;
drop table if exists public.pilot_directive_versions;
drop table if exists public.pilot_directive_source_registry;

commit;
