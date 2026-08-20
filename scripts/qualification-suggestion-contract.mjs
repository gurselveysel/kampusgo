import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { higherEducationCycleCrosswalk, tyycQualificationTypeDescriptors } from "../src/reference-data.js";
import {
  QUALIFICATION_ADVISORY_NOTICE,
  QUALIFICATION_FRAMEWORK_IDS,
  QUALIFICATION_SUGGESTION_ENGINE_VERSION,
  QUALIFICATION_SUGGESTION_LIMITS,
  applyManualQualificationOverride,
  buildQualificationSelectionOptions,
  recordHumanBoardQualificationDecision,
  suggestOutcomeQualificationAlignment,
  suggestProgramQualificationAlignment
} from "../src/qualification-suggestion.js";
import {
  getLocalQualificationSuggestionCatalog,
  normalizeQualificationSuggestionCatalog
} from "../src/supabase.js";

const migrationUrl = new URL("../supabase/migrations/20260820020000_smart_qualification_suggestion_engine.sql", import.meta.url);
const sql = readFileSync(migrationUrl, "utf8");
const followupSql = readFileSync(new URL("../supabase/migrations/20260820032000_tyyc_smart_alignment_program_spine.sql", import.meta.url), "utf8");
const spineIntegritySql = readFileSync(new URL("../supabase/migrations/20260820034000_tyyc_spine_integrity_performance.sql", import.meta.url), "utf8");
const spineIntegrityRollback = readFileSync(new URL("../supabase/rollback/20260820034000_tyyc_spine_integrity_performance.rollback.sql", import.meta.url), "utf8");
const spineIntegrityProbe = readFileSync(new URL("../supabase/tests/20260820034000_tyyc_spine_integrity.sql", import.meta.url), "utf8");
const combinedSql = `${sql}\n${followupSql}\n${spineIntegritySql}`;
const adapter = readFileSync(new URL("../src/supabase.js", import.meta.url), "utf8");

assert.equal(QUALIFICATION_SUGGESTION_ENGINE_VERSION, "2026-08-20.2");
assert.match(QUALIFICATION_ADVISORY_NOTICE, /karar değil/i);
assert.match(QUALIFICATION_ADVISORY_NOTICE, /TYYÇ/);
assert.deepEqual(QUALIFICATION_SUGGESTION_LIMITS, { maxOutcomeCount: 40, maxOutcomeLength: 600 });
assert.equal(tyycQualificationTypeDescriptors.length, 6);
assert.ok(tyycQualificationTypeDescriptors.every((item) => item.operationalDescriptorStatus === "advisory_summary_not_verbatim" && item.equivalenceClaim === false && item.placementClaim === false && item.logoRightClaim === false));

for (const frameworkId of QUALIFICATION_FRAMEWORK_IDS) {
  const options = buildQualificationSelectionOptions(frameworkId);
  assert.deepEqual(options.map((item) => item.level), frameworkId === "tyyc" ? [5, 6, 7, 8] : [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.ok(options.every((item) => item.dimensions.length === 3));
  assert.ok(options.every((item) => item.dimensions.every((dimension) => dimension.descriptor.length >= 10)));
  assert.equal(options.filter((item) => item.higherEducationCycleSuggestion).length, 4);
  if (frameworkId === "tyyc") assert.equal(options.flatMap((item) => item.qualificationTypeCandidates).length, 6);
}

const complexOutcome = {
  id: "LO-COMPLEX",
  text: "Karmaşık ve öngörülemeyen bir veri sorununu eleştirel olarak analiz eder ve yenilikçi çözüm geliştirir."
};
const first = suggestOutcomeQualificationAlignment(complexOutcome);
const second = suggestOutcomeQualificationAlignment(complexOutcome);
assert.deepEqual(first, second, "aynı girdi aynı deterministik öneriyi üretmeli");
for (const frameworkId of QUALIFICATION_FRAMEWORK_IDS) {
  const suggestion = first.suggestions[frameworkId];
  assert.equal(suggestion.level, 6);
  assert.equal(suggestion.dimension, "skills");
  assert.ok(suggestion.score >= 80 && suggestion.score <= 100);
  assert.equal(suggestion.confidence, "high");
  assert.ok(suggestion.descriptor.length >= 40);
  assert.ok(suggestion.rationale.includes("karar değildir"));
  assert.ok(suggestion.matchedSignals.length >= 4);
  assert.ok(suggestion.suggestedContent.length >= 3);
  assert.ok(suggestion.suggestedAssessments.length >= 2);
  assert.equal(suggestion.autonomousDecision, false);
}
assert.equal(first.suggestions.tyyc.descriptorStatus, "advisory_summary_not_verbatim");
assert.equal(first.suggestions.tyyc.qualificationTypeSuggestion.selected.qualificationType, "bachelor");
assert.equal(first.suggestions.tyyc.officialPlacementClaim, false);
assert.equal(first.suggestions.tyyc.equivalenceClaim, false);
assert.equal(first.suggestions.tyyc.logoRightClaim, false);
assert.equal(first.crossFrameworkConsistency.classification, "aligned");
assert.equal(first.crossFrameworkConsistency.threeFrameworkClassification, "aligned");
assert.equal(first.crossFrameworkConsistency.equalityForced, false);

const strategic = suggestOutcomeQualificationAlignment({
  id: "LO-STRATEGIC",
  text: "Ekip performansını değerlendirir ve stratejik dönüşümü yönetir."
});
assert.deepEqual(
  [strategic.suggestions.tyc.level, strategic.suggestions.eqf.level, strategic.suggestions.tyyc.level, strategic.suggestions.tyc.dimension, strategic.suggestions.eqf.dimension, strategic.suggestions.tyyc.dimension],
  [7, 7, 7, "competence", "competence", "competence"]
);

const adjacent = suggestOutcomeQualificationAlignment({
  id: "LO-ADJACENT",
  text: "Temel sorunları saptar ve uygun yöntemi uygular."
});
assert.equal(adjacent.crossFrameworkConsistency.levelDifference, 1);
assert.equal(adjacent.crossFrameworkConsistency.classification, "adjacent_review");
assert.equal(adjacent.crossFrameworkConsistency.requiresHumanReview, true);
assert.match(adjacent.crossFrameworkConsistency.discrepancyRationale, /eşdeğerlik iddiası değildir/i);

for (const unsafeOrWeak of ["a", "<script>alert(1)</script>"]) {
  const result = suggestOutcomeQualificationAlignment(unsafeOrWeak);
  assert.equal(result.inputQuality.isMeasurable, false);
  assert.equal(result.inputQuality.status, "insufficient");
  assert.ok(result.inputQuality.warnings.length >= 1);
  assert.ok(result.inputQuality.improvementPrompt.includes("geliştirin"));
  assert.equal(result.suggestions.tyc.confidence, "low");
  assert.ok(result.suggestions.tyc.score <= 45);
}
assert.throws(() => suggestOutcomeQualificationAlignment("x".repeat(601)), /en fazla 600/);
assert.throws(() => suggestProgramQualificationAlignment({ outcomes: Array.from({ length: 41 }, (_, index) => ({ id: `X-${index}`, text: "Karmaşık sorunu analiz eder." })) }), /en fazla 40/);

const outcomes = [complexOutcome, { id: "LO-STRATEGIC", text: "Ekip performansını değerlendirir ve stratejik dönüşümü yönetir." }];
const program = suggestProgramQualificationAlignment({ programId: "P-SMART", outcomes });
assert.deepEqual(program.program.suggestedLevels, { tyc: 6, eqf: 6, tyyc: 6 });
assert.equal(program.program.coverage.outcomeCount, 2);
assert.equal(program.program.crossFrameworkConsistency.allExact, true);
assert.equal(program.finalDecision.status, "pending_human_board");
assert.equal(program.finalDecision.autonomousDecision, false);

const overrideInput = {
  outcomeId: "LO-COMPLEX",
  frameworkId: "tyc",
  level: 6,
  dimension: "knowledge",
  reason: "Çıktının birincil kanıtı eleştirel bilgi çözümlemesidir.",
  actorRole: "instructor"
};
const overridden = applyManualQualificationOverride(program, overrideInput);
assert.equal(program.outcomes[0].suggestions.tyc.effectiveSelection.source, "engine_suggestion", "orijinal sonuç mutate edilmemeli");
assert.equal(overridden.outcomes[0].suggestions.tyc.effectiveSelection.source, "manual_override");
assert.equal(overridden.manualOverrides[0].id, "OVR-LO-COMPLEX-tyc-1");
assert.equal(overridden.manualOverrides[0].level, 6);
assert.equal(overridden.manualOverrides[0].dimension, "knowledge");
for (const actorRole of ["coordinator", "commission", "admin", "learner"]) {
  assert.throws(() => applyManualQualificationOverride(program, { ...overrideInput, actorRole }), /yalnız üniversite içi veya kurum dışı eğitici/i);
}
const tyycOverridden = applyManualQualificationOverride(program, {
  outcomeId: "LO-COMPLEX", frameworkId: "tyyc", level: 6, dimension: "skills",
  reason: "Lisans türü advisory bağlamındaki karmaşık beceri kanıtı eğitici tarafından seçilmiştir.",
  actorRole: "externalInstructor"
});
assert.equal(tyycOverridden.outcomes[0].suggestions.tyyc.effectiveSelection.source, "manual_override");
assert.equal(tyycOverridden.outcomes[0].suggestions.tyyc.effectiveSelection.qualificationTypeSuggestion.selected.qualificationType, "bachelor");
assert.throws(() => applyManualQualificationOverride(program, {
  outcomeId: "LO-COMPLEX", frameworkId: "tyyc", level: 4, dimension: "skills",
  reason: "TYYÇ düzeyi beşten küçük olamaz ve bu seçim reddedilmelidir.", actorRole: "instructor"
}), /5–8/);

const replayed = suggestProgramQualificationAlignment({
  programId: "P-SMART",
  outcomes,
  manualOverrides: JSON.parse(JSON.stringify(overridden.manualOverrides))
});
assert.deepEqual(replayed.manualOverrides, overridden.manualOverrides, "kalıcı durumdan manuel seçim aynı kimlikle replay edilmeli");
assert.equal(replayed.outcomes[0].suggestions.tyc.effectiveSelection.dimension, "knowledge");

const suggestionSnapshotBeforeDecision = JSON.stringify(overridden.outcomes);
const decided = recordHumanBoardQualificationDecision(overridden, {
  actorRole: "commission",
  decision: "approved",
  decidedBy: "Sentetik Mikro Yeterlilik Komisyonu",
  rationale: "Kurul, önerileri ve ölçme kanıtlarını insan incelemesiyle değerlendirmiştir.",
  tycLevel: 6,
  eqfLevel: 6,
  tyycLevel: 6,
  meetingReference: "SENTETIK-TOPLANTI"
});
assert.equal(decided.finalDecision.status, "recorded_human_board_decision");
assert.equal(decided.finalDecision.source, "human_commission");
assert.equal(decided.finalDecision.suggestionMutated, false);
assert.deepEqual(decided.finalDecision.decidedLevels, { tyc: 6, eqf: 6, tyyc: 6 });
assert.equal(JSON.stringify(decided.outcomes), suggestionSnapshotBeforeDecision, "kurul kararı öneri/matris kaydını değiştirmemeli");
assert.throws(() => recordHumanBoardQualificationDecision(program, {
  actorRole: "coordinator", decision: "approved", decidedBy: "Koordinatör", rationale: "İnsan gerekçesi yeterince uzundur."
}), /yalnız komisyon/);

assert.equal(higherEducationCycleCrosswalk.length, 4);
assert.deepEqual(higherEducationCycleCrosswalk.map((item) => item.tycLevel), [5, 6, 7, 8]);
assert.ok(higherEducationCycleCrosswalk.every((item) =>
  item.mappingStatus === "provisional_advisory_crosswalk" &&
  item.equivalenceClaim === false && item.placementClaim === false &&
  item.institutionalValidationRequired === true && item.officialValidationRequired === true &&
  item.tyycSourceUrl === "https://uluslararasi.yok.gov.tr/Sayfalar/avrupa-yuksekogretim-alani-ile-uyum-projesi/yeterlikler-cercevesi/yuksekogretim-yeterlilik-turleri.aspx" &&
  item.bolognaSourceUrl === "https://ehea.info/bologna-policy/qualification-frameworks/"
));

for (const table of [
  "qualification_higher_education_cycle_crosswalks",
  "pilot_qualification_suggestion_engine_profiles",
  "pilot_qualification_program_summaries",
  "pilot_learning_outcome_suggestions",
  "pilot_qualification_manual_override_examples",
  "pilot_qualification_board_decision_examples"
]) {
  assert.match(sql, new RegExp(`create table if not exists public\\.${table}`));
  assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
  assert.match(sql, new RegExp(`alter table public\\.${table} force row level security`));
  assert.match(sql, new RegExp(`grant select on table public\\.${table} to anon, authenticated`));
}
for (const view of [
  "qualification_higher_education_cycle_catalog",
  "pilot_qualification_suggestion_profile_catalog",
  "pilot_qualification_manual_override_catalog",
  "qualification_tyyc_type_descriptor_catalog",
  "pilot_qualification_program_summary_v2_catalog",
  "pilot_learning_outcome_suggestion_v2_catalog",
  "pilot_qualification_board_decision_v2_catalog",
  "pilot_qualification_program_spine_catalog",
  "pilot_constructive_alignment_catalog"
]) {
  assert.match(combinedSql, new RegExp(`create or replace view public\\.${view}`));
  assert.ok(adapter.includes(view), `Supabase adapter missing ${view}`);
}
assert.equal((sql.match(/with \(security_invoker = true, security_barrier = true\)/g) || []).length, 6);
assert.doesNotMatch(sql, /grant\s+(?:insert|update|delete|all)\b[^;]*\bto\s+(?:anon|authenticated)/i);
assert.doesNotMatch(sql, /service_role|secret[_-]?key|card_number|iban/i);
assert.match(sql, /actor_role text not null check \(actor_role in \('instructor', 'externalInstructor'\)\)/);
assert.match(sql, /actor_role text not null check \(actor_role = 'commission'\)/);
assert.match(sql, /foreign key \(program_id, engine_profile_id\)[\s\S]*?references public\.pilot_qualification_program_summaries\(program_id, engine_profile_id\)/);
assert.match(sql, /foreign key \(suggestion_id, outcome_id, framework_id, computed_level, computed_dimension\)[\s\S]*?references public\.pilot_learning_outcome_suggestions/);
assert.match(sql, /outcome_text text not null check \(char_length\(btrim\(outcome_text\)\) between 1 and 600\)/);
assert.match(sql, /recorded_at timestamptz not null/);
assert.match(sql, /decided_at timestamptz not null/);
for (const seedId of [
  "qualification-engine-2026-08-20-1", "program-smart-alignment-demo", "SUG-DEMO-LO-1-TYC", "SUG-DEMO-LO-1-EQF",
  "SUG-DEMO-LO-2-TYC", "SUG-DEMO-LO-2-EQF", "SUG-DEMO-LO-1-TYYC", "SUG-DEMO-LO-2-TYYC",
  "OVR-DEMO-LO-1-TYC-1", "DEC-DEMO-001", "PROGRAM-DATA-LITERACY", "ALIGN-LO-1", "ALIGN-LO-2"
]) assert.ok(combinedSql.includes(seedId), `migration seed missing ${seedId}`);
for (const table of [
  "qualification_tyyc_type_descriptors", "pilot_qualification_program_spine_links",
  "pilot_qualification_program_outcomes", "pilot_learning_outcome_tyyc_type_candidates",
  "pilot_directive_constructive_alignment_rows"
]) assert.match(followupSql, new RegExp(`create table if not exists public\\.${table}`));
assert.match(followupSql, /foreign key \(smart_program_id, engine_profile_id, outcome_id\)[\s\S]*?references public\.pilot_qualification_program_outcomes/);
assert.match(followupSql, /foreign key \(directive_program_id, directive_program_version_no, workload_component_type\)[\s\S]*?references public\.pilot_directive_workload_items/);
assert.match(followupSql, /advisory_summary_not_verbatim/);
assert.doesNotMatch(followupSql, /grant\s+(?:insert|update|delete|all)\b[^;]*\bto\s+(?:anon|authenticated)/i);

for (const constraint of [
  "pilot_qualification_spine_same_version_key",
  "pilot_qualification_outcomes_same_spine_fkey",
  "pilot_qualification_outcomes_same_spine_key",
  "pilot_constructive_alignment_same_spine_outcome_fkey"
]) {
  assert.ok(spineIntegritySql.includes(constraint), `same-spine migration constraint missing: ${constraint}`);
  assert.match(spineIntegrityRollback, new RegExp(`drop constraint if exists ${constraint}`), `same-spine rollback missing: ${constraint}`);
}
assert.match(spineIntegritySql, /foreign key \(\s*smart_program_id,\s*engine_profile_id,\s*directive_program_id,\s*directive_program_version_no\s*\)[\s\S]*?references public\.pilot_qualification_program_spine_links \(\s*smart_program_id,\s*engine_profile_id,\s*directive_program_id,\s*directive_program_version_no\s*\)/, "Outcome row must reference the exact four-column canonical spine");
assert.match(spineIntegritySql, /foreign key \(\s*smart_program_id,\s*engine_profile_id,\s*outcome_id,\s*directive_program_id,\s*directive_program_version_no\s*\)[\s\S]*?references public\.pilot_qualification_program_outcomes \(\s*smart_program_id,\s*engine_profile_id,\s*outcome_id,\s*directive_program_id,\s*directive_program_version_no\s*\)/, "Constructive alignment must reference the exact five-column outcome spine");

const spineIndexes = [
  "pilot_learning_outcome_suggestions_program_outcome_idx",
  "pilot_qualification_outcomes_same_spine_fk_idx",
  "pilot_constructive_alignment_same_spine_outcome_idx",
  "pilot_constructive_alignment_workload_fk_idx",
  "pilot_directive_credentials_correction_fk_idx",
  "pilot_directive_source_links_version_fk_idx",
  "qualification_tyyc_type_framework_fk_idx"
];
for (const index of spineIndexes) {
  assert.match(spineIntegritySql, new RegExp(`create index if not exists ${index}`), `FK covering index missing: ${index}`);
  assert.match(spineIntegrityRollback, new RegExp(`drop index if exists public\\.${index}`), `FK covering index rollback missing: ${index}`);
}
assert.match(spineIntegrityProbe, /program-smart-spine-probe/, "Negative probe must construct a second valid smart/directive spine");
assert.match(spineIntegrityProbe, /pilot_qualification_outcomes_same_spine_fkey/, "Negative probe must identify the four-column outcome rejection constraint");
assert.match(spineIntegrityProbe, /pilot_constructive_alignment_same_spine_outcome_fkey/, "Negative probe must identify the five-column alignment rejection constraint");
assert.match(spineIntegrityProbe, /^rollback;$/m, "Same-spine acceptance probe must leave no persistent rows");
assert.doesNotMatch(spineIntegritySql, /grant\s+(?:insert|update|delete|all)\b[^;]*\bto\s+(?:anon|authenticated)/i);

function structuralShape(value) {
  if (value === null) return null;
  if (Array.isArray(value)) return value.map(structuralShape);
  if (typeof value !== "object") return typeof value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, structuralShape(value[key])]));
}

const localCatalog = getLocalQualificationSuggestionCatalog();
const selectionOptions = Object.fromEntries(QUALIFICATION_FRAMEWORK_IDS.map((frameworkId) => [
  frameworkId,
  new Map(buildQualificationSelectionOptions(frameworkId).map((option) => [option.level, option]))
]));
const remoteMock = {
  higherEducationCycles: localCatalog.higherEducationCycles.map((cycle) => ({
    id: cycle.id,
    tyc_level: cycle.tycLevel,
    eqf_level: cycle.eqfLevel,
    tyyc_cycle_tr: cycle.tyycCycleTr,
    bologna_cycle_tr: cycle.bolognaCycleTr,
    award_context_tr: cycle.awardContextTr,
    mapping_status: cycle.mappingStatus,
    equivalence_claim: cycle.equivalenceClaim,
    placement_claim: cycle.placementClaim,
    institutional_validation_required: cycle.institutionalValidationRequired,
    official_validation_required: cycle.officialValidationRequired,
    tyyc_source_url: cycle.tyycSourceUrl,
    bologna_source_url: cycle.bolognaSourceUrl,
    pilot_notice: cycle.pilotNotice
  })),
  suggestionEngineProfiles: localCatalog.suggestionEngineProfiles.map((profile) => ({
    id: profile.id,
    engine_version: profile.engineVersion,
    engine_mode: profile.engineMode,
    method_key: profile.methodKey,
    aggregation_method: profile.aggregationMethod,
    advisory_notice: profile.advisoryNotice,
    editable_roles: profile.editableRoles,
    reviewer_roles: profile.reviewerRoles,
    deterministic: profile.deterministic,
    auto_decision_enabled: profile.autoDecisionEnabled,
    final_decision_authority: profile.finalDecisionAuthority,
    institutional_validation_required: profile.institutionalValidationRequired
  })),
  tyycTypeDescriptors: localCatalog.tyycTypeDescriptors.map((type) => ({
    id: type.id,
    framework_id: type.frameworkId,
    level: type.level,
    qualification_type: type.qualificationType,
    title_tr: type.titleTr,
    orientation: type.orientation,
    context_signals: type.contextSignals,
    official_source_url: type.officialSourceUrl,
    official_form_registry_url: type.officialFormRegistryUrl,
    source_publisher: type.sourcePublisher,
    source_status: type.sourceStatus,
    operational_descriptor_status: type.operationalDescriptorStatus,
    equivalence_claim: type.equivalenceClaim,
    placement_claim: type.placementClaim,
    logo_right_claim: type.logoRightClaim,
    autonomous_decision: type.autonomousDecision,
    institutional_validation_required: type.institutionalValidationRequired,
    verified_at: type.verifiedAt
  })),
  programSuggestionSummaries: localCatalog.programSuggestionSummaries.map((summary) => ({
    program_id: summary.programId,
    directive_program_id: summary.directiveProgramId,
    directive_program_version_no: summary.directiveProgramVersionNo,
    suggested_tyc_level: summary.suggestedLevels.tyc,
    suggested_eqf_level: summary.suggestedLevels.eqf,
    suggested_tyyc_level: summary.suggestedLevels.tyyc,
    level_summaries: summary.levelSummaries,
    dimension_coverage: summary.dimensionCoverage,
    coverage: summary.coverage,
    consistency: summary.consistency,
    cross_framework_consistency: summary.crossFrameworkConsistency,
    higher_education_cycle_id: summary.higherEducationCycleSuggestion?.id,
    rationale: summary.rationale,
    aggregation_method: summary.aggregationMethod,
    autonomous_decision: summary.autonomousDecision,
    institutional_validation_required: summary.institutionalValidationRequired
  })),
  learningOutcomeSuggestions: localCatalog.learningOutcomeSuggestions.map((suggestion) => {
    const dimensions = Object.fromEntries(selectionOptions[suggestion.frameworkId].get(suggestion.level).dimensions.map((entry) => [entry.dimension, entry.descriptor]));
    return {
      id: suggestion.id,
      engine_profile_id: "qualification-engine-2026-08-20-1",
      program_id: suggestion.programId,
      directive_program_id: suggestion.directiveProgramId,
      directive_program_version_no: suggestion.directiveProgramVersionNo,
      outcome_order: suggestion.outcomeOrder,
      outcome_id: suggestion.outcomeId,
      outcome_text: suggestion.outcomeText,
      input_quality: suggestion.inputQuality,
      framework_id: suggestion.frameworkId,
      framework_code: suggestion.frameworkCode,
      proposed_level: suggestion.level,
      proposed_dimension: suggestion.dimension,
      score: suggestion.score,
      confidence: suggestion.confidence,
      rationale: suggestion.rationale,
      matched_signals: suggestion.matchedSignals,
      suggested_content: suggestion.suggestedContent,
      suggested_assessments: suggestion.suggestedAssessments,
      cross_framework_peer_level: suggestion.crossFrameworkConsistency.tycLevel,
      cross_framework_levels: {
        tyc: suggestion.crossFrameworkConsistency.tycLevel,
        eqf: suggestion.crossFrameworkConsistency.eqfLevel,
        tyyc: suggestion.crossFrameworkConsistency.tyycLevel
      },
      cross_framework_status: suggestion.crossFrameworkConsistency.threeFrameworkClassification,
      cross_framework_rationale: suggestion.crossFrameworkConsistency.discrepancyRationale,
      selection_source: suggestion.effectiveSelection.source,
      autonomous_decision: suggestion.autonomousDecision,
      institutional_validation_required: suggestion.institutionalValidationRequired,
      knowledge_descriptor: dimensions.knowledge,
      skills_descriptor: dimensions.skills,
      competence_descriptor: dimensions.competence,
      official_source_url: suggestion.officialSourceUrl,
      descriptor_content_basis: suggestion.frameworkId === "tyyc" ? "official_form_operational_summary" : "official_verbatim",
      qualification_type_candidates: suggestion.frameworkId === "tyyc"
        ? [suggestion.qualificationTypeSuggestion.selected, ...suggestion.qualificationTypeSuggestion.alternatives].map((candidate, index) => ({
          id: candidate.id,
          level: candidate.level,
          qualificationType: candidate.qualificationType,
          titleTr: candidate.titleTr,
          orientation: candidate.orientation,
          score: candidate.typeFitScore,
          rank: index + 1,
          rationale: "Yeterlilik türü adayı yalnız pedagojik insan incelemesi için gösterilir."
        }))
        : []
    };
  }),
  manualOverrideExamples: localCatalog.manualOverrideExamples.map((override) => ({
    id: override.id,
    outcome_id: override.outcomeId,
    framework_id: override.frameworkId,
    computed_level: override.computedLevel,
    computed_dimension: override.computedDimension,
    selected_level: override.selectedLevel,
    selected_dimension: override.selectedDimension,
    reason: override.reason,
    actor_role: override.actorRole,
    recorded_at: override.recordedAt,
    is_human_selection: override.isHumanSelection,
    final_board_decision: override.finalBoardDecision
  })),
  boardDecisionExamples: localCatalog.boardDecisionExamples.map((decision) => ({
    id: decision.id,
    program_id: decision.programId,
    directive_program_id: decision.directiveProgramId,
    directive_program_version_no: decision.directiveProgramVersionNo,
    decision_status: decision.decision,
    actor_role: decision.actorRole,
    decided_by_label: decision.decidedBy,
    rationale: decision.rationale,
    decided_at: decision.decidedAt,
    meeting_reference: decision.meetingReference,
    decided_tyc_level: decision.decidedLevels.tyc,
    decided_eqf_level: decision.decidedLevels.eqf,
    decided_tyyc_level: decision.decidedLevels.tyyc,
    suggestion_snapshot: decision.suggestionSnapshot,
    suggestion_mutated: decision.suggestionMutated,
    autonomous_decision: decision.autonomousDecision,
    institutional_validation_required: decision.institutionalValidationRequired
  })),
  programSpine: localCatalog.programSpine.map((item) => Object.fromEntries(Object.entries(item).map(([key, value]) => [key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`), value]))),
  constructiveAlignment: localCatalog.constructiveAlignment.map((item) => Object.fromEntries(Object.entries(item).map(([key, value]) => [key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`), value])))
};
const normalizedRemoteCatalog = normalizeQualificationSuggestionCatalog(remoteMock, localCatalog);
const normalizedFallbackCatalog = normalizeQualificationSuggestionCatalog({}, localCatalog);
for (const key of Object.keys(normalizedFallbackCatalog)) {
  assert.deepEqual(
    structuralShape(normalizedRemoteCatalog[key]),
    structuralShape(normalizedFallbackCatalog[key]),
    `${key}: uzak Supabase satırları ile yerel motor aynı derin sözleşmeyi üretmeli`
  );
  assert.deepEqual(
    normalizedRemoteCatalog[key].map((row) => Object.keys(row).sort()),
    normalizedFallbackCatalog[key].map((row) => Object.keys(row).sort()),
    `${key}: her uzak satırın anahtarları yerel fallback ile aynı olmalı`
  );
}
for (const suggestion of normalizedRemoteCatalog.learningOutcomeSuggestions) {
  assert.equal(suggestion.level, suggestion.computedSelection.level);
  assert.equal(suggestion.dimension, suggestion.computedSelection.dimension);
  assert.ok(suggestion.descriptor.length > 0);
  assert.ok(suggestion.effectiveSelection.source);
  assert.ok(suggestion.crossFrameworkConsistency.classification);
}
assert.deepEqual(normalizedRemoteCatalog.programSuggestionSummaries[0].suggestedLevels, { tyc: 6, eqf: 6, tyyc: 6 });
assert.equal(normalizedRemoteCatalog.boardDecisionExamples[0].status, "recorded_human_board_decision");
assert.equal(normalizedRemoteCatalog.boardDecisionExamples[0].source, "human_commission");
assert.deepEqual(normalizedRemoteCatalog.boardDecisionExamples[0].decidedLevels, { tyc: 6, eqf: 6, tyyc: 6 });
assert.equal(normalizedRemoteCatalog.tyycTypeDescriptors.length, 6);
assert.equal(normalizedRemoteCatalog.learningOutcomeSuggestions.filter((item) => item.frameworkId === "tyyc").length, 2);
assert.equal(normalizedRemoteCatalog.programSpine[0].directiveProgramId, "PROGRAM-DATA-LITERACY");
assert.equal(normalizedRemoteCatalog.programSpine[0].directiveProgramVersionNo, 1);
for (const countKey of ["outcomeCount", "suggestionCount", "manualOverrideCount", "matrixDraftCount", "constructiveAlignmentRowCount", "boardDecisionCount"]) {
  assert.ok(normalizedRemoteCatalog.programSpine[0][countKey] > 0, `program spine ${countKey} join'i sıfır olmamalı`);
}
assert.match(followupSql, /count\(distinct m\.id\)::integer as manual_override_count/);
assert.match(followupSql, /left join public\.pilot_qualification_manual_override_examples m/);
assert.equal(normalizedRemoteCatalog.constructiveAlignment.length, 2);

console.log("qualification-suggestion-contract: OK", {
  engineVersion: QUALIFICATION_SUGGESTION_ENGINE_VERSION,
  frameworks: 3,
  levelsPerFramework: "TYÇ/AYÇ 8; TYYÇ 4 (5–8)",
  cycleCrosswalks: higherEducationCycleCrosswalk.length,
  tables: 11,
  views: 10,
  remoteFallbackStructuralParity: true
});
