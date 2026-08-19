import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import {
  REFERENCE_DATA_VERSION,
  qualificationFrameworks,
  qualificationLevelDescriptors,
  qualificationLevelTranslations,
  qualificationDatasetRegistry,
  officialQualificationReferences,
  qualificationMatrixTemplates,
  qualificationMatrixExamples,
  qualificationMatrixDrafts,
  financeHandoffRoutes,
  roleWorkflowOverviews,
  roleWorkflowSteps,
  pilotPaymentRequests,
  pilotPaymentEvents,
  qualificationReferenceSnapshot
} from "../src/reference-data.js";

const migrationPath = new URL("../supabase/migrations/20260820010000_framework_matrix_finance_role_seed.sql", import.meta.url);
const adapterPath = new URL("../src/supabase.js", import.meta.url);
const sql = await readFile(migrationPath, "utf8");
const adapter = await readFile(adapterPath, "utf8");
const normalizedSql = sql.replaceAll("''", "'");

assert.equal(REFERENCE_DATA_VERSION, "2026-08-20.2");
assert.deepEqual(
  {
    frameworks: qualificationFrameworks.length,
    descriptors: qualificationLevelDescriptors.length,
    translations: qualificationLevelTranslations.length,
    datasets: qualificationDatasetRegistry.length,
    qualifications: officialQualificationReferences.length,
    templates: qualificationMatrixTemplates.length,
    examples: qualificationMatrixExamples.length,
    drafts: qualificationMatrixDrafts.length,
    financeRoutes: financeHandoffRoutes.length,
    roles: roleWorkflowOverviews.length,
    roleSteps: roleWorkflowSteps.length,
    paymentRequests: pilotPaymentRequests.length,
    paymentEvents: pilotPaymentEvents.length
  },
  {
    frameworks: 2,
    descriptors: 16,
    translations: 8,
    datasets: 2,
    qualifications: 6,
    templates: 16,
    examples: 8,
    drafts: 2,
    financeRoutes: 4,
    roles: 9,
    roleSteps: 25,
    paymentRequests: 1,
    paymentEvents: 2
  }
);

assert.equal((sql.match(/create table if not exists public\./gi) || []).length, 14);
assert.equal((sql.match(/create or replace view public\./gi) || []).length, 10);
assert.equal((sql.match(/with \(security_invoker = true, security_barrier = true\)/gi) || []).length, 10);
assert.equal((sql.match(/ force row level security;/gi) || []).length, 14);
assert.doesNotMatch(sql, /grant\s+(?:insert|update|delete|all)\b[^;]*\bto\s+(?:anon|authenticated)/i);
assert.doesNotMatch(sql, /service_role|secret[_-]?key|card_number|iban/i);

for (const item of [
  ...qualificationFrameworks,
  ...qualificationLevelDescriptors,
  ...qualificationLevelTranslations,
  ...qualificationDatasetRegistry,
  ...officialQualificationReferences,
  ...qualificationMatrixExamples,
  ...qualificationMatrixDrafts,
  ...financeHandoffRoutes,
  ...roleWorkflowOverviews,
  ...roleWorkflowSteps,
  ...pilotPaymentRequests,
  ...pilotPaymentEvents
]) {
  const key = item.id || item.qualificationCode || item.roleId;
  assert.ok(normalizedSql.includes(key), `Migration seed missing ${key}`);
}
assert.ok(sql.includes("'matrix-' || d.framework_id || '-' || d.level::text"));

for (const example of qualificationMatrixExamples) {
  for (const field of [
    "learningOutcomeSample", "learningLevelSample", "courseContentSample",
    "assessmentMethodSample", "evidenceSample", "alignmentRationaleSample", "pilotNotice"
  ]) {
    assert.ok(normalizedSql.includes(example[field]), `${example.id}.${field} differs from SQL`);
  }
}

for (const draft of qualificationMatrixDrafts) {
  assert.equal(draft.status, "pilot_draft");
  assert.equal(draft.rows.length, 3);
  for (const row of draft.rows) {
    for (const value of Object.values(row)) assert.ok(normalizedSql.includes(value), `${draft.id} row differs from SQL`);
  }
}

assert.equal(qualificationLevelDescriptors.filter((item) => item.frameworkId === "eqf" && item.sourceLanguage === "en").length, 8);
assert.equal(qualificationLevelTranslations.find((item) => item.level === 7)?.skillsBasis, "institutional_operational_translation");
assert.equal(officialQualificationReferences.filter((item) => item.responsibleInstitution === "Kütahya Dumlupınar Üniversitesi").length, 6);
assert.equal(officialQualificationReferences.find((item) => item.qualificationCode === "TR0030009011")?.creditValueEcts, 240);
assert.ok(qualificationDatasetRegistry.every((item) => item.automatedIngestionEnabled === false));
assert.ok(pilotPaymentRequests.every((item) => item.realPayment === false && item.hasFinancialIdentifiers === false));
assert.ok(qualificationReferenceSnapshot.matrixDrafts.every((item) => item.rows.length === 3));

for (const view of [
  "qualification_level_catalog",
  "qualification_level_bilingual_catalog",
  "qualification_dataset_catalog",
  "official_qualification_reference_catalog",
  "pilot_matrix_template_catalog",
  "pilot_matrix_draft_catalog",
  "pilot_finance_handoff_catalog",
  "pilot_role_workflow_catalog",
  "pilot_payment_request_catalog",
  "pilot_payment_event_catalog"
]) assert.ok(adapter.includes(view), `Supabase adapter missing ${view}`);

console.log("reference-data-contract: OK", {
  version: REFERENCE_DATA_VERSION,
  tables: 14,
  views: 10,
  qualifications: officialQualificationReferences.length,
  roles: roleWorkflowOverviews.length
});
