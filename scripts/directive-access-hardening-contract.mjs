import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  getLocalDirectivePilotCatalog,
  normalizeDirectivePilotCatalog,
  validateDirectivePilotCatalog
} from "../src/supabase.js";
import { directiveRoleScopeRows, organizationScopes } from "../src/directive-pilot.js";

const migration = readFileSync(new URL("../supabase/migrations/20260820033000_directive_reference_access_hardening.sql", import.meta.url), "utf8");
const rollback = readFileSync(new URL("../supabase/rollback/20260820033000_directive_reference_access_hardening.rollback.sql", import.meta.url), "utf8");
const sqlAcceptance = readFileSync(new URL("../supabase/tests/20260820033000_directive_access_hardening.sql", import.meta.url), "utf8");
const spineIntegrity = readFileSync(new URL("../supabase/migrations/20260820034000_tyyc_spine_integrity_performance.sql", import.meta.url), "utf8");
const spineIntegrityRollback = readFileSync(new URL("../supabase/rollback/20260820034000_tyyc_spine_integrity_performance.rollback.sql", import.meta.url), "utf8");
const spineIntegrityAcceptance = readFileSync(new URL("../supabase/tests/20260820034000_tyyc_spine_integrity.sql", import.meta.url), "utf8");
const migrationSqlBody = migration.replace(/^--.*$/gm, "");
const sources = JSON.parse(readFileSync(new URL("../supabase/reference/directive_official_sources.json", import.meta.url), "utf8")).sources;
const adapter = readFileSync(new URL("../src/supabase.js", import.meta.url), "utf8");

function assertSqlLexicallyBalanced(sql, label) {
  let index = 0;
  let parentheses = 0;
  let state = "code";
  let dollarTag = "";
  while (index < sql.length) {
    const next = sql.slice(index, index + 2);
    const char = sql[index];
    if (state === "line_comment") {
      if (char === "\n") state = "code";
      index += 1;
      continue;
    }
    if (state === "block_comment") {
      if (next === "*/") { state = "code"; index += 2; } else index += 1;
      continue;
    }
    if (state === "single_quote") {
      if (next === "''") index += 2;
      else if (char === "'") { state = "code"; index += 1; }
      else index += 1;
      continue;
    }
    if (state === "double_quote") {
      if (next === "\"\"") index += 2;
      else if (char === "\"") { state = "code"; index += 1; }
      else index += 1;
      continue;
    }
    if (state === "dollar_quote") {
      if (sql.startsWith(dollarTag, index)) { state = "code"; index += dollarTag.length; }
      else index += 1;
      continue;
    }
    if (next === "--") { state = "line_comment"; index += 2; continue; }
    if (next === "/*") { state = "block_comment"; index += 2; continue; }
    if (char === "'") { state = "single_quote"; index += 1; continue; }
    if (char === "\"") { state = "double_quote"; index += 1; continue; }
    if (char === "$") {
      const match = sql.slice(index).match(/^\$[a-z_][a-z0-9_]*\$/i);
      if (match) { dollarTag = match[0]; state = "dollar_quote"; index += dollarTag.length; continue; }
    }
    if (char === "(") parentheses += 1;
    if (char === ")") parentheses -= 1;
    assert.ok(parentheses >= 0, `${label}: closing parenthesis without opener at byte ${index}`);
    index += 1;
  }
  assert.equal(state, "code", `${label}: unterminated SQL lexical state ${state}`);
  assert.equal(parentheses, 0, `${label}: unbalanced SQL parentheses`);
}

assertSqlLexicallyBalanced(migration, "forward migration");
assertSqlLexicallyBalanced(rollback, "rollback migration");
assertSqlLexicallyBalanced(sqlAcceptance, "SQL acceptance probe");
assertSqlLexicallyBalanced(spineIntegrity, "same-spine integrity migration");
assertSqlLexicallyBalanced(spineIntegrityRollback, "same-spine integrity rollback");
assertSqlLexicallyBalanced(spineIntegrityAcceptance, "same-spine SQL acceptance probe");

for (const [index, columns] of [
  ["pilot_learning_outcome_suggestions_program_outcome_idx", "program_id, engine_profile_id, outcome_id"],
  ["pilot_qualification_outcomes_same_spine_fk_idx", "smart_program_id, engine_profile_id, directive_program_id, directive_program_version_no"],
  ["pilot_constructive_alignment_same_spine_outcome_idx", "smart_program_id, engine_profile_id, outcome_id, directive_program_id, directive_program_version_no"],
  ["pilot_constructive_alignment_workload_fk_idx", "directive_program_id, directive_program_version_no, workload_component_type"],
  ["pilot_directive_credentials_correction_fk_idx", "correction_of_credential_id"],
  ["pilot_directive_source_links_version_fk_idx", "directive_version_id"],
  ["qualification_tyyc_type_framework_fk_idx", "framework_id"]
]) {
  assert.match(spineIntegrity, new RegExp(`create index if not exists ${index}[\\s\\S]*?\\(${columns.replaceAll(" ", "\\s*")}\\)`), `Exact FK index signature missing: ${index}`);
  assert.match(spineIntegrityRollback, new RegExp(`drop index if exists public\\.${index}`), `FK index rollback missing: ${index}`);
}
assert.match(spineIntegrityAcceptance, /when foreign_key_violation/g, "Same-spine probe must use explicit FK-negative assertions");
assert.equal((spineIntegrityAcceptance.match(/when foreign_key_violation/g) || []).length, 2, "Same-spine probe must reject both outcome and alignment mismatches");
assert.match(spineIntegrityAcceptance, /^rollback;$/m, "Same-spine probe must be rollback-only");

const expectedSourceIds = Array.from({ length: 27 }, (_, index) => `S${String(index + 1).padStart(2, "0")}`);
const sourceSeedIds = [...migration.matchAll(/^\s*\('(S\d{2})', 'directive_primary_s\d{2}',/gm)].map((match) => match[1]);
assert.deepEqual(sourceSeedIds, expectedSourceIds, "S01-S27 source seed order/count must be exact");
assert.equal(sources.length, 27, "Authoritative workstream inventory must contain 27 sources");

const sqlString = (value) => String(value).replaceAll("'", "''");
for (const source of sources) {
  assert.ok(migration.includes(`('${source.id}', 'directive_primary_${source.id.toLowerCase()}', '${sqlString(source.title)}', '${sqlString(source.institution)}'`), `${source.id} title/institution metadata mismatch`);
  assert.ok(migration.includes(`'${sqlString(source.version)}'`), `${source.id} version/decision metadata missing`);
  assert.ok(migration.includes(`'${sqlString(source.url)}'`), `${source.id} official URL missing`);
  assert.ok(migration.includes(`'${sqlString(JSON.stringify(source.supports))}'`), `${source.id} support scope mismatch`);
  const hash = createHash("sha256").update(source.url).digest("hex");
  assert.ok(migration.includes(`sha256:${hash}`), `${source.id} canonical URL hash mismatch`);
  assert.match(migration, new RegExp(`when '${source.id}' then '${sqlString(source.date)}'`), `${source.id} exact date label missing`);
}

assert.match(migration, /create table if not exists public\.pilot_directive_source_clause_links/, "Source-clause/rule FK join table missing");
assert.match(migration, /source_id text not null references public\.pilot_directive_source_registry/, "Source link FK missing");
assert.match(migration, /rule_parameter_id text references public\.pilot_directive_rule_parameters/, "Rule link FK missing");
assert.equal((migration.match(/^\s*\('SOURCE-LINK-' \|\|/gm) || []).length, 0, "Dynamic source link seed must remain a SELECT, not malformed VALUES");
assert.match(migration, /from public\.pilot_directive_source_registry s\s+where s\.id ~ '\^S\(0\[1-9\]\|1\[0-9\]\|2\[0-7\]\)\$'/, "All S01-S27 rows must receive traceability links");
assert.equal((migration.match(/^\s*\('SOURCE-RULE-/gm) || []).length, 6, "Six explicit rule-support links expected");

const newViews = [
  "pilot_directive_public_source_catalog",
  "pilot_directive_public_source_support_catalog",
  "pilot_directive_role_scope_catalog",
  "pilot_directive_credential_lifecycle_catalog",
  "pilot_directive_appeal_integrity_catalog"
];
for (const view of newViews) {
  assert.match(migration, new RegExp(`create or replace view public\\.${view}\\nwith \\(security_invoker = true\\)`), `${view} must be security_invoker`);
  assert.match(rollback, new RegExp(`drop view if exists public\\.${view};`), `${view} rollback missing`);
}
assert.equal((migration.match(/with \(security_invoker = true\)/g) || []).length, 5, "Follow-up must add exactly five security-invoker views");

const scopedStart = migration.indexOf("do $scoped_security$");
const scopedEnd = migration.indexOf("$scoped_security$;", scopedStart) + "$scoped_security$;".length;
const scopedBlock = migration.slice(scopedStart, scopedEnd);
assert.ok(scopedStart >= 0 && scopedEnd > scopedStart, "Scoped RLS block missing");
const scopedSpecs = [...scopedBlock.matchAll(/^\s*\('(pilot_directive_[a-z_]+)', '\{([^}]*)\}', '([^']*)'\),?$/gm)].map((match) => ({
  table: match[1],
  roles: match[2].split(","),
  unitPredicate: match[3]
}));
assert.equal(scopedSpecs.length, 31, "Every operational directive table, including appeal panels, needs one scoped policy spec");
assert.equal(new Set(scopedSpecs.map((item) => item.table)).size, 31, "Scoped policy table list must be unique");
assert.doesNotMatch(scopedBlock, /to anon|to anon, authenticated|grant select[^;]+anon/i, "Anon must not receive operational access");
assert.match(scopedBlock, /grant select on table public\.%I to authenticated/, "Authenticated access must remain explicit SELECT-only");
assert.match(scopedBlock, /pilot_directive_has_read_claim\(%L::text\[\], %L\)/, "Every operational policy must call the trusted role/scope claim gate");
assert.match(scopedBlock, /pilot_directive_has_unit_claim/, "Unit/body/member relational scope predicates are required");

const adminTables = scopedSpecs.filter((item) => item.roles.includes("admin")).map((item) => item.table).sort();
assert.deepEqual(adminTables, [
  "pilot_directive_audit_events",
  "pilot_directive_body_memberships",
  "pilot_directive_outbox",
  "pilot_directive_units"
], "System administrator must be excluded from academic and finance operational tables");
assert.deepEqual(scopedSpecs.find((item) => item.table === "pilot_directive_finance_cases")?.roles, ["finance"], "Finance cases must be finance-role scoped");
const smartScopedPolicies = [
  "pilot_qualification_program_spine_authenticated_read",
  "pilot_qualification_program_outcomes_authenticated_read",
  "pilot_tyyc_type_candidates_authenticated_read",
  "pilot_constructive_alignment_authenticated_read"
];
for (const policy of smartScopedPolicies) {
  const policyStart = migration.indexOf(`create policy ${policy}`);
  const policyEnd = migration.indexOf(";", policyStart) + 1;
  const policySql = migration.slice(policyStart, policyEnd);
  assert.ok(policyStart >= 0, `Smart/directive spine policy missing: ${policy}`);
  assert.match(policySql, /for select to authenticated/, `${policy} must remain authenticated SELECT-only`);
  assert.match(policySql, /pilot_directive_has_read_claim/, `${policy} must deny generic authenticated tokens`);
  assert.match(policySql, /pilot_directive_has_unit_claim/, `${policy} must enforce organizational unit scope`);
}
assert.equal(scopedSpecs.length + smartScopedPolicies.length, 35, "Hardening must replace 35 operational read policies in total");

const claimFunctionStart = migration.indexOf("create or replace function public.pilot_directive_has_read_claim");
const claimFunctionEnd = migration.indexOf("$claim_check$;", claimFunctionStart) + "$claim_check$;".length;
const claimFunction = migration.slice(claimFunctionStart, claimFunctionEnd);
for (const claim of ["auth.uid()", "'app_metadata'", "'myys_role'", "'decision_scopes'"]) {
  assert.ok(claimFunction.includes(claim), `Trusted JWT claim gate missing ${claim}`);
}
assert.doesNotMatch(claimFunction, /user_metadata/, "Authorization must never use user_metadata");
assert.match(migration, /'app_metadata' -> 'unit_ids'/, "Unit scope must come from trusted app_metadata");
assert.match(migration, /revoke all on function public\.pilot_directive_has_read_claim\(text\[\], text\) from public, anon, authenticated/, "Claim helper must not be anonymously executable");
assert.doesNotMatch(migrationSqlBody, /security definer/i, "Directive hardening must not use SECURITY DEFINER");

const anonTableGrants = [...migration.matchAll(/^grant select on table public\.(pilot_directive_[a-z_]+) to anon, authenticated;$/gm)].map((match) => match[1]).sort();
assert.deepEqual(anonTableGrants, [
  "pilot_directive_source_clause_links",
  "pilot_directive_source_registry"
], "Anonymous underlying-table allowlist must contain only two official reference metadata tables");
assert.match(migration, /create policy pilot_directive_source_public_read\s+on public\.pilot_directive_source_registry for select to anon\s+using \(\s+id ~ '\^S\(0\[1-9\]\|1\[0-9\]\|2\[0-7\]\)\$'/, "Anon source registry policy must filter out non-S01-S27 rows");
assert.match(migration, /and official_primary_source/, "Anon source registry policy must require an official primary source");
const sourceLinkPolicyStart = migration.indexOf("create policy pilot_directive_source_links_public_read");
const sourceLinkPolicyEnd = migration.indexOf(";", sourceLinkPolicyStart) + 1;
const sourceLinkPolicy = migration.slice(sourceLinkPolicyStart, sourceLinkPolicyEnd);
assert.ok(sourceLinkPolicyStart >= 0, "Anon source-link policy missing");
assert.match(sourceLinkPolicy, /exists \(/, "Anon source links must be authorized through their linked source row");
assert.match(sourceLinkPolicy, /source\.id ~ '\^S\(0\[1-9\]\|1\[0-9\]\|2\[0-7\]\)\$'/, "Anon source links must be restricted to S01-S27");
assert.match(sourceLinkPolicy, /source\.official_primary_source/, "Anon source links must require official primary-source metadata");
const publicSupportViewStart = migration.indexOf("create or replace view public.pilot_directive_public_source_support_catalog");
const publicSupportViewEnd = migration.indexOf(";", publicSupportViewStart) + 1;
const publicSupportView = migration.slice(publicSupportViewStart, publicSupportViewEnd);
assert.match(publicSupportView, /s\.id ~ '\^S\(0\[1-9\]\|1\[0-9\]\|2\[0-7\]\)\$'/, "Public support view must be restricted to S01-S27");
assert.match(publicSupportView, /s\.official_primary_source/, "Public support view must require official primary sources");
const anonViews = ["pilot_directive_public_source_catalog", "pilot_directive_public_source_support_catalog"];
const publicViewGrantStart = migration.indexOf("foreach view_name in array array[\n    'pilot_directive_public_source_catalog'");
const publicViewGrantEnd = migration.indexOf("]\n  loop", publicViewGrantStart);
const publicViewGrantBlock = migration.slice(publicViewGrantStart, publicViewGrantEnd);
assert.ok(publicViewGrantStart >= 0, "Anonymous public-view allowlist block missing");
assert.deepEqual([...publicViewGrantBlock.matchAll(/'([^']+)'/g)].map((match) => match[1]), anonViews, "Anonymous view allowlist must contain exactly two source catalogs");
assert.doesNotMatch(migration, /grant\s+(?:all|insert|update|delete)[^;]*\b(?:anon|authenticated)\b/i, "No API role may receive write grants");
assert.doesNotMatch(migration, /for\s+(?:insert|update|delete|all)\s+to\s+(?:anon|authenticated)/i, "No API role may receive write policies");
for (const requiredProbe of [
  "anon_source_registry_27", "anon_source_links_33", "anon_source_support_view_33",
  "anon_old_operational_view_denied", "anon_program_select_denied", "generic_authenticated_denied",
  "generic_smart_spine_denied", "scoped_instructor_smart_spine_allowed",
  "scoped_instructor_alignment_allowed",
  "scoped_finance_read_allowed", "finance_academic_read_denied",
  "scoped_admin_audit_allowed", "admin_academic_read_denied", "admin_finance_read_denied"
]) assert.ok(sqlAcceptance.includes(requiredProbe), `SQL acceptance probe missing: ${requiredProbe}`);
assert.match(sqlAcceptance, /request\.jwt\.claims/, "SQL acceptance probe must exercise trusted JWT claims");
assert.match(sqlAcceptance, /^rollback;$/m, "SQL acceptance probe must leave no persistent change");

for (const field of ["retention_until", "correction_of_credential_id", "reissued_at", "reissue_reason", "replacement_credential_id"]) {
  assert.match(migration, new RegExp(`\\b${field}\\b`), `Credential lifecycle field/link missing: ${field}`);
}
assert.match(migration, /holder_display_masked !~ '\[0-9\]'/, "Masked public holder label must contain no digits");
assert.match(migration, /\[0-9\]\{11\}/, "Eleven-digit national identifier rejection check missing");
assert.match(migration, /credential status\/revocation mismatch/, "Atomic credential/revocation status trigger missing");
assert.match(migration, /revocation replacement must point back through correction linkage/, "Bidirectional revocation/reissue integrity check missing");
assert.match(migration, /simulation_ready requires exact workload 8\/8/, "Deferred workload 8/8 trigger missing");
assert.match(migration, /workload component sum must equal total/, "Deferred workload sum trigger missing");
assert.match(migration, /deferrable initially deferred/g, "Integrity triggers must be deferred until transaction end");
assert.match(migration, /unique \(appeal_id, membership_id\)/, "Original/appellate member overlap must be structurally impossible");
assert.match(migration, /filed_at <= filing_deadline_at/, "Appeal filing deadline check missing");
assert.match(migration, /original and appellate panel units must be independent/, "Appeal panel unit independence trigger missing");
assert.match(migration, /pilot_directive_appeal_membership_unit_integrity/, "Membership-unit changes must revalidate panel independence");
assert.match(migration, /status <> 'decided' and decided_at is null and outcome is null/, "Non-decided appeals must not carry a partial decision state");
assert.match(migration, /audit event requires exactly one dry-run outbox row/, "Audit/outbox atomicity trigger missing");

assert.match(adapter, /governance: \["pilot_directive_role_scope_catalog"/, "Adapter must consume the exact nine-role scope catalog");
const local = getLocalDirectivePilotCatalog();
assert.deepEqual(validateDirectivePilotCatalog(local), [], "Local directive fallback must remain valid");
assert.equal(local.governance.length, 9, "Local governance fallback must contain exactly nine DTO rows");
assert.deepEqual(local.governance, directiveRoleScopeRows, "Local fail-closed governance fallback must use the exact shared nine-role DTO contract");
assert.deepEqual(new Set(local.governance.map((row) => row.id)), new Set([
  "MEM-LEARNER", "MEM-INSTRUCTOR", "MEM-EXTERNAL", "MEM-COORD", "MEM-COMM-CHAIR",
  "MEM-STUDENT-AFFAIRS", "MEM-IT", "MEM-FINANCE", "MEM-ADMIN"
]), "Local governance fallback IDs must match canonical DB role rows");
assert.ok(local.governance.every((row) => row.unitId && row.unitType && row.bodyType && row.membershipRole && row.mandateFrom && row.mandateTo && row.decisionScope.length), "Role fallback DTO must include unit/body/membership/mandate/scope fields");
const localAdmin = local.governance.find((row) => row.roleKey === "admin");
assert.deepEqual(localAdmin.decisionScope, ["configuration_only"], "Admin fallback scope must be configuration-only");
assert.equal(localAdmin.mayMakeAcademicDecision || localAdmin.mayMakeFinancialDecision, false, "Admin fallback must not decide academic/financial matters");
for (const row of local.governance) {
  const uiScope = organizationScopes[row.roleKey];
  assert.ok(uiScope, `UI scope missing for canonical role ${row.roleKey}`);
  assert.equal(uiScope.membership_id, row.id, `${row.roleKey}: UI/fallback membership parity failed`);
  assert.equal(uiScope.unit_id, row.unitId, `${row.roleKey}: UI/fallback unit parity failed`);
  assert.equal(uiScope.unit_type, row.unitType, `${row.roleKey}: UI/fallback unit type parity failed`);
  assert.equal(uiScope.body_type, row.bodyType, `${row.roleKey}: UI/fallback body type parity failed`);
  assert.equal(uiScope.membership_role, row.membershipRole, `${row.roleKey}: UI/fallback membership role parity failed`);
  assert.deepEqual(uiScope.body_membership, [row.id], `${row.roleKey}: UI/fallback body membership parity failed`);
  assert.equal(uiScope.mandate_from, row.mandateFrom, `${row.roleKey}: UI/fallback mandate start parity failed`);
  assert.equal(uiScope.mandate_to, row.mandateTo, `${row.roleKey}: UI/fallback mandate end parity failed`);
  assert.deepEqual(uiScope.decision_scope, row.decisionScope, `${row.roleKey}: UI/fallback decision scope parity failed`);
}
const leakedIdentifier = structuredClone(local);
leakedIdentifier.publicCredentials[0].holderDisplayMasked = "12345678901*";
assert.ok(validateDirectivePilotCatalog(leakedIdentifier).some((error) => error.includes("minimization")), "Adapter must reject an 11-digit public identifier pattern");

const accepted = normalizeDirectivePilotCatalog(local, local);
assert.equal(accepted.remoteAccepted, true, "Complete canonical view-shaped snapshot must be accepted");
assert.equal(accepted.remoteVerified, true, "Only complete valid remote snapshots may be marked verified");
assert.equal(accepted.fallbackUsed, false, "Complete valid remote snapshot must not report fallback");
assert.deepEqual(accepted.governance, directiveRoleScopeRows, "Accepted normalized snapshot must preserve exact nine-role DTO parity");
const rawViewSnapshot = structuredClone(local);
rawViewSnapshot.governance = local.governance.map((row) => Object.fromEntries(
  Object.entries(row).map(([key, value]) => [key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`), value])
));
const acceptedRawView = normalizeDirectivePilotCatalog(rawViewSnapshot, local);
assert.equal(acceptedRawView.remoteAccepted, true, "Complete snake_case role-scope view snapshot must be accepted");
assert.deepEqual(acceptedRawView.governance, directiveRoleScopeRows, "Remote snake_case view and local fallback must normalize to the same nine-role DTO rows");
const partial = normalizeDirectivePilotCatalog({ governance: local.governance }, local);
assert.equal(partial.remoteAccepted, false, "Partial snapshot must fail closed");
assert.equal(partial.remoteVerified, false, "Partial snapshot must never be labelled remote verified");
assert.equal(partial.fallbackUsed, true, "Partial snapshot must select complete local fallback");
assert.equal(partial.partialRemoteDiscarded, true, "Partial remote rows must be explicitly discarded");
assert.deepEqual(partial.governance, local.governance, "Partial snapshot must not create a mixed remote/fallback catalog");

assert.match(migration, /^begin;$/m, "Migration must be transactional");
assert.match(migration, /^commit;$/m, "Migration must commit explicitly");
assert.match(rollback, /^begin;$/m, "Rollback must be transactional");
assert.match(rollback, /^commit;$/m, "Rollback must commit explicitly");
const dollarTags = [...migration.matchAll(/\$[a-z_]+\$/g)].map((match) => match[0]);
for (const tag of new Set(dollarTags)) {
  assert.equal(dollarTags.filter((item) => item === tag).length % 2, 0, `Unbalanced PostgreSQL dollar quote: ${tag}`);
}

console.log("directive access hardening contract: PASS (27 sources, 35 scoped operational policies, anon=2 tables+2 views, 9 exact role DTOs)");
