import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getLocalDirectivePilotCatalog,
  normalizeDirectivePilotCatalog,
  validateDirectivePilotCatalog
} from "../src/supabase.js";

const migrationPath = new URL("../supabase/migrations/20260820030000_directive_alignment_pilot_schema.sql", import.meta.url);
const rollbackPath = new URL("../supabase/rollback/20260820030000_directive_alignment_pilot_schema.rollback.sql", import.meta.url);
const performanceMigrationPath = new URL("../supabase/migrations/20260820031000_directive_alignment_performance_indexes.sql", import.meta.url);
const performanceRollbackPath = new URL("../supabase/rollback/20260820031000_directive_alignment_performance_indexes.rollback.sql", import.meta.url);
const migration = readFileSync(migrationPath, "utf8");
const rollback = readFileSync(rollbackPath, "utf8");
const performanceMigration = readFileSync(performanceMigrationPath, "utf8");
const performanceRollback = readFileSync(performanceRollbackPath, "utf8");
const performanceSqlBody = performanceMigration.replace(/^--.*$/gm, "");

const expectedTables = [
  "pilot_directive_source_registry",
  "pilot_directive_versions",
  "pilot_directive_rule_parameters",
  "pilot_directive_decision_register",
  "pilot_directive_units",
  "pilot_directive_body_memberships",
  "pilot_directive_programs",
  "pilot_directive_program_versions",
  "pilot_directive_workload_items",
  "pilot_directive_terms",
  "pilot_directive_offerings",
  "pilot_directive_enrollment_queue",
  "pilot_directive_recognition_cases",
  "pilot_directive_recognition_checks",
  "pilot_directive_recognition_decisions",
  "pilot_directive_recognition_appeals",
  "pilot_directive_double_counting_registry",
  "pilot_directive_commission_meetings",
  "pilot_directive_meeting_participants",
  "pilot_directive_commission_votes",
  "pilot_directive_commission_resolutions",
  "pilot_directive_credentials",
  "pilot_directive_credential_revocations",
  "pilot_directive_verification_events",
  "pilot_directive_award_states",
  "pilot_directive_quality_reviews",
  "pilot_directive_sunset_plans",
  "pilot_directive_finance_cases",
  "pilot_directive_rule_evaluations",
  "pilot_directive_audit_events",
  "pilot_directive_outbox"
];

const expectedViews = [
  "pilot_directive_policy_catalog",
  "pilot_directive_rule_catalog",
  "pilot_directive_governance_catalog",
  "pilot_directive_program_compliance_catalog",
  "pilot_directive_recognition_catalog",
  "pilot_directive_commission_catalog",
  "pilot_directive_credential_public_catalog",
  "pilot_directive_award_state_catalog",
  "pilot_directive_quality_finance_catalog",
  "pilot_directive_readiness_catalog"
];

const expectedWorkloadComponents = [
  "synchronous_or_face_to_face",
  "asynchronous_learning",
  "preparation_and_reading",
  "practice_or_laboratory",
  "project_assignment_portfolio",
  "independent_study",
  "assessment",
  "feedback_and_revision"
];

const expectedRecognitionDecisions = [
  "credential_verification_or_recognition",
  "ects_credit_recognition",
  "course_or_requirement_substitution"
];

const expectedRuleFields = [
  "source_clause",
  "effective_from",
  "effective_to",
  "program_type",
  "calculation_basis",
  "numerator",
  "denominator",
  "rounding_rule",
  "exception_rule",
  "interpretation_note",
  "institutional_validation_required"
];

const expectedPerformanceIndexes = new Map([
  ["pilot_directive_commission_meetings_body_unit_id_idx", "pilot_directive_commission_meetings (body_unit_id)"],
  ["pilot_directive_program_versions_program_type_idx", "pilot_directive_program_versions (program_id, program_type)"],
  ["pilot_directive_recognition_checks_rule_parameter_id_idx", "pilot_directive_recognition_checks (rule_parameter_id)"],
  ["pilot_directive_units_parent_unit_id_idx", "pilot_directive_units (parent_unit_id)"]
]);

const tableMatches = [...migration.matchAll(/^create table if not exists public\.(pilot_directive_[a-z_]+) \(/gm)].map((match) => match[1]);
const viewMatches = [...migration.matchAll(/^create or replace view public\.(pilot_directive_[a-z_]+)$/gm)].map((match) => match[1]);
assert.deepEqual(new Set(tableMatches), new Set(expectedTables), "Directive migration table set must remain exact");
assert.deepEqual(new Set(viewMatches), new Set(expectedViews), "Directive migration view set must remain exact");
assert.equal(tableMatches.length, 31, "Directive schema must expose 31 normalized pilot tables");
assert.equal(viewMatches.length, 10, "Directive schema must expose 10 DTO views");

// Replay/idempotency contract: every object and seed is safe to evaluate twice.
assert.equal((migration.match(/^create table if not exists /gm) || []).length, expectedTables.length, "Every table must be IF NOT EXISTS");
assert.equal((migration.match(/^create index if not exists /gm) || []).length >= 24, true, "Foreign-key indexes must be idempotent");
assert.equal((migration.match(/^create or replace view /gm) || []).length, expectedViews.length, "Every view must be CREATE OR REPLACE");
assert.equal((migration.match(/^on conflict /gm) || []).length >= 20, true, "Synthetic seeds must use upsert semantics");

// Advisor-remediation migration must be index-only, replay-safe and exactly
// cover the four foreign-key paths reported by the live performance advisor.
const performanceIndexMatches = [...performanceMigration.matchAll(/^create index if not exists ([a-z0-9_]+)\s+on public\.([a-z0-9_]+ \([^;]+\));$/gm)];
assert.equal(performanceIndexMatches.length, expectedPerformanceIndexes.size, "Performance migration must create exactly four indexes");
assert.deepEqual(new Set(performanceIndexMatches.map((match) => match[1])), new Set(expectedPerformanceIndexes.keys()), "Performance index name set mismatch");
performanceIndexMatches.forEach((match) => {
  assert.equal(match[2].replace(/\s+/g, " ").trim(), expectedPerformanceIndexes.get(match[1]), `Performance index target mismatch: ${match[1]}`);
});
assert.match(performanceMigration, /^begin;/m, "Performance migration must be transactional");
assert.match(performanceMigration, /^commit;/m, "Performance migration must commit explicitly");
assert.doesNotMatch(performanceSqlBody, /\b(?:create|alter|drop)\s+(?:table|view|policy)\b|\b(?:insert|update|delete|grant|revoke)\b/i, "Performance migration must remain index-only");

const performanceRollbackIndexes = [...performanceRollback.matchAll(/^drop index if exists public\.([a-z0-9_]+);$/gm)].map((match) => match[1]);
assert.deepEqual(new Set(performanceRollbackIndexes), new Set(expectedPerformanceIndexes.keys()), "Performance rollback index set must match migration");

// RLS/grants negative contract. One official-reference table is explicit; the
// remaining 30 are covered by the deterministic security loop.
const securityLoopStart = migration.indexOf("do $security$");
const securityLoopEnd = migration.indexOf("$security$;", securityLoopStart) + "$security$;".length;
const securityLoop = migration.slice(securityLoopStart, securityLoopEnd);
const loopTables = [...securityLoop.matchAll(/'((?:pilot_directive_)[a-z_]+)'/g)].map((match) => match[1]);
assert.equal(new Set(loopTables).size, expectedTables.length - 1, "RLS security loop must cover every non-reference table");
assert.match(migration, /alter table public\.pilot_directive_source_registry force row level security;/, "Reference table must FORCE RLS");
assert.match(securityLoop, /force row level security/, "Operational table loop must FORCE RLS");
assert.match(securityLoop, /grant select on table/, "Data API SELECT grant must be explicit");
assert.doesNotMatch(migration, /grant\s+(?:all|insert|update|delete)(?:\s*,[^;]+)?\s+on\s+(?:table\s+)?public\.[^;]+\s+to\s+[^;]*\banon\b/i, "Anon must never receive write grants");
assert.doesNotMatch(migration, /for\s+(?:insert|update|delete|all)\s+to\s+[^;]*\banon\b/i, "Anon must never receive write policies");
assert.equal((migration.match(/with \(security_invoker = true\)/g) || []).length, expectedViews.length, "Every DTO view must be security_invoker");

// Domain contracts required by the directive alignment work.
expectedRuleFields.forEach((field) => assert.match(migration, new RegExp(`\\b${field}\\b`), `Versioned rule field missing: ${field}`));
assert.match(migration, /total_learner_workload_hours >= 25 \* ects and total_learner_workload_hours <= 30 \* ects/, "ECTS-workload band check missing");
expectedWorkloadComponents.forEach((component) => assert.match(migration, new RegExp(`'${component}'`), `Workload component missing: ${component}`));
expectedRecognitionDecisions.forEach((type) => assert.match(migration, new RegExp(`'${type}'`), `Recognition decision type missing: ${type}`));
assert.match(migration, /appellate_body <> original_deciding_body/, "Appeal body independence check missing");
assert.match(migration, /not conflict_declared or recused/, "Conflict recusal check missing");
assert.match(migration, /outcome not in \('approved', 'partially_approved'\) or institutional_validation_confirmed/, "Unvalidated positive recognition outcomes must be blocked");
assert.match(migration, /outcome <> 'approved' or institutional_validation_confirmed/, "Unvalidated commission approvals must be blocked");
assert.match(migration, /role_key <> 'admin' or \(not may_make_academic_decision and not may_make_financial_decision\)/, "System administrator decision restriction missing");
assert.match(migration, /live_dispatch_enabled boolean not null default false check \(not live_dispatch_enabled\)/, "Outbox live-dispatch guard missing");
assert.match(migration, /payment_executed boolean not null default false check \(not payment_executed\)/, "Real-payment guard missing");

const credentialViewStart = migration.indexOf("create or replace view public.pilot_directive_credential_public_catalog");
const credentialViewEnd = migration.indexOf("create or replace view public.pilot_directive_award_state_catalog", credentialViewStart);
const credentialView = migration.slice(credentialViewStart, credentialViewEnd);
assert.doesNotMatch(credentialView, /holder_internal_ref/, "Public credential DTO must not disclose internal holder mapping");
assert.doesNotMatch(credentialView, /tckn|ykn/i, "Public credential DTO must not disclose national identifiers");
assert.match(credentialView, /holder_display_masked/, "Public credential DTO must expose only a masked display label");
assert.doesNotMatch(migration, /\b\d{11}\b/, "Migration must not contain an 11-digit national identifier");
assert.doesNotMatch(migration, /(?:pg_net|net\.http|http_post|dblink|service_role|secret[_-]?key)/i, "Migration must not enable live networking or embed privileged keys");

// Explicit rollback completeness. The set—not only the count—must match.
const rollbackTables = [...rollback.matchAll(/^drop table if exists public\.(pilot_directive_[a-z_]+);$/gm)].map((match) => match[1]);
const rollbackViews = [...rollback.matchAll(/^drop view if exists public\.(pilot_directive_[a-z_]+);$/gm)].map((match) => match[1]);
assert.deepEqual(new Set(rollbackTables), new Set(expectedTables), "Rollback table set must match migration");
assert.deepEqual(new Set(rollbackViews), new Set(expectedViews), "Rollback view set must match migration");

// Adapter/view DTO parity and negative mutations.
const local = getLocalDirectivePilotCatalog();
assert.deepEqual(validateDirectivePilotCatalog(local), [], "Local fallback must satisfy the canonical directive contract");
const normalized = normalizeDirectivePilotCatalog(local, local);
assert.equal(normalized.validationErrors.length, 0, "Normalized local contract must remain valid");
assert.equal(normalized.remoteAccepted, true, "A complete valid view-shaped snapshot must be accepted");

const brokenProductionBoundary = structuredClone(local);
brokenProductionBoundary.readiness[0].productionNoGo = false;
assert.ok(validateDirectivePilotCatalog(brokenProductionBoundary).some((error) => error.includes("NO-GO")), "Production boundary mutation must fail closed");

const brokenRoleScope = structuredClone(local);
brokenRoleScope.governance = brokenRoleScope.governance.filter((row) => row.roleKey !== "finance");
assert.ok(validateDirectivePilotCatalog(brokenRoleScope).some((error) => error.includes("nine-role")), "Missing role scope must fail closed");

const brokenCredential = structuredClone(local);
brokenCredential.publicCredentials[0].holderInternalRef = "SENTETIK-LEAK";
assert.ok(validateDirectivePilotCatalog(brokenCredential).some((error) => error.includes("minimization")), "Internal identity disclosure must fail closed");

const brokenQuorum = structuredClone(local);
brokenQuorum.commission[0].quorumIntegrityValid = false;
assert.ok(validateDirectivePilotCatalog(brokenQuorum).some((error) => error.includes("quorum")), "Quorum inconsistency must fail closed");

const brokenRecognitionValidation = structuredClone(local);
brokenRecognitionValidation.recognitionDecisions[0].outcome = "approved";
assert.ok(validateDirectivePilotCatalog(brokenRecognitionValidation).some((error) => error.includes("unvalidated positive")), "Positive recognition without institutional validation must fail closed");

const brokenCommissionValidation = structuredClone(local);
brokenCommissionValidation.commission[0].outcome = "approved";
assert.ok(validateDirectivePilotCatalog(brokenCommissionValidation).some((error) => error.includes("unvalidated approval")), "Commission approval without institutional validation must fail closed");

const brokenFinance = structuredClone(local);
brokenFinance.qualityFinance[0].paymentExecuted = true;
assert.ok(validateDirectivePilotCatalog(brokenFinance).some((error) => error.includes("real-effect")), "Payment side effect must fail closed");

console.log(`directive pilot contract: PASS (${expectedTables.length} tables, ${expectedViews.length} security-invoker views, anon write denied)`);
