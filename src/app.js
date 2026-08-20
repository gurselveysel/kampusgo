import { externalPilotIntegrationGates, initialState, integrationMasterDataOwnership, lifecycle, pageMeta, roleNavigation, roles } from "./data.js";
import {
  canRecordAssessmentDecision,
  canViewApplication,
  createApplication,
  filterApplicationsForRole,
  getAllowedApplicationTransitions,
  recordAssessmentDecision,
  reviewPaymentRequest,
  runIntegrationBulkDryRun,
  runIntegrationDryRun,
  runScenarioStep,
  scenarioDefinitions,
  startPaymentRequest,
  submitPaymentRequest,
  transitionApplication,
  visiblePaymentRequestsForRole,
  visibleProgramsForRole
} from "./workflow.js";
import { getSupabasePublicConfig, loadPilotSnapshot } from "./supabase.js";
import {
  findQualificationDescriptor,
  findQualificationTemplate,
  officialQualificationReferences,
  qualificationDatasetRegistry,
  qualificationFrameworks,
  qualificationLevelDescriptors,
  qualificationMatrixExamples
} from "./reference-data.js";
import {
  QUALIFICATION_ADVISORY_NOTICE,
  QUALIFICATION_FRAMEWORK_IDS,
  QUALIFICATION_SUGGESTION_ENGINE_VERSION,
  QUALIFICATION_SUGGESTION_LIMITS,
  applyManualQualificationOverride,
  buildQualificationSelectionOptions,
  recordHumanBoardQualificationDecision,
  suggestProgramQualificationAlignment
} from "./qualification-suggestion.js";
import {
  createSmartSuggestionSnapshot,
  readSmartSuggestionSnapshot,
  validateSmartSuggestionSnapshot
} from "./smart-snapshot.js";
import {
  DIRECTIVE_PILOT_NOTICE,
  cloneDirectivePilotState,
  createFinancePersonnelDryRun,
  createPublicCredentialView,
  ectsWorkloadBands,
  evaluatePilotRule,
  generateMydCode,
  organizationScopes,
  policyVersionRegistry,
  recordRecognitionDecision,
  requestOfferingSeat,
  submitIndependentAppeal,
  validateCommissionMeeting,
  validateEctsWorkload,
  validateEk1Credential,
  versionedPilotRules,
  workloadComponents
} from "./directive-pilot.js";

const STORAGE_KEY = "kdpu-myys-pilot-v4";
const root = document.querySelector("#main-content");
const sideNav = document.querySelector("#side-nav");
const roleSelect = document.querySelector("#role-select");
const personaCard = document.querySelector("#persona-card");
const modalBackdrop = document.querySelector("#modal-backdrop");
const modal = document.querySelector("#modal");
const toastRegion = document.querySelector("#toast-region");
const routeAnnouncer = document.querySelector("#route-announcer");
const notificationButton = document.querySelector("[data-nav='notifications']");

const ASSESSMENT_START_ROLES = new Set(["learner", "instructor", "externalInstructor"]);
const INTEGRATION_BULK_ROLES = new Set(["it", "admin"]);
const FINANCE_OPERATOR_ROLES = new Set(["finance"]);
const PROPOSAL_ROLES = new Set(["instructor", "externalInstructor"]);
const SAFE_ID_PATTERN = /^[A-Za-z][A-Za-z0-9._:-]{0,127}$/;
const PROPOSAL_WORKLOAD_SEED = Object.freeze({ synchronous: 10, asynchronous: 10, preparation: 10, practice: 10, project: 15, independent: 10, assessment: 5, feedback: 5 });
const SMART_DESCRIPTOR_LABELS = Object.freeze({
  canonical: "Kanonik tanımlayıcı",
  tyyc: "YÖK/MYK form siciline dayalı pilot operasyonel özet — birebir alıntı değildir"
});

let state = normalizePilotState(loadState());
let lastFocused = null;
let currentCommissionTab = "summary";
let currentFrameworkTab = "tyc";
let currentFrameworkLevel = 6;
let currentIntegrationCategory = "all";
let currentIntegrationTier = "all";
let uiMutationEpoch = 0;
let smartSuggestionReport = null;
let smartSuggestionApplied = [];
let smartSuggestionTimer = null;
let smartSuggestionRequest = 0;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (isValidSavedState(saved)) return saved;
  } catch {
    // Corrupt local state safely falls back to the sealed synthetic seed.
  }
  return structuredClone(initialState);
}

function normalizePilotState(value) {
  value.finance ||= structuredClone(initialState.finance);
  value.finance.paymentRequests ||= structuredClone(initialState.finance.paymentRequests || []);
  value.finance.transactions ||= [];
  value.finance.entitlements ||= [];
  value.finance.invoiceDrafts ||= [];
  value.qualificationDrafts ||= [];
  value.smartAlignments ||= [];
  value.directivePilot ||= cloneDirectivePilotState();
  return value;
}

function isValidSavedState(saved) {
  const roleIds = new Set(roles.map((role) => role.id));
  const auditRoleIds = new Set([...roleIds, "system"]);
  const applicationStatuses = new Set(["draft", "review", "commission", "revision", "approved", "deferred", "rejected", "credentialed"]);
  const programStatuses = new Set([...applicationStatuses, "active"]);
  const assessmentStatuses = new Set(["scheduled", "active", "under_review", "completed"]);
  const ownerRoles = new Set(["learner", "instructor", "externalInstructor"]);
  const arrayKeys = [
    "applications", "programs", "credentials", "integrations", "notifications", "audit", "smartAlignments",
    "enrollments", "assessmentSessions", "recognizedCredits", "integrationJobs"
  ];
  const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
  const isText = (value) => typeof value === "string" && value.trim().length > 0;
  const isNumber = (value, min = 0, max = Number.POSITIVE_INFINITY) => Number.isFinite(value) && value >= min && value <= max;
  const isDate = (value) => isText(value) && Number.isFinite(Date.parse(value));
  const workloadKeys = workloadComponents.map(([key]) => key);
  const isSemanticWorkload = (components, total, ects) => isObject(components) &&
    Object.keys(components).length === workloadKeys.length && workloadKeys.every((key) => Object.hasOwn(components, key) && isNumber(components[key])) &&
    isNumber(total) && Math.abs(Object.values(components).reduce((sum, value) => sum + value, 0) - total) <= 0.001 &&
    total >= 25 * ects && total <= 30 * ects;
  const isScenario = (item, kind) => isObject(item) &&
    Number.isInteger(item.step) && item.step >= 0 && item.step <= scenarioDefinitions[kind].length &&
    typeof item.completed === "boolean" &&
    (item.applicationId === null || item.applicationId === undefined || isSafeId(item.applicationId)) &&
    Array.isArray(item.log) && item.log.every((entry) => isObject(entry) && Number.isInteger(entry.index) && auditRoleIds.has(entry.role) && isText(entry.label) && isDate(entry.at));
  const isApplication = (item) => isObject(item) && isSafeId(item.id) &&
    ["id", "code", "title", "applicant", "submittedAt", "targetAt", "comparedCourse", "notes"].every((key) => isText(item[key])) &&
    isDate(item.submittedAt) && isDate(item.targetAt) &&
    ["internal", "external"].includes(item.kind) && ownerRoles.has(item.ownerRole) &&
    (item.kind === "external" ? item.ownerRole === "learner" : ["instructor", "externalInstructor"].includes(item.ownerRole)) &&
    applicationStatuses.has(item.status) && !["approved", "credentialed"].includes(item.status) &&
    typeof item.institutionalValidationConfirmed === "boolean" && item.productionEligible === false &&
    isNumber(item.elapsedDays) && isNumber(item.similarity, 0, 100) && isNumber(item.tycMatch, 0, 100) &&
    Number.isInteger(item.ects) && isNumber(item.ects, 1, 6) && isSemanticWorkload(item.workloadComponents, item.totalWorkload, item.ects) &&
    (item.formData?.workloadComponents === undefined || (isSemanticWorkload(item.formData.workloadComponents, item.formData.totalWorkload, item.ects) && JSON.stringify(item.formData.workloadComponents) === JSON.stringify(item.workloadComponents))) &&
    isNumber(item.remoteRate, 0, 100) && isNumber(item.evidence) && isNumber(item.missing) &&
    (item.portfolioRemoteShare === undefined || isNumber(item.portfolioRemoteShare, 0, 100));
  const isProgram = (item) => isObject(item) && isSafeId(item.id) &&
    ["id", "code", "title", "unit", "instructor", "mode", "summary"].every((key) => isText(item[key])) &&
    programStatuses.has(item.status) && item.productionEligible === false && Number.isInteger(item.ects) && isNumber(item.ects, 1, 6) && isSemanticWorkload(item.workloadComponents, item.workload, item.ects) &&
    isNumber(item.level, 1, 8) && isNumber(item.remoteRate, 0, 100) && isNumber(item.learners) && isNumber(item.price) &&
    Array.isArray(item.outcomes) && item.outcomes.every(isText);
  const isCredential = (item) => isObject(item) && isSafeId(item.id) && isSafeId(item.code) &&
    ["id", "code", "title", "owner", "issuer", "issuedAt", "status", "verifyPath"].every((key) => isText(item[key])) &&
    isDate(item.issuedAt) && isNumber(item.ects, 0.01) && isNumber(item.level, 1, 8) &&
    Array.isArray(item.outcomes) && item.outcomes.every(isText);
  const isEnrollment = (item) => isObject(item) && isSafeId(item.id) &&
    ["id", "programCode", "title", "learner", "status"].every((key) => isText(item[key])) &&
    isNumber(item.progress, 0, 100) && isNumber(item.ects, 0.01) && isNumber(item.remoteEcts);
  const isAssessment = (item) => isObject(item) && isSafeId(item.id) && isSafeId(item.enrollmentId) &&
    ["id", "enrollmentId", "title"].every((key) => isText(item[key])) && assessmentStatuses.has(item.status) &&
    (item.score === null || item.score === undefined || isNumber(item.score, 0, 100)) &&
    (item.evaluatorDecision === null || item.evaluatorDecision === undefined || isText(item.evaluatorDecision)) && isNumber(item.events);
  const isRecognizedCredit = (item) => isObject(item) && isSafeId(item.id) && isSafeId(item.applicationId) &&
    ["id", "applicationId", "title", "status"].every((key) => isText(item[key])) &&
    isNumber(item.ects, 0.01) && isNumber(item.remoteEcts);
  const isFinanceRecord = (item, kind) => {
    if (!isObject(item) || !isSafeId(item.id)) return false;
    if (kind === "transaction") return ["program", "learner", "channel", "status"].every((key) => isText(item[key])) && isNumber(item.gross);
    if (kind === "entitlement") return ["instructor", "evidence", "status"].every((key) => isText(item[key])) && isNumber(item.hours) && isNumber(item.gross);
    return isText(item.entitlementId) && isText(item.status) && isDate(item.createdAt) && item.realDocument === false;
  };
  const isPaymentRequest = (item) => isObject(item) && isSafeId(item.id) && isSafeId(item.programId) &&
    ["id", "programId", "programCode", "program", "learner", "channel", "status", "createdAt", "updatedAt"].every((key) => isText(item[key])) &&
    ["draft", "pending_finance", "approved", "revision", "reconciled"].includes(item.status) &&
    isDate(item.createdAt) && isDate(item.updatedAt) && isNumber(item.amount) &&
    item.realPayment === false && typeof item.enrollmentCreated === "boolean";
  const isQualificationDraft = (item) => isObject(item) && isSafeId(item.id) &&
    ["id", "frameworkId", "programTitle", "ownerRole", "ownerName", "status", "updatedAt"].every((key) => isText(item[key])) &&
    QUALIFICATION_FRAMEWORK_IDS.includes(item.frameworkId) && ["instructor", "externalInstructor"].includes(item.ownerRole) &&
    isSmartFrameworkLevel(item.frameworkId, item.level) && item.status === "pilot_draft" && isDate(item.updatedAt) &&
    Array.isArray(item.rows) && item.rows.length === 3 && item.rows.every((row) => isObject(row) &&
      ["dimension", "learningOutcome", "learningLevel", "courseContent", "assessmentMethod", "evidence", "alignmentRationale"].every((key) => isText(row[key]))
    );
  const directiveDecisionKinds = new Set(["credential", "ects", "course_substitution"]);
  const directiveDecisionStatuses = new Set(["pending_human_review", "rejected", "additional_evidence_required"]);
  const isDirectiveCode = (item) => {
    if (!isObject(item) || !isSafeId(item.id) || !isText(item.code)) return false;
    const match = item.code.match(/^MYD-(\d{4})-([A-Z0-9]{2,12})-(\d{3})$/);
    return Boolean(match) && item.id === `MYDREC-${match[1]}-${match[2]}-${match[3]}` && item.unitCode === match[2] &&
      Number.isInteger(item.versionNo) && item.versionNo >= 1 && item.versionNo <= 999 && item.status === "pilot_reserved" &&
      item.policyVersionId === "POL-DRAFT-2026-08" && item.productionEligible === false && isDate(item.createdAt);
  };
  const isDirectiveDecision = (item) => isObject(item) && isSafeId(item.id) && isSafeId(item.applicationId) &&
    directiveDecisionKinds.has(item.kind) && directiveDecisionStatuses.has(item.status) && typeof item.rationale === "string" &&
    (item.decisionBody === null || isSafeId(item.decisionBody)) && item.ruleVersion === "POL-DRAFT-2026-08" &&
    item.appealRoute === "independent_appeal_body_required" && (item.decidedAt === null || isDate(item.decidedAt)) &&
    (item.autonomousDecision === undefined || item.autonomousDecision === false);
  const isDirectiveAppeal = (item) => isObject(item) && isSafeId(item.id) && isSafeId(item.applicationId) && directiveDecisionKinds.has(item.decisionKind) &&
    item.status === "submitted" && isText(item.reason) && isSafeId(item.initialDecisionBody) && isSafeId(item.appealBody) &&
    item.initialDecisionBody !== item.appealBody && isDate(item.submittedAt) && item.productionEligible === false;
  const isDirectiveMember = (item) => isObject(item) && isSafeId(item.id) && isText(item.name) && isSafeId(item.unit_id) && isText(item.unit_type) &&
    isSafeId(item.body_membership) && isText(item.mandate) && isText(item.decision_scope) &&
    ["activeMandate", "present", "recused"].every((key) => typeof item[key] === "boolean");
  const isDirectiveSeatRequest = (item) => isObject(item) && isSafeId(item.id) && isSafeId(item.learnerId) && isDate(item.requestedAt) &&
    isText(item.idempotencyKey) && ["pending", "enrolled", "waitlisted"].includes(item.status) &&
    (item.waitlistPosition === null || item.waitlistPosition === undefined || (Number.isInteger(item.waitlistPosition) && item.waitlistPosition > 0));
  const isDirectiveOffering = (item) => isObject(item) && isSafeId(item.id) && isText(item.term) && Number.isInteger(item.capacity) && item.capacity >= 0 &&
    Array.isArray(item.requests) && item.requests.every(isDirectiveSeatRequest) &&
    new Set(item.requests.map((request) => request.id)).size === item.requests.length &&
    new Set(item.requests.map((request) => request.idempotencyKey)).size === item.requests.length &&
    new Set(item.requests.map((request) => request.learnerId)).size === item.requests.length;
  const isDirectiveMeetingValidation = (item) => item === null || (isObject(item) && item.valid === true && item.quorumMet === true && item.voteQuorumMet === true &&
    Number.isInteger(item.eligibleCount) && item.eligibleCount > 0 && Number.isInteger(item.validEligibleVoteCount) && item.validEligibleVoteCount > 0 &&
    Array.isArray(item.unknownVotes) && item.unknownVotes.length === 0 && Array.isArray(item.ineligibleVotes) && item.ineligibleVotes.length === 0 &&
    Array.isArray(item.invalidVotes) && item.invalidVotes.length === 0 && Array.isArray(item.conflictViolations) && item.conflictViolations.length === 0 &&
    item.duplicateVotes === false && item.autonomousDecision === false && isDate(item.validatedAt) && isSafeId(item.bodyId) && isText(item.mandate));
  const isDirectiveDryRun = (item) => isObject(item) && isSafeId(item.id) && isText(item.kind) && isNumber(item.amount) && item.status === "approval_required" &&
    item.realPayment === false && item.realDocument === false && item.externalRequestSent === false &&
    item.personnelApprovalRequired === true && item.financialApprovalRequired === true && isDate(item.createdAt);
  const isDirectiveState = (item) => isObject(item) && item.policyVersionId === "POL-DRAFT-2026-08" &&
    Array.isArray(item.codes) && item.codes.every(isDirectiveCode) && new Set(item.codes.map((code) => code.id)).size === item.codes.length && new Set(item.codes.map((code) => code.code)).size === item.codes.length &&
    Array.isArray(item.recognitionDecisions) && item.recognitionDecisions.length === 3 && item.recognitionDecisions.every(isDirectiveDecision) &&
    new Set(item.recognitionDecisions.map((decision) => decision.id)).size === 3 && new Set(item.recognitionDecisions.map((decision) => decision.kind)).size === 3 &&
    Array.isArray(item.appeals) && item.appeals.every(isDirectiveAppeal) && new Set(item.appeals.map((appeal) => appeal.id)).size === item.appeals.length &&
    isObject(item.credentialOutcome) && item.credentialOutcome.applicationId === "APP-042" &&
    item.credentialOutcome.independentStates === true && ["credential", "ects", "courseSubstitution"].every((key) => isObject(item.credentialOutcome[key]) && isText(item.credentialOutcome[key].status) && isText(item.credentialOutcome[key].decisionType)) &&
    isObject(item.commission) && isSafeId(item.commission.bodyId) && isText(item.commission.mandate) && Number.isInteger(item.commission.quorumRequired) && item.commission.quorumRequired > 0 &&
    Array.isArray(item.commission.members) && item.commission.members.length >= item.commission.quorumRequired && item.commission.members.every(isDirectiveMember) &&
    new Set(item.commission.members.map((member) => member.id)).size === item.commission.members.length && isDirectiveMeetingValidation(item.commission.lastValidation) &&
    Array.isArray(item.offerings) && item.offerings.length > 0 && item.offerings.every(isDirectiveOffering) &&
    Array.isArray(item.financePersonnelDryRuns) && item.financePersonnelDryRuns.every(isDirectiveDryRun);
  const isSmartAssessmentSuggestion = (item) => isObject(item) && ["method", "evidence", "rationale"].every((key) => isText(item[key]));
  const isSmartSignal = (item) => isObject(item) && isText(item.label || item.pattern) && isText(item.category) && isNumber(item.weight, 0);
  const isSmartFrameworkLevel = (frameworkId, level) => frameworkId === "tyyc" ? isNumber(level, 5, 8) : isNumber(level, 1, 8);
  const isSmartSelection = (selection) => isObject(selection) && isSafeId(selection.outcomeId) && isSafeId(selection.outcomeFingerprint) &&
    Number.isInteger(selection.outcomeIndex) && selection.outcomeIndex >= 0 && QUALIFICATION_FRAMEWORK_IDS.includes(selection.frameworkId) &&
    isSmartFrameworkLevel(selection.frameworkId, selection.level) && ["knowledge", "skills", "competence"].includes(selection.dimension) &&
    isNumber(selection.score, 0, 100) && typeof selection.applied === "boolean" && selection.autonomousDecision === false &&
    selection.institutionalValidationRequired === true && (selection.manual === undefined || typeof selection.manual === "boolean") &&
    isText(selection.descriptor) && isText(selection.rationale) && /^https:\/\//.test(selection.officialSourceUrl) &&
    Array.isArray(selection.matchedSignals) && selection.matchedSignals.every(isSmartSignal) &&
    Array.isArray(selection.suggestedContent) && selection.suggestedContent.length > 0 && selection.suggestedContent.every(isText) &&
    Array.isArray(selection.suggestedAssessments) && selection.suggestedAssessments.length > 0 && selection.suggestedAssessments.every(isSmartAssessmentSuggestion);
  const isSmartAppliedSelection = (selection) => isObject(selection) && isSafeId(selection.id) && isSafeId(selection.outcomeId) && isSafeId(selection.outcomeFingerprint) && Number.isInteger(selection.outcomeIndex) && selection.outcomeIndex >= 0 &&
    QUALIFICATION_FRAMEWORK_IDS.includes(selection.frameworkId) && isSmartFrameworkLevel(selection.frameworkId, selection.level) && ["knowledge", "skills", "competence"].includes(selection.dimension) &&
    isNumber(selection.score, 0, 100) && isDate(selection.recordedAt) && selection.autonomousDecision === false && selection.institutionalValidationRequired === true &&
    isText(selection.descriptor) && isText(selection.rationale) && /^https:\/\//.test(selection.officialSourceUrl) &&
    Array.isArray(selection.matchedSignals) && selection.matchedSignals.every(isSmartSignal) && Array.isArray(selection.suggestedContent) && selection.suggestedContent.every(isText) &&
    Array.isArray(selection.suggestedAssessments) && selection.suggestedAssessments.every(isSmartAssessmentSuggestion);
  const isSmartManualOverride = (override) => isObject(override) && isSafeId(override.id) && QUALIFICATION_FRAMEWORK_IDS.includes(override.frameworkId) && isSafeId(override.outcomeId) &&
    /^OVR-[A-Za-z0-9._:-]+-(?:tyc|eqf|tyyc)-\d+$/.test(override.id) && isSafeId(override.outcomeFingerprint) && Number.isInteger(override.outcomeIndex) && override.outcomeIndex >= 0 && isDate(override.recordedAt) &&
    isSmartFrameworkLevel(override.frameworkId, override.selectedLevel) && ["knowledge", "skills", "competence"].includes(override.selectedDimension) &&
    isText(override.reason) && ["instructor", "externalInstructor"].includes(override.actorRole) && override.isHumanSelection === true && override.finalBoardDecision === false;
  const isSmartProgram = (program) => isObject(program) && isObject(program.suggestedLevels) && isNumber(program.suggestedLevels.tyc, 1, 8) &&
    isNumber(program.suggestedLevels.eqf, 1, 8) && isNumber(program.suggestedLevels.tyyc, 5, 8) && isObject(program.dimensionCoverage) && QUALIFICATION_FRAMEWORK_IDS.every((frameworkId) => isObject(program.dimensionCoverage[frameworkId]) &&
      ["knowledge", "skills", "competence"].every((dimension) => isNumber(program.dimensionCoverage[frameworkId][dimension], 0))) &&
    isObject(program.coverage) && isNumber(program.coverage.outcomeCount, 1, 40) && isObject(program.consistency) && QUALIFICATION_FRAMEWORK_IDS.every((frameworkId) =>
      isObject(program.consistency[frameworkId]) && isNumber(program.consistency[frameworkId].min, 1, 8) && isNumber(program.consistency[frameworkId].max, 1, 8) &&
      isNumber(program.consistency[frameworkId].spread, 0, 7) && typeof program.consistency[frameworkId].consistent === "boolean") && isText(program.rationale) &&
    program.autonomousDecision === false && program.institutionalValidationRequired === true;
  const isSmartCycle = (cycle) => isObject(cycle) && cycle.mappingStatus === "provisional_advisory_crosswalk" && cycle.equivalenceClaim === false &&
    cycle.placementClaim === false && cycle.autonomousDecision === false && cycle.institutionalValidationRequired === true;
  const isSmartBoardDecision = (decision) => isObject(decision) && decision.status === "recorded_human_board_decision" &&
    ["approved", "revision_requested", "rejected", "deferred"].includes(decision.decision) && decision.source === "human_commission" &&
    decision.actorRole === "commission" && isText(decision.decidedBy) && isText(decision.rationale) && isDate(decision.decidedAt) && isObject(decision.decidedLevels) &&
    isNumber(decision.decidedLevels.tyc, 1, 8) && isNumber(decision.decidedLevels.eqf, 1, 8) && isNumber(decision.decidedLevels.tyyc, 5, 8) && decision.suggestionMutated === false && decision.autonomousDecision === false;
  const isSmartAlignment = (item) => isObject(item) && isSafeId(item.id) && isSafeId(item.applicationId) &&
    (item.programId === "pending-program" || isSafeId(item.programId)) && isSafeId(item.orderedOutcomeFingerprint) &&
    ["id", "applicationId", "programId", "applicationCode", "programTitle", "ownerRole", "ownerName", "status", "engineVersion", "advisoryNotice", "updatedAt"].every((key) => isText(item[key])) &&
    ["instructor", "externalInstructor"].includes(item.ownerRole) && item.status === "pilot_suggestion" && isDate(item.updatedAt) &&
    item.institutionalValidationRequired === true && Array.isArray(item.outcomes) && item.outcomes.length > 0 && item.outcomes.length <= QUALIFICATION_SUGGESTION_LIMITS.maxOutcomeCount &&
    item.outcomes.every((outcome, outcomeIndex) => isObject(outcome) && isSafeId(outcome.outcomeId) && isSafeId(outcome.outcomeFingerprint) &&
      outcome.outcomeIndex === outcomeIndex && outcome.outcomeFingerprint === smartOutcomeFingerprint(outcome.text, outcomeIndex) && isText(outcome.text) &&
      normalizeSmartOutcomeText(outcome.text).length <= QUALIFICATION_SUGGESTION_LIMITS.maxOutcomeLength && Array.isArray(outcome.selections) &&
      outcome.selections.length === 3 && outcome.selections.every((selection) => isSmartSelection(selection) && selection.outcomeId === outcome.outcomeId &&
        selection.outcomeIndex === outcomeIndex && selection.outcomeFingerprint === outcome.outcomeFingerprint) && new Set(outcome.selections.map((selection) => selection.frameworkId)).size === 3) &&
    new Set(item.outcomes.map((outcome) => outcome.outcomeId)).size === item.outcomes.length &&
    item.orderedOutcomeFingerprint === smartOrderedOutcomeFingerprint(item.outcomes.map((outcome) => outcome.text)) &&
    Array.isArray(item.manualOverrides) && item.manualOverrides.every(isSmartManualOverride) &&
    Array.isArray(item.appliedSelections) && item.appliedSelections.every(isSmartAppliedSelection) &&
    isSmartProgram(item.program) && isSmartCycle(item.higherEducationCycleSuggestion) &&
    (item.boardDecision === null || item.boardDecision === undefined || isSmartBoardDecision(item.boardDecision)) &&
    validateSmartSuggestionSnapshot(item.suggestionSnapshot, {
      engineVersion: item.engineVersion,
      orderedOutcomeFingerprint: item.orderedOutcomeFingerprint,
      outcomes: item.outcomes,
      program: item.program,
      manualOverrides: item.manualOverrides,
      appliedSelections: item.appliedSelections,
      higherEducationCycleSuggestion: item.higherEducationCycleSuggestion
    }).valid;
  const smartCrossReferencesAreValid = (alignments, applications, programs) => {
    if (new Set(alignments.map((item) => item.id)).size !== alignments.length) return false;
    if (new Set(alignments.map((item) => item.applicationId)).size !== alignments.length) return false;
    const linkedProgramIds = alignments.filter((item) => item.programId !== "pending-program").map((item) => item.programId);
    if (new Set(linkedProgramIds).size !== linkedProgramIds.length) return false;
    if (!applications.every((application) => application.smartAlignmentId === undefined || alignments.some((item) => item.id === application.smartAlignmentId && item.applicationId === application.id))) return false;
    if (!programs.every((program) => program.smartAlignmentId === undefined || alignments.some((item) => item.id === program.smartAlignmentId && item.programId === program.id))) return false;
    return alignments.every((alignment) => {
      const application = applications.find((item) => item.id === alignment.applicationId);
      if (!application || application.kind !== "internal" || application.ownerRole !== alignment.ownerRole || application.applicant !== alignment.ownerName || application.code !== alignment.applicationCode) return false;
      if (alignment.id !== `ALIGN-${application.id}` || alignment.outcomes.some((outcome, index) => outcome.outcomeId !== `LO-${index + 1}`)) return false;
      if (application.smartAlignmentId !== alignment.id) return false;
      const mappingBacklink = application.formData?.qualificationMapping;
      if (!mappingBacklink || mappingBacklink.id !== alignment.id || mappingBacklink.applicationId !== application.id || mappingBacklink.programId !== alignment.programId) return false;
      const applicationOutcomes = Array.isArray(application.formData?.outcomes)
        ? application.formData.outcomes.map((item) => String(item).trim()).filter(Boolean)
        : splitLearningOutcomes(application.formData?.outcomes || "");
      const alignmentOutcomes = alignment.outcomes.map((outcome) => outcome.text);
      if (applicationOutcomes.length !== alignmentOutcomes.length || applicationOutcomes.some((text, index) => normalizeSmartOutcomeText(text) !== normalizeSmartOutcomeText(alignmentOutcomes[index]))) return false;
      if (mappingBacklink.orderedOutcomeFingerprint !== alignment.orderedOutcomeFingerprint || mappingBacklink.updatedAt !== alignment.updatedAt ||
          mappingBacklink.suggestionSnapshot?.integrityHash !== alignment.suggestionSnapshot?.integrityHash) return false;
      if (alignment.programId !== "pending-program") {
        const program = programs.find((item) => item.id === alignment.programId);
        if (!program || program.code !== application.code || program.smartAlignmentId !== alignment.id) return false;
        if (program.outcomes.length !== alignmentOutcomes.length || program.outcomes.some((text, index) => normalizeSmartOutcomeText(text) !== normalizeSmartOutcomeText(alignmentOutcomes[index]))) return false;
      } else if (application.status !== "draft") {
        return false;
      }
      const outcomeById = new Map(alignment.outcomes.map((outcome) => [outcome.outcomeId, outcome]));
      if (!alignment.manualOverrides.every((override) => {
        const outcome = outcomeById.get(override.outcomeId);
        return outcome && override.actorRole === alignment.ownerRole && override.outcomeIndex === outcome.outcomeIndex && override.outcomeFingerprint === outcome.outcomeFingerprint;
      })) return false;
      if (new Set(alignment.manualOverrides.map((override) => override.id)).size !== alignment.manualOverrides.length) return false;
      if (new Set(alignment.manualOverrides.map((override) => `${override.outcomeFingerprint}:${override.frameworkId}`)).size !== alignment.manualOverrides.length) return false;
      if (!alignment.appliedSelections.every((selection) => {
        const outcome = outcomeById.get(selection.outcomeId);
        return outcome && selection.id === `APPLIED-${selection.outcomeFingerprint}-${selection.frameworkId}` && selection.outcomeIndex === outcome.outcomeIndex && selection.outcomeFingerprint === outcome.outcomeFingerprint &&
          outcome.selections.some((item) => item.frameworkId === selection.frameworkId && item.outcomeFingerprint === selection.outcomeFingerprint);
      })) return false;
      return new Set(alignment.appliedSelections.map((selection) => selection.id)).size === alignment.appliedSelections.length &&
        new Set(alignment.appliedSelections.map((selection) => `${selection.outcomeFingerprint}:${selection.frameworkId}`)).size === alignment.appliedSelections.length;
    });
  };
  const selectedApplicationIsValid = (applications) => saved.selectedApplicationId === null ||
    saved.selectedApplicationId === undefined ||
    (isText(saved.selectedApplicationId) && applications.some((item) => item.id === saved.selectedApplicationId));
  const hasCanonicalIntegrationCatalog = (integrations) => {
    if (!Array.isArray(integrations) || integrations.length !== initialState.integrations.length) return false;
    const actual = integrations.map((item) => item?.id).sort();
    const expected = initialState.integrations.map((item) => item.id).sort();
    return actual.every((id, index) => id === expected[index]);
  };
  return Boolean(
    isObject(saved) &&
    saved.version === initialState.version &&
    roleIds.has(saved.roleId) &&
    isText(saved.activePage) && typeof saved.mobileNavOpen === "boolean" && isText(saved.dataMode) &&
    arrayKeys.every((key) => Array.isArray(saved[key])) &&
    isObject(saved.scenarios) && isScenario(saved.scenarios.internal, "internal") && isScenario(saved.scenarios.recognition, "recognition") &&
    saved.applications.every(isApplication) && selectedApplicationIsValid(saved.applications) &&
    saved.programs.every(isProgram) && saved.credentials.every(isCredential) && saved.enrollments.every(isEnrollment) &&
    saved.smartAlignments.every(isSmartAlignment) && smartCrossReferencesAreValid(saved.smartAlignments, saved.applications, saved.programs) &&
    saved.assessmentSessions.every(isAssessment) && saved.recognizedCredits.every(isRecognizedCredit) &&
    hasCanonicalIntegrationCatalog(saved.integrations) && saved.integrations.every((item) => isObject(item) && isSafeId(item.id) &&
      ["id", "name", "category", "systemClass", "owner", "status", "lastTest", "sourceStatus", "purposeProposal", "dataDirection", "approvalGate", "errorScenario", "retryPolicy", "auditPolicy", "integrationTier", "myysRelevance", "publicUrl"].every((key) => isText(item[key])) &&
      ["tier1", "tier2", "tier3"].includes(item.integrationTier) && ["core", "supporting", "adjacent"].includes(item.myysRelevance) && typeof item.consultationOnly === "boolean" &&
      Array.isArray(item.operatorRoles) && item.operatorRoles.length > 0 && item.operatorRoles.every((role) => roleIds.has(role)) &&
      isObject(item.samplePayload) && item.samplePayload.mode === "dry-run" && item.samplePayload.realData === false &&
      (item.publicUrl === "" || /^https:\/\//.test(item.publicUrl)) && (item.sourceUrl === "" || /^https:\/\//.test(item.sourceUrl)) &&
      isNumber(item.stage, 0, 5) && (item.attempts === undefined || isNumber(item.attempts)) && item.realDataEnabled === false && !item.secret) &&
    saved.integrationJobs.every((item) => isObject(item) && isSafeId(item.id) && isSafeId(item.target) &&
      item.targetId === item.target && isText(item.targetLabel) &&
      ["status", "at"].every((key) => isText(item[key])) && isDate(item.at) && item.realDataSent === false) &&
    saved.notifications.every((item) => isObject(item) && isSafeId(item.id) && ["title", "body", "time"].every((key) => isText(item[key])) && Array.isArray(item.recipientRoles) && item.recipientRoles.length > 0 && item.recipientRoles.every((role) => roleIds.has(role)) && Array.isArray(item.readBy) && item.readBy.every((role) => roleIds.has(role) && item.recipientRoles.includes(role))) &&
    saved.audit.every((item) => isObject(item) && isSafeId(item.id) && isSafeId(item.entityId) && ["at", "actor", "action", "from", "to", "reason"].every((key) => isText(item[key])) && isDate(item.at) && auditRoleIds.has(item.actorRole)) &&
    isObject(saved.finance) &&
    isDirectiveState(saved.directivePilot) &&
    Array.isArray(saved.finance.transactions) &&
    Array.isArray(saved.finance.entitlements) &&
    saved.finance.transactions.every((item) => isFinanceRecord(item, "transaction")) &&
    saved.finance.entitlements.every((item) => isFinanceRecord(item, "entitlement")) &&
    (saved.finance.paymentRequests === undefined || (Array.isArray(saved.finance.paymentRequests) && saved.finance.paymentRequests.every(isPaymentRequest))) &&
    (saved.qualificationDrafts === undefined || (Array.isArray(saved.qualificationDrafts) && saved.qualificationDrafts.every(isQualificationDraft))) &&
    (saved.finance.invoiceDrafts === undefined || (Array.isArray(saved.finance.invoiceDrafts) && saved.finance.invoiceDrafts.every((item) => isFinanceRecord(item, "invoice")))) &&
    isObject(saved.finance.parameters) && ["withholding", "vat", "stamp"].every((key) => isNumber(saved.finance.parameters[key], 0, 100)) &&
    (saved.remoteSnapshot === null || saved.remoteSnapshot === undefined || (isObject(saved.remoteSnapshot) &&
      ["programs", "applications", "credentials", "integrations"].every((key) => isNumber(saved.remoteSnapshot[key])) &&
      ["qualificationLevels", "officialQualifications", "matrixTemplates", "matrixDrafts", "paymentRequests", "roleWorkflowRows", "unavailableReferenceViews", "institutionalSystems", "institutionalMappings", "institutionalScenarios", "institutionalAuditEvents", "unavailableInstitutionalViews", "publicOfficialSources", "publicOfficialSourceSupports"].every((key) => saved.remoteSnapshot[key] === undefined || isNumber(saved.remoteSnapshot[key])) &&
      ["protectedRemoteVerified", "coreRemoteVerified", "publicSourceRemoteVerified"].every((key) => saved.remoteSnapshot[key] === undefined || typeof saved.remoteSnapshot[key] === "boolean") &&
      (saved.remoteSnapshot.referenceSource === undefined || isText(saved.remoteSnapshot.referenceSource)) &&
      isDate(saved.remoteSnapshot.checkedAt)))
  );
}

function saveState() {
  uiMutationEpoch += 1;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function createAsyncRefreshGuard() {
  return {
    persistedState: localStorage.getItem(STORAGE_KEY),
    roleId: state.roleId,
    uiMutationEpoch
  };
}

function canCommitAsyncRefresh(guard) {
  try {
    const persistedState = localStorage.getItem(STORAGE_KEY);
    if (
      uiMutationEpoch !== guard.uiMutationEpoch ||
      state.roleId !== guard.roleId ||
      persistedState !== guard.persistedState
    ) return false;
    if (persistedState === null) return isValidSavedState(state);
    const persisted = JSON.parse(persistedState);
    return isValidSavedState(persisted) && persisted.roleId === guard.roleId;
  } catch {
    return false;
  }
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[character]));
}

function icon(name) {
  const safe = pageMeta[name]?.icon || name;
  return `<svg aria-hidden="true"><use href="#icon-${safe}"></use></svg>`;
}

function currentRole() {
  return roles.find((role) => role.id === state.roleId) || roles[0];
}

function initials(name) {
  return name.split(" ").filter((part) => part.length > 1).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function navigate(page, detail = "") {
  const nextHash = `#/${page}${detail ? `/${encodeURIComponent(detail)}` : ""}`;
  if (window.location.hash === nextHash) render();
  else window.location.hash = nextHash;
}

function route() {
  const parts = window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  return { page: parts[0] || "home", detail: decodeURIComponent(parts[1] || "") };
}

function isAllowed(page) {
  return ["home", "verify"].includes(page) || (roleNavigation[state.roleId] || []).includes(page);
}

function visibleApplications() {
  return filterApplicationsForRole(state.applications, state.roleId, currentRole().name);
}

function visiblePrograms() {
  return visibleProgramsForRole(state.programs, state.roleId, currentRole().name);
}

function visibleNotifications() {
  return state.notifications.filter((item) => item.recipientRoles.includes(state.roleId));
}

function isNotificationRead(item) {
  return item.readBy.includes(state.roleId);
}

function visibleAuditEvents(applications = visibleApplications()) {
  const visibleIds = new Set(applications.map((application) => application.id));
  const isOwnActor = (event) => event.actorRole === state.roleId && event.actor === currentRole().name;

  if (state.roleId === "admin") return state.audit;
  if (["learner", "instructor", "externalInstructor"].includes(state.roleId)) {
    return state.audit.filter((event) => visibleIds.has(event.entityId) || isOwnActor(event));
  }
  if (state.roleId === "coordinator") {
    return state.audit.filter((event) => visibleIds.has(event.entityId) || event.actorRole === "coordinator");
  }
  if (state.roleId === "commission") {
    return state.audit.filter((event) => visibleIds.has(event.entityId) || event.actorRole === "commission" || /^(ASM-|credential-)/.test(event.entityId));
  }
  if (state.roleId === "studentAffairs") {
    return state.audit.filter((event) => visibleIds.has(event.entityId) || event.actorRole === "studentAffairs" || /^(CR-|ENR-|credential-|INT-dpu-obs|INT-dpu-bologna)/.test(event.entityId));
  }
  if (state.roleId === "it") {
    return state.audit.filter((event) => event.actorRole === "it" || /^(INT-|JOB-)/.test(event.entityId));
  }
  if (state.roleId === "finance") {
    return state.audit.filter((event) => event.actorRole === "finance" || /^(FIN-|PAY-|TX-|INV-|ENT-)/.test(event.entityId));
  }
  return [];
}

function visibleOverviewAudit(applications) {
  return visibleAuditEvents(applications);
}

function deny(message = "Seçili demo rolü bu işlemi gerçekleştiremez.") {
  toast(message, "error");
  return false;
}

function canOperateIntegration(id) {
  const item = state.integrations.find((integration) => integration.id === id);
  return Boolean(item?.consultationOnly === false && item?.operatorRoles?.includes(state.roleId) && item.realDataEnabled === false);
}

function formatDate(value, includeTime = false) {
  if (!value) return "—";
  const date = new Date(value);
  return new Intl.DateTimeFormat("tr-TR", includeTime ? { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" } : { dateStyle: "medium", timeZone: "Europe/Istanbul" }).format(date);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 }).format(value);
}

const statusMap = {
  draft: ["Taslak", "neutral"], review: ["Ön incelemede", "warning"], commission: ["Komisyon gündeminde", "info"],
  revision: ["Revizyon bekliyor", "warning"], approved: ["Pilot onaylandı", "success"], rejected: ["Pilot reddedildi", "risk"],
  deferred: ["Kurumsal doğrulama bekliyor", "warning"],
  active: ["Yayında • Pilot", "success"], credentialed: ["Yeterlilik üretildi • Pilot", "success"], valid: ["Geçerli • Pilot", "success"], disconnected: ["Bağlı değil", "neutral"],
  simulated: ["Simülasyon", "info"], matched: ["Eşleştirildi • Simülasyon", "success"], pending: ["Bekliyor • Simülasyon", "warning"],
  completed: ["Tamamlandı • Simülasyon", "success"], scheduled: ["Planlandı • Simülasyon", "info"],
  failed: ["Hata senaryosu • Simülasyon", "risk"], recognized: ["Tanınan kredi • Pilot", "success"],
  pending_finance: ["Mali inceleme bekliyor", "warning"],
  reconciled: ["Mutabakat tamamlandı • Simülasyon", "success"]
};

function statusBadge(status, override) {
  const [label, tone] = statusMap[status] || [override || status, "neutral"];
  return `<span class="status status--${tone}">${escapeHtml(override || label)}</span>`;
}

function pageHeader(kicker, title, subtitle, actions = "") {
  return `<header class="page-header"><div><div class="page-kicker">${escapeHtml(kicker)}</div><h1>${escapeHtml(title)}</h1><p class="page-subtitle">${escapeHtml(subtitle)}</p></div>${actions ? `<div class="page-actions">${actions}</div>` : ""}</header>`;
}

function notice(tone, title, text) {
  return `<div class="notice notice--${tone}">${icon(tone === "success" ? "shield" : "alert")}<div><strong>${escapeHtml(title)}</strong>${escapeHtml(text)}</div></div>`;
}

function toast(message, tone = "success") {
  const node = document.createElement("div");
  node.className = `toast toast--${tone}`;
  node.setAttribute("role", tone === "error" ? "alert" : "status");
  node.innerHTML = `${icon(tone === "success" ? "check" : "alert")}<div>${escapeHtml(message)}</div>`;
  toastRegion.append(node);
  setTimeout(() => node.remove(), 4300);
}

function openModal(content) {
  lastFocused = document.activeElement;
  modal.innerHTML = content;
  modalBackdrop.hidden = false;
  for (const selector of [".pilot-banner", ".site-header", ".app-shell"]) {
    const element = document.querySelector(selector);
    if (element) element.inert = true;
  }
  document.body.style.overflow = "hidden";
  setTimeout(() => modal.querySelector("button, input, select, textarea")?.focus(), 0);
}

function closeModal() {
  modalBackdrop.hidden = true;
  modal.innerHTML = "";
  for (const selector of [".pilot-banner", ".site-header", ".app-shell"]) {
    const element = document.querySelector(selector);
    if (element) element.inert = false;
  }
  document.body.style.overflow = "";
  lastFocused?.focus?.();
}

function closeMobileNav(restoreFocus = false) {
  document.body.classList.remove("nav-open");
  const toggle = document.querySelector("[data-action='toggle-nav']");
  toggle?.setAttribute("aria-expanded", "false");
  toggle?.setAttribute("aria-label", "Menüyü aç");
  if (restoreFocus) setTimeout(() => toggle?.focus(), 0);
}

function activateCommissionTab(tabId) {
  if (!["summary", "evidence", "curriculum", "smart", "history"].includes(tabId)) return;
  currentCommissionTab = tabId;
  render();
  setTimeout(() => document.querySelector(`#commission-tab-${currentCommissionTab}`)?.focus(), 0);
}

function modalTemplate(title, body, footer = "") {
  return `<header class="modal-header"><div><div class="page-kicker">Kontrollü pilot</div><h2 id="modal-title">${escapeHtml(title)}</h2></div><button class="icon-button" type="button" data-action="close-modal" aria-label="Pencereyi kapat">${icon("close")}</button></header><div class="modal-body">${body}</div>${footer ? `<footer class="modal-footer">${footer}</footer>` : ""}`;
}

function renderShell() {
  roleSelect.innerHTML = roles.map((role) => `<option value="${role.id}" ${role.id === state.roleId ? "selected" : ""}>${escapeHtml(role.label)}</option>`).join("");
  const role = currentRole();
  personaCard.innerHTML = `<div class="persona-top"><span class="avatar" aria-hidden="true">${initials(role.name)}</span><div><strong>${escapeHtml(role.name)}</strong><small>${escapeHtml(role.title)}</small></div></div><span class="persona-badge">${escapeHtml(role.label)}</span>`;
  const active = route().page;
  sideNav.innerHTML = `<button class="nav-link ${active === "home" ? "active" : ""}" type="button" data-nav="home" ${active === "home" ? `aria-current="page"` : ""}>${icon("home")}<span>Pilot Ana Sayfa</span></button>${(roleNavigation[state.roleId] || []).map((page) => `<button class="nav-link ${active === page ? "active" : ""}" type="button" data-nav="${page}" ${active === page ? `aria-current="page"` : ""}>${icon(pageMeta[page].icon)}<span>${escapeHtml(pageMeta[page].label)}</span></button>`).join("")}`;
  const notificationAllowed = isAllowed("notifications");
  notificationButton.hidden = !notificationAllowed;
  notificationButton.disabled = !notificationAllowed;
  notificationButton.setAttribute("aria-hidden", String(!notificationAllowed));
  document.querySelector("#notification-count").textContent = String(visibleNotifications().filter((item) => !isNotificationRead(item)).length);
  document.querySelector("#data-mode-label").textContent = state.dataMode;
}

function render() {
  renderShell();
  const { page, detail } = route();
  state.activePage = page;
  saveState();
  if (!isAllowed(page)) {
    root.innerHTML = unauthorizedPage(page);
  } else {
    const renderer = pages[page] || pages.overview;
    root.innerHTML = renderer(detail);
  }
  if (page === "proposal" && isAllowed("proposal")) {
    smartSuggestionReport = null;
    smartSuggestionApplied = [];
    window.clearTimeout(smartSuggestionTimer);
  }
  closeMobileNav();
  const announcedTitle = page === "verify" ? "Pilot belge doğrulama" : (pageMeta[page]?.label || "Sayfa");
  routeAnnouncer.textContent = `${announcedTitle} sayfası açıldı`;
  document.title = `${announcedTitle} • KDPÜ MYYS`;
  window.scrollTo({ top: 0, behavior: "instant" });
  setTimeout(() => root.focus({ preventScroll: true }), 0);
}

function unauthorizedPage(page) {
  return `<div class="page-container">${pageHeader("Rol bazlı erişim", "Bu bölüm seçili demo rolüne açık değil", `${currentRole().label} rolü, “${pageMeta[page]?.label || page}” görünümüne erişemez. Bu kontrol yalnızca pilot yetki davranışını örnekler.`)}<div class="card empty-state"><div class="empty-icon">${icon("lock")}</div><h3>Yetkisiz pilot rota</h3><p>Önceki role ait hiçbir içerik gösterilmedi. Role uygun panele dönün veya üst bölümden başka bir demo rolü seçin.</p><button class="button" data-nav="overview">Role uygun panele dön</button></div></div>`;
}

function homePage() {
  const catalogAction = state.roleId === "learner" ? `<button class="button button--secondary" data-nav="catalog">${icon("book")} Mikro yeterlilikleri incele</button>` : "";
  return `<div class="page-container">
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-art"><img src="assets/illustrations/myys-hero.webp" alt="Üniversite, öğrenenler, eğitici, akademik komisyon ve dijital yeterlilik arasında kurulan kontrollü ekosistem illüstrasyonu" width="1400" height="896" fetchpriority="high" /></div>
      <div class="hero-copy">
        <div class="hero-logo-row"><img src="assets/brand/kdpu-logo-web.png" alt="Kütahya Dumlupınar Üniversitesi" /><span class="line"></span><img src="assets/brand/go-icon-web.png" alt="" /></div>
        <div class="eyebrow">Mikro Yeterlilik Yönetim Sistemi • Kontrollü Pilot</div>
        <h1 id="hero-title">Kısa öğrenmeleri <span>izlenebilir akademik kazanımlara</span> dönüştüren pilot</h1>
        <p>Başvuru, kanıt, komisyon değerlendirmesi, dijital yeterlilik, entegrasyon ve mali süreçleri ortak bir denetim izi içinde örnekler.</p>
        <div class="hero-actions"><button class="button" data-action="demo-login">${icon("arrow")} ${escapeHtml(currentRole().label)} panelini aç</button>${catalogAction}<button class="button button--ghost" data-action="pilot-info">Pilot kapsamını görüntüle</button></div>
        <div class="source-strip"><span>${icon("shield")} Gerçek veri yok</span><span>${icon("check")} İnsan kararı merkezde</span><span>${icon("network")} Entegrasyonlar bağlı değil</span></div>
      </div>
    </section>
    <section class="section"><div class="section-heading"><div><div class="page-kicker">Uçtan uca izlenebilirlik</div><h2>Altı evre, tek kanıt zinciri</h2></div><p>Her evre; rol, karar sahibi, gerekçe, kanıt ve zaman damgasıyla görünür olur. Pilot analizler nihai akademik karar yerine geçmez.</p></div><div class="lifecycle-grid">${lifecycle.map((item) => `<article class="life-card"><span class="life-no">${item.no}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.description)}</p></article>`).join("")}</div></section>
    <section class="section" aria-labelledby="financial-integration-title">
      <div class="section-heading"><div><div class="page-kicker">Mali entegrasyon taslağı</div><h2 id="financial-integration-title">GİB/e-Arşiv ve MYS/MAYS neyi örnekliyor?</h2></div><p>Her iki kapı da varsayılan olarak bağlı değildir. Bu pilot, yalnız onay sırasını, hata senaryosunu ve denetim kaydını görünür kılar.</p></div>
      <div class="grid grid-2">
        <article class="card integration-explainer"><div class="card-body"><div class="integration-head"><span class="integration-mark">GİB</span>${statusBadge("disconnected")}</div><h3>GİB / e-Arşiv taslak kapısı</h3><p class="page-subtitle">Mali birimce doğrulanmış bir tahsilat sonrasında e-belge oluşturma sürecine aktarılması önerilen alanları ve onayları temsil eder. Gerçek mükellef bilgisi, e-Arşiv faturası, servis adresi veya belge numarası üretilmez.</p><ul class="scope-list"><li>Örnek belge üst verisi</li><li>Mali onay ve hata/yeniden deneme adımı</li><li><strong>Gerçek veri gönderilmez</strong></li></ul></div></article>
        <article class="card integration-explainer"><div class="card-body"><div class="integration-head"><span class="integration-mark">MYS</span>${statusBadge("disconnected")}</div><h3>MYS / MAYS kontrollü aktarım taslağı</h3><p class="page-subtitle">Döner sermaye ve mali yönetim süreçlerinde gerekli olabilecek harcama, ödeme, hak ediş ve mutabakat kayıtlarının kontrollü servis katmanından geçirilmesini örnekler. Kurumsal kullanım ve alan eşlemesi ayrıca doğrulanmalıdır.</p><ul class="scope-list"><li>Onay kapısı ve görev ayrılığı</li><li>Hak ediş / mutabakat simülasyonu</li><li><strong>Canlı mali sisteme bağlı değil</strong></li></ul></div></article>
      </div>
    </section>
    <section class="section grid grid-3">
      <article class="card"><div class="card-body"><div class="kpi-icon">${icon("users")}</div><h3 style="margin-top:15px">Akademik yetki korunur</h3><p class="page-subtitle">Yapay zekâ yalnız karşılaştırılabilir pilot analiz üretir; nihai karar komisyon ve yetkili kuruldadır.</p></div></article>
      <article class="card"><div class="card-body"><div class="kpi-icon">${icon("shield")}</div><h3 style="margin-top:15px">Mahremiyet sınırlandırılır</h3><p class="page-subtitle">Kamera, mikrofon, biyometri, gerçek kimlik ve ödeme verisi toplanmaz; tüm kayıtlar açıkça sentetiktir.</p></div></article>
      <article class="card"><div class="card-body"><div class="kpi-icon">${icon("network")}</div><h3 style="margin-top:15px">Entegrasyonlar aşamalıdır</h3><p class="page-subtitle">ÖBİS, YÖKSİS, e-Devlet, GİB ve MYS/MAYS kartları sadece dry-run ve audit senaryoları sunar.</p></div></article>
    </section>
  </div>`;
}

function overviewPage() {
  const role = currentRole();
  const profile = roleOverviewProfile(state.roleId);
  const applications = visibleApplications();
  const auditEvents = visibleOverviewAudit(applications);
  const pending = applications.filter((item) => ["review", "commission", "revision"].includes(item.status)).length;
  const dueSoon = applications.filter((item) => item.elapsedDays >= 15 && !["approved", "rejected"].includes(item.status)).length;
  const unread = visibleNotifications().filter((item) => !isNotificationRead(item)).length;
  const notificationValue = isAllowed("notifications") ? unread : "Kapalı";
  const notificationNote = isAllowed("notifications") ? "Yalnız uygulama içi; SMS/e-posta gönderilmez" : "Bu rolün bildirim çalışma alanı yoktur";
  const auditAction = isAllowed("audit") ? `<button class="button button--ghost button--sm" data-nav="audit">Tümünü gör</button>` : "";
  const auditContent = auditEvents.length ? `<div class="timeline">${auditEvents.slice(0,4).map(auditTimeline).join("")}</div>` : `<div class="empty-inline"><strong>Bu role ait denetim olayı yok</strong><span>Yeni bir pilot işlem yaptığınızda burada görünür.</span></div>`;
  return `<div class="page-container">${pageHeader("Rol bazlı operasyon", `${role.label} genel bakışı`, `${role.name} için yalnızca kurgusal pilot veriler ve role uygun eylemler gösteriliyor.`, `<button class="button button--secondary" data-action="reset-demo">${icon("refresh")} Demo verisini sıfırla</button>`)}
    <section class="role-overview" data-role-overview="${state.roleId}" aria-labelledby="role-workspace-title">
      <div><span class="role-overview__eyebrow">Aktif demo çalışma alanı</span><h2 id="role-workspace-title">${escapeHtml(profile.title)}</h2><p>${escapeHtml(profile.scope)}</p></div>
      <div class="role-overview__boundary"><strong>Bu rolün sınırı</strong><span>${escapeHtml(profile.boundary)}</span></div>
      <button class="button button--secondary" data-nav="${profile.primaryPage}">${escapeHtml(profile.primaryAction)} ${icon("arrow")}</button>
    </section>
    <div class="grid grid-4">
      ${kpi("Aktif başvurular", pending, "İnceleme, komisyon veya revizyon aşamasında", "file")}
      ${kpi("Yaklaşan pilot süre", dueSoon, "30 günlük gösterge kurumsal doğrulamaya açıktır", "clock")}
      ${kpi("Pilot yeterlilik", state.credentials.length, "Yalnız bu Preview ortamında doğrulanabilir", "wallet")}
      ${kpi("Okunmamış bildirim", notificationValue, notificationNote, "bell")}
    </div>
    <div class="grid grid-2 section">
      <section class="card"><div class="card-header"><div><h2>Rolünüze uygun sonraki adımlar</h2><p>Görevler çalışma alanına göre önceliklendirildi.</p></div>${statusBadge("simulated")}</div><div class="card-body">${roleTasks(state.roleId)}</div></section>
      <section class="card"><div class="card-header"><div><h2>Son denetim olayları</h2><p>Her durum değişikliği gerekçe ve aktörle birlikte tutulur.</p></div>${auditAction}</div><div class="card-body">${auditContent}</div></section>
    </div>
    <div class="section">${notice("warning", "Pilot kural uyarısı", "30 gün, %10 AKTS, %50 uzaktan kredi ve benzerlik bantları kaynak dosyalardaki öneri/ön kontrol değerleridir; kurumsal ve Senato doğrulaması olmadan nihai karar üretmez.")}</div>
  </div>`;
}

function roleOverviewProfile(roleId) {
  return {
    learner: { title: "Öğrenme, başvuru ve ödeme demo akışı", scope: "Kataloğu inceler; kendi başvurusunu, mali yönlendirmesini, eğitimini ve yeterlilik cüzdanını izler.", boundary: "Başka kişinin kaydını veya akademik/mali kararı değiştiremez.", primaryPage: "catalog", primaryAction: "Programa başvur" },
    instructor: { title: "Üniversite içi program tasarım alanı", scope: "Program önerisini, öğrenme çıktısını, AKTS iş yükünü, rubriği ve kalite kanıtlarını hazırlar.", boundary: "Komisyon adına onay, ret veya mali işlem yapamaz.", primaryPage: "proposal", primaryAction: "Program önerisi oluştur" },
    externalInstructor: { title: "Kurum dışı eğitici kanıt ve öneri alanı", scope: "Kendi demo kimliğiyle program önerisi ve eğitici yeterlilik kanıt üst verisi oluşturur.", boundary: "Üniversite içi eğitici gibi işaretlenmez; başka eğiticinin taslağını göremez.", primaryPage: "proposal", primaryAction: "Dış eğitici önerisini aç" },
    coordinator: { title: "Koordinatörlük / SEM ön inceleme alanı", scope: "Başvuru bütünlüğünü, süre göstergesini, eksik kanıtı ve komisyon gündemine hazırlığı yönetir.", boundary: "Nihai akademik onay veya gerekçeli ret veremez.", primaryPage: "applications", primaryAction: "Gelen başvuruları incele" },
    commission: { title: "Akademik insan kararı çalışma alanı", scope: "Karşılaştırılabilir kanıtları inceler; gerekçeli onay, ret, revizyon veya çekimser görüş kaydeder.", boundary: "Pilot analiz karar değildir; nihai yetki insan komisyonundadır.", primaryPage: "commission", primaryAction: "Karar masasını aç" },
    studentAffairs: { title: "AKTS, kayıt ve belge kontrol alanı", scope: "Dış kazanım, AKTS portföyü, yapılandırılmış belge ve ÖBİS aktarım taslağını inceler.", boundary: "Gerçek öğrenci kaydı veya canlı ÖBİS aktarımı oluşturamaz.", primaryPage: "applications", primaryAction: "AKTS ön kontrolünü aç" },
    it: { title: "Entegrasyon ve teknik kontrol alanı", scope: "Bağlı olmayan servis kapılarını, hata/yeniden deneme simülasyonlarını ve audit sağlığını izler.", boundary: "Canlı uç noktaya veri gönderemez; akademik karar veremez.", primaryPage: "integrations", primaryAction: "Entegrasyon merkezini aç" },
    finance: { title: "Finans / Döner Sermaye inceleme kuyruğu", scope: "Öğrenenden gelen ödeme demolarını ön onay, revizyon ve mutabakat adımlarıyla işler; hak edişi izler.", boundary: "Gerçek para, kart verisi, fatura veya kesin vergi hesabı oluşturamaz.", primaryPage: "finance", primaryAction: "Mali inceleme kuyruğunu aç" },
    admin: { title: "Teknik pilot yönetim ve gözetim alanı", scope: "Rol-yetki matrisini, modülleri, entegrasyon simülasyonlarını ve denetim izini teknik açıdan gözlemler.", boundary: "Akademik veya mali karar sahibi değildir; production yetkisi yoktur.", primaryPage: "reports", primaryAction: "Yönetim raporunu aç" }
  }[roleId];
}

function scenariosPage() {
  return `<div class="page-container">${pageHeader("Çalışan pilot akışlar", "Uçtan uca demo senaryoları", "Her “sonraki adım” eylemi tarayıcıdaki izole pilot veri katmanını, rolü ve denetim izini gerçekten günceller. Yenileme sonrasında durum korunur.", `<button class="button button--secondary" data-action="reset-demo">${icon("refresh")} Tüm senaryoları sıfırla</button>`)}
    ${notice("warning", "Kontrollü yürütme", "Adımlar sentetik veriyle çalışır. Yapay zekâ hiçbir adımda karar sahibi değildir; entegrasyon kayıtlarında realDataSent=false kalır.")}
    <div class="grid grid-2 section">
      ${scenarioCard("internal", "Senaryo 1", "Üniversite içi program önerisi", "Öneri ve akademik inceleme sonrası kurumsal doğrulama kapısı; yayın, kayıt, değerlendirme ve belge bloke")}
      ${scenarioCard("recognition", "Senaryo 2", "Kurum dışı kazanımın tanınması", "Kanıt ve pilot karşılaştırma sonrası erteleme; kredi/ikame kapalı, yalnız bloke aktarım dry-run")}
    </div>
  </div>`;
}

function scenarioCard(kind, kicker, title, description) {
  const scenario = state.scenarios[kind];
  const steps = scenarioDefinitions[kind];
  const percent = Math.round((scenario.step / steps.length) * 100);
  const next = steps[scenario.step];
  return `<section class="card scenario-card"><div class="card-header"><div><span class="table-subtitle">${kicker}</span><h2>${title}</h2><p>${description}</p></div>${scenario.completed ? statusBadge("completed") : statusBadge("simulated", `${scenario.step}/${steps.length} adım`)}</div><div class="card-body"><div class="progress" role="progressbar" aria-label="${title} ilerlemesi" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><span style="width:${percent}%"></span></div><ol class="scenario-steps">${steps.map(([role,label], index) => `<li class="${index < scenario.step ? "done" : index === scenario.step ? "current" : ""}"><span>${index + 1}</span><div><strong>${escapeHtml(label)}</strong><small>${escapeHtml(roleLabel(role))}</small></div></li>`).join("")}</ol>${scenario.completed ? `<div class="notice notice--warning">${icon("shield")}<div><strong>Güvenli pilot senaryosu tamamlandı</strong>${kind === "internal" ? "Başvuru ertelendi; yayın, kayıt, değerlendirme veya belge oluşturulmadı." : "Tanıma ertelendi; AKTS, ders ikamesi veya canlı aktarım oluşturulmadı."}</div></div>` : `<button class="button scenario-next" data-action="run-scenario" data-kind="${kind}">${icon("arrow")} Sonraki adım: ${escapeHtml(next[1])}</button>`}${scenario.completed ? `<button class="button button--secondary scenario-next" data-action="open-scenario-result" data-kind="${kind}">${kind === "internal" ? "Ertelenmiş başvuruyu aç" : "Bloke dry-run loglarını aç"}</button>` : ""}</div></section>`;
}

function roleLabel(role) {
  if (role === "system") return "Karar vermeyen pilot hizmet";
  return roles.find((item) => item.id === role)?.label || role;
}

function learningPage() {
  const completedEcts = state.enrollments.filter((item) => item.status === "completed").reduce((sum,item)=>sum+Number(item.ects),0);
  const recognizedEcts = state.recognizedCredits.reduce((sum,item)=>sum+Number(item.ects),0);
  const remoteEcts = state.enrollments.reduce((sum,item)=>sum+Number(item.remoteEcts || 0),0) + state.recognizedCredits.reduce((sum,item)=>sum+Number(item.remoteEcts || 0),0);
  const total = completedEcts + recognizedEcts;
  const remoteShare = total ? Math.round(remoteEcts / total * 100) : 0;
  return `<div class="page-container">${pageHeader("Öğrenen çalışma alanı", "Eğitimlerim, değerlendirmelerim ve AKTS", "Kayıtlar yalnız seçili sentetik öğrenenin yerel pilot çalışma alanındadır; resmî transkript veya ÖBİS kaydı değildir.")}
    <div class="grid grid-4">${kpi("Tamamlanan pilot AKTS",completedEcts,"Eğitim kayıtlarından","book")}${kpi("Tanınan pilot AKTS",recognizedEcts,"Dış kazanım kayıtlarından","check")}${kpi("Toplam pilot kayıt",`${total} AKTS`,"Payda ve üst sınır kurumsal doğrulama bekliyor","chart")}${kpi("Uzaktan kaynak payı",`%${remoteShare}`,"%50 doğrulanmamış örnek gösterge; blok değildir","network")}</div>
    <div class="grid grid-2 section"><section class="card"><div class="card-header"><div><h2>Eğitimlerim</h2><p>Kayıt ve ilerleme durumu</p></div></div><div class="card-body"><div class="timeline">${state.enrollments.map((item)=>`<div class="timeline-item"><div class="timeline-marker"></div><div class="timeline-content"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.programCode)} • ${item.ects} AKTS • %${item.progress} ilerleme</span>${statusBadge(item.status)}</div></div>`).join("") || `<p class="page-subtitle">Henüz pilot eğitim kaydı yok.</p>`}</div></div></section><section class="card"><div class="card-header"><div><h2>Değerlendirmelerim</h2><p>İnsan değerlendirici kararları</p></div></div><div class="card-body"><div class="timeline">${state.assessmentSessions.map((item)=>`<div class="timeline-item"><div class="timeline-marker"></div><div class="timeline-content"><strong>${escapeHtml(item.title)}</strong><span>${item.score ?? "—"}/100 • ${escapeHtml(item.evaluatorDecision || "İnceleme bekliyor")}</span>${statusBadge(item.status)}</div></div>`).join("") || `<p class="page-subtitle">Henüz pilot değerlendirme yok.</p>`}</div></div></section></div>
    ${state.recognizedCredits.length ? `<section class="card section"><div class="card-header"><div><h2>Tanınan dış kazanımlar</h2><p>Yalnız pilot kredi defteri</p></div></div><div class="card-body">${state.recognizedCredits.map((item)=>`<div class="integration-head"><div><strong>${escapeHtml(item.title)}</strong><span class="table-subtitle">${item.ects} AKTS • ${item.remoteEcts} uzaktan kaynaklı AKTS</span></div>${statusBadge("recognized")}</div>`).join("")}</div></section>` : ""}
  </div>`;
}

function kpi(label, value, note, iconName) {
  return `<article class="card kpi-card"><div class="kpi-label"><span>${escapeHtml(label)}</span><span class="kpi-icon">${icon(iconName)}</span></div><div class="kpi-value">${escapeHtml(value)}</div><div class="kpi-note">${escapeHtml(note)}</div></article>`;
}

function roleTasks(roleId) {
  const tasks = {
    learner: [["Eğitim başvurusu ve mali yönlendirmeyi izle", "payments", "Gerçek ödeme yok"], ["Aktif programları incele", "catalog", "3 pilot program"], ["Yeterliliğini doğrula", "wallet", "1 pilot belge"]],
    instructor: [["Program önerisini komisyon için gözden geçir", "proposal", "MY-PRG-2026-014"], ["Ölçme rubriğini aç", "assessment", "Taslak kanıt"], ["Program durumlarını izle", "applications", "3 kayıt"]],
    externalInstructor: [["Yetkinlik kanıtı yükleme alanını incele", "proposal", "Simülasyon"], ["Program önerisi oluştur", "proposal", "Yeni taslak"], ["Bildirimleri kontrol et", "notifications", "Uygulama içi"]],
    coordinator: [["Eksik belge kontrolünü tamamla", "applications", "1 başvuru"], ["Süre göstergelerini incele", "reports", "1 yaklaşan kayıt"], ["Komisyon gündemini aç", "commission", "2 kayıt"]],
    commission: [["Karşılaştırma analizini incele", "commission", "MY-PRG-2026-014"], ["Gerekçeli görüş ekle", "commission", "İnsan kararı"], ["Karar geçmişini denetle", "audit", "İzlenebilir kayıt"]],
    studentAffairs: [["AKTS ön kontrolünü incele", "applications", "%10 pilot sınırı"], ["ÖBİS dry-run kaydını aç", "integrations", "Bağlı değil"], ["Belge alanlarını karşılaştır", "wallet", "EK-1 taslağı"]],
    it: [["Entegrasyon onay kapılarını test et", "integrations", `${state.integrations.length} kontrollü katalog kaydı`], ["Audit kayıtlarını incele", "audit", "Gerçek veri yok"], ["Sistem sağlığı özetini aç", "reports", "Pilot görünüm"]],
    finance: [["Öğrenen ödeme demo kuyruğunu incele", "finance", "Ön onay / revizyon / mutabakat"], ["Hak ediş taslağını doğrula", "finance", "Mali onay gerekli"], ["Bildirimleri kontrol et", "notifications", "Yalnız uygulama içi"]],
    admin: [["Rol ve kapsam görünümünü denetle", "overview", "9 demo rolü"], ["Entegrasyonları doğrula", "integrations", "Production kapalı"], ["Audit izini dışa aktarma simülasyonu", "audit", "Sentetik veri"]]
  }[roleId] || [];
  return `<div class="timeline">${tasks.map(([title, page, meta], index) => `<div class="timeline-item"><div class="timeline-marker"></div><div class="timeline-content"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(meta)}</span><button class="text-button" data-nav="${page}">Aç</button></div></div>`).join("")}</div>`;
}

function catalogPage() {
  const proposalAction = ["instructor","externalInstructor"].includes(state.roleId) ? `<button class="button" data-nav="proposal">${icon("plus")} Program öner</button>` : "";
  const programs = visiblePrograms();
  const catalogContent = programs.length
    ? `<div class="grid grid-3" id="catalog-grid">${programs.map(programCard).join("")}</div><div class="card empty-state" id="catalog-filter-empty" hidden><div class="empty-icon">${icon("search")}</div><h3>Filtreyle eşleşen program yok</h3><p>Arama metnini veya TYÇ düzeyi filtresini değiştirin.</p><button class="button button--secondary" data-action="clear-catalog">Filtreleri temizle</button></div>`
    : `<div class="card empty-state" id="catalog-grid"><div class="empty-icon">${icon("book")}</div><h3>Yayımlanmış pilot program yok</h3><p>Bu katalog yalnız aktif durumdaki ve öğrenene açık sentetik programları gösterir.</p></div>`;
  return `<div class="page-container">${pageHeader("Öğrenme kataloğu", "Mikro yeterlilik programları", "Katalogdaki tüm programlar kurgusal pilot kayıtlardır; aktif görünen programlar gerçek kayıt veya ödeme kabul etmez.", proposalAction)}
    <div class="toolbar"><div class="search">${icon("search")}<label class="sr-only" for="catalog-search">Program, birim veya eğitici ara</label><input id="catalog-search" type="search" placeholder="Program, birim veya eğitici ara" /></div><div class="toolbar-group"><select class="select" id="catalog-level" aria-label="TYÇ düzeyi filtresi"><option value="">Tüm TYÇ düzeyleri</option><option value="6">TYÇ 6</option><option value="7">TYÇ 7</option></select><button class="button button--secondary button--sm" data-action="clear-catalog">Filtreleri temizle</button></div></div>
    ${catalogContent}
  </div>`;
}

function paymentsPage() {
  const requests = visiblePaymentRequestsForRole(state, state.roleId, currentRole().name);
  const current = requests.find((item) => ["draft", "revision", "pending_finance", "approved"].includes(item.status)) || requests[0];
  const content = current
    ? paymentRequestPanel(current)
    : `<section class="card empty-state"><div class="empty-icon">${icon("coins")}</div><h3>Ödeme demo başvurusu yok</h3><p>Ücretli bir pilot programın ayrıntısından “Başvuru ve ödeme demosuna geç” düğmesini kullanın.</p><button class="button" data-nav="catalog">Pilot programları incele</button></section>`;
  const history = requests.length
    ? `<section class="card section"><div class="card-header"><div><h2>Başvuru ve mali yönlendirme geçmişim</h2><p>Yalnız ${escapeHtml(currentRole().name)} adına oluşturulan sentetik kayıtlar</p></div></div><div class="table-wrap"><table><caption class="sr-only">Öğrenenin ödeme demo başvuruları</caption><thead><tr><th scope="col">Kayıt</th><th scope="col">Program</th><th scope="col">Tutar</th><th scope="col">Kanal</th><th scope="col">Durum</th></tr></thead><tbody>${requests.map((item) => `<tr><td><span class="table-title">${escapeHtml(item.id)}</span><span class="table-subtitle">${formatDate(item.updatedAt, true)}</span></td><td>${escapeHtml(item.program)}</td><td>${formatCurrency(item.amount)}</td><td>${escapeHtml(item.channel)}</td><td>${paymentStatusBadge(item)}</td></tr>`).join("")}</tbody></table></div></section>`
    : "";
  return `<div class="page-container">${pageHeader("Eğitim başvurusu • Mali yönlendirme", "Eğitim başvurusu ve ödeme demosu", "Program seçimi, ödeme kanalı tercihi, Finans / Döner Sermaye incelemesi ve mutabakat adımları gerçek para veya ödeme aracı verisi olmadan örneklenir.", `<button class="button button--secondary" data-nav="catalog">${icon("book")} Kataloğa dön</button>`)}
    ${notice("warning", "Gerçek ödeme alınmaz", "Kart numarası, banka hesabı, T.C. kimlik numarası veya kişisel mali veri istenmez. GİB/e-Arşiv ve MYS/MAYS bağlı değildir; yalnız mali işlere uygulama içi yönlendirme oluşturulur.")}
    ${content}${history}
  </div>`;
}

function paymentRequestPanel(request) {
  const ranks = { draft: 1, revision: 1, pending_finance: 2, approved: 3, reconciled: 4 };
  const rank = ranks[request.status] || 1;
  const steps = [
    [1, "Program seçildi", request.programCode],
    [2, "Mali işlere yönlendirme", request.status === "draft" || request.status === "revision" ? "Kanal seçimi bekliyor" : request.channel],
    [3, "Mali ön inceleme", request.status === "approved" || request.status === "reconciled" ? "Ön onay tamamlandı" : request.status === "revision" ? "Düzeltme istendi" : "Finans / Döner Sermaye"],
    [4, "Mutabakat ve pilot kayıt", request.status === "reconciled" ? "Eğitim kaydı açıldı" : "Gerçek tahsilat yok"]
  ];
  const editable = ["draft", "revision"].includes(request.status);
  const form = editable
    ? `<form class="card payment-form" id="payment-request-form"><div class="card-header"><div><h2>Ödeme kanalı demosu</h2><p>Yalnız kanal adı seçilir; ödeme aracı bilgisi alınmaz.</p></div>${paymentStatusBadge(request)}</div><div class="card-body form-grid"><input type="hidden" name="id" value="${escapeHtml(request.id)}" /><div class="field full"><label class="required" for="payment-channel">Pilot kanal</label><select id="payment-channel" name="channel" required><option value="">Kanal seçin</option><option>Sanal POS simülasyonu</option><option>Havale/EFT simülasyonu</option></select><small>Her iki seçenek de yalnız iş akışı etiketidir; gerçek tahsilat başlatmaz.</small></div><label class="consent-row full"><input type="checkbox" name="confirm" required /><span>Bu işlemin gerçek ödeme veya kayıt oluşturmadığını ve yalnız mali inceleme demosu olduğunu anlıyorum.</span></label></div><div class="card-footer"><span><strong>${formatCurrency(request.amount)}</strong><span class="table-subtitle">Pilot program ücreti • mali birim doğrulaması gerekir</span></span><button class="button" type="button" data-action="submit-payment-request">Finans / Döner Sermaye'ye gönder ${icon("arrow")}</button></div></form>`
    : `<section class="card"><div class="card-header"><div><h2>${escapeHtml(request.program)}</h2><p>${escapeHtml(request.id)} • ${formatCurrency(request.amount)} • ${escapeHtml(request.channel)}</p></div>${paymentStatusBadge(request)}</div><div class="card-body">${request.reviewReason ? notice(request.status === "revision" ? "warning" : "success", "Mali birim notu", request.reviewReason) : notice("success", "Mali işlere iletildi", "Başvuru Finans / Döner Sermaye demo kuyruğunda görünür; gerçek tahsilat veya dış bildirim oluşmaz.")}${request.status === "reconciled" ? `<button class="button" data-nav="learning">Pilot eğitim kaydını aç</button>` : `<button class="button button--secondary" data-action="handoff-finance">Finans / Döner Sermaye demo rolüne geç</button>`}</div></section>`;
  return `<section class="payment-flow section" aria-label="Ödeme demo ilerlemesi"><ol>${steps.map(([step, title, note]) => `<li class="${step < rank ? "done" : step === rank ? "current" : ""}"><span>${step < rank ? icon("check") : step}</span><div><strong>${escapeHtml(title)}</strong><small>${escapeHtml(note)}</small></div></li>`).join("")}</ol></section>${form}`;
}

function paymentStatusBadge(request) {
  if (request.status === "approved") return statusBadge("approved", "Mali ön onay • Simülasyon");
  if (request.status === "revision") return statusBadge("revision", "Mali düzeltme bekliyor");
  if (request.status === "draft") return statusBadge("draft", "Kanal seçimi bekliyor");
  return statusBadge(request.status);
}

function programCard(program) {
  return `<article class="card program-card" data-program-level="${program.level}" data-searchable="${escapeHtml(`${program.title} ${program.unit} ${program.instructor}`.toLocaleLowerCase("tr-TR"))}"><div class="program-accent"></div><div class="card-body"><div class="program-meta"><span class="meta-pill">${program.ects} AKTS • Pilot</span><span class="meta-pill">TYÇ ${program.level} önerisi</span><span class="meta-pill">${escapeHtml(program.mode)}</span></div><h3>${escapeHtml(program.title)}</h3><p>${escapeHtml(program.summary)}</p><small class="table-subtitle">${escapeHtml(program.unit)} • ${escapeHtml(program.instructor)}</small></div><div class="card-footer">${statusBadge(program.status)}<button class="button button--secondary button--sm" data-action="open-program" data-id="${escapeHtml(program.id)}">Ayrıntıları gör ${icon("arrow")}</button></div></article>`;
}

function splitLearningOutcomes(value = "") {
  return String(value)
    .split(/\n+/)
    .map((item) => item.replace(/^\s*(?:[-*•]|(?:ÖÇ|LO)?\s*\d+[.)-]?)\s*/iu, "").trim())
    .filter(Boolean);
}

function normalizeSmartOutcomeText(value = "") {
  return String(value)
    .normalize("NFKC")
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, " ")
    .trim();
}

function smartStableHash(value = "") {
  let hash = 0x811c9dc5;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function smartOutcomeFingerprint(text, index) {
  return `LOFP-${Number(index) + 1}-${smartStableHash(normalizeSmartOutcomeText(text))}`;
}

function smartOrderedOutcomeFingerprint(outcomes = []) {
  return `ORDER-${smartStableHash(outcomes.map((text, index) => smartOutcomeFingerprint(text, index)).join("|"))}`;
}

function isSafeId(value) {
  return typeof value === "string" && SAFE_ID_PATTERN.test(value);
}

function smartOutcomeId(outcome, index) {
  return outcome?.id || outcome?.outcomeId || `outcome-${index + 1}`;
}

function smartOutcomeText(outcome) {
  return outcome?.outcomeText || outcome?.outcome || outcome?.text || outcome?.learningOutcome || "";
}

function smartSuggestionFor(outcome, frameworkId) {
  return outcome?.suggestions?.[frameworkId] || outcome?.[frameworkId] || null;
}

function smartEffectiveSelection(suggestion) {
  if (!suggestion) return null;
  const effective = suggestion.effectiveSelection || {};
  return {
    ...suggestion,
    ...effective,
    score: Number(suggestion.score || effective.score || 0),
    confidence: suggestion.confidence || effective.confidence || "low",
    descriptor: effective.descriptor || suggestion.descriptor || "",
    descriptorDisplayTr: effective.descriptorDisplayTr || suggestion.descriptorDisplayTr || suggestion.descriptor || "",
    rationale: effective.reason || suggestion.rationale || "",
    suggestedContent: suggestion.suggestedContent || effective.suggestedContent || [],
    suggestedAssessments: suggestion.suggestedAssessments || effective.suggestedAssessments || [],
    isManualOverride: effective.source === "manual_override"
  };
}

function smartFrameworkCode(frameworkId) {
  return ({ tyc: "TYÇ", eqf: "AYÇ/EQF", tyyc: "TYYÇ" })[frameworkId] || frameworkId?.toUpperCase() || "Çerçeve";
}

function smartFrameworkLevels(frameworkId) {
  return frameworkId === "tyyc" ? [5, 6, 7, 8] : [1, 2, 3, 4, 5, 6, 7, 8];
}

function smartDescriptorProvenanceLabel(frameworkId) {
  return SMART_DESCRIPTOR_LABELS[frameworkId === "tyyc" ? "tyyc" : "canonical"];
}

function smartDescriptorProvenanceKind(frameworkId) {
  return frameworkId === "tyyc" ? "pilot-operational-summary-not-verbatim" : "canonical-descriptor";
}

function smartDimensionLabel(dimension, frameworkId) {
  const labels = frameworkId === "eqf"
    ? { knowledge: "Bilgi / Knowledge", skills: "Beceriler / Skills", competence: "Sorumluluk ve özerklik" }
    : { knowledge: "Bilgi", skills: "Beceri", competence: "Yetkinlik" };
  return labels[dimension] || dimension || "Boyut belirtilmedi";
}

function smartConfidenceLabel(value) {
  return ({ high: "Yüksek", medium: "Orta", low: "Düşük" })[value] || "Düşük";
}

function smartDescriptorForSelection(frameworkId, level, dimension) {
  const option = (buildQualificationSelectionOptions(frameworkId) || []).find((item) => Number(item.level) === Number(level));
  const selected = option?.dimensions?.find((item) => item.dimension === dimension);
  return selected?.descriptorDisplayTr || selected?.descriptor || "Seçili tanımlayıcı bulunamadı; kurumsal doğrulama gerekir.";
}

function measurableVerb(outcome = "") {
  const verbs = [
    "geliştirir", "tasarlar", "üretir", "değerlendirir", "analiz eder", "yorumlar", "uygular",
    "karşılaştırır", "sınıflandırır", "çözer", "oluşturur", "açıklar", "tanımlar", "saptar",
    "yönetir", "doğrular", "gerekçelendirir", "eleştirir", "bütünleştirir"
  ];
  const normalized = String(outcome).toLocaleLowerCase("tr-TR");
  return verbs.find((verb) => normalized.includes(verb)) || "Ölçülebilir eylem fiili ekleyin";
}

function smartCycleCrosswalk(level) {
  const cycles = {
    5: { cycle: "Kısa döngü / önlisans bandı", note: "TYYÇ kısa döngü ile Bologna kısa döngüsü için açıklayıcı aday." },
    6: { cycle: "Birinci döngü / lisans bandı", note: "TYYÇ birinci döngü ile Bologna birinci döngüsü için açıklayıcı aday." },
    7: { cycle: "İkinci döngü / yüksek lisans bandı", note: "TYYÇ ikinci döngü ile Bologna ikinci döngüsü için açıklayıcı aday." },
    8: { cycle: "Üçüncü döngü / doktora bandı", note: "TYYÇ üçüncü döngü ile Bologna üçüncü döngüsü için açıklayıcı aday." }
  };
  return {
    ...(cycles[Number(level)] || { cycle: "Yükseköğretim döngüsü önerilmedi", note: "TYÇ/AYÇ 1–4 için bu pilot yükseköğretim döngüsü eşlemesi üretmez." }),
    mappingStatus: "provisional_advisory_crosswalk",
    equivalenceClaim: false,
    placementClaim: false,
    autonomousDecision: false,
    institutionalValidationRequired: true
  };
}

function smartSuggestionLevels(suggestion, frameworkId) {
  const primary = smartEffectiveSelection(suggestion);
  const alternatives = Array.isArray(suggestion?.alternatives) ? suggestion.alternatives : [];
  const byLevel = new Map();
  [primary, ...alternatives].filter(Boolean).forEach((item) => {
    const level = Number(item.level);
    if (smartFrameworkLevels(frameworkId).includes(level) && !byLevel.has(level)) byLevel.set(level, item);
  });
  const selectionOptions = buildQualificationSelectionOptions(frameworkId) || [];
  const options = Array.isArray(selectionOptions) ? selectionOptions : (selectionOptions.options || selectionOptions.levels || []);
  options.forEach((item) => {
    const level = Number(item.level || item.value);
    if (smartFrameworkLevels(frameworkId).includes(level) && !byLevel.has(level)) byLevel.set(level, item);
  });
  return smartFrameworkLevels(frameworkId).map((level) => {
    return { level, ...(byLevel.get(level) || {}), score: Number(byLevel.get(level)?.score || 0) };
  });
}

function smartAppliedSelection(outcomeId, frameworkId, outcomeFingerprint) {
  return smartSuggestionApplied.find((item) => item.outcomeId === outcomeId && item.frameworkId === frameworkId && item.outcomeFingerprint === outcomeFingerprint) || null;
}

function smartEvidenceHint(suggestion) {
  const assessments = suggestion?.suggestedAssessments || [];
  const first = Array.isArray(assessments) ? assessments[0] : assessments;
  if (first && typeof first === "object") return first.evidence || `${first.method || "Performans görevi"} çıktısı ve değerlendirici kayıt izi`;
  return `${first || "Performans görevi"} çıktısı, analitik rubrik ve değerlendirici kayıt izi`;
}

function smartAssessmentText(value) {
  if (!value) return "";
  const items = Array.isArray(value) ? value : [value];
  return items.map((item) => typeof item === "object" ? `${item.method}${item.evidence ? ` — Kanıt: ${item.evidence}` : ""}` : String(item)).join(" • ");
}

function smartCycleLabel(cycle) {
  if (!cycle) return "Yükseköğretim döngüsü önerilmedi";
  if (typeof cycle === "string") return cycle;
  return [cycle.tyycCycleTr, cycle.bolognaCycleTr, cycle.awardContextTr, cycle.cycle, cycle.label, cycle.note].filter(Boolean).join(" • ");
}

function smartSafeCycle(cycle, level) {
  return {
    ...(cycle || smartCycleCrosswalk(level)),
    mappingStatus: "provisional_advisory_crosswalk",
    equivalenceClaim: false,
    placementClaim: false,
    autonomousDecision: false,
    institutionalValidationRequired: true
  };
}

function smartMappingSnapshot(report = smartSuggestionReport) {
  if (!report) return null;
  const outcomes = (report.outcomes || []).map((outcome, index) => {
    const outcomeId = smartOutcomeId(outcome, index);
    const text = smartOutcomeText(outcome);
    const outcomeFingerprint = smartOutcomeFingerprint(text, index);
    return {
      outcomeId,
      outcomeIndex: index,
      outcomeFingerprint,
      text,
      selections: QUALIFICATION_FRAMEWORK_IDS.map((frameworkId) => {
        const applied = smartAppliedSelection(outcomeId, frameworkId, outcomeFingerprint);
        const suggestion = smartEffectiveSelection(smartSuggestionFor(outcome, frameworkId));
        const selection = applied || suggestion;
        return selection ? {
          outcomeId,
          outcomeIndex: index,
          outcomeFingerprint,
          frameworkId,
          frameworkCode: smartFrameworkCode(frameworkId),
          level: Number(selection.level),
          dimension: selection.dimension,
          score: Number(selection.score || 0),
          descriptor: selection.descriptor || "",
          descriptorDisplayTr: selection.descriptorDisplayTr || selection.descriptor || "",
          rationale: selection.rationale || "",
          officialSourceUrl: selection.officialSourceUrl || "",
          matchedSignals: selection.matchedSignals || [],
          suggestedContent: selection.suggestedContent || [],
          suggestedAssessments: selection.suggestedAssessments || [],
          applied: Boolean(applied),
          manual: Boolean(selection.manual || selection.isManualOverride),
          autonomousDecision: false,
          institutionalValidationRequired: true
        } : null;
      }).filter(Boolean)
    };
  });
  const topTyyc = outcomes.flatMap((item) => item.selections).filter((item) => item.frameworkId === "tyyc" && item.applied).sort((a, b) => b.score - a.score)[0]
    || outcomes.flatMap((item) => item.selections).filter((item) => item.frameworkId === "tyyc").sort((a, b) => b.score - a.score)[0];
  return {
    engineVersion: QUALIFICATION_SUGGESTION_ENGINE_VERSION,
    advisoryNotice: QUALIFICATION_ADVISORY_NOTICE,
    orderedOutcomeFingerprint: smartOrderedOutcomeFingerprint(outcomes.map((outcome) => outcome.text)),
    outcomes,
    program: report.program || {},
    manualOverrides: report.manualOverrides || [],
    appliedSelections: structuredClone(smartSuggestionApplied),
    higherEducationCycleSuggestion: smartSafeCycle(report.program?.higherEducationCycleSuggestion, topTyyc?.level)
  };
}

function syncSmartMappingField() {
  const field = document.querySelector("#proposal-smart-mapping");
  if (field) field.value = JSON.stringify(smartMappingSnapshot() || {});
}

function renderSmartLevelCandidates(suggestion, frameworkId) {
  const code = smartFrameworkCode(frameworkId);
  return `<details class="smart-levels"><summary>Tüm ${code} seviye adaylarını görüntüle</summary><div class="smart-level-list">${smartSuggestionLevels(suggestion, frameworkId).map((item) => `<span class="${Number(item.score) > 0 ? "has-score" : ""}"><strong>${item.level}</strong><small>${Number(item.score) > 0 ? `%${Math.round(item.score)}` : "Aday"}</small></span>`).join("")}</div></details>`;
}

function smartSuggestionCard(outcome, outcomeIndex, frameworkId, interactive = true, appliedSelections = smartSuggestionApplied) {
  const rawSuggestion = smartSuggestionFor(outcome, frameworkId);
  if (!rawSuggestion) return "";
  const suggestion = smartEffectiveSelection(rawSuggestion);
  const outcomeId = smartOutcomeId(outcome, outcomeIndex);
  const outcomeFingerprint = smartOutcomeFingerprint(smartOutcomeText(outcome), outcomeIndex);
  const applied = appliedSelections.find((item) => item.outcomeId === outcomeId && item.outcomeFingerprint === outcomeFingerprint && item.frameworkId === frameworkId) || null;
  // Applied selections intentionally store a reduced human-action record. Merge
  // that record over the immutable full suggestion so review still renders the
  // captured confidence, method, alternatives, TYYÇ type and evidence gaps.
  const selection = applied ? { ...suggestion, ...applied } : suggestion;
  const code = smartFrameworkCode(frameworkId);
  const score = Math.max(0, Math.min(100, Math.round(Number(selection.score || 0))));
  const content = Array.isArray(selection.suggestedContent) ? selection.suggestedContent.join(" • ") : selection.suggestedContent;
  const assessments = smartAssessmentText(selection.suggestedAssessments);
  const cycle = selection.higherEducationCycleSuggestion || smartCycleCrosswalk(selection.level);
  const qualificationType = selection.qualificationTypeSuggestion?.selected;
  const evidenceGaps = Array.isArray(selection.evidenceGapWarnings) ? selection.evidenceGapWarnings : [];
  const signals = Array.isArray(selection.matchedSignals) ? selection.matchedSignals : [];
  return `<article class="smart-suggestion ${applied ? "is-applied" : ""}" data-smart-suggestion data-smart-framework="${escapeHtml(frameworkId.toUpperCase())}" data-outcome-index="${Number(outcomeIndex)}" data-outcome-fingerprint="${escapeHtml(outcomeFingerprint)}" data-framework="${escapeHtml(frameworkId.toUpperCase())}" data-level="${Number(selection.level)}" data-dimension="${escapeHtml(selection.dimension)}" data-score="${score}">
    <div class="smart-suggestion__head"><div><span class="table-subtitle">${code} • ${smartDimensionLabel(selection.dimension, frameworkId)}</span><h4>${code} ${Number(selection.level)}. seviye</h4><span class="smart-confidence">${selection.isManualOverride ? "İnsan düzeltmesi" : `${smartConfidenceLabel(selection.confidence)} güven`} • ${escapeHtml(selection.method || "açıklanabilir kural motoru")}</span></div><span class="smart-score" aria-label="Öneri puanı yüzde ${score}">%${score}</span></div>
    <div class="progress" role="progressbar" aria-label="${code} öneri puanı" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${score}"><span style="width:${score}%"></span></div>
    <dl class="smart-suggestion__details"><dt>Gerekçe</dt><dd>${escapeHtml(selection.rationale || "Gözlenebilir fiil, karmaşıklık ve özerklik işaretleri birlikte değerlendirildi.")}</dd><dt data-smart-descriptor-kind="${smartDescriptorProvenanceKind(frameworkId)}">${escapeHtml(smartDescriptorProvenanceLabel(frameworkId))}</dt><dd>${escapeHtml(selection.descriptor || "Seviye tanımlayıcısı için kurumsal inceleme gerekir.")}</dd>${selection.descriptorDisplayTr && selection.descriptorDisplayTr !== selection.descriptor ? `<dt>Türkçe görünüm</dt><dd>${escapeHtml(selection.descriptorDisplayTr)}</dd>` : ""}<dt>Ölçülebilir eylem fiili</dt><dd>${escapeHtml(measurableVerb(smartOutcomeText(outcome)))}</dd><dt>İçerik ipucu</dt><dd>${escapeHtml(content || "Çıktıyı uygulamaya dönüştüren vaka ve etkinlik planı")}</dd><dt>Ölçme-değerlendirme</dt><dd>${escapeHtml(assessments || "Performans görevi + analitik rubrik")}</dd><dt>Kanıt önerisi</dt><dd>${escapeHtml(smartEvidenceHint(selection))}</dd></dl>
    ${signals.length ? `<div class="smart-signals" aria-label="Eşlemeyi açıklayan sinyaller">${signals.slice(0, 8).map((signal) => `<span>${escapeHtml(signal.label || signal.pattern || String(signal))}</span>`).join("")}</div>` : `<div class="permission-note"><strong>Düşük sinyal yoğunluğu</strong><span>Daha ölçülebilir bir eylem fiili, karmaşıklık veya özerklik ifadesi ekleyerek öneriyi güçlendirin.</span></div>`}
    ${selection.officialSourceUrl ? `<a class="text-button smart-source-link" href="${escapeHtml(selection.officialSourceUrl)}" target="_blank" rel="noreferrer">Resmî seviye kaynağını aç ${icon("external")}</a>` : ""}
    <div class="smart-cycle"><strong>${frameworkId === "tyyc" ? "TYYÇ yeterlilik türü adayı" : "TYYÇ / Bologna açıklayıcı crosswalk"}</strong><span>${frameworkId === "tyyc" ? escapeHtml(qualificationType ? `${qualificationType.titleTr} • ${qualificationType.orientation}` : "Yeterlilik türü için insan seçimi gerekir") : escapeHtml(smartCycleLabel(cycle))}</span><small>${frameworkId === "tyyc" ? "Önerilen pedagojik referans düzeyidir; resmî yerleştirme, eşdeğerlik, akreditasyon veya logo hakkı değildir." : Number(selection.level) < 5 ? "TYÇ/AYÇ 1–4 için yükseköğretim döngüsü eşlemesi yapılmaz." : "Resmî eşdeğerlik veya yerleştirme değildir; kurumsal doğrulama gerekir."}</small></div>
    ${evidenceGaps.length ? `<div class="permission-note"><strong>Eksik kanıt uyarısı</strong><span>${escapeHtml(evidenceGaps.join(" "))}</span></div>` : ""}
    ${renderSmartLevelCandidates(rawSuggestion, frameworkId)}
    ${interactive ? `<div class="smart-suggestion__actions"><button class="button button--secondary button--sm" type="button" data-action="apply-smart-suggestion" data-outcome-index="${Number(outcomeIndex)}" data-outcome-fingerprint="${escapeHtml(outcomeFingerprint)}" data-framework="${escapeHtml(frameworkId)}">${applied ? `${icon("check")} Uygulandı` : "Bu öneriyi seç ve uygula"}</button></div>
    <div class="smart-override" data-smart-override data-outcome-index="${Number(outcomeIndex)}" data-outcome-fingerprint="${escapeHtml(outcomeFingerprint)}" data-framework="${escapeHtml(frameworkId)}"><details><summary>Seviye veya boyutu manuel düzelt</summary><div class="smart-override__fields"><div class="field"><label for="smart-level-${Number(outcomeIndex)}-${escapeHtml(frameworkId)}">Seviye</label><select id="smart-level-${Number(outcomeIndex)}-${escapeHtml(frameworkId)}" class="select smart-override-level">${smartFrameworkLevels(frameworkId).map((level) => `<option value="${level}" ${level === Number(selection.level) ? "selected" : ""}>${code} ${level}</option>`).join("")}</select></div><div class="field"><label for="smart-dimension-${Number(outcomeIndex)}-${escapeHtml(frameworkId)}">Boyut</label><select id="smart-dimension-${Number(outcomeIndex)}-${escapeHtml(frameworkId)}" class="select smart-override-dimension">${["knowledge", "skills", "competence"].map((dimension) => `<option value="${escapeHtml(dimension)}" ${dimension === selection.dimension ? "selected" : ""}>${smartDimensionLabel(dimension, frameworkId)}</option>`).join("")}</select></div><div class="field full"><span class="table-subtitle">${escapeHtml(smartDescriptorProvenanceLabel(frameworkId))}</span><p class="smart-override-descriptor">${escapeHtml(smartDescriptorForSelection(frameworkId, selection.level, selection.dimension))}</p></div><div class="field full"><label class="required" for="smart-reason-${Number(outcomeIndex)}-${escapeHtml(frameworkId)}">İnsan gerekçesi</label><input id="smart-reason-${Number(outcomeIndex)}-${escapeHtml(frameworkId)}" class="smart-override-reason" minlength="12" placeholder="Neden farklı seviye/boyut seçildi?" /></div><button class="button button--secondary button--sm" type="button" data-action="apply-smart-override">Manuel düzeltmeyi uygula</button></div></details></div>` : `<div class="permission-note"><strong>Salt-okunur pilot öneri</strong><span>Komisyon öneriyi ve insan düzeltmesini inceler; bu alanda motor çıktısını değiştiremez.</span></div>`}
  </article>`;
}

function smartCoverageMatrix(report) {
  const outcomes = report?.outcomes || [];
  const dimensions = ["knowledge", "skills", "competence"];
  const cell = (outcome, frameworkId, dimension) => {
    const selection = smartEffectiveSelection(smartSuggestionFor(outcome, frameworkId));
    if (!selection || selection.dimension !== dimension) return `<span class="coverage-empty" aria-label="Eşleşme yok">—</span>`;
    return `<strong aria-label="${smartFrameworkCode(frameworkId)} ${smartDimensionLabel(dimension, frameworkId)} yüzde ${Math.round(selection.score)}">%${Math.round(selection.score)}</strong>`;
  };
  return `<div class="table-wrap smart-coverage" data-smart-coverage><table><caption>Öğrenme çıktısı, çerçeve ve yeterlilik boyutu kapsam matrisi</caption><thead><tr><th rowspan="2" scope="col">Öğrenme çıktısı</th><th colspan="3" scope="colgroup">TYÇ</th><th colspan="3" scope="colgroup">AYÇ/EQF</th><th colspan="3" scope="colgroup">TYYÇ</th></tr><tr>${["Bilgi", "Beceri", "Yetkinlik", "Bilgi", "Beceri", "Sorumluluk/özerklik", "Bilgi", "Beceri", "Yetkinlik"].map((label) => `<th scope="col">${label}</th>`).join("")}</tr></thead><tbody>${outcomes.map((outcome, index) => `<tr><th scope="row"><span class="table-title">ÖÇ-${index + 1}</span><span class="table-subtitle">${escapeHtml(smartOutcomeText(outcome))}</span></th>${QUALIFICATION_FRAMEWORK_IDS.flatMap((frameworkId) => dimensions.map((dimension) => `<td>${cell(outcome, frameworkId, dimension)}</td>`)).join("")}</tr>`).join("")}</tbody></table></div>`;
}

function smartCoverageWarnings(report) {
  const outcomes = report?.outcomes || [];
  const missing = [];
  for (const frameworkId of QUALIFICATION_FRAMEWORK_IDS) {
    const used = new Set(outcomes.map((outcome) => smartEffectiveSelection(smartSuggestionFor(outcome, frameworkId))?.dimension).filter(Boolean));
    for (const dimension of ["knowledge", "skills", "competence"]) {
      if (!used.has(dimension)) missing.push(`${smartFrameworkCode(frameworkId)} ${smartDimensionLabel(dimension, frameworkId)}`);
    }
  }
  const dimensionNotice = missing.length
    ? notice("warning", "Boyut kapsamı insan incelemesi gerektiriyor", `Program genelinde henüz görünmeyen boyutlar: ${missing.join(", ")}. Bu uyarı gönderimi otomatik engellemez.`)
    : notice("success", "Dokuz boyut görünür", "TYÇ, AYÇ/EQF ve TYYÇ için bilgi, beceri ve yetkinlik/özerklik boyutlarının her biri en az bir öğrenme çıktısıyla ilişkilendirildi.");
  const consistency = report?.program?.consistency || {};
  const consistencyWarnings = [consistency.tyc?.warning, consistency.eqf?.warning, consistency.tyyc?.warning].filter(Boolean);
  const suggested = report?.program?.suggestedLevels || {};
  const frameworkDifference = [suggested.tyc, suggested.eqf, suggested.tyyc].every(Number) && new Set([Number(suggested.tyc), Number(suggested.eqf), Number(suggested.tyyc)]).size > 1
    ? `TYÇ ${suggested.tyc}, AYÇ/EQF ${suggested.eqf} ve TYYÇ ${suggested.tyyc} program önerileri ayrışıyor; çerçeveler ayrı incelenmelidir.`
    : "";
  const alignmentNotice = consistencyWarnings.length || frameworkDifference
    ? notice("warning", "Seviye tutarlılığı kontrolü", [...consistencyWarnings, frameworkDifference].filter(Boolean).join(" "))
    : notice("success", "Seviye dağılımı tutarlı", "Motorun program düzeyi önerilerinde üç veya daha fazla seviye yayılımı ya da TYÇ/AYÇ/TYYÇ ayrışması görülmedi.");
  return `${dimensionNotice}${alignmentNotice}`;
}

function smartProgramSummary(report) {
  const tycLevel = report?.program?.suggestedLevels?.tyc || "—";
  const eqfLevel = report?.program?.suggestedLevels?.eqf || "—";
  const tyycLevel = report?.program?.suggestedLevels?.tyyc || "—";
  const cycle = report?.program?.higherEducationCycleSuggestion || smartCycleCrosswalk(tycLevel);
  return `<div class="smart-program-summary"><div><span>Program TYÇ adayı</span><strong>Seviye ${tycLevel}</strong></div><div><span>Program AYÇ/EQF adayı</span><strong>Seviye ${eqfLevel}</strong></div><div><span>Önerilen pedagojik TYYÇ düzeyi</span><strong>Seviye ${tyycLevel}</strong></div><div><span>TYYÇ / Bologna döngüsü</span><strong>${escapeHtml(smartCycleLabel(cycle))}</strong></div></div>`;
}

function renderSmartSuggestionReport(report, { interactive = true, appliedSelections = smartSuggestionApplied } = {}) {
  const outcomes = report?.outcomes || [];
  if (!outcomes.length) return `<div class="smart-empty"><div class="empty-icon">${icon("layers")}</div><strong>Öğrenme çıktılarınızı yazın</strong><span>Her satıra bir ölçülebilir çıktı eklediğinizde TYÇ, AYÇ/EQF ve TYYÇ önerileri otomatik oluşur.</span></div>`;
  return `${smartProgramSummary(report)}${outcomes.map((outcome, index) => `<section class="smart-outcome"><div class="smart-outcome__title"><span>ÖÇ-${index + 1}</span><h4>${escapeHtml(smartOutcomeText(outcome) || "Öğrenme çıktısı")}</h4></div><div class="smart-suggestion-grid">${QUALIFICATION_FRAMEWORK_IDS.map((frameworkId) => smartSuggestionCard(outcome, index, frameworkId, interactive, appliedSelections)).join("")}</div></section>`).join("")}<section class="smart-coverage-section"><div class="section-heading"><div><span class="page-kicker">Program kapsamı</span><h3>TYÇ + AYÇ + TYYÇ boyut matrisi</h3></div></div>${smartCoverageMatrix(report)}${smartCoverageWarnings(report)}</section>`;
}

function writeSmartReportToPanel() {
  const panel = document.querySelector("#smart-suggestion-results");
  if (panel) {
    panel.innerHTML = renderSmartSuggestionReport(smartSuggestionReport, { interactive: true });
    panel.setAttribute("aria-busy", "false");
  }
  syncSmartMappingField();
}

function failSmartQualificationAnalysis(code, message, panel, { empty = false } = {}) {
  smartSuggestionReport = null;
  smartSuggestionApplied = [];
  if (panel) {
    panel.innerHTML = empty ? renderSmartSuggestionReport(null) : notice("risk", "Akıllı eşleme kalite kapısı", message);
    panel.setAttribute("aria-busy", "false");
  }
  syncSmartMappingField();
  return { ok: false, code, message, report: null };
}

function analyzeProposalQualifications(form = document.querySelector("#proposal-form"), { announce = false } = {}) {
  // An explicit analysis (button, submit or draft save) supersedes the
  // debounced input analysis. Without cancelling that queued callback it can
  // redraw the suggestion cards while an instructor is completing a manual
  // override, detaching the focused select/details controls.
  window.clearTimeout(smartSuggestionTimer);
  smartSuggestionTimer = null;
  smartSuggestionRequest += 1;
  const panel = document.querySelector("#smart-suggestion-results");
  if (!form || !PROPOSAL_ROLES.has(state.roleId)) {
    if (panel) panel.setAttribute("aria-busy", "false");
    return { ok: false, code: "unauthorized_or_missing_form", message: "Akıllı eşleme formu veya düzenleme yetkisi bulunamadı.", report: null };
  }
  const outcomes = splitLearningOutcomes(form.elements.outcomes?.value);
  if (!outcomes.length) {
    return failSmartQualificationAnalysis("empty_outcomes", "En az bir ölçülebilir öğrenme çıktısı yazın.", panel, { empty: true });
  }
  if (outcomes.length > QUALIFICATION_SUGGESTION_LIMITS.maxOutcomeCount) {
    return failSmartQualificationAnalysis("too_many_outcomes", `Bir programda en fazla ${QUALIFICATION_SUGGESTION_LIMITS.maxOutcomeCount} öğrenme çıktısı analiz edilebilir.`, panel);
  }
  const oversizedIndex = outcomes.findIndex((text) => text.length > QUALIFICATION_SUGGESTION_LIMITS.maxOutcomeLength);
  if (oversizedIndex >= 0) {
    return failSmartQualificationAnalysis("outcome_too_long", `ÖÇ-${oversizedIndex + 1} en fazla ${QUALIFICATION_SUGGESTION_LIMITS.maxOutcomeLength} karakter olabilir.`, panel);
  }
  if (panel) panel.setAttribute("aria-busy", "true");
  const orderedOutcomeFingerprint = smartOrderedOutcomeFingerprint(outcomes);
  const previousFingerprint = smartSuggestionReport?.orderedOutcomeFingerprint;
  const currentOutcomeMeta = outcomes.map((text, index) => ({
    outcomeId: `LO-${index + 1}`,
    outcomeIndex: index,
    outcomeFingerprint: smartOutcomeFingerprint(text, index)
  }));
  const contextUnchanged = previousFingerprint === orderedOutcomeFingerprint;
  const previousOverrides = contextUnchanged
    ? (smartSuggestionReport?.manualOverrides || []).filter((override) => currentOutcomeMeta.some((meta) =>
      meta.outcomeId === override.outcomeId && meta.outcomeIndex === override.outcomeIndex && meta.outcomeFingerprint === override.outcomeFingerprint))
    : [];
  const previousApplied = contextUnchanged
    ? smartSuggestionApplied.filter((selection) => currentOutcomeMeta.some((meta) =>
      meta.outcomeId === selection.outcomeId && meta.outcomeIndex === selection.outcomeIndex && meta.outcomeFingerprint === selection.outcomeFingerprint))
    : [];
  try {
    const nextReport = suggestProgramQualificationAlignment({
      programId: String(form.elements.title?.value || "pilot-program"),
      outcomes: outcomes.map((text, index) => ({ id: `LO-${index + 1}`, text })),
      preferredLevels: { tyc: Number(form.elements.level?.value || 6), eqf: Number(form.elements.level?.value || 6), tyyc: Math.max(5, Number(form.elements.level?.value || 6)) },
      manualOverrides: previousOverrides
    });
    const insufficient = (nextReport.outcomes || []).find((outcome) => outcome.inputQuality?.isMeasurable !== true);
    if (insufficient) {
      const warnings = insufficient.inputQuality?.warnings?.join(" ") || "Öğrenme çıktısı ölçülebilir bir eylem, bağlam ve gözlenebilir kanıt içermelidir.";
      return failSmartQualificationAnalysis("insufficient_outcome", `${smartOutcomeText(insufficient)}: ${warnings}`, panel);
    }
    nextReport.orderedOutcomeFingerprint = orderedOutcomeFingerprint;
    nextReport.outcomes.forEach((outcome, index) => {
      outcome.outcomeIndex = index;
      outcome.outcomeFingerprint = currentOutcomeMeta[index].outcomeFingerprint;
    });
    nextReport.manualOverrides = (nextReport.manualOverrides || []).map((override) => {
      const meta = previousOverrides.find((item) => item.id === override.id) || currentOutcomeMeta.find((item) => item.outcomeId === override.outcomeId);
      return { ...override, outcomeIndex: meta?.outcomeIndex, outcomeFingerprint: meta?.outcomeFingerprint, recordedAt: override.recordedAt || meta?.recordedAt || null };
    });
    smartSuggestionReport = nextReport;
    smartSuggestionApplied = previousApplied;
    writeSmartReportToPanel();
    if (announce) toast(`${outcomes.length} öğrenme çıktısı için TYÇ, AYÇ/EQF ve TYYÇ önerileri yenilendi.`);
    return { ok: true, code: "ready", message: "Akıllı eşleme kalite kapısı geçildi.", report: smartSuggestionReport };
  } catch (error) {
    return failSmartQualificationAnalysis("analysis_error", `${error.message}. Taslak veya başvuru oluşturulmadı; öğrenme çıktılarını düzeltip yeniden analiz edin.`, panel);
  } finally {
    if (panel) panel.setAttribute("aria-busy", "false");
  }
}

function scheduleSmartQualificationAnalysis(form) {
  window.clearTimeout(smartSuggestionTimer);
  const request = ++smartSuggestionRequest;
  const panel = document.querySelector("#smart-suggestion-results");
  if (panel) panel.setAttribute("aria-busy", "true");
  smartSuggestionTimer = window.setTimeout(() => {
    if (request !== smartSuggestionRequest) {
      if (panel) panel.setAttribute("aria-busy", "false");
      return;
    }
    analyzeProposalQualifications(form);
  }, 320);
}

function applySmartSelection(outcomeIndex, frameworkId, { quiet = false } = {}) {
  if (!PROPOSAL_ROLES.has(state.roleId)) { deny("Yeterlilik önerisini yalnız iç veya kurum dışı eğitici uygulayabilir."); return; }
  const outcome = smartSuggestionReport?.outcomes?.[Number(outcomeIndex)];
  const suggestion = smartEffectiveSelection(smartSuggestionFor(outcome, frameworkId));
  if (!outcome || !suggestion) { deny("Uygulanabilir yeterlilik önerisi bulunamadı."); return; }
  const outcomeId = smartOutcomeId(outcome, Number(outcomeIndex));
  const outcomeFingerprint = smartOutcomeFingerprint(smartOutcomeText(outcome), Number(outcomeIndex));
  const liveOutcomes = splitLearningOutcomes(document.querySelector("#proposal-form")?.elements?.outcomes?.value || "");
  if (outcome.outcomeFingerprint !== outcomeFingerprint || smartSuggestionReport?.orderedOutcomeFingerprint !== smartOrderedOutcomeFingerprint(liveOutcomes)) {
    failSmartQualificationAnalysis("stale_outcome_context", "Öğrenme çıktısı değiştiği için eski seçim temizlendi. Çıktıları yeniden analiz edin.", document.querySelector("#smart-suggestion-results"));
    deny("Öğrenme çıktısı bağlamı değişti; eski öneri uygulanmadı.");
    return;
  }
  const next = {
    id: `APPLIED-${outcomeFingerprint}-${frameworkId}`,
    outcomeId,
    outcomeIndex: Number(outcomeIndex),
    outcomeFingerprint,
    frameworkId,
    level: Number(suggestion.level),
    dimension: suggestion.dimension,
    score: Number(suggestion.score || 0),
    descriptor: suggestion.descriptor || "",
    descriptorDisplayTr: suggestion.descriptorDisplayTr || suggestion.descriptor || "",
    rationale: suggestion.rationale || "",
    officialSourceUrl: suggestion.officialSourceUrl || "",
    matchedSignals: suggestion.matchedSignals || [],
    suggestedContent: suggestion.suggestedContent || [],
    suggestedAssessments: suggestion.suggestedAssessments || [],
    manual: Boolean(suggestion.isManualOverride || suggestion.manual),
    recordedAt: new Date().toISOString(),
    autonomousDecision: false,
    institutionalValidationRequired: true
  };
  const existing = smartSuggestionApplied.findIndex((item) => item.outcomeId === outcomeId && item.outcomeFingerprint === outcomeFingerprint && item.frameworkId === frameworkId);
  if (existing >= 0) smartSuggestionApplied.splice(existing, 1, next);
  else smartSuggestionApplied.push(next);
  if (frameworkId === "tyc") {
    const levelField = document.querySelector("#proposal-level");
    if (levelField && [...levelField.options].some((option) => Number(option.value) === Number(next.level))) levelField.value = String(next.level);
  }
  const sorted = [...smartSuggestionApplied].sort((a, b) => a.outcomeIndex - b.outcomeIndex || a.frameworkId.localeCompare(b.frameworkId));
  const valueFor = (key, fallback) => sorted.map((item) => {
    const value = item[key];
    const label = `${smartFrameworkCode(item.frameworkId)} ÖÇ-${item.outcomeIndex + 1}`;
    const rendered = key === "suggestedAssessments"
      ? smartAssessmentText(value)
      : Array.isArray(value) ? value.join("; ") : (value || fallback);
    return `${label}: ${rendered || fallback}`;
  }).join("\n");
  const contentField = document.querySelector("#proposal-smart-content");
  const assessmentField = document.querySelector("#proposal-smart-assessment");
  const evidenceField = document.querySelector("#proposal-smart-evidence");
  if (contentField) contentField.value = valueFor("suggestedContent", "Çıktıya bağlı vaka ve uygulama etkinliği");
  if (assessmentField) assessmentField.value = valueFor("suggestedAssessments", "Performans görevi + analitik rubrik");
  if (evidenceField) evidenceField.value = sorted.map((item) => `${smartFrameworkCode(item.frameworkId)} ÖÇ-${item.outcomeIndex + 1}: ${smartEvidenceHint(item)}`).join("\n");
  writeSmartReportToPanel();
  if (!quiet) toast(`${smartFrameworkCode(frameworkId)} önerisi programa uygulandı; alanlar hâlâ eğitici tarafından düzenlenebilir.`);
}

function applySmartOverride(container) {
  if (!PROPOSAL_ROLES.has(state.roleId)) { deny("Manuel yeterlilik düzeltmesini yalnız iç veya kurum dışı eğitici yapabilir."); return; }
  const outcomeIndex = Number(container?.dataset.outcomeIndex);
  const frameworkId = String(container?.dataset.framework || "");
  const outcome = smartSuggestionReport?.outcomes?.[outcomeIndex];
  const reason = String(container?.querySelector(".smart-override-reason")?.value || "").trim();
  if (!outcome || !QUALIFICATION_FRAMEWORK_IDS.includes(frameworkId)) { deny("Manuel düzeltme hedefi geçersiz."); return; }
  const liveOutcomes = splitLearningOutcomes(document.querySelector("#proposal-form")?.elements?.outcomes?.value || "");
  const currentFingerprint = smartOutcomeFingerprint(liveOutcomes[outcomeIndex] || "", outcomeIndex);
  if (container?.dataset.outcomeFingerprint !== currentFingerprint || smartSuggestionReport?.orderedOutcomeFingerprint !== smartOrderedOutcomeFingerprint(liveOutcomes)) {
    failSmartQualificationAnalysis("stale_outcome_context", "Öğrenme çıktısı değiştiği için eski manuel düzeltme temizlendi. Çıktıları yeniden analiz edin.", document.querySelector("#smart-suggestion-results"));
    deny("Öğrenme çıktısı bağlamı değişti; eski manuel düzeltme uygulanmadı.");
    return;
  }
  if (reason.length < 12) { deny("Manuel düzeltme için en az 12 karakterlik insan gerekçesi yazın."); return; }
  try {
    smartSuggestionReport = applyManualQualificationOverride(smartSuggestionReport, {
      outcomeId: smartOutcomeId(outcome, outcomeIndex),
      frameworkId,
      level: Number(container.querySelector(".smart-override-level")?.value),
      dimension: container.querySelector(".smart-override-dimension")?.value,
      reason,
      actorRole: state.roleId,
      recordedAt: new Date().toISOString()
    });
    const outcomeFingerprint = smartOutcomeFingerprint(smartOutcomeText(outcome), outcomeIndex);
    smartSuggestionReport.orderedOutcomeFingerprint ||= smartOrderedOutcomeFingerprint((smartSuggestionReport.outcomes || []).map(smartOutcomeText));
    smartSuggestionReport.outcomes.forEach((item, index) => {
      item.outcomeIndex = index;
      item.outcomeFingerprint = smartOutcomeFingerprint(smartOutcomeText(item), index);
    });
    smartSuggestionReport.manualOverrides = (smartSuggestionReport.manualOverrides || []).map((override) => override.outcomeId === smartOutcomeId(outcome, outcomeIndex) && override.frameworkId === frameworkId
      ? { ...override, outcomeIndex, outcomeFingerprint, recordedAt: override.recordedAt || new Date().toISOString() }
      : override);
    applySmartSelection(outcomeIndex, frameworkId, { quiet: true });
    toast("İnsan gerekçeli manuel düzeltme uygulandı ve pilot eşleme kaydına eklendi.");
  } catch (error) {
    deny(error.message);
  }
}

function updateSmartOverrideDescriptor(container) {
  if (!container) return;
  const frameworkId = container.dataset.framework;
  const level = Number(container.querySelector(".smart-override-level")?.value);
  const dimension = container.querySelector(".smart-override-dimension")?.value;
  const target = container.querySelector(".smart-override-descriptor");
  if (target && QUALIFICATION_FRAMEWORK_IDS.includes(frameworkId)) target.textContent = smartDescriptorForSelection(frameworkId, level, dimension);
}

function proposalPage() {
  const role = currentRole();
  const submitLabel = state.roleId === "externalInstructor" ? "Kurum dışı eğitici olarak koordinatörlüğe ilet" : "Koordinatörlüğe ilet";
  return `<div class="page-container">${pageHeader("Başvuru • Evre 1", "Yeni mikro yeterlilik programı önerisi", "Zorunlu alanları tamamlayın; bu form yalnızca tarayıcınızdaki pilot veri katmanına sentetik kayıt oluşturur.", `<button class="button button--secondary" data-nav="frameworks">${icon("layers")} TYÇ / AYÇ / TYYÇ matrisini aç</button>`)}
    ${notice("success", "Başvuru sahibi demo kimliği", `${role.name} • ${role.label}. Gönderim bu rol ve kişi adına sahiplik ile denetim kaydı oluşturur.`)}
    <div class="form-shell"><aside class="card steps" aria-label="Form adımları"><div class="step active"><span>1</span><div><strong>Program bilgileri</strong><small>Ad, birim, hedef kitle</small></div></div><div class="step"><span>2</span><div><strong>Akademik yapı</strong><small>Çıktı, AKTS, TYÇ</small></div></div><div class="step"><span>3</span><div><strong>Değerlendirme</strong><small>Kanıt ve rubrik</small></div></div><div class="step"><span>4</span><div><strong>Önizleme</strong><small>Pilot kontrol ve gönderim</small></div></div></aside>
      <form class="card form-card" id="proposal-form">
        <section class="form-section"><h3>Program kimliği</h3><p>Başvuru, seçili demo rolü adına oluşturulur.</p><div class="form-grid"><div class="field full"><label class="required" for="proposal-title">Program adı</label><input id="proposal-title" name="title" required minlength="8" placeholder="Örn. Dijital Üretimde Veri Okuryazarlığı" /></div><div class="field"><label for="proposal-unit">Akademik birim</label><select id="proposal-unit" name="unit"><option>Mühendislik Fakültesi</option><option>Eğitim Fakültesi</option><option>Lisansüstü Eğitim Enstitüsü</option><option>Sürekli Eğitim Merkezi</option></select></div><div class="field"><label for="proposal-audience">Hedef kitle</label><input id="proposal-audience" name="audience" value="Lisans öğrencileri ve yeni mezunlar" /></div><div class="field full"><label class="required" for="proposal-summary">Program özeti</label><textarea id="proposal-summary" name="summary" required minlength="20" placeholder="Programın amacı ve kapsamı"></textarea></div></div></section>
        <section class="form-section"><h3>Akademik yapı ve pilot parametreler</h3><p>AKTS ile toplam öğrenen iş yükü bağlıdır: 25 × AKTS ≤ iş yükü ≤ 30 × AKTS. Seviye ve oranlar yalnız pilot ön kontrolüdür.</p><div class="form-grid"><div class="field"><label class="required" for="proposal-ects">Önerilen AKTS</label><input id="proposal-ects" name="ects" type="number" min="1" max="6" step="1" value="3" required /></div><div class="field"><label class="required" for="proposal-workload">Toplam öğrenen iş yükü</label><input id="proposal-workload" name="workload" type="number" min="25" max="180" step="0.25" value="75" required /><small>3 AKTS için geçerli bant 75–90 saattir; aşağıdaki sekiz bileşenin toplamı bu alanla birebir eşleşmelidir.</small></div><div class="field"><label for="proposal-level">Eğiticinin başlangıç TYÇ düzeyi</label><select id="proposal-level" name="level"><option value="1">1 • Temel başlangıç</option><option value="2">2 • Temel olgusal</option><option value="3">3 • Başlangıç kuramsal</option><option value="4">4 • Orta düzey</option><option value="5">5 • Önlisans bandı</option><option value="6" selected>6 • Lisans bandı</option><option value="7">7 • Yüksek lisans bandı</option><option value="8">8 • Doktora bandı</option></select><small>Motor TYÇ, AYÇ/EQF ve TYYÇ adaylarını ayrı üretir. TYYÇ yalnız 5–8 aralığında önerilen pedagojik referans düzeyidir; diploma eşdeğerliği değildir.</small></div><div class="field"><label for="proposal-remote">Uzaktan sunum oranı (%)</label><input id="proposal-remote" name="remoteRate" type="number" min="0" max="100" value="40" /></div><div class="field full"><label class="required" for="proposal-outcomes">Öğrenme çıktıları</label><textarea id="proposal-outcomes" name="outcomes" data-smart-outcome required minlength="20" placeholder="Her satıra bir ölçülebilir öğrenme çıktısı yazın&#10;Örn. Karmaşık bir veri setinin güvenilirliğini eleştirel ölçütlerle değerlendirir.&#10;Örn. Kanıta dayalı bir görselleştirme tasarlar ve gerekçelendirir."></textarea><small>Her satır ayrı analiz edilir. Fiil, nesne, bağlam, karmaşıklık, özerklik, sorumluluk ve kanıt işaretleri 320 ms sonra otomatik değerlendirilir.</small></div></div></section>
        <section class="form-section"><h3>Sekiz bileşenli öğrenen iş yükü</h3><p>Eksik alan veya toplam uyuşmazlığı taslak/gönderim işlemini bloke eder. Kesirli saatlerde yuvarlama gerekçesi insan incelemesinde kaydedilir.</p><div class="form-grid">${workloadComponents.map(([key, label]) => `<div class="field"><label class="required" for="proposal-workload-${escapeHtml(key)}">${escapeHtml(label)}</label><input id="proposal-workload-${escapeHtml(key)}" name="workload_${escapeHtml(key)}" type="number" min="0" step="0.25" value="${PROPOSAL_WORKLOAD_SEED[key]}" required /></div>`).join("")}</div></section>
        <section class="form-section smart-qualification-shell" id="smart-alignment-form" aria-labelledby="smart-alignment-title"><div class="smart-alignment-header"><div><span class="page-kicker">Açıklanabilir pilot analiz</span><h3 id="smart-alignment-title">Akıllı Yeterlilik Eşleme</h3><p>Her öğrenme çıktısı için TYÇ, AYÇ/EQF ve TYYÇ ayrı önerilir; seçme ve uygulama yalnız sizin onayınızla gerçekleşir.</p></div><button class="button button--secondary button--sm" type="button" data-action="reanalyze-smart-suggestions">${icon("refresh")} Yeniden analiz et</button></div>
          ${notice("warning", "Öneri karar değildir", QUALIFICATION_ADVISORY_NOTICE)}
          <input id="proposal-smart-mapping" name="qualificationMapping" type="hidden" value="{}" />
          <div id="smart-suggestion-results" class="smart-suggestion-results" aria-live="polite" aria-busy="false">${renderSmartSuggestionReport(null)}</div>
          <div class="smart-applied-fields" data-smart-override><div class="field full"><label for="proposal-smart-content">Uygulanan içerik önerileri</label><textarea id="proposal-smart-content" name="smartContent" placeholder="Bir TYÇ/AYÇ/TYYÇ önerisini uyguladığınızda doldurulur; eğitici tarafından serbestçe düzeltilebilir."></textarea></div><div class="field full"><label for="proposal-smart-assessment">Uygulanan ölçme-değerlendirme önerileri</label><textarea id="proposal-smart-assessment" name="smartAssessment" placeholder="Öneriyi uygulayın veya kendi ölçme yönteminizi yazın."></textarea></div><div class="field full"><label for="proposal-smart-evidence">Uygulanan başarı kanıtı önerileri</label><textarea id="proposal-smart-evidence" name="smartEvidence" placeholder="Rubrik, ürün, performans veya değerlendirici kayıt izini düzenleyin."></textarea></div></div>
          <div class="permission-note"><strong>İnsan kontrolü zorunlu</strong><span>Otomatik analiz hiçbir alanı sessizce uygulamaz. Eğitici öneriyi seçer, gerekirse insan gerekçesiyle düzeltir; Komisyon aynı kaydı salt-okunur inceler.</span></div>
        </section>
        <section class="form-section"><h3>Ölçme, kanıt ve kalite güvencesi</h3><p>Gerçek kimlik veya biyometrik veri yüklemeyin. Dosya alanı yalnız üst veri simülasyonudur.</p><div class="form-grid"><div class="field"><label for="proposal-assessment">Birincil değerlendirme</label><select id="proposal-assessment" name="assessment"><option>Proje + rubrik</option><option>Portfolyo + sözlü sunum</option><option>Uygulama + kısa sınav</option></select></div><div class="field"><label for="proposal-evidence">Pilot kanıt sayısı</label><input id="proposal-evidence" name="evidence" type="number" min="1" value="3" /></div><div class="field full"><label class="required" for="proposal-qualifications">Eğitici yeterlilikleri</label><textarea id="proposal-qualifications" name="qualifications" required minlength="15" placeholder="Alan uzmanlığı, öğretim deneyimi ve doğrulanacak kanıtlar"></textarea></div><div class="field full"><label class="required" for="proposal-quality">Kalite güvence planı</label><textarea id="proposal-quality" name="quality" required minlength="15" placeholder="Rubrik kalibrasyonu, geri bildirim ve kanıt saklama yaklaşımı"></textarea></div><div class="field"><label for="proposal-fee-mode">Program türü</label><select id="proposal-fee-mode" name="feeMode"><option>Ücretsiz</option><option>Ücretli • Pilot taslak</option></select></div><div class="field"><label for="proposal-fee">Örnek ücret (TL)</label><input id="proposal-fee" name="fee" type="number" min="0" value="0" /><small>Pilot parametre — mali birim doğrulaması gerekir</small></div><button class="dropzone full" type="button" data-action="mock-upload">${icon("upload")}<strong>Sentetik kanıt üst verisi ekle</strong><span>PDF, PNG veya JPG • Dosya içeriği aktarılmaz</span></button></div></section>
        <div class="form-actions"><button class="button button--secondary" type="button" data-action="save-draft">Taslağı kaydet</button><button class="button button--secondary" type="button" data-action="preview-proposal">Ön izle</button><button class="button" type="submit">${submitLabel} ${icon("arrow")}</button></div>
      </form>
    </div>
  </div>`;
}

function applicationsPage() {
  const applications = visibleApplications();
  const actions = `${state.roleId === "learner" ? `<button class="button button--secondary" data-nav="recognition">${icon("upload")} Dış kazanım başvurusu</button>` : ""}${["instructor","externalInstructor"].includes(state.roleId) ? `<button class="button" data-nav="proposal">${icon("plus")} Program önerisi</button>` : ""}`;
  return `<div class="page-container">${pageHeader("Başvuru yönetimi", "Başvurular ve süre takibi", "Program önerileri ile dış kazanım tanınma talepleri aynı denetim izi içinde, farklı kontrol yollarıyla izlenir.", actions)}
    <div class="toolbar"><div class="search">${icon("search")}<label class="sr-only" for="application-search">Kod, başlık veya başvuran ara</label><input id="application-search" type="search" placeholder="Kod, başlık veya başvuran ara" /></div><div class="toolbar-group"><select id="application-status" class="select" aria-label="Durum filtresi"><option value="">Tüm durumlar</option><option value="review">Ön incelemede</option><option value="commission">Komisyon gündeminde</option><option value="revision">Revizyon bekliyor</option><option value="deferred">Kurumsal doğrulama bekliyor</option><option value="approved">Doğrulanmış onay</option></select></div></div>
    <div class="table-wrap"><table><caption class="sr-only">${escapeHtml(currentRole().label)} rolünün görebildiği başvurular</caption><thead><tr><th scope="col">Başvuru</th><th scope="col">Tür / Başvuran</th><th scope="col">Durum</th><th scope="col">30 günlük gösterge</th><th scope="col">Pilot analiz</th><th scope="col"><span class="sr-only">İşlem</span></th></tr></thead><tbody id="application-rows">${applications.length ? applications.map(applicationRow).join("") : `<tr class="empty-table-row"><td colspan="6"><strong>Bu role ait başvuru bulunamadı</strong><span>Yeni bir taslak oluşturduğunuzda yalnız kendi kaydınız burada görünür.</span></td></tr>`}</tbody></table></div><div class="card empty-state" id="application-filter-empty" hidden><div class="empty-icon">${icon("search")}</div><h3>Filtreyle eşleşen başvuru yok</h3><p>Arama metnini veya durum filtresini değiştirin.</p></div>
    <div class="section">${notice("warning", "Süre göstergesi hakkında", "30 günlük sayaç yalnızca kaynak dosyadaki pilot kuralı görselleştirir. Sürenin başlangıcı, durması ve kurumsal eskalasyon yöntemi ayrıca doğrulanmalıdır.")}</div>
  </div>`;
}

function applicationRow(item) {
  const progress = Math.min(100, Math.round(item.elapsedDays / 30 * 100));
  const remaining = Math.max(0, 30 - item.elapsedDays);
  return `<tr data-application-status="${escapeHtml(item.status)}" data-searchable="${escapeHtml(`${item.code} ${item.title} ${item.applicant}`.toLocaleLowerCase("tr-TR"))}"><td><span class="table-title">${escapeHtml(item.title)}</span><span class="table-subtitle">${escapeHtml(item.code)} • ${formatDate(item.submittedAt)}</span></td><td>${item.kind === "external" ? "Dış kazanım" : "Program önerisi"}<span class="table-subtitle">${escapeHtml(item.applicant)}</span></td><td>${statusBadge(item.status)}</td><td><div class="progress ${progress > 65 ? "progress--warning" : ""}" role="progressbar" aria-label="${escapeHtml(item.code)} değerlendirme süresi" aria-valuemin="0" aria-valuemax="30" aria-valuenow="${Math.min(30, item.elapsedDays)}" aria-valuetext="${item.elapsedDays} gün geçti, ${remaining} gün kaldı"><span style="width:${progress}%"></span></div><div class="progress-labels"><span>${item.elapsedDays}/30 gün</span><span>${remaining} gün</span></div></td><td><strong>%${item.similarity}</strong> benzerlik<span class="table-subtitle">TYÇ önerisi %${item.tycMatch}</span></td><td><button class="button button--secondary button--sm" data-action="open-application" data-id="${escapeHtml(item.id)}">İncele</button></td></tr>`;
}

function recognitionPage() {
  const markup = `<div class="page-container">${pageHeader("Başvuru • Evre 1", "Kurum dışı kazanım tanınma talebi", "Dış öğrenme kanıtını ve program bilgisini sentetik verilerle girin. Doğrulama bağlantısı sunucu tarafından açılmaz; gerçek belge yüklenmez.")}
    <div class="grid grid-2"><form class="card form-card" id="recognition-form"><section class="form-section"><h3>Kazanım ve sağlayıcı</h3><div class="form-grid"><div class="field full"><label class="required" for="recognition-title">Eğitim adı</label><input id="recognition-title" name="title" required value="Veri Görselleştirme Temelleri" /></div><div class="field"><label class="required" for="recognition-provider">Sağlayıcı</label><input id="recognition-provider" name="provider" required value="Örnek Açık Öğrenme Merkezi" /></div><div class="field"><label for="recognition-url">Doğrulama bağlantısı</label><input id="recognition-url" name="url" type="url" value="https://example.invalid/pilot-belge" /></div></div></section><section class="form-section"><h3>Kredi ve karşılaştırma</h3><div class="form-grid"><div class="field"><label class="required" for="recognition-ects">Talep edilen AKTS</label><input id="recognition-ects" name="ects" type="number" min="1" max="12" value="2" required /></div><div class="field"><label class="required" for="recognition-remote">Uzaktan eğitim oranı (%)</label><input id="recognition-remote" name="remoteRate" type="number" min="0" max="100" value="100" required /></div><div class="field full"><label for="recognition-course">Karşılaştırılacak kurumsal ders</label><input id="recognition-course" name="comparedCourse" value="İstatistiksel Veri Analizi" /></div></div></section><section class="form-section"><h3>Kanıt üst veri simülasyonu</h3><button class="dropzone" type="button" data-action="mock-upload">${icon("upload")}<strong>Örnek sertifika ve içerik planı</strong><span>Dosya seçimi yalnız görünüm simülasyonudur; dosya içeriği aktarılmaz.</span></button></section><div class="form-actions"><button class="button button--secondary" type="button" data-action="save-draft">Taslağı kaydet</button><button class="button" type="submit">Ön incelemeye gönder ${icon("arrow")}</button></div></form>
      <aside class="grid"><div class="card"><div class="card-header"><div><h2>Pilot ön kontrol özeti</h2><p>Başvurudan sonra deterministik örnek bulgular üretilir.</p></div>${statusBadge("simulated")}</div><div class="card-body"><div class="timeline"><div class="timeline-item"><div class="timeline-marker"></div><div class="timeline-content"><strong>Belge bütünlüğü</strong><span>Sağlayıcı teyidi insan incelemesine açıktır.</span></div></div><div class="timeline-item"><div class="timeline-marker"></div><div class="timeline-content"><strong>İçerik karşılaştırması</strong><span>Benzerlik işareti karar değildir.</span></div></div><div class="timeline-item"><div class="timeline-marker"></div><div class="timeline-content"><strong>Üç ayrı sonuç</strong><span>Belge, AKTS ve ders ikamesi bağımsız kararlardır.</span></div></div><div class="timeline-item"><div class="timeline-marker"></div><div class="timeline-content"><strong>AKTS portföy hesabı</strong><span>Toplam kredi ve uzaktan kaynak payı ayrı izlenir.</span></div></div></div></div></div>${notice("warning", "%50 ifadesi basitleştirilmez", "Kaynak, transfer edilen mikro yeterlilik kredilerinin uzaktan kaynaklı bölümüne ilişkindir. Tek eğitimin sunum oranı ile toplam portföy payı ayrı gösterilir.")}</aside>
    </div>
  </div>`;
  return markup.replace('id="recognition-ects" name="ects" type="number" min="1" max="12"', 'id="recognition-ects" name="ects" type="number" min="1" max="6" step="1"');
}

function commissionPage() {
  const scopedApplications = visibleApplications().filter((item) => item.status !== "draft");
  const selected = scopedApplications.find((item) => item.id === state.selectedApplicationId);
  const application = (selected?.status === "commission" ? selected : null) || scopedApplications.find((item) => item.status === "commission") || selected || scopedApplications[0];
  if (!application) {
    return `<div class="page-container">${pageHeader("Evre 2 • Akademik karar desteği", "Komisyon karar masası", "Seçili demo rolünün görev kapsamında incelenebilir bir başvuru bulunmuyor.")}${notice("warning", "Karar değil, pilot analiz", "Yapay zekâ hiçbir durumda akademik karar vermez; karar yetkili Komisyon ve kuruldadır.")}<div class="card empty-state section"><div class="empty-icon">${icon("file")}</div><h3>İncelenecek başvuru yok</h3><p>Gönderilmiş bir program veya dış kazanım başvurusu oluştuğunda yalnız role açık kayıtlar burada görünür.</p><button class="button button--secondary" data-nav="applications">Başvurulara dön</button></div></div>`;
  }
  const tabs = [["summary","Özet"],["smart","Akıllı eşleme"],["evidence","Kanıtlar"],["curriculum","Müfredat eşleme"],["history","Karar geçmişi"]];
  const decisionActions = application.status !== "commission"
    ? notice("success", "Karar kaydı kapalı", "Bu başvuru artık Komisyon gündeminde değildir. Geçmiş ve kanıtlar salt-okunur görüntülenebilir.")
    : state.roleId === "commission"
    ? `<div class="decision-buttons"><button class="button button--secondary" data-action="decision" data-id="${escapeHtml(application.id)}" data-status="deferred">${icon("shield")} Kurumsal doğrulamaya ertele</button><button class="button button--secondary" data-action="decision" data-id="${escapeHtml(application.id)}" data-status="revision">Revizyon iste</button><button class="button button--secondary" data-action="decision" data-id="${escapeHtml(application.id)}" data-status="commission">Çekimser görüş ekle</button><button class="button button--danger" data-action="decision" data-id="${escapeHtml(application.id)}" data-status="rejected">Gerekçeli pilot ret</button></div>${notice("warning", "Nihai onay kapalı", "Kurumsal doğrulama tamamlanmadığı için bu kontrollü pilotta approved/credentialed işlemi sunulmaz.")}`
    : state.roleId === "coordinator"
      ? `<div class="decision-buttons"><button class="button button--secondary" data-action="decision" data-id="${escapeHtml(application.id)}" data-status="revision">Eksik kanıt için revizyon iste</button></div>${notice("warning", "Koordinatörlük yetkisi", "Koordinatörlük ön inceleme ve revizyon isteği oluşturabilir; akademik onay veya ret Komisyon demo rolüne aittir.")}`
      : notice("warning", "Salt-okunur karar görünümü", "Sistem yöneticisi akademik karar kaydedemez. Bu rol yalnız pilot yapılandırma ve denetim görünümünü inceler.");
  return `<div class="page-container">${pageHeader("Evre 2 • Akademik karar desteği", "Komisyon karar masası", "Yapay zekâ karar vermez; komisyonun karşılaştırılabilir kanıt, pilot mevzuat ön kontrolleri ve denetim izi üzerinden gerekçeli karar oluşturmasını destekler.")}
    ${notice("warning", "Karar değil, pilot analiz", "Bu çıktı komisyon incelemesini destekleyen karşılaştırılabilir bir pilot analizidir. Nihai akademik karar yetkili kurulundur.")}
    <figure class="editorial-figure editorial-figure--compact"><img src="assets/illustrations/commission-review.webp" alt="Akademik komisyonun belge, müfredat eşlemesi ve öğrenme kanıtlarını birlikte incelediği editoryal illüstrasyon" width="960" height="668" loading="lazy" /><figcaption>İnsan kararı merkezde; teknoloji yalnız karşılaştırılabilir kanıtı düzenler.</figcaption></figure>
    <div class="decision-layout section"><section class="card"><div class="card-header"><div><span class="table-subtitle">${escapeHtml(application.code)}</span><h2>${escapeHtml(application.title)}</h2><p>${escapeHtml(application.applicant)} • ${escapeHtml(application.comparedCourse)}</p></div>${statusBadge(application.status)}</div><div class="card-body"><div class="tabs" role="tablist" aria-label="Komisyon inceleme bölümleri">${tabs.map(([id,label]) => `<button id="commission-tab-${id}" class="tab ${currentCommissionTab === id ? "active" : ""}" role="tab" aria-selected="${currentCommissionTab === id}" aria-controls="commission-tab-panel" tabindex="${currentCommissionTab === id ? "0" : "-1"}" data-action="commission-tab" data-tab="${id}">${label}</button>`).join("")}</div><div id="commission-tab-panel" role="tabpanel" aria-labelledby="commission-tab-${currentCommissionTab}">${commissionTab(application, currentCommissionTab)}</div></div></section>
      <aside class="card sticky-card"><div class="card-header"><div><h2>Gerekçeli görüş</h2><p>Her izinli eylem audit izine eklenir.</p></div></div><div class="card-body">${decisionActions}<div style="margin-top:18px">${notice("warning", "Yetki sınırı", "Analiz motoru hiçbir akademik karar kaydedemez; nihai akademik yetki Komisyon ve yetkili kuruldadır.")}</div></div></aside>
    </div>
  </div>`;
}

function commissionTab(application, tab) {
  if (tab === "smart") {
    const record = smartAlignmentForApplication(application);
    const report = smartReportForAlignment(record, application);
    return `<div class="section">${smartReadOnlyReview(record, report, { application })}</div>`;
  }
  if (tab === "evidence") return `<div class="section"><div class="grid grid-2">${["Program bilgi paketi","Öğrenme çıktısı matrisi","Ölçme rubriği","Eğitici yeterlilik kanıtı","İş yükü hesabı","Kalite güvence planı"].map((title,index) => `<article class="card"><div class="card-body"><div class="integration-head"><div><strong>${escapeHtml(title)}</strong><span class="table-subtitle">Sentetik belge metadata • PDF</span></div>${index < application.evidence ? statusBadge("approved","Mevcut") : statusBadge("review","Bekliyor")}</div></div></article>`).join("")}</div></div>`;
  if (tab === "curriculum") return `<div class="section"><h3>Öğrenme çıktısı eşleme matrisi</h3><div class="matrix">${[["Veri kaynağını değerlendirir","Veri güvenilirliği ölçütlerini uygular",82],["Temel görselleştirmeyi yorumlar","Grafik ve tablo yorumlar",64],["Kanıta dayalı kısa analiz üretir","İstatistiksel çıkarım yapar",38]].map(([a,b,value]) => `<div class="matrix-row"><span>${a}<small class="table-subtitle">Önerilen program</small></span><span>${b}<small class="table-subtitle">${escapeHtml(application.comparedCourse)}</small></span><strong>%${value}</strong></div>`).join("")}</div>${notice("warning", "Yorum gerektirir", "Eşleme oranları deterministik pilot örnektir; otomatik onay veya ret üretmez.")}</div>`;
  if (tab === "history") return `<div class="section"><div class="timeline">${state.audit.filter((event) => event.entityId === application.id).map(auditTimeline).join("") || `<p class="page-subtitle">Bu başvuru için kayıtlı olay bulunamadı.</p>`}</div></div>`;
  return `<div class="analysis-band"><div class="band"><span>Pilot müfredat benzerliği</span><strong>%${application.similarity}</strong><span>Karşılaştırılabilirlik işareti</span></div><div class="band is-active"><span>TYÇ öneri uyumu</span><strong>%${application.tycMatch}</strong><span>TYÇ ${application.kind === "internal" ? 6 : 5} • Gerekçeli öneri</span></div><div class="band"><span>Pilot kanıt durumu</span><strong>${application.evidence}/${application.evidence + application.missing}</strong><span>${application.missing ? `${application.missing} eksik` : "Zorunlu metadata tam"}</span></div></div><div class="grid grid-2"><article class="card"><div class="card-body"><h3>AKTS ön kontrolü</h3><div class="permission-note"><strong>${application.ects} AKTS önerisi</strong><span>Payda, yüzde hesabı, yuvarlama ve üst sınır kurumsal doğrulama olmadan hesaplanmaz.</span></div><p class="table-subtitle">%10 ifadesi yalnız doğrulanmamış örnek göstergedir; kesin tavan veya otomatik karar değildir.</p></div></article><article class="card"><div class="card-body"><h3>Uzaktan kredi portföyü</h3><div class="progress progress--warning"><span style="width:${application.portfolioRemoteShare || 42}%"></span></div><div class="progress-labels"><span>Portföy payı: %${application.portfolioRemoteShare || 42}</span><span>Doğrulanmamış örnek: %50</span></div><p class="table-subtitle">Tek programın sunum oranından ayrıdır ve nihai bloklama yapmaz.</p></div></article></div>`;
}

function programsPage() {
  const action = ["instructor","externalInstructor"].includes(state.roleId) ? `<button class="button" data-nav="proposal">${icon("plus")} Yeni program öner</button>` : "";
  const programs = visiblePrograms();
  const content = programs.length ? `<div class="grid grid-3">${programs.map(programCard).join("")}</div>` : `<div class="card empty-state"><div class="empty-icon">${icon("layers")}</div><h3>Bu role ait program yok</h3><p>Yeni bir program önerisi gönderildiğinde yaşam döngüsü kaydı burada görünür.</p>${action}</div>`;
  return `<div class="page-container">${pageHeader("Program yaşam döngüsü", "Mikro yeterlilik programları", "Taslak, inceleme ve pilot yayımlama durumlarını fakülte, AKTS, yöntem ve öğrenen sayısıyla birlikte izleyin.", action)}${content}</div>`;
}

function assessmentPage() {
  const events = [["09.02","Kimlik adımı","Örnek kimlik kontrolü tamamlandı"],["09.18","Sekme değişimi","Pilot olay kaydı • orta önem"],["09.27","Ortam sesi","Simüle ses eşiği işareti"],["09.41","Gönderim","Değerlendirme kuyruğuna alındı"]];
  const session = state.assessmentSessions.find((item)=>item.id==="ASM-DEMO-LIVE") || state.assessmentSessions[0];
  const score = session?.score ?? 84;
  const startAction = ASSESSMENT_START_ROLES.has(state.roleId) ? `<button class="button" data-action="assessment-run">${icon("check")} Örnek sınavı başlat</button>` : "";
  const decisionReady = session && ["active", "under_review"].includes(session.status);
  const decisionAction = canRecordAssessmentDecision(state.roleId) && decisionReady
    ? `<button class="button button--secondary" data-action="assessment-decision">İnsan değerlendirmesi kaydet</button>`
    : canRecordAssessmentDecision(state.roleId)
      ? `<div class="permission-note"><strong>Karar kaydı kapalı</strong><span>Yeni veya insan incelemesindeki bir oturum olduğunda değerlendirici kararı kaydedilebilir.</span></div>`
      : `<div class="permission-note"><strong>Salt-okunur olay görünümü</strong><span>Nihai insan değerlendirici kararı yalnız eğitici veya Komisyon demo rolü tarafından kaydedilebilir.</span></div>`;
  return `<div class="page-container">${pageHeader("Evre 3 • Kanıt ve değerlendirme", "Eğitim ve değerlendirme pilotu", "Gerçek kamera, mikrofon, yüz tanıma veya biyometrik veri işlenmez. Olaylar yalnız senaryolaştırılmış metinsel pilot kayıtlarıdır.", startAction)}
    ${notice("risk", "Gözetim simülasyonu", "Bu ekran akademik geçerlilik veya mevzuata tam uyum iddiası taşımaz. Her işaret insan değerlendirici tarafından incelenir; teknoloji tek başına karar vermez.")}
    <div class="grid grid-3 section"><section class="card"><div class="card-header"><div><h2>Örnek değerlendirme oturumu</h2><p>Proje Temelli Öğrenme Tasarımı • Sentetik katılımcı</p></div>${statusBadge(session?.status || "scheduled")}</div><div class="card-body"><div class="grid grid-3">${kpi("Proje puanı",`${score}/100`,"Rubrik tabanlı pilot puan","check")}${kpi("Güvenilirlik","76/100","İnsan incelemesi gerekli","shield")}${kpi("İşaretli olay",session?.events ?? 2,"Karar değildir","alert")}</div><h3 class="section">Rubrik özeti</h3>${[["Problem tanımı",90],["Kanıt kullanımı",82],["Çözüm tasarımı",80]].map(([label,value]) => `<div style="margin-bottom:13px"><div class="progress-labels"><strong>${label}</strong><span>${value}/100</span></div><div class="progress" role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}"><span style="width:${value}%"></span></div></div>`).join("")}</div></section>
      <section class="card"><div class="card-header"><div><h2>İzin ve kimlik kontrol listesi</h2><p>Tamamı senaryo verisidir.</p></div>${statusBadge("simulated")}</div><div class="card-body"><div class="timeline">${[["Örnek kimlik adımı","Sentetik kullanıcı eşleştirildi"],["Kamera izni","Kapalı — istek yapılmadı"],["Mikrofon izni","Kapalı — istek yapılmadı"],["Veri minimizasyonu","Yalnız metinsel olay etiketi"]].map(([title,body])=>`<div class="timeline-item"><div class="timeline-marker"></div><div class="timeline-content"><strong>${title}</strong><span>${body}</span></div></div>`).join("")}</div></div></section>
      <section class="card"><div class="card-header"><div><h2>Simüle olay günlüğü</h2><p>Görüntü, ses veya biyometrik şablon saklanmaz.</p></div></div><div class="card-body"><div class="timeline">${events.map(([time,title,body]) => `<div class="timeline-item"><div class="timeline-marker"></div><div class="timeline-content"><strong>${title}</strong><span>${time} • ${body}</span></div></div>`).join("")}</div>${decisionAction}</div></section>
    </div>
  </div>`;
}

function walletPage() {
  const credentialContent = state.credentials.length
    ? state.credentials.map(credentialCard).join("")
    : `<section class="card empty-state"><div class="empty-icon">${icon("wallet")}</div><h3>Henüz pilot yeterlilik yok</h3><p>Uçtan uca program senaryosu tamamlandığında yapılandırılmış belge burada görünür.</p></section>`;
  const verifyAction = state.credentials[0]
    ? `<button class="button button--secondary button--sm" data-action="open-credential" data-code="${escapeHtml(state.credentials[0].code)}">Doğrulama sayfasını aç</button>`
    : `<span class="table-subtitle">Doğrulama için önce pilot yeterlilik oluşturulmalıdır.</span>`;
  return `<div class="page-container">${pageHeader("Evre 4 • Yapılandırılmış belge", "Dijital yeterlilik cüzdanı", "Pilot belgeler yalnız bu Preview ortamında doğrulanır; gerçek W3C/Open Badges uygunluk testi, kurumsal imza veya dış cüzdan yayını yapılmaz.", `<button class="button button--secondary" data-action="verify-code">${icon("search")} Kodla doğrula</button>`)}
    <figure class="editorial-figure editorial-figure--wide"><img src="assets/illustrations/digital-wallet.webp" alt="Üniversite kaydı, öğrenen dijital cüzdanı ve doğrulayıcı kurum arasındaki güven zinciri illüstrasyonu" width="960" height="668" loading="lazy" /><figcaption>Taşınabilirlik hedefi, iptal farkındalığı ve Preview içi doğrulama birlikte görünür.</figcaption></figure>
    <div class="grid grid-2">${credentialContent}<section class="card"><div class="card-header"><div><h2>Kontrollü paylaşım</h2><p>QR yalnız pilot doğrulama rotasına gider.</p></div></div><div class="card-body donut-row">${qrMarkup()}<div><h3>Doğrulanabilir görünüm</h3><p class="page-subtitle">Belge kodu, sağlayan kurum, öğrenme çıktıları, AKTS, TYÇ önerisi, düzenlenme tarihi ve pilot durumu gösterilir.</p>${verifyAction}</div></div></section></div>
    <div class="section">${notice("warning", "EK-1 alanları kurumsal teyide açık", "Kaynaklar asgari alan yapısından söz eder ancak tüm alanları tek tek doğrulamamaktadır. Bu pilot şema resmî alan seti olarak sunulmaz.")}</div>
  </div>`;
}

function credentialCard(item) {
  return `<article class="credential"><div class="credential-top"><img src="assets/brand/kdpu-logo-web.png" alt="Kütahya Dumlupınar Üniversitesi" />${statusBadge(item.status)}</div><h3>${escapeHtml(item.title)}</h3><span class="credential-code">${escapeHtml(item.code)}</span><div class="credential-grid"><div class="credential-field"><span>Öğrenen</span><strong>${escapeHtml(item.owner)}</strong></div><div class="credential-field"><span>Pilot AKTS</span><strong>${item.ects}</strong></div><div class="credential-field"><span>TYÇ önerisi</span><strong>Düzey ${item.level}</strong></div><div class="credential-field"><span>Düzenleme</span><strong>${formatDate(item.issuedAt)}</strong></div><div class="credential-field"><span>İmzalama</span><strong>Simülasyon</strong></div><div class="credential-field"><span>Doğrulama</span><strong>Preview içi</strong></div></div></article>`;
}

function qrMarkup() {
  const pattern = "111111101010101111111100000101110101000001101110101010101011101101110101110101011101101110101010101011101100000101010101000001111111101010101111111";
  return `<div class="qr" role="img" aria-label="Pilot doğrulama kodunu temsil eden dekoratif QR simülasyonu">${[...pattern].slice(0,81).map((value) => `<i class="${value === "1" ? "on" : ""}"></i>`).join("")}</div>`;
}

function qualificationDraftFor(frameworkId, level) {
  const matches = (state.qualificationDrafts || []).filter((draft) => draft.frameworkId === frameworkId && draft.level === Number(level));
  if (PROPOSAL_ROLES.has(state.roleId)) {
    return matches.find((draft) => draft.ownerRole === state.roleId && draft.ownerName === currentRole().name) || null;
  }
  return matches.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0] || null;
}

function matrixSeedRow(dimension, frameworkId, level) {
  const example = qualificationMatrixExamples.find((item) => item.frameworkId === frameworkId && item.level === Number(level));
  const seeds = {
    knowledge: {
      learningOutcome: "Dijital öğrenme tasarımının kuram ve ilkelerini eleştirel biçimde açıklar.",
      learningLevel: "Analiz etme ve gerekçelendirme",
      courseContent: "Öğrenme kuramları, tasarım modelleri ve kanıt değerlendirme ilkeleri",
      assessmentMethod: "Eleştirel kısa rapor + analitik rubrik",
      evidence: "Gerekçeli rapor ve rubrikte en az yeterli düzey",
      alignmentRationale: "Kuramsal bilgiyi eleştirel açıklama ve uygulama bağlamına taşıma kanıtı üretir."
    },
    skills: {
      learningOutcome: example?.learningOutcomeSample || "Karmaşık bir öğrenme ihtiyacına yenilikçi çözüm tasarlar.",
      learningLevel: example?.learningLevelSample || "Yaratma ve değerlendirme",
      courseContent: example?.courseContentSample || "İhtiyaç analizi, öğrenme senaryosu ve ölçme planı",
      assessmentMethod: example?.assessmentMethodSample || "Proje + sunum + performans rubriği",
      evidence: example?.evidenceSample || "Proje dosyası, sunum ve rubrik kaydı",
      alignmentRationale: example?.alignmentRationaleSample || "Seviye beklentisiyle gözlenebilir beceri kanıtını ilişkilendirir."
    },
    competence: {
      learningOutcome: "Öngörülemeyen proje koşullarında kanıta dayalı karar alır; ekip işini ve etik riskleri yönetir.",
      learningLevel: "Bağımsız karar alma ve yönetme",
      courseContent: "Proje yönetimi, etik, erişilebilirlik ve risk değerlendirmesi",
      assessmentMethod: "Senaryo simülasyonu + karar gerekçesi + akran değerlendirmesi",
      evidence: "Karar günlüğü, risk kaydı ve akran değerlendirmesi",
      alignmentRationale: "Sorumluluk, özerklik, proje yönetimi ve etik yargı kanıtlarını birlikte görünür kılar."
    }
  };
  return { dimension, ...seeds[dimension] };
}

function descriptorParagraphs(value) {
  return String(value || "").split(/\n{2,}/).filter(Boolean).map((part) => `<p>${escapeHtml(part)}</p>`).join("");
}

function matrixDimensionCard(dimension, label, descriptorText, row, editable, canonicalText = "", translationNote = "") {
  const readonly = editable ? "" : " readonly";
  return `<fieldset class="matrix-editor-row"><legend>${escapeHtml(label)}</legend>
    <div class="matrix-reference"><span>Resmî referans • salt okunur</span>${descriptorParagraphs(descriptorText)}${translationNote ? `<small>${escapeHtml(translationNote)}</small>` : ""}${canonicalText ? `<details><summary>Kanonik İngilizce metni göster</summary>${descriptorParagraphs(canonicalText)}</details>` : ""}</div>
    <input type="hidden" name="${dimension}Dimension" value="${dimension}" />
    <div class="matrix-fields">
      <div class="field full"><label class="required" for="matrix-${dimension}-outcome">Öğrenme hedefi / çıktısı</label><textarea id="matrix-${dimension}-outcome" name="${dimension}Outcome" required minlength="20"${readonly}>${escapeHtml(row.learningOutcome)}</textarea></div>
      <div class="field"><label class="required" for="matrix-${dimension}-level">Öğrenme düzeyi ve eylem fiili</label><input id="matrix-${dimension}-level" name="${dimension}Level" required minlength="5" value="${escapeHtml(row.learningLevel)}"${readonly} /></div>
      <div class="field"><label class="required" for="matrix-${dimension}-content">Ders içeriği / etkinlik</label><textarea id="matrix-${dimension}-content" name="${dimension}Content" required minlength="12"${readonly}>${escapeHtml(row.courseContent)}</textarea></div>
      <div class="field"><label class="required" for="matrix-${dimension}-assessment">Ölçme-değerlendirme</label><textarea id="matrix-${dimension}-assessment" name="${dimension}Assessment" required minlength="12"${readonly}>${escapeHtml(row.assessmentMethod)}</textarea></div>
      <div class="field"><label class="required" for="matrix-${dimension}-evidence">Başarı ölçütü ve kanıt</label><textarea id="matrix-${dimension}-evidence" name="${dimension}Evidence" required minlength="12"${readonly}>${escapeHtml(row.evidence)}</textarea></div>
      <div class="field full"><label class="required" for="matrix-${dimension}-rationale">Uyum gerekçesi</label><textarea id="matrix-${dimension}-rationale" name="${dimension}Rationale" required minlength="20"${readonly}>${escapeHtml(row.alignmentRationale)}</textarea></div>
    </div>
  </fieldset>`;
}

function visibleSmartAlignments() {
  const records = state.smartAlignments || [];
  if (PROPOSAL_ROLES.has(state.roleId)) return records.filter((item) => item.ownerRole === state.roleId && item.ownerName === currentRole().name);
  if (["coordinator", "commission", "admin"].includes(state.roleId)) return records;
  return [];
}

function smartReportForAlignment(record, application = null) {
  if (!record) return null;
  const stored = readSmartSuggestionSnapshot(record.suggestionSnapshot, {
    engineVersion: record.engineVersion,
    orderedOutcomeFingerprint: record.orderedOutcomeFingerprint,
    outcomes: record.outcomes,
    program: record.program,
    manualOverrides: record.manualOverrides,
    appliedSelections: record.appliedSelections,
    higherEducationCycleSuggestion: record.higherEducationCycleSuggestion
  });
  return stored.ok ? stored.report : null;
}

function smartAlignmentForApplication(application) {
  return (state.smartAlignments || []).find((item) => item.applicationId === application?.id || item.applicationCode === application?.code) || null;
}

function smartAlignmentDecisionStatus(record) {
  const decision = record?.boardDecision;
  if (!decision || decision.source !== "human_commission") return notice("warning", "İnsan kurul kararı bekleniyor", "Motor önerisi ve eğitici seçimi akademik karar değildir. Komisyon kararı ayrı bir kayıt olarak tutulur.");
  const labels = { approved: "İnsan kurul onayı", revision_requested: "İnsan kurul revizyon isteği", rejected: "İnsan kurul reddi", deferred: "İnsan kurul ertelemesi" };
  return notice(decision.decision === "approved" ? "success" : "warning", labels[decision.decision] || "İnsan kurul kararı", `${decision.decidedBy} • ${decision.rationale} • TYÇ ${decision.decidedLevels?.tyc} / AYÇ ${decision.decidedLevels?.eqf} / TYYÇ ${decision.decidedLevels?.tyyc}. Öneri kaydı değiştirilmedi.`);
}

function smartReadOnlyReview(record, report, { application = null, compact = false } = {}) {
  if (!report) return notice("risk", "Akıllı eşleme snapshot'ı doğrulanamadı", "Saklanan tam öneri raporunun bütünlük hash'i veya seçim bağları doğrulanamadı. Sistem güncel motorla sessizce yeniden hesaplama yapmaz; kayıt güvenli biçimde incelemeye kapatıldı.");
  const appliedSelections = record?.appliedSelections || [];
  const boardAction = record && application && state.roleId === "commission" && application.status === "commission"
    ? `<button class="button button--secondary button--sm" type="button" data-action="qualification-board-decision" data-id="${escapeHtml(application.id)}">${record.boardDecision ? "Ayrı kurul kaydını güncelle" : "Ayrı insan kurul kararı kaydet"}</button>`
    : "";
  const snapshotMeta = record?.suggestionSnapshot;
  const header = `<div class="smart-review-head"><div><span class="page-kicker">${escapeHtml(record?.applicationCode || application?.code || "Pilot kayıt")}</span><h3>${escapeHtml(record?.programTitle || application?.title || "Akıllı yeterlilik eşlemesi")}</h3><p>${escapeHtml(record?.ownerName || application?.applicant || "Eğitici pilot kullanıcısı")} • ${appliedSelections.length} kullanıcı onaylı seçim • Motor ${escapeHtml(record?.engineVersion || QUALIFICATION_SUGGESTION_ENGINE_VERSION)} • Kaynak ${escapeHtml(snapshotMeta?.referenceDataVersion || "—")}</p><small data-smart-snapshot-hash="${escapeHtml(snapshotMeta?.integrityHash || "")}">Değişmez tam rapor snapshot'ı • ${escapeHtml(snapshotMeta?.integrityHash || "bütünlük hash'i yok")}</small></div>${boardAction}</div>`;
  if (compact) return `<article class="card smart-review-card" data-smart-review><div class="card-body">${header}${smartProgramSummary(report)}${smartAlignmentDecisionStatus(record)}<details><summary>Salt-okunur eşleme ayrıntısını aç</summary><div class="smart-review-details">${renderSmartSuggestionReport(report, { interactive: false, appliedSelections })}</div></details></div></article>`;
  return `<section class="smart-readonly-review" data-smart-review>${header}${notice("warning", "Öneri karar değildir", QUALIFICATION_ADVISORY_NOTICE)}${smartAlignmentDecisionStatus(record)}${renderSmartSuggestionReport(report, { interactive: false, appliedSelections })}</section>`;
}

function smartAlignmentLibrary() {
  const records = visibleSmartAlignments();
  if (!records.length) return `<section class="card section" data-smart-review><div class="card-body"><h2>Programla bağlı akıllı eşleme kayıtları</h2><p class="page-subtitle">Henüz bu role görünür bir akıllı eşleme kaydı yok. İç veya dış eğitici, program önerisinde öğrenme çıktılarını analiz edip taslağı kaydettiğinde applicationId/programId bağlantısı burada salt-okunur görünür.</p></div></section>`;
  return `<section class="section" aria-labelledby="smart-library-title"><div class="section-heading"><div><span class="page-kicker">Aynı pilot kayıtları</span><h2 id="smart-library-title">Programla bağlı akıllı eşlemeler</h2><p>Program önerisi ekranındaki TYÇ/AYÇ/TYYÇ seçimleri burada aynı applicationId/programId bağıyla incelenir.</p></div></div><div class="grid">${records.map((record) => smartReadOnlyReview(record, smartReportForAlignment(record), { compact: true })).join("")}</div></section>`;
}

function frameworksPage() {
  const framework = qualificationFrameworks.find((item) => item.id === currentFrameworkTab) || qualificationFrameworks[0];
  const descriptor = findQualificationDescriptor(framework.id, currentFrameworkLevel) || qualificationLevelDescriptors.find((item) => item.frameworkId === framework.id);
  const template = findQualificationTemplate(framework.id, descriptor.level);
  const savedDraft = qualificationDraftFor(framework.id, descriptor.level);
  const editable = PROPOSAL_ROLES.has(state.roleId);
  const displayDescriptor = framework.id === "eqf" && descriptor.displayTranslationTr ? descriptor.displayTranslationTr : descriptor;
  const eqfTranslationNote = framework.id === "eqf"
    ? `Europass Türkçe görünüm; ${descriptor.level === 7 ? "beceri alanı kurumsal operasyonel çeviri olarak işaretlidir" : "resmî Türkçe sayfadan doğrulanmıştır"}.`
    : "";
  const dimensions = [
    ["knowledge", smartDimensionLabel("knowledge", framework.id), displayDescriptor.knowledge, framework.id === "eqf" ? descriptor.knowledge : ""],
    ["skills", smartDimensionLabel("skills", framework.id), displayDescriptor.skills, framework.id === "eqf" ? descriptor.skills : ""],
    ["competence", smartDimensionLabel("competence", framework.id), displayDescriptor.competence, framework.id === "eqf" ? descriptor.competence : ""]
  ];
  const rows = dimensions.map(([dimension]) => savedDraft?.rows.find((row) => row.dimension === dimension) || matrixSeedRow(dimension, framework.id, descriptor.level));
  const actions = editable
    ? `<button class="button" type="submit">${icon("check")} Matris taslağını kaydet</button>`
    : `<span class="status status--info">Salt-okunur inceleme</span>`;
  const draftNotice = savedDraft
    ? notice("success", "Kayıtlı pilot matris taslağı", `${savedDraft.ownerName} • ${formatDate(savedDraft.updatedAt, true)}. Bu kayıt resmî seviye ataması veya komisyon kararı değildir.`)
    : notice("warning", "Hazır örnek alanlar", "Alanlar kullanım örneğiyle doldurulmuştur. Eğitici kendi ölçülebilir çıktısını, içeriğini, ölçme yöntemini, ölçütünü ve kanıtını yazmalıdır.");
  return `<div class="page-container">${pageHeader("Akademik tasarım • Resmî referans + pilot şablon", "TYÇ, AYÇ ve TYYÇ yeterlilik eşleme matrisleri", "Türkiye, Avrupa ve yükseköğretime özgü TYYÇ katmanları ayrı tutulur. TYÇ/AYÇ resmî seviye tanımlayıcıları ile TYYÇ form siciline dayalı advisory özetler salt okunurdur; aday eğitici program hedefi, içerik, ölçme yöntemi, başarı ölçütü ve kanıt alanlarını doldurur.")}
    ${notice("warning", "Seviye seçimi karar değildir", "Bu ekran yalnız program önerisi için gerekçeli seviye eşleme taslağı üretir. TYYÇ metinleri exact form yerine geçmeyen pilot özetlerdir. Nihai akademik karar yetkili kurulundur; resmî yerleştirme, eşdeğerlik, akreditasyon veya logo hakkı iddia edilmez.")}
    <div class="framework-tabs" role="tablist" aria-label="Yeterlilik çerçevesi seçimi">${qualificationFrameworks.map((item) => `<button class="tab ${item.id === framework.id ? "active" : ""}" role="tab" aria-selected="${item.id === framework.id}" data-action="framework-tab" data-framework="${item.id}">${escapeHtml(item.code)}<small>${escapeHtml(item.nameTr)}</small></button>`).join("")}</div>
    <section class="card framework-source-card"><div class="card-body"><div><span class="table-subtitle">Kamuya açık resmî çerçeve referansı</span><h2>${escapeHtml(framework.nameTr)}</h2><p class="page-subtitle">${escapeHtml(framework.nameEn)} • ${escapeHtml(framework.jurisdiction)} • Doğrulama: ${formatDate(framework.verifiedAt)}</p></div><a class="button button--secondary button--sm" href="${escapeHtml(framework.officialSourceUrl)}" target="_blank" rel="noreferrer">Resmî kaynağı aç ${icon("arrow")}</a></div></section>
    <div class="toolbar section"><div><strong>Hazır şablon</strong><span class="table-subtitle">${framework.id === "tyyc" ? "TYYÇ için 5–8" : "1–8"} arasında seviye seçin; üç boyut birlikte yüklenir.</span></div><div class="toolbar-group"><label class="sr-only" for="framework-level">Seviye</label><select id="framework-level" class="select">${smartFrameworkLevels(framework.id).map((level) => `<option value="${level}" ${level === descriptor.level ? "selected" : ""}>${framework.code} ${level}. seviye</option>`).join("")}</select><button class="button button--secondary" data-action="load-framework-level">Şablonu yükle</button></div></div>
    ${draftNotice}
    <form id="qualification-matrix-form" class="section"><input type="hidden" name="frameworkId" value="${framework.id}" /><input type="hidden" name="level" value="${descriptor.level}" />
      <section class="card matrix-intro"><div class="card-header"><div><h2>${escapeHtml(template.title)}</h2><p>${escapeHtml(template.candidateInstructions)}</p></div>${statusBadge("simulated", `${framework.code} ${descriptor.level} • Pilot öneri`)}</div><div class="card-body"><div class="field"><label class="required" for="matrix-program-title">Program adı</label><input id="matrix-program-title" name="programTitle" required minlength="8" value="${escapeHtml(savedDraft?.programTitle || "Dijital Öğrenme Tasarımı ve Değerlendirme")}"${editable ? "" : " readonly"} /></div><ol class="instruction-list"><li>Her resmî boyut için en az bir ölçülebilir çıktı yazın.</li><li>Çıktıyı içerik, öğretim etkinliği ve ölçme yöntemiyle eşleyin.</li><li>Başarı ölçütünü ve doğrulanabilir kanıtı açıkça belirtin.</li><li>AKTS/iş yükü ve uzaktan eğitim kontrollerini program formunda ayrıca tamamlayın.</li></ol></div></section>
      <div class="matrix-editor">${dimensions.map(([dimension, label, text, canonical], index) => matrixDimensionCard(dimension, label, text, rows[index], editable, canonical, eqfTranslationNote)).join("")}</div>
      <div class="form-actions"><span class="table-subtitle">Şablon ve örnekler sentetiktir; resmî metinler salt okunur kaynak alanlarıdır.</span>${actions}</div>
    </form>
    ${smartAlignmentLibrary()}
    <section class="card section"><div class="card-header"><div><h2>Veri kapsamı ve provenans</h2><p>Supabase kataloğu resmî referans ile pilot çalışma verisini ayırır.</p></div>${statusBadge("approved", "20 düzey kaydı")}</div><div class="card-body"><div class="grid grid-3"><div><strong>8 TYÇ seviyesi</strong><p class="page-subtitle">MYK resmî Türkçe tanımlayıcıları</p></div><div><strong>8 AYÇ/EQF seviyesi</strong><p class="page-subtitle">Europass kanonik İngilizce + ayrı Türkçe görünüm</p></div><div><strong>4 TYYÇ düzeyi • 6 tür formu</strong><p class="page-subtitle">YÖK/MYK form sicili + exact metin yerine geçtiği iddia edilmeyen advisory boyut özeti</p></div></div></div></section>
    <section class="card section"><div class="card-header"><div><h2>KDPÜ program referansları</h2><p>Türkiye Yeterlilikler Veri Tabanı'ndan doğrulanan sınırlı kamu üst verisi; tam katalog değildir.</p></div>${statusBadge("simulated", `${officialQualificationReferences.length} kaynak kayıt`)}</div><div class="table-wrap"><table><caption class="sr-only">KDPÜ resmî yeterlilik referansları</caption><thead><tr><th scope="col">Kod / program</th><th scope="col">Tür</th><th scope="col">Seviye</th><th scope="col">Yerleştirme durumu</th><th scope="col">Kaynak</th></tr></thead><tbody>${officialQualificationReferences.map((item) => `<tr><td><span class="table-title">${escapeHtml(item.qualificationCode)}</span><span class="table-subtitle">${escapeHtml(item.qualificationTitle)}</span></td><td>${escapeHtml(item.qualificationType)}</td><td>TYÇ ${item.tycLevel}${item.eqfLevel ? ` • AYÇ ${item.eqfLevel}` : ""}</td><td>${item.placementStatus === "not_placed" ? statusBadge("disconnected", "TYÇ'ye yerleştirilmedi") : statusBadge("simulated", "Yerleştirme doğrulanmadı")}</td><td><a class="text-button" href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noreferrer">Kaydı aç</a></td></tr>`).join("")}</tbody></table></div></section>
    <section class="grid grid-2 section" aria-label="Yeterlilik veri kaynağı kütüğü">${qualificationDatasetRegistry.map((dataset) => `<article class="card"><div class="card-body"><span class="table-subtitle">${escapeHtml(dataset.publisherName)}</span><h3>${escapeHtml(dataset.datasetName)}</h3><p class="page-subtitle">${escapeHtml(dataset.coverageNote)}</p><div class="permission-note"><strong>Alım: manuel doğrulanmış anlık görüntü</strong><span>${escapeHtml(dataset.licenceNote)}</span></div><a class="button button--secondary button--sm" href="${escapeHtml(dataset.documentationUrl)}" target="_blank" rel="noreferrer">Kaynak açıklaması</a></div></article>`).join("")}</section>
  </div>`;
}

function integrationsPage() {
  const bulkAction = INTEGRATION_BULK_ROLES.has(state.roleId) ? `<button class="button button--secondary" data-action="integration-dryrun">${icon("refresh")} Toplu dry-run</button>` : "";
  const categories = [...new Set(state.integrations.map((item) => item.category))].sort((a, b) => a.localeCompare(b, "tr"));
  const visibleIntegrations = currentIntegrationCategory === "all"
    ? state.integrations
    : state.integrations.filter((item) => item.category === currentIntegrationCategory);
  const tierFilteredIntegrations = currentIntegrationTier === "all"
    ? visibleIntegrations
    : visibleIntegrations.filter((item) => item.integrationTier === currentIntegrationTier);
  const publicReferences = state.integrations.filter((item) => item.systemClass.includes("Kamuya açık")).length;
  return `<div class="page-container">${pageHeader("Evre 5 • Kontrollü servis katmanı", "Entegrasyon merkezi", "Bütün bağlantılar simülasyon veya bağlı değil durumundadır. Dry-run, onay kapısı, hata, yeniden deneme ve mutabakat kayıtları gerçek API çağrısı olmadan örneklenir.", bulkAction)}
    ${notice("success", "Canlı servis çağrısı kapalı", "Tarayıcı izin politikası kamera, mikrofon, konum ve ödeme özelliklerini devre dışı bırakır; bu pilot gerçek kurumsal uç noktalara istek göndermez.")}
    ${notice("warning", "Envanter, entegrasyon taahhüdü değildir", "Kamuya açık web bağlantıları yalnızca kaynak envanteridir. Sistem işlevi, veri sahipliği, API erişimi, hukuki dayanak ve alan eşlemesi her hedef için kurumsal olarak doğrulanmalıdır.")}
    <figure class="editorial-figure editorial-figure--wide"><img src="assets/illustrations/integration-gates.webp" alt="Akademik kaydı doğrudan veri tabanı erişiminden koruyan rol, onay ve servis kapıları illüstrasyonu" width="1400" height="788" loading="lazy" /><figcaption>Servisler aşamalı ve bağlı değil; her geçiş rol, onay, audit ve geri alma kontrolüne tabidir.</figcaption></figure>
    <div class="grid grid-3 section integration-summary">${kpi("Katalog kaydı", state.integrations.length, `${categories.length} iş kategorisi`, "network")}${kpi("Kamu referansı", publicReferences, "API olduğu iddia edilmez", "book")}${kpi("Canlı veri aktarımı", "0", "Tüm kapılar kapalı", "shield")}</div>
    <section class="card section master-data-card"><div class="card-header"><div><h2>Ana veri sahipliği ve karar kaynağı</h2><p>Bu tablo canonical sistemlerin masterDataDomains/masterDataBoundary alanlarından üretilir; MYYS kopya bir ana sistem kurmaz.</p></div>${statusBadge("simulated", "Yönetişim taslağı")}</div><div class="table-wrap"><table><caption class="sr-only">Entegrasyon ana veri sahipliği taslağı</caption><thead><tr><th scope="col">Veri alanı</th><th scope="col">Kaynak sistem</th><th scope="col">Yetkili sahip adayı</th><th scope="col">Canonical sınır</th></tr></thead><tbody>${integrationMasterDataOwnership.map((item) => `<tr data-owner-system-id="${escapeHtml(item.systemId)}"><td><strong>${escapeHtml(item.domain)}</strong></td><td><span class="table-title">${escapeHtml(item.system)}</span><span class="table-subtitle">${escapeHtml(item.integrationTier)} • ${escapeHtml(item.myysRelevance)}</span></td><td>${escapeHtml(item.authority)}</td><td>${escapeHtml(item.mode)}</td></tr>`).join("")}</tbody></table></div><div class="card-body"><div class="permission-note"><strong>Ad benzerliği uyarısı</strong><span>BKYS içindeki Memnuniyet Yönetim Sistemi (kalite MYS) ile mali MYS/MAYS ayrı iş alanlarıdır; veri ve onay kapıları birleştirilmez.</span></div></div></section>
    <section class="card section integration-tier-legend" aria-labelledby="tier-legend-title"><div class="card-header"><div><h2 id="tier-legend-title">Entegrasyon Tier açıklaması</h2><p>Tier, erişim ve işlem sınıfıdır; sistemin hazır, bağlı veya onaylanmış olduğunu göstermez.</p></div>${statusBadge("disconnected", "Tümü bağlı değil")}</div><div class="card-body tier-legend-grid"><div><strong>Tier 1</strong><span>Kamu salt-okunur referans</span></div><div><strong>Tier 2</strong><span>Kontrollü servis / veri durumu</span></div><div><strong>Tier 3</strong><span>İşlem, belge veya mali handoff</span></div><div><strong>MYYS önemi</strong><span>core / supporting / adjacent ayrı etikettir</span></div></div></section>
    <section class="toolbar section integration-toolbar" aria-label="Entegrasyon kataloğu filtresi"><div><strong>DPÜ sistem ve kaynak envanteri</strong><span class="table-subtitle">Ad veya amaç arayın; kategori ve Tier filtrelerini birlikte uygulayın.</span></div><div class="toolbar-group"><label class="sr-only" for="integration-search">Entegrasyon ara</label><input id="integration-search" type="search" placeholder="Sistem, kategori veya amaç ara" autocomplete="off" /><label class="sr-only" for="integration-category">Kategori</label><select id="integration-category" class="select"><option value="all">Tüm kategoriler (${state.integrations.length})</option>${categories.map((category) => `<option value="${escapeHtml(category)}" ${currentIntegrationCategory === category ? "selected" : ""}>${escapeHtml(category)} (${state.integrations.filter((item) => item.category === category).length})</option>`).join("")}</select><label class="sr-only" for="integration-tier">Tier</label><select id="integration-tier" class="select"><option value="all">Tüm Tier'lar</option>${["tier1", "tier2", "tier3"].map((tier) => `<option value="${tier}" ${currentIntegrationTier === tier ? "selected" : ""}>${tier.replace("tier", "Tier ")} (${state.integrations.filter((item) => item.integrationTier === tier).length})</option>`).join("")}</select><button class="button button--secondary" data-action="integration-category">Filtreleri uygula</button></div></section>
    <div class="grid grid-3 section" id="integration-catalog">${tierFilteredIntegrations.map(integrationCard).join("")}</div>
    <div id="integration-filter-empty" class="empty-state" hidden><strong>Eşleşen entegrasyon kaydı yok</strong><p>Arama ifadesini veya kategori filtresini değiştirin.</p></div>
    <section class="section"><div class="section-heading"><div><div class="page-kicker">DPÜ dışı kontrollü kapılar</div><h2>Kamu, mali ve bildirim taslakları</h2></div><p>Bu ${externalPilotIntegrationGates.length} kapı, ${state.integrations.length} kayıtlı canonical kurum sistemi kataloğundan ayrı tutulur; hiçbirinin canlı sözleşmesi veya erişim anahtarı tanımlı değildir.</p></div><div class="grid grid-3">${externalPilotIntegrationGates.map(externalIntegrationGateCard).join("")}</div></section>
    ${state.integrationJobs.length ? `<section class="card section"><div class="card-header"><div><h2>Simülasyon iş günlüğü</h2><p>Başarı, hata ve yeniden deneme senaryoları; tüm kayıtlarda gerçek veri aktarımı kapalıdır.</p></div></div><div class="table-wrap"><table><caption class="sr-only">Entegrasyon simülasyon iş kayıtları</caption><thead><tr><th scope="col">Hedef / kategori</th><th scope="col">Durum</th><th scope="col">Hata / yeniden deneme</th><th scope="col">Gerçek veri</th><th scope="col">Zaman</th></tr></thead><tbody>${state.integrationJobs.map((job)=>`<tr><td><span class="table-title">${escapeHtml(job.targetLabel || job.target)}</span><span class="table-subtitle">${escapeHtml(job.category || "Pilot entegrasyon")}</span></td><td>${statusBadge(job.status === "simulation_failed" ? "failed" : "simulated", job.status === "simulation_failed" ? "Simüle hata" : "Simüle başarı")}</td><td>${escapeHtml(job.errorCode || "NONE")}<span class="table-subtitle">${job.retryAvailable ? "Yeniden deneme açık" : "Yeniden deneme gerekmiyor"}</span></td><td><strong>Gönderilmedi</strong><span class="table-subtitle">realDataSent=false</span></td><td>${formatDate(job.at,true)}</td></tr>`).join("")}</tbody></table></div></section>` : ""}
  </div>`;
}

function externalIntegrationGateCard(item) {
  return `<article class="card external-gate-card"><div class="card-body"><div class="integration-head"><span class="integration-mark">${escapeHtml(item.name.split(" ")[0].slice(0, 5))}</span>${statusBadge("disconnected")}</div><div class="integration-tags"><span>Haricî kapı</span><span>${escapeHtml(item.category)}</span></div><h3>${escapeHtml(item.name)}</h3><dl><dt>Veri yönü</dt><dd>${escapeHtml(item.direction)}</dd><dt>Onay kapısı</dt><dd>${escapeHtml(item.approvalGate)}</dd><dt>Pilot sınırı</dt><dd>${escapeHtml(item.boundary)}</dd></dl></div><div class="card-footer"><span class="status status--neutral">Gerçek veri gönderilmez</span></div></article>`;
}

function integrationCard(item) {
  const publicLink = item.publicUrl
    ? `<a class="text-button integration-public" href="${escapeHtml(item.publicUrl)}" target="_blank" rel="noreferrer">Kamu erişim noktasını aç</a>`
    : `<span class="table-subtitle integration-public">Erişim adresi tanımlı değil</span>`;
  const evidenceLink = item.sourceUrl && item.sourceUrl !== item.publicUrl
    ? `<a class="text-button integration-source" href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noreferrer">Kaynak kanıtını aç</a>`
    : "";
  const referenceLinks = `<div class="integration-links">${publicLink}${evidenceLink}</div>`;
  const searchable = [item.name, item.category, item.systemClass, item.purposeProposal, item.owner].join(" ").toLocaleLowerCase("tr-TR");
  const governanceBadge = item.consultationOnly
    ? `<span class="integration-governance">Yalnızca istişare / taslak</span>`
    : `<span class="integration-governance">Kontrollü pilot adayı</span>`;
  const relevanceLabels = { core: "Core", supporting: "Supporting", adjacent: "Adjacent" };
  const detailLabel = item.consultationOnly ? "Referans ayrıntısı" : "Dry-run ayrıntısı";
  return `<article class="card integration-card" data-system-id="${escapeHtml(item.id)}" data-integration-tier="${escapeHtml(item.integrationTier)}" data-myys-relevance="${escapeHtml(item.myysRelevance)}" data-consultation-only="${item.consultationOnly}" data-public-url="${escapeHtml(item.publicUrl)}" data-source-url="${escapeHtml(item.sourceUrl)}" data-searchable="${escapeHtml(searchable)}"><div class="card-body"><div class="integration-head"><span class="integration-mark">${escapeHtml(item.name.split(" ")[0].slice(0,5))}</span>${statusBadge(item.status)}</div><div class="integration-tags"><span>Tier ${item.stage}</span><span>MYYS: ${relevanceLabels[item.myysRelevance] || escapeHtml(item.myysRelevance)}</span><span>${escapeHtml(item.category)}</span><span>${escapeHtml(item.systemClass)}</span></div>${governanceBadge}<h3>${escapeHtml(item.name)}</h3><p class="page-subtitle integration-purpose">${escapeHtml(item.purposeProposal)}</p><dl><dt>Veri yönü</dt><dd>${escapeHtml(item.dataDirection)}</dd><dt>Onay kapısı</dt><dd>${escapeHtml(item.approvalGate)}</dd><dt>Deneme</dt><dd>${item.attempts || 0}</dd><dt>Son durum</dt><dd>${escapeHtml(item.lastTest)}</dd></dl>${referenceLinks}</div><div class="card-footer"><span class="status status--neutral">Gerçek veri yok</span><button class="button button--secondary button--sm" data-action="open-integration" data-id="${escapeHtml(item.id)}">${detailLabel}</button></div></article>`;
}

function financePage() {
  const canOperateFinance = state.roleId === "finance";
  const paymentRequests = visiblePaymentRequestsForRole(state, state.roleId, currentRole().name);
  const financeQueue = paymentRequests.filter((item) => ["pending_finance", "approved", "revision"].includes(item.status));
  const entitlement = state.finance.entitlements[0] || null;
  const gross = entitlement?.gross || 0;
  const withholding = gross * state.finance.parameters.withholding / 100;
  const entitlementPanel = entitlement
    ? `<section class="card"><div class="card-header"><div><h2>Hak ediş taslağı</h2><p>${escapeHtml(entitlement.instructor)}</p></div>${statusBadge("draft")}</div><div class="card-body"><dl class="integration-card" style="min-height:0"><div class="integration-head"><dt>Ders kanıtı</dt><dd>${entitlement.evidence}</dd></div><div class="integration-head"><dt>Brüt taslak</dt><dd>${formatCurrency(gross)}</dd></div><div class="integration-head"><dt>Örnek kesinti</dt><dd>−${formatCurrency(withholding)}</dd></div><div class="integration-head"><dt>Net ön izleme</dt><dd><strong>${formatCurrency(gross-withholding)}</strong></dd></div></dl>${canOperateFinance ? `<button class="button button--secondary" data-action="finance-draft">Fatura / bordro taslağı oluştur</button>` : `<span class="status status--neutral">Teknik salt-okunur görünüm</span>`}<p class="table-subtitle">${state.finance.invoiceDrafts?.length || 0} sentetik taslak kayıtlı</p></div></section>`
    : `<section class="card empty-state"><div class="empty-icon">${icon("file")}</div><h3>Hak ediş taslağı yok</h3><p>Ders ve katılım kanıtı olan sentetik bir kayıt oluştuğunda mali ön izleme burada görünür.</p></section>`;
  return `<div class="page-container">${pageHeader("Evre 6 • Mali izlenebilirlik", "Finansal yönetim ve döner sermaye pilotu", "Öğrenenden gelen ödeme demo kuyruğu, mali ön onay, revizyon, mutabakat, fatura taslağı ve eğitici hak edişleri yalnız sentetik kayıtlarla örneklenir.", canOperateFinance ? `<button class="button" data-action="finance-simulate">${icon("coins")} Tahsilatı simüle et</button>` : `<span class="status status--neutral">Sistem yöneticisi • salt-okunur</span>`)}
    ${notice("warning", "Pilot parametre — mali birim doğrulaması gerekir", "Vergi, kesinti ve ödeme kuralları kesin mevzuat veya canlı hesaplama olarak kodlanmamıştır; aşağıdaki değerler yalnız ekran davranışını örnekler.")}
    <div class="grid grid-4 section">${kpi("Mali inceleme kuyruğu", financeQueue.length, "Öğrenenden gelen demo kayıtları", "file")}${kpi("Simüle brüt tahsilat", formatCurrency(state.finance.transactions.reduce((sum,item)=>sum+item.gross,0)), "Gerçek ödeme alınmadı", "coins")}${kpi("Eşleşen kayıt", state.finance.transactions.filter((item)=>item.status==="matched").length, "Pilot mutabakat", "check")}${kpi("Hak ediş taslağı", formatCurrency(gross), "Mali onay gerekli", "chart")}</div>
    ${financePaymentQueue(paymentRequests)}
    <div class="grid grid-2 section"><section><div class="section-heading"><div><h2>Tahsilat simülasyonları</h2></div></div><div class="table-wrap"><table><caption class="sr-only">Sentetik tahsilat kayıtları</caption><thead><tr><th scope="col">Kayıt</th><th scope="col">Program</th><th scope="col">Tutar</th><th scope="col">Kanal</th><th scope="col">Durum</th></tr></thead><tbody>${state.finance.transactions.length ? state.finance.transactions.map((item)=>`<tr><td><span class="table-title">${item.id}</span><span class="table-subtitle">${escapeHtml(item.learner)}</span></td><td>${escapeHtml(item.program)}</td><td>${formatCurrency(item.gross)}</td><td>${escapeHtml(item.channel)}</td><td>${statusBadge(item.status)}</td></tr>`).join("") : `<tr><td colspan="5"><div class="table-empty"><strong>Tahsilat simülasyonu yok</strong><span>Gerçek ödeme alınmadan örnek kayıt oluşturabilirsiniz.</span></div></td></tr>`}</tbody></table></div></section>${entitlementPanel}</div>
    <section class="card section"><div class="card-header"><div><h2>Yapılandırılabilir mali pilot parametreleri</h2><p>Değişiklikler yalnız yerel demo durumunu etkiler; mali onay değildir.</p></div></div><form class="card-body form-grid" id="finance-parameters"><div class="field"><label for="finance-withholding">Örnek kesinti (%)</label><input id="finance-withholding" name="withholding" type="number" min="0" max="100" step="0.01" value="${state.finance.parameters.withholding}" ${canOperateFinance ? "" : "readonly"} /></div><div class="field"><label for="finance-vat">Örnek KDV alanı (%)</label><input id="finance-vat" name="vat" type="number" min="0" max="100" step="0.01" value="${state.finance.parameters.vat}" ${canOperateFinance ? "" : "readonly"} /></div><div class="field"><label for="finance-stamp">Örnek damga alanı (%)</label><input id="finance-stamp" name="stamp" type="number" min="0" max="100" step="0.001" value="${state.finance.parameters.stamp}" ${canOperateFinance ? "" : "readonly"} /></div><div class="field"><span class="table-subtitle">Pilot parametre — mali birim doğrulaması gerekir</span>${canOperateFinance ? `<button class="button" type="submit">Parametre taslağını kaydet</button>` : `<span class="status status--neutral">Değişiklik yetkisi yok</span>`}</div></form></section>
  </div>`;
}

function financePaymentQueue(requests) {
  const rows = requests.length
    ? requests.map((request) => {
        const actionButtons = state.roleId === "finance"
          ? request.status === "pending_finance"
            ? `<button class="button button--success button--sm" data-action="payment-review" data-id="${escapeHtml(request.id)}" data-status="approved">Mali ön onay</button><button class="button button--secondary button--sm" data-action="payment-review" data-id="${escapeHtml(request.id)}" data-status="revision">Düzeltme iste</button>`
            : request.status === "approved"
              ? `<button class="button button--success button--sm" data-action="payment-review" data-id="${escapeHtml(request.id)}" data-status="reconciled">Mutabakatı tamamla</button><button class="button button--secondary button--sm" data-action="payment-review" data-id="${escapeHtml(request.id)}" data-status="revision">Düzeltme iste</button>`
              : `<span class="table-subtitle">${request.status === "revision" ? "Öğrenen düzeltmesi bekleniyor" : request.status === "draft" ? "Öğrenen gönderimi bekleniyor" : "İşlem tamamlandı"}</span>`
          : `<span class="table-subtitle">Teknik salt-okunur görünüm</span>`;
        return `<tr><td><span class="table-title">${escapeHtml(request.id)}</span><span class="table-subtitle">${formatDate(request.createdAt, true)}</span></td><td>${escapeHtml(request.learner)}</td><td>${escapeHtml(request.program)}<span class="table-subtitle">${escapeHtml(request.programCode)}</span></td><td>${formatCurrency(request.amount)}<span class="table-subtitle">${escapeHtml(request.channel)}</span></td><td>${paymentStatusBadge(request)}</td><td><div class="table-actions">${actionButtons}</div></td></tr>`;
      }).join("")
    : `<tr><td colspan="6"><div class="table-empty"><strong>Mali inceleme kaydı yok</strong><span>Öğrenen ücretli program ödeme demosunu gönderdiğinde burada görünür.</span></div></td></tr>`;
  return `<section class="card section"><div class="card-header"><div><h2>Öğrenen ödeme demo kuyruğu</h2><p>Ön onay → mutabakat → pilot eğitim kaydı; gerçek tahsilat, GİB/e-Arşiv veya MYS/MAYS aktarımı yapılmaz.</p></div>${statusBadge("disconnected", "Canlı mali servisler kapalı")}</div><div class="table-wrap"><table><caption class="sr-only">Finans ve Döner Sermaye ödeme demo inceleme kuyruğu</caption><thead><tr><th scope="col">Kayıt</th><th scope="col">Öğrenen</th><th scope="col">Program</th><th scope="col">Tutar / Kanal</th><th scope="col">Durum</th><th scope="col">Mali işlem</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}

function reportsPage() {
  const counts = ["review","commission","revision","approved"].map((status)=>state.applications.filter((item)=>item.status===status).length);
  const activePercent = state.applications.length ? Math.round((counts[0] + counts[1]) / state.applications.length * 100) : 0;
  const units = [...new Set(state.programs.map((item)=>item.unit))].map((unit)=>[unit.replace(" Fakültesi", "").replace("Lisansüstü Eğitim Enstitüsü", "Enstitü"), state.programs.filter((item)=>item.unit===unit).length]);
  const maxUnit = Math.max(1, ...units.map(([,value])=>value));
  return `<div class="page-container">${pageHeader("Yönetim görünümü", "Pilot performans ve risk göstergeleri", "Grafikler gerçek HTML/CSS bileşenleridir; hedef, varsayım ve ölçümler üretim KPI’ı veya hukuki uyum kanıtı değildir.", `<button class="button button--secondary" data-action="export-report">${icon("file")} Pilot rapor özeti</button>`)}
    <div class="grid grid-4">${kpi("Toplam başvuru",state.applications.length,"Sentetik pilot kayıt","file")}${kpi("Ort. geçen süre","12 gün","30 günlük pilot gösterge","clock")}${kpi("Aktif program",state.programs.filter((item)=>item.status==="active").length,"Katalog simülasyonu","book")}${kpi("Bağlı canlı servis","0","Tüm entegrasyonlar kapalı","network")}</div>
    <div class="grid grid-2 section"><section class="card chart-wrap"><div class="card-header"><div><h2>Başvuru durumu</h2><p>Durum dağılımının erişilebilir metin özeti</p></div></div><div class="card-body donut-row"><div class="donut" role="img" aria-label="Başvuruların yüzde ${activePercent} kadarı aktif incelemede" style="--value:${activePercent}"><strong>%${activePercent}</strong></div><div class="chart-legend">${[["Aktif inceleme",counts[0]+counts[1],"#352b82"],["Revizyon",counts[2],"#b58a43"],["Pilot onay",counts[3],"#167a5b"]].map(([label,value,color])=>`<div class="legend-item"><span><i style="background:${color}"></i>${label}</span><strong>${value}</strong></div>`).join("")}</div></div></section><section class="card chart-wrap"><div class="card-header"><div><h2>Birim bazlı örnek programlar</h2><p>Toplam ${state.programs.length} sentetik program</p></div></div><div class="card-body"><div class="bar-chart" role="img" aria-label="Birim bazlı program sayıları">${units.map(([label,value])=>`<div class="bar" style="--h:${Math.max(22,Math.round(value/maxUnit*88))}%"><strong>${value}</strong><span>${escapeHtml(label)}</span></div>`).join("")}</div></div></section></div>
    <div class="grid grid-2 section"><section class="card"><div class="card-header"><div><h2>Kritik başarı ölçütleri</h2><p>Teknolojiden önce kurumsal karar netliği</p></div></div><div class="card-body"><div class="timeline">${[["Akademik yetki eşlemesi","Rol ve onay sahibi görünür"],["Mahremiyet sınırı","Gerçek kişisel veri yok"],["Entegrasyon hatası","Kontrollü dry-run ve mutabakat"],["Sürdürülebilirlik","Pilot sonrası kaynak kararı"]].map(([a,b])=>`<div class="timeline-item"><div class="timeline-marker"></div><div class="timeline-content"><strong>${a}</strong><span>${b}</span></div></div>`).join("")}</div></div></section><section class="card"><div class="card-header"><div><h2>Pilot kapsamı</h2><p>Önerilen sınırlı doğrulama çerçevesi</p></div></div><div class="card-body"><ul class="page-subtitle"><li>1–2 örnek program ve sınırlı sentetik öğrenen</li><li>Başvuru, karar, belge ve aktarım simülasyonu</li><li>Gerçek ödeme, kimlik, biyometri veya dış servis yok</li><li>Komisyon kararı ve kullanıcı geri bildirimiyle değerlendirme</li></ul></div></section></div>
    <section class="card section" aria-labelledby="role-matrix-title"><div class="card-header"><div><h2 id="role-matrix-title">9 rol • yetki ve sınır matrisi</h2><p>Her demo rolünün çalışma alanı, kritik eylemi ve açıkça engellenen sınırı</p></div>${statusBadge("simulated", "9/9 rol tanımlı")}</div><div class="table-wrap"><table><caption class="sr-only">Dokuz kontrollü pilot rolünün yetki matrisi</caption><thead><tr><th scope="col">Rol</th><th scope="col">Temel çalışma alanı</th><th scope="col">İzinli kritik eylem</th><th scope="col">Yasak / sınır</th></tr></thead><tbody>${roleCapabilityRows().map(([roleId,area,allowed,boundary])=>`<tr><td><span class="table-title">${escapeHtml(roleLabel(roleId))}</span><span class="table-subtitle">${escapeHtml(roleId)}</span></td><td>${escapeHtml(area)}</td><td>${escapeHtml(allowed)}</td><td>${escapeHtml(boundary)}</td></tr>`).join("")}</tbody></table></div></section>
  </div>`;
}

function roleCapabilityRows() {
  return [
    ["learner", "Katalog, eğitim/ödeme demosu, kendi başvurusu ve cüzdan", "Ücretli programı ödeme aracı verisi olmadan mali işlere yönlendirir; kendi başvurusunu izler", "Başkasının kaydını, mali ön onayı veya insan değerlendirici kararını değiştiremez"],
    ["instructor", "Kendi program önerileri ve değerlendirme simülasyonu", "Program taslağı gönderir; insan değerlendirmesi kaydeder", "Başka eğiticinin kaydını ve Komisyon kararını göremez/değiştiremez"],
    ["externalInstructor", "Kendi dış eğitici program önerileri", "Kendi kimliğiyle öneri ve insan değerlendirmesi oluşturur", "İç eğitici gibi işaretlenmez; Komisyon kararı veremez"],
    ["coordinator", "Başvuru ön inceleme, program ve süre takibi", "Eksik kanıt için revizyon ister", "Akademik onay veya ret kaydedemez"],
    ["commission", "Karar masası, değerlendirme ve denetim izi", "Gerekçeli onay/ret/revizyon ve nihai insan değerlendirmesi kaydeder", "Yapay zekâ çıktısını tek başına karar olarak kullanamaz"],
    ["studentAffairs", "Taslak olmayan dış kazanım, AKTS ve belge alanları", "ÖBİS aktarımını yalnız dry-run olarak inceler", "Özel taslakları veya akademik kararı değiştiremez"],
    ["it", "Entegrasyon, audit ve sistem sağlığı", "Hata/yeniden deneme simülasyonu üretir", "Gerçek servis çağrısı ve akademik karar yapamaz"],
    ["finance", "Ödeme demo kuyruğu, tahsilat, hak ediş ve mali rapor simülasyonu", "Ön onay, revizyon ve mutabakat kaydeder; mali pilot parametre taslağı oluşturur", "Gerçek ödeme/fatura veya GİB/MYS aktarımı üretemez; oranlar kesin kural değildir"],
    ["admin", "Teknik gözetim, yapılandırma ve tüm pilot modüller", "Entegrasyon/finans simülasyonlarını ve kayıtları denetler", "Akademik onay, ret veya insan değerlendirici kararı kaydedemez"]
  ];
}

function auditPage() {
  const events = visibleAuditEvents();
  const rows = events.length
    ? events.map((event)=>`<tr><td>${formatDate(event.at,true)}</td><td><span class="table-title">${escapeHtml(event.entityId)}</span><span class="table-subtitle">${escapeHtml(event.id)}</span></td><td>${escapeHtml(event.actor)}<span class="table-subtitle">${escapeHtml(event.actorRole)}</span></td><td>${escapeHtml(event.action)}</td><td>${escapeHtml(event.from)} → ${escapeHtml(event.to)}</td><td>${escapeHtml(event.reason)}</td></tr>`).join("")
    : `<tr><td colspan="6"><div class="table-empty"><strong>Bu rolün kapsamında denetim kaydı yok</strong><span>İzinli bir pilot işlem yapıldığında yalnız ilgili kayıtlar burada görünür.</span></div></td></tr>`;
  return `<div class="page-container">${pageHeader("İzlenebilirlik", "Pilot denetim izi", "Her rol yalnız görev kapsamındaki aktör, durum, gerekçe ve zaman damgası kayıtlarını görür. Bu görünüm 5651 nitelikli değiştirilemez log iddiası taşımaz.", `<button class="button button--secondary" data-action="export-audit">${icon("file")} Sentetik kayıt özeti</button>`)}<div class="table-wrap"><table><caption class="sr-only">Seçili demo rolünün görev kapsamındaki pilot denetim kayıtları</caption><thead><tr><th scope="col">Zaman</th><th scope="col">Varlık</th><th scope="col">Aktör / Rol</th><th scope="col">Olay</th><th scope="col">Durum geçişi</th><th scope="col">Gerekçe</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
}

function notificationsPage() {
  const notifications = visibleNotifications();
  const content = notifications.length
    ? notifications.map((item)=>`<article class="card"><div class="card-body"><div class="integration-head"><div><h3>${escapeHtml(item.title)}</h3><p class="page-subtitle">${escapeHtml(item.body)}</p><span class="table-subtitle">${escapeHtml(item.time)}</span></div>${isNotificationRead(item) ? statusBadge("neutral","Okundu") : statusBadge("review","Yeni")}</div></div></article>`).join("")
    : `<article class="card empty-state"><div class="empty-icon">${icon("bell")}</div><h3>Bu role ait bildirim yok</h3><p>Yeni bir pilot işlem oluştuğunda yalnız ilgili demo rolünün bildirim alanında gösterilir.</p></article>`;
  return `<div class="page-container">${pageHeader("Uygulama içi iletişim", "Bildirimler", "Gerçek SMS veya e-posta gönderilmez. Yalnız seçili demo rolünün sentetik uygulama içi kayıtları gösterilir.", `<button class="button button--secondary" data-action="mark-notifications">Bu rolün tümünü okundu işaretle</button>`)}<div class="grid">${content}</div></div>`;
}

function verifyPage(code) {
  const credential = state.credentials.find((item)=>item.code===code);
  if (!credential) return `<div class="page-container">${pageHeader("Pilot doğrulama", "Doğrulama kaydı bulunamadı", "Bu kodla eşleşen sentetik pilot yeterlilik yoktur.")}<div class="card empty-state"><div class="empty-icon">${icon("search")}</div><h3>Kod eşleşmedi</h3><p>Pilot belge kodunu kontrol edip yeniden deneyin.</p><button class="button" data-action="verify-code">Kodu yeniden gir</button></div></div>`;
  const returnPage = isAllowed("wallet") ? "wallet" : "overview";
  const returnLabel = returnPage === "wallet" ? "Cüzdana dön" : "Genel bakışa dön";
  return `<div class="page-container">${pageHeader("Pilot doğrulama", "Dijital yeterlilik doğrulandı", "Bu sonuç yalnızca kontrollü Preview ortamındaki sentetik kayda dayanır; üretim imzası veya dış cüzdan uygunluğu değildir.", `<button class="button button--secondary" data-nav="${returnPage}">${returnLabel}</button>`)}${notice("success","Pilot kayıt eşleşti",`${credential.code} kodlu sentetik yeterlilik bu pilot veri katmanında geçerli görünüyor.`)}<div class="grid grid-2 section">${credentialCard(credential)}<section class="card"><div class="card-header"><div><h2>Yapılandırılmış alanlar</h2><p>Kurumsal doğrulamaya açık pilot görünüm</p></div>${statusBadge("valid")}</div><div class="card-body"><dl class="integration-card" style="min-height:0"><div class="integration-head"><dt>Sağlayan kurum</dt><dd>${escapeHtml(credential.issuer)}</dd></div><div class="integration-head"><dt>Öğrenen</dt><dd>${escapeHtml(credential.owner)}</dd></div><div class="integration-head"><dt>Pilot AKTS</dt><dd>${credential.ects}</dd></div><div class="integration-head"><dt>TYÇ düzeyi</dt><dd>${credential.level} • Öneri</dd></div><div class="integration-head"><dt>İmzalama modu</dt><dd>Simülasyon</dd></div><div class="integration-head"><dt>Dış paylaşım</dt><dd>Kapalı</dd></div></dl><h3>Öğrenme çıktıları</h3><ul class="page-subtitle">${credential.outcomes.map((outcome)=>`<li>${escapeHtml(outcome)}</li>`).join("")}</ul></div></section></div></div>`;
}

function directiveRoleScopeCard() {
  const scope = organizationScopes[state.roleId];
  return `<section class="card governance-scope" data-governance-role="${escapeHtml(state.roleId)}"><div class="card-header"><div><span class="table-subtitle">Seçili demo rolünün örgütsel kapsamı</span><h2>${escapeHtml(currentRole().label)}</h2><p>${escapeHtml(scope.mandate)}</p><p class="muted">${escapeHtml(scope.decision_scope_note)}</p></div>${statusBadge("simulated", "SENTETİK")}</div><div class="card-body"><dl class="governance-definition"><div><dt>unit_id</dt><dd>${escapeHtml(scope.unit_id)}</dd></div><div><dt>unit_type</dt><dd>${escapeHtml(scope.unit_type)}</dd></div><div><dt>body_type / membership_role</dt><dd>${escapeHtml(`${scope.body_type} / ${scope.membership_role}`)}</dd></div><div><dt>body_membership</dt><dd>${escapeHtml(scope.body_membership.join(", ") || "Yok")}</dd></div><div><dt>mandate_from / mandate_to</dt><dd>${escapeHtml(`${scope.mandate_from} / ${scope.mandate_to}`)}</dd></div><div><dt>decision_scope</dt><dd>${escapeHtml(scope.decision_scope.join(", ") || "Yok")}</dd></div></dl></div></section>`;
}

function directivePolicyRegistry() {
  return `<section class="card"><div class="card-header"><div><h2>Politika ve kaynak sürüm sicili</h2><p>Taslak ile resmî kamu referansı aynı kayıt türü olarak gösterilmez.</p></div>${statusBadge("review", "Yürürlük yok")}</div><div class="card-body"><div class="governance-policy-list">${policyVersionRegistry.map((policy) => `<article><div><strong>${escapeHtml(policy.title)}</strong><span>${escapeHtml(policy.id)} • ${escapeHtml(policy.version)}</span></div><div>${statusBadge(policy.status === "reference_only" ? "approved" : "review", policy.status === "reference_only" ? "Salt-okunur referans" : "Kurumsal değerlendirme taslağı")}</div><small>Senato onayı: ${policy.senateApproval === false ? "Yok" : "Uygulanamaz"} • Production: NO-GO</small></article>`).join("")}</div></div></section>`;
}

function directiveWorkloadResult(result) {
  const tone = result.valid ? "success" : "risk";
  const text = result.valid
    ? `${result.equation} doğrulandı. ${result.componentTotal === null ? result.warnings.join(" ") : `Sekiz bileşenin toplamı ${result.componentTotal} saat.`}`
    : result.errors.join(" ");
  return notice(tone, result.valid ? "AKTS–iş yükü bağı geçerli" : "AKTS–iş yükü kontrolü başarısız", text);
}

function directiveWorkloadPanel() {
  const seed = { synchronous: 10, asynchronous: 10, preparation: 10, practice: 10, project: 15, independent: 10, assessment: 5, feedback: 5 };
  const result = validateEctsWorkload({ ects: 3, totalWorkload: 75, components: seed });
  return `<section class="card"><div class="card-header"><div><h2>AKTS ve iş yükü doğrulayıcı</h2><p>25 × AKTS ≤ toplam iş yükü ≤ 30 × AKTS; 10+20 evrensel kural değildir.</p></div><span class="status status--info">1–6 AKTS</span></div><form id="directive-workload-form" class="card-body"><div class="form-grid"><div class="field"><label for="directive-ects">AKTS</label><input id="directive-ects" name="ects" type="number" min="1" max="6" step="1" value="3" required /></div><div class="field"><label for="directive-total">Toplam öğrenen iş yükü</label><input id="directive-total" name="totalWorkload" type="number" min="25" max="180" step="0.25" value="75" required /></div>${workloadComponents.map(([key, label]) => `<div class="field"><label for="directive-${key}">${escapeHtml(label)}</label><input id="directive-${key}" name="${escapeHtml(key)}" type="number" min="0" step="0.25" value="${seed[key]}" required /></div>`).join("")}</div><div id="directive-workload-result" class="section" aria-live="polite">${directiveWorkloadResult(result)}</div><div class="form-actions"><span class="table-subtitle">Kesirli saatte yuvarlama gerekçesi ayrıca kaydedilir.</span><button class="button button--secondary" type="submit">Bağı doğrula</button></div></form></section>`;
}

function directiveRuleRegistry() {
  return `<section class="card section"><div class="card-header"><div><h2>Sürümlü ve belirsizlik korumalı kural motoru</h2><p>Sayılar kesin mevzuat hükmü gibi kodlanmaz; doğrulama yoksa yalnız uyarı üretir.</p></div><span class="status status--warning">${versionedPilotRules.length} karar bekliyor</span></div><div class="table-wrap governance-rule-table"><table><caption class="sr-only">Kurumsal doğrulama bekleyen pilot kurallar</caption><thead><tr><th>Kural</th><th>Kaynak / hesap temeli</th><th>Sürüm alanları</th><th>Motor sonucu</th></tr></thead><tbody>${versionedPilotRules.map((rule) => { const evaluation = evaluatePilotRule(rule.id, { requestedEcts: 6, programCycle: "associate", singleProgram: true }); return `<tr><td><strong>${escapeHtml(rule.label)}</strong><span class="table-subtitle">${escapeHtml(rule.id)}</span></td><td>${escapeHtml(rule.source_clause)}<span class="table-subtitle">${escapeHtml(rule.calculation_basis)}</span></td><td>${escapeHtml(rule.rounding_rule)}<span class="table-subtitle">İstisna: ${escapeHtml(rule.exception_rule)}</span></td><td><span class="status status--warning">Uyarı + blok</span><span class="table-subtitle">${escapeHtml(evaluation.warnings.at(-1))}</span></td></tr>`; }).join("")}</tbody></table></div></section>`;
}

function recognitionDecisionLabel(kind) {
  return { credential: "Belge / yeterlilik doğrulama", ects: "AKTS tanıma", course_substitution: "Ders / yükümlülük yerine sayma" }[kind] || kind;
}

function directiveRecognitionPanel() {
  const decisions = state.directivePilot.recognitionDecisions;
  const decisionActions = state.roleId === "commission";
  const appealAction = state.roleId === "learner";
  const outcome = state.directivePilot.credentialOutcome;
  return `<section class="card section"><div class="card-header"><div><h2>Üç ayrı tanıma sonucu ve bağımsız itiraz</h2><p>Belge tanıma, AKTS ve ders ikamesi tek karara dönüştürülemez.</p></div>${statusBadge("review", "APP-042 • SİMÜLASYON")}</div><div class="card-body">${notice("warning", "Olumlu nihai sonuç bloke", "Kurumsal doğrulaması tamamlanmamış sürümlü kurallar varken Komisyon yalnız ek kanıt talebi kaydedebilir; tanıma veya kısmi tanıma oluşturulmaz.")}<div class="recognition-decision-grid">${decisions.map((decision) => `<article><span>${escapeHtml(recognitionDecisionLabel(decision.kind))}</span><strong>${escapeHtml(decision.status)}</strong><small>${escapeHtml(decision.decisionBody || "İnsan kararı bekleniyor")}</small>${decisionActions ? `<button class="button button--secondary button--sm" type="button" data-action="directive-recognition-decision" data-kind="${escapeHtml(decision.kind)}">Ek kanıt talebi kaydet</button>` : ""}${appealAction ? `<button class="button button--secondary button--sm" type="button" data-action="directive-appeal" data-kind="${escapeHtml(decision.kind)}">Bağımsız mercie itiraz</button>` : ""}</article>`).join("")}</div><div class="split-outcome section"><div><span>Dijital rozet / belge</span><strong>${escapeHtml(outcome.credential.status)}</strong></div><div><span>AKTS</span><strong>${escapeHtml(outcome.ects.status)}</strong></div><div><span>Ders ikamesi</span><strong>${escapeHtml(outcome.courseSubstitution.status)}</strong></div></div><p class="table-subtitle">Aynı programda rozet kazanılmış olsa bile AKTS veya ders ikamesi ayrıca karara bağlanır. ${state.directivePilot.appeals.length} bağımsız itiraz kaydı.</p></div></section>`;
}

function directiveRoleOperations() {
  const offering = state.directivePilot.offerings[0];
  const registered = offering.requests.filter((item) => item.status === "enrolled").length;
  const waiting = offering.requests.filter((item) => item.status === "waitlisted").length;
  const actions = [];
  if (state.roleId === "coordinator") actions.push(`<button class="button" type="button" data-action="directive-myd-generate">MYD kod taslağı üret</button>`);
  if (state.roleId === "commission") actions.push(`<button class="button" type="button" data-action="directive-commission-check">Nisap / çekilme kontrolü</button>`);
  if (state.roleId === "learner") actions.push(`<button class="button" type="button" data-action="directive-seat-request">Kontenjan talebi oluştur</button>`);
  if (state.roleId === "it") actions.push(`<button class="button" type="button" data-action="directive-ek1-validate">EK-1 kamu görünümünü doğrula</button>`);
  if (state.roleId === "finance") actions.push(`<button class="button" type="button" data-action="directive-finance-dryrun">Hak ediş dry-run oluştur</button>`);
  const readOnly = actions.length ? actions.join("") : `<span class="status status--neutral">Salt-okunur rol görünümü</span>`;
  const lastCode = state.directivePilot.codes.at(-1);
  const meetingStatus = state.directivePilot.commission.lastValidation?.valid ? "Toplantı kontrolü geçerli" : "Toplantı kontrolü bekleniyor";
  return `<section class="card section"><div class="card-header"><div><h2>Role bağlı kontrollü pilot işlemler</h2><p>Sistem yöneticisine akademik, tanıma, mali veya personel karar yetkisi verilmez.</p></div>${state.roleId === "admin" ? statusBadge("review", "Teknik gözlem") : statusBadge("simulated")}</div><div class="card-body"><div class="governance-operation-grid"><article><span>MYD kod sicili</span><strong>${escapeHtml(lastCode?.code || "Kod üretilmedi")}</strong><small>${lastCode ? `Ayrı program sürümü V${lastCode.versionNo}` : "Yalnız Koordinatörlük / SEM taslak rezervasyonu"}</small></article><article><span>Dönem / kontenjan</span><strong>${registered}/${offering.capacity} kayıt • ${waiting} bekleme</strong><small>${escapeHtml(offering.term)} • FIFO + öğrenen tekilliği + idempotency</small></article><article><span>Komisyon kapısı</span><strong>${escapeHtml(meetingStatus)}</strong><small>Geçerli nisap/çekilme/oy kaydı olmadan tanıma işlemi yok</small></article><article><span>Mali/Personel</span><strong>${state.directivePilot.financePersonnelDryRuns.length} dry-run</strong><small>Gerçek ödeme, bordro, fatura veya dış istek yok</small></article><article><span>EK-1 güvenliği</span><strong>11 zorunlu alan + TCKN sızıntı testi</strong><small>Kamu görünümü yalnız rastgele belge kimliği ve asgari alanlar</small></article></div><div class="governance-actions">${readOnly}</div>${state.roleId === "admin" ? notice("warning", "Yönetici karar veremez", "Bu rol yalnız teknik yapılandırma ve denetim görünümünü inceler; akademik veya mali işlem düğmesi sunulmaz.") : ""}</div></section>`;
}

function governancePage() {
  return `<div class="page-container" data-directive-governance>${pageHeader("Yönerge uyarlaması • kontrollü pilot", "Yönerge ve kural merkezi", "Taslak hükümler; rol, form, veri, durum, kural, audit, entegrasyon, rapor, RBAC ve test sözleşmesine ayrıştırılır. Production kesinlikle kapalıdır.")}
    ${notice("warning", "Kurumsal değerlendirme taslağı — yürürlük yok", DIRECTIVE_PILOT_NOTICE)}
    <div class="grid grid-2 section">${directiveRoleScopeCard()}${directivePolicyRegistry()}</div>
    <div class="grid grid-2 section">${directiveWorkloadPanel()}<section class="card"><div class="card-header"><div><h2>AKTS saat bantları</h2><p>Toplam öğrenen iş yükü ile AKTS birbirinden bağımsız değildir.</p></div></div><div class="card-body"><div class="band-list">${ectsWorkloadBands.map((band) => `<div><strong>${band.ects} AKTS</strong><span>${band.minHours}–${band.maxHours} saat</span></div>`).join("")}</div>${notice("warning", "Örnek dağılım", "10 saat sınıf içi + 20 saat sınıf dışı yalnız 30 saatlik örnektir; evrensel eşik değildir.")}</div></section></div>
    ${directiveRuleRegistry()}
    ${directiveRecognitionPanel()}
    ${directiveRoleOperations()}
  </div>`;
}

function auditTimeline(event) {
  return `<div class="timeline-item"><div class="timeline-marker"></div><div class="timeline-content"><strong>${escapeHtml(event.action)}</strong><span>${formatDate(event.at,true)} • ${escapeHtml(event.actor)} • ${escapeHtml(event.reason)}</span></div></div>`;
}

const pages = {
  home: homePage,
  overview: overviewPage,
  governance: governancePage,
  scenarios: scenariosPage,
  catalog: catalogPage,
  payments: paymentsPage,
  learning: learningPage,
  proposal: proposalPage,
  frameworks: frameworksPage,
  applications: applicationsPage,
  recognition: recognitionPage,
  commission: commissionPage,
  programs: programsPage,
  assessment: assessmentPage,
  wallet: walletPage,
  integrations: integrationsPage,
  finance: financePage,
  reports: reportsPage,
  audit: auditPage,
  notifications: notificationsPage,
  verify: verifyPage
};

function showPilotInfo() {
  openModal(modalTemplate("Kontrollü pilot kapsamı", `<div class="notice notice--success">${icon("shield")}<div><strong>Production NO-GO</strong>Bu ortam gerçek kurumsal sistemlere veya kişisel verilere bağlı değildir.</div></div><div class="grid grid-2 section"><div><h3>Kapsam içinde</h3><ul class="page-subtitle"><li>Sentetik başvuru ve komisyon akışı</li><li>Pilot karşılaştırma analizleri</li><li>Yerel kalıcı durum ve Supabase salt-okunur seed</li><li>Belge ve entegrasyon simülasyonları</li></ul></div><div><h3>Kapsam dışında</h3><ul class="page-subtitle"><li>ÖBİS, YÖKSİS, e-Devlet, GİB, MYS/MAYS</li><li>Gerçek kimlik, ödeme, kamera ve mikrofon</li><li>Kurumsal imza ve dış cüzdan yayını</li><li>Production domain veya production branch</li></ul></div></div><p class="page-subtitle">Kaynak dosyalardaki kesin uyum, risk sıfırlama ve otomatik karar iddiaları arayüze taşınmamıştır; bütün oranlar ve eşikler kurumsal doğrulamaya açık pilot parametreleridir.</p>`, `<button class="button" data-action="close-modal">Anladım</button>`));
}

function showDataMode() {
  const config = getSupabasePublicConfig();
  const snapshot = state.remoteSnapshot;
  const protectedFallback = snapshot?.protectedRemoteVerified === false;
  const referenceSummary = snapshot?.qualificationLevels === undefined
    ? ""
    : `<br />Referans kataloğu: ${snapshot.qualificationLevels} seviye, ${snapshot.officialQualifications} KDPÜ kaydı, ${snapshot.matrixTemplates} şablon, ${snapshot.matrixDrafts} örnek taslak, ${snapshot.paymentRequests} ödeme demo kaydı, ${snapshot.roleWorkflowRows} rol adımı${snapshot.institutionalSystems === undefined ? "" : `<br />Kurumsal envanter: ${snapshot.institutionalSystems} sistem, ${snapshot.institutionalMappings} eşleme, ${snapshot.institutionalScenarios} dry-run senaryosu, ${snapshot.institutionalAuditEvents} kaynak-audit olayı`}${snapshot.unavailableReferenceViews ? `<br />Yerel güvenli fallback kullanan referans view: ${snapshot.unavailableReferenceViews}` : ""}${snapshot.unavailableInstitutionalViews ? `<br />Yerel güvenli fallback kullanan kurumsal view: ${snapshot.unavailableInstitutionalViews}` : ""}`;
  const snapshotSummary = !snapshot
    ? "<br />Son bağlantı doğrulanamadı"
    : protectedFallback
      ? `<br />Anonim doğrulanan kamu kaynağı: ${snapshot.publicOfficialSources || 0} kaynak, ${snapshot.publicOfficialSourceSupports || 0} izlenebilirlik bağı<br />Korumalı DTO'lar: ağ isteği yapılmadı; ${snapshot.programs} program, ${snapshot.applications} başvuru, ${snapshot.credentials} belge ve ${snapshot.integrations} entegrasyon yerel sentetik fallback'ten geldi${referenceSummary}<br />Kaynak modu: ${escapeHtml(snapshot.referenceSource || "anonim kamu kataloğu + yerel korumalı fallback")}`
      : `<br />Claim-kapsamlı doğrulanan: ${snapshot.programs} program, ${snapshot.applications} başvuru, ${snapshot.credentials} belge, ${snapshot.integrations} entegrasyon${referenceSummary}<br />Kaynak modu: ${escapeHtml(snapshot.referenceSource || "claim-kapsamlı salt-okunur görünüm")}`;
  openModal(modalTemplate("Pilot veri katmanı", `<div class="grid grid-2"><article class="card"><div class="card-body"><h3>Etkin çalışma modu</h3><p class="page-subtitle">${escapeHtml(state.dataMode)}</p><span class="status status--success">Yerel mutasyonlar çalışıyor</span></div></article><article class="card"><div class="card-body"><h3>Supabase başlangıç görünümü</h3><p class="page-subtitle">Proje: ${config.projectRef}<br />${config.mode}${snapshotSummary}</p><span class="status status--neutral">Gizli anahtar kullanılmıyor</span></div></article></div><div class="section">${notice("success","Katmanların sınırı açık","Anonim Preview yalnız iki allowlist'li resmî kaynak kataloğunu okur. Yönerge, akıllı eşleme, rol ve kurumsal operasyon DTO'ları anonim ağ isteği üretmeden doğrulanmamış yerel sentetik fallback'ten sunulur; claim-kapsamlı oturum ayrı bir yoldur. Gerçek ödeme veya kurumsal aktarım yapılmaz.")}</div>`, `<button class="button button--secondary" data-action="refresh-data">Bağlantıyı yeniden dene</button><button class="button" data-action="close-modal">Kapat</button>`));
}

function openProgram(id) {
  if (!isAllowed("catalog") && !isAllowed("programs")) { deny("Bu rol program ayrıntılarını açamaz."); return; }
  const program = state.programs.find((item)=>item.id===id);
  if (!program) return;
  if (!visiblePrograms().some((item)=>item.id===program.id)) { deny("Bu program seçili demo rolünün görünür kayıtları arasında değildir."); return; }
  const applyLabel = Number(program.price) > 0 ? "Başvuru ve ödeme demosuna geç" : "Ücretsiz pilot kayıt oluştur";
  const applyAction = state.roleId === "learner" ? `<button class="button" data-action="apply-program" data-id="${escapeHtml(program.id)}">${applyLabel}</button>` : "";
  openModal(modalTemplate(program.title, `<div class="program-meta"><span class="meta-pill">${program.code}</span><span class="meta-pill">${program.ects} AKTS</span><span class="meta-pill">${program.workload} saat</span><span class="meta-pill">TYÇ ${program.level} önerisi</span><span class="meta-pill">${Number(program.price) > 0 ? `${formatCurrency(program.price)} • ödeme demosu` : "Ücretsiz • pilot"}</span></div><p class="page-subtitle">${escapeHtml(program.summary)}</p><div class="section"><h3>Öğrenme çıktıları</h3><ul class="page-subtitle">${program.outcomes.map((item)=>`<li>${escapeHtml(item)}</li>`).join("")}</ul></div>${notice("warning","Pilot program", Number(program.price) > 0 ? "Gerçek kayıt veya ödeme alınmaz. Devam ettiğinizde ödeme aracı bilgisi istemeyen demo sayfasına ve ardından Finans / Döner Sermaye inceleme kuyruğuna yönlendirilirsiniz." : "Bu ücretsiz program yalnızca sentetik pilot eğitim kaydı oluşturur; gerçek öğrenci kaydı değildir.")}`, `<button class="button button--secondary" data-action="close-modal">Kapat</button>${applyAction}`));
}

function openApplication(id) {
  const item = state.applications.find((application)=>application.id===id);
  if (!item) return;
  if (!canViewApplication(item, state.roleId, currentRole().name)) { deny("Bu başvuru başka bir pilot kayıt sahibine aittir veya rol kapsamınız dışındadır."); return; }
  state.selectedApplicationId = item.id;
  saveState();
  openModal(modalTemplate(`${item.code} • Başvuru ayrıntısı`, `<div class="grid grid-2"><article class="card"><div class="card-body"><span class="table-subtitle">Başvuru</span><h3>${escapeHtml(item.title)}</h3><p class="page-subtitle">${escapeHtml(item.applicant)} • ${item.kind === "external" ? "Dış kazanım" : "Program önerisi"}</p>${statusBadge(item.status)}</div></article><article class="card"><div class="card-body"><span class="table-subtitle">30 günlük pilot gösterge</span><h3>${item.elapsedDays}/30 gün</h3><div class="progress"><span style="width:${Math.round(item.elapsedDays/30*100)}%"></span></div><span class="table-subtitle">Hedef: ${formatDate(item.targetAt)}</span></div></article></div><div class="analysis-band"><div class="band"><span>Müfredat benzerliği</span><strong>%${item.similarity}</strong><span>Karar değildir</span></div><div class="band"><span>TYÇ önerisi</span><strong>%${item.tycMatch}</strong><span>Gerekçeli pilot skor</span></div><div class="band"><span>Kanıt</span><strong>${item.evidence}</strong><span>${item.missing} eksik</span></div></div>${notice("warning","İnsan incelemesi gerekir",item.notes)}`, `<button class="button button--secondary" data-action="close-modal">Kapat</button>${["coordinator","commission","admin"].includes(state.roleId) ? `<button class="button" data-action="go-commission">Karar masasında aç</button>` : ""}`));
}

function decisionModal(id, nextStatus) {
  const item = state.applications.find((application)=>application.id===id);
  if (!item) { deny("Başvuru bulunamadı."); return; }
  if (!getAllowedApplicationTransitions(item, state.roleId, currentRole().name).includes(nextStatus)) {
    deny("Seçili demo rolü bu başvuru için istenen durum geçişini oluşturamaz.");
    return;
  }
  const labels = { approved: "Doğrulanmış onay", deferred: "Kurumsal doğrulamaya erteleme", revision: "Revizyon isteği", rejected: "Pilot ret", commission: "Çekimser görüş" };
  openModal(modalTemplate(`${labels[nextStatus]} kaydı`, `<form id="decision-form"><input type="hidden" name="id" value="${escapeHtml(item.id)}" /><input type="hidden" name="status" value="${escapeHtml(nextStatus)}" /><div class="field"><label class="required" for="decision-reason">Gerekçe</label><textarea id="decision-reason" name="reason" required minlength="12" placeholder="Kanıtları, akademik değerlendirmeyi ve karar gerekçesini yazın"></textarea><small>Gerekçe audit izine eklenir ve sonradan görünür kalır.</small></div><div class="field" style="margin-top:14px"><label><input type="checkbox" name="confirm" required /> Bu kaydın yalnız kontrollü pilot kararı olduğunu onaylıyorum.</label></div></form>`, `<button class="button button--secondary" data-action="close-modal">Vazgeç</button><button class="button ${nextStatus === "rejected" ? "button--danger" : nextStatus === "approved" ? "button--success" : ""}" data-action="submit-decision">Gerekçeli kaydı oluştur</button>`));
}

function qualificationBoardDecisionModal(id) {
  if (state.roleId !== "commission") { deny("Yeterlilik kurul kararını yalnız Komisyon demo rolü kaydedebilir."); return; }
  const application = state.applications.find((item) => item.id === id);
  if (!application || application.status !== "commission") { deny("Yalnız Komisyon gündemindeki başvuru için ayrı yeterlilik kararı kaydedilebilir."); return; }
  const record = smartAlignmentForApplication(application);
  if (!record) { deny("Ayrı kurul kararı için eğitici tarafından kaydedilmiş akıllı eşleme bulunmalıdır."); return; }
  const report = smartReportForAlignment(record, application);
  if (!report) { deny("Kurul kararı için yeterlilik öneri anlık görüntüsü üretilemedi."); return; }
  const existing = record?.boardDecision;
  const tycLevel = existing?.decidedLevels?.tyc || report.program.suggestedLevels.tyc;
  const eqfLevel = existing?.decidedLevels?.eqf || report.program.suggestedLevels.eqf;
  const tyycLevel = existing?.decidedLevels?.tyyc || report.program.suggestedLevels.tyyc;
  openModal(modalTemplate("Ayrı insan kurul yeterlilik kararı", `<form id="qualification-board-form"><input type="hidden" name="id" value="${escapeHtml(application.id)}" /><div class="notice notice--warning">${icon("alert")}<div><strong>Motor önerisi değiştirilemez</strong>Bu kayıt, otomatik öneri ve eğitici manuel seçimini değiştirmeyen ayrı bir insan Komisyon kararıdır.</div></div><div class="form-grid section"><div class="field"><label class="required" for="qualification-board-decision">Karar</label><select id="qualification-board-decision" name="decision" required><option value="approved" ${existing?.decision === "approved" ? "selected" : ""}>Onay</option><option value="revision_requested" ${existing?.decision === "revision_requested" ? "selected" : ""}>Revizyon isteği</option><option value="rejected" ${existing?.decision === "rejected" ? "selected" : ""}>Ret</option><option value="deferred" ${existing?.decision === "deferred" ? "selected" : ""}>Erteleme</option></select></div><div class="field"><label for="qualification-board-reference">Toplantı referansı</label><input id="qualification-board-reference" name="meetingReference" value="${escapeHtml(existing?.meetingReference || "MYK-KOM-PILOT-2026-08")}" /></div><div class="field"><label class="required" for="qualification-board-tyc">İnsan kararı TYÇ düzeyi</label><select id="qualification-board-tyc" name="tycLevel">${smartFrameworkLevels("tyc").map((level) => `<option value="${level}" ${level === Number(tycLevel) ? "selected" : ""}>TYÇ ${level}</option>`).join("")}</select></div><div class="field"><label class="required" for="qualification-board-eqf">İnsan kararı AYÇ/EQF düzeyi</label><select id="qualification-board-eqf" name="eqfLevel">${smartFrameworkLevels("eqf").map((level) => `<option value="${level}" ${level === Number(eqfLevel) ? "selected" : ""}>AYÇ/EQF ${level}</option>`).join("")}</select></div><div class="field"><label class="required" for="qualification-board-tyyc">İnsan kararı TYYÇ pedagojik referans düzeyi</label><select id="qualification-board-tyyc" name="tyycLevel">${smartFrameworkLevels("tyyc").map((level) => `<option value="${level}" ${level === Number(tyycLevel) ? "selected" : ""}>TYYÇ ${level}</option>`).join("")}</select><small>Resmî yerleştirme veya eşdeğerlik kararı değildir.</small></div><div class="field full"><label class="required" for="qualification-board-rationale">İnsan kurul gerekçesi</label><textarea id="qualification-board-rationale" name="rationale" required minlength="12" placeholder="Öğrenme çıktısı, tanımlayıcı, ölçme kanıtı ve program bütünlüğüne dayalı gerekçeyi yazın">${escapeHtml(existing?.rationale || "Komisyon, motor önerisini karar olarak değil karşılaştırılabilir inceleme girdisi olarak değerlendirmiştir.")}</textarea></div><label class="consent-row full"><input type="checkbox" name="confirm" required /><span>Bu kararın insan Komisyon kaydı olduğunu ve motor önerisini değiştirmediğini onaylıyorum.</span></label></div></form>`, `<button class="button button--secondary" type="button" data-action="close-modal">Vazgeç</button><button class="button" type="button" data-action="submit-qualification-board-decision">Ayrı kurul kaydını oluştur</button>`));
}

function storedAlignmentOutcomes(report, appliedSelections = []) {
  return (report.outcomes || []).map((outcome, index) => {
    const outcomeId = smartOutcomeId(outcome, index);
    const text = smartOutcomeText(outcome);
    const outcomeFingerprint = smartOutcomeFingerprint(text, index);
    return {
      outcomeId,
      outcomeIndex: index,
      outcomeFingerprint,
      text,
      selections: QUALIFICATION_FRAMEWORK_IDS.map((frameworkId) => {
        const suggestion = smartEffectiveSelection(smartSuggestionFor(outcome, frameworkId));
        const applied = appliedSelections.some((item) => item.outcomeFingerprint === outcomeFingerprint && item.frameworkId === frameworkId);
        return {
          outcomeId,
          outcomeIndex: index,
          outcomeFingerprint,
          frameworkId,
          frameworkCode: smartFrameworkCode(frameworkId),
          level: Number(suggestion.level),
          dimension: suggestion.dimension,
          score: Number(suggestion.score || 0),
          descriptor: suggestion.descriptor || "",
          descriptorDisplayTr: suggestion.descriptorDisplayTr || suggestion.descriptor || "",
          rationale: suggestion.rationale || "",
          officialSourceUrl: suggestion.officialSourceUrl || "",
          matchedSignals: suggestion.matchedSignals || [],
          suggestedContent: suggestion.suggestedContent || [],
          suggestedAssessments: suggestion.suggestedAssessments || [],
          applied,
          manual: Boolean(suggestion.isManualOverride),
          autonomousDecision: false,
          institutionalValidationRequired: true
        };
      })
    };
  });
}

function submitQualificationBoardDecision(form) {
  if (!form.reportValidity()) return;
  if (state.roleId !== "commission") { deny("Yeterlilik kurul kararını yalnız Komisyon demo rolü kaydedebilir."); return; }
  const data = new FormData(form);
  const application = state.applications.find((item) => item.id === data.get("id"));
  if (!application || application.status !== "commission") { deny("Başvuru Komisyon gündeminde değil."); return; }
  const existing = smartAlignmentForApplication(application);
  if (!existing) { deny("İnsan kurul kararı için eğitici tarafından kaydedilmiş akıllı eşleme bulunmalıdır."); return; }
  const report = smartReportForAlignment(existing, application);
  if (!report) { deny("Yeterlilik öneri anlık görüntüsü oluşturulamadı."); return; }
  try {
    const immutableSuggestionSnapshotBefore = JSON.stringify(existing.suggestionSnapshot);
    const decidedAt = new Date().toISOString();
    const result = recordHumanBoardQualificationDecision(report, {
      actorRole: "commission",
      decision: String(data.get("decision")),
      decidedBy: currentRole().name,
      rationale: String(data.get("rationale")),
      tycLevel: Number(data.get("tycLevel")),
      eqfLevel: Number(data.get("eqfLevel")),
      tyycLevel: Number(data.get("tyycLevel")),
      decidedAt,
      meetingReference: String(data.get("meetingReference") || "")
    });
    const program = state.programs.find((item) => item.id === existing.programId);
    const record = existing;
    record.boardDecision = result.finalDecision;
    record.updatedAt = decidedAt;
    if (JSON.stringify(record.suggestionSnapshot) !== immutableSuggestionSnapshotBefore) {
      throw new Error("İnsan kurul kararı tam öneri snapshot'ını değiştiremez.");
    }
    application.smartAlignmentId = record.id;
    application.formData ||= {};
    application.formData.qualificationMapping = record;
    if (program) program.smartAlignmentId = record.id;
    state.audit.unshift({ id: `AUD-${Date.now()}-BOARD`, entityId: application.id, at: decidedAt, actor: currentRole().name, actorRole: "commission", action: "İnsan kurul yeterlilik kararı ayrı kaydedildi", from: application.status, to: application.status, reason: `${result.finalDecision.decision} • TYÇ ${result.finalDecision.decidedLevels.tyc} / AYÇ ${result.finalDecision.decidedLevels.eqf} / TYYÇ ${result.finalDecision.decidedLevels.tyyc} • snapshot ${record.suggestionSnapshot.integrityHash} • motor önerisi değiştirilmedi` });
    saveState();
    closeModal();
    render();
    toast("Ayrı insan Komisyon kararı kaydedildi; motor önerisi ve eğitici seçimi değiştirilmedi.");
  } catch (error) {
    deny(error.message);
  }
}

function paymentReviewModal(id, nextStatus) {
  if (state.roleId !== "finance") { deny("Ödeme demo durumunu yalnız Finans / Döner Sermaye rolü değiştirebilir."); return; }
  const request = state.finance.paymentRequests.find((item) => item.id === id);
  if (!request) { deny("Ödeme demo kaydı bulunamadı."); return; }
  const labels = { approved: "Mali ön onay", revision: "Mali düzeltme isteği", reconciled: "Mutabakat tamamlama" };
  const defaultReason = nextStatus === "approved"
    ? "Sentetik tutar, program ve kanal alanları pilot ön kontrolden geçti."
    : nextStatus === "revision"
      ? "Ödeme kanalı veya program başvuru bilgisi için öğrenen düzeltmesi gerekiyor."
      : "Mali ön onay ile sentetik tahsilat kaydı eşleştirildi; gerçek para hareketi yoktur.";
  openModal(modalTemplate(`${labels[nextStatus]} • ${escapeHtml(request.id)}`, `<form id="payment-review-form"><input type="hidden" name="id" value="${escapeHtml(request.id)}" /><input type="hidden" name="status" value="${escapeHtml(nextStatus)}" /><div class="grid grid-2"><div><span class="table-subtitle">Program</span><h3>${escapeHtml(request.program)}</h3><p class="page-subtitle">${escapeHtml(request.learner)} • ${formatCurrency(request.amount)} • ${escapeHtml(request.channel)}</p></div><div>${paymentStatusBadge(request)}</div></div><div class="field section"><label class="required" for="payment-review-reason">Mali demo gerekçesi</label><textarea id="payment-review-reason" name="reason" required minlength="12">${escapeHtml(defaultReason)}</textarea><small>Gerekçe, role açık bildirim ve denetim izinde görünür.</small></div><label class="consent-row"><input type="checkbox" name="confirm" required /><span>Gerçek ödeme, fatura, GİB/e-Arşiv veya MYS/MAYS aktarımı oluşturmadığımı onaylıyorum.</span></label></form>`, `<button class="button button--secondary" data-action="close-modal">Vazgeç</button><button class="button ${nextStatus === "revision" ? "button--secondary" : "button--success"}" type="button" data-action="submit-payment-review">${labels[nextStatus]} kaydını oluştur</button>`));
}

function openIntegration(id) {
  if (!isAllowed("integrations")) { deny("Bu rol entegrasyon ayrıntılarını açamaz."); return; }
  const item = state.integrations.find((integration)=>integration.id===id);
  if (!item) { deny("Entegrasyon kaydı bulunamadı."); return; }
  const samplePayload = escapeHtml(JSON.stringify({ ...item.samplePayload, target: item.id, realDataSent: false }, null, 2));
  const lastResult = item.status === "failed" ? `,\n  "error": "${escapeHtml(item.errorScenario)}",\n  "retryAvailable": true` : "";
  const operationAction = canOperateIntegration(item.id)
    ? `<button class="button" data-action="simulate-integration" data-id="${escapeHtml(item.id)}">${item.status === "failed" ? "Yeniden dene" : "Deneme çalıştırması"}</button>`
    : "";
  const publicAccess = item.publicUrl
    ? `<a class="button button--secondary button--sm integration-public" href="${escapeHtml(item.publicUrl)}" target="_blank" rel="noreferrer">Kamu erişim noktasını aç</a>`
    : `<span class="status status--neutral">Erişim adresi tanımlı değil</span>`;
  const sourceEvidence = item.sourceUrl && item.sourceUrl !== item.publicUrl
    ? `<a class="button button--secondary button--sm integration-source" href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noreferrer">Kaynak kanıtını aç</a>`
    : "";
  const source = `<div class="integration-links">${publicAccess}${sourceEvidence}</div>`;
  const governance = item.consultationOnly
    ? notice("warning", "Yalnızca istişare ve taslak", "Bu hedef için aktarım kurgulanmaz; önce kurumlar/birimler arası yetki, amaç ve veri sözlüğü netleştirilir.")
    : "";
  const safetyNotice = item.consultationOnly
    ? notice("warning", "Aktarıma yönelik dry-run kapalı", "Bu kayıtta yalnız kamu kaynağı, sahiplik adayı ve veri sözlüğü taslağı incelenir; başarı/hata aktarım denemesi oluşturulmaz.")
    : notice("warning", "Bağlı değil — gerçek veri gönderilmez", "Aşağıdaki istek ve yanıt yalnız redakte edilmiş sentetik veri paketi simülasyonudur.");
  const detailPanels = item.consultationOnly
    ? `<div class="grid grid-2 section"><article class="card"><div class="card-body"><h3>Kaynak ve olası veri sözlüğü</h3><p class="page-subtitle"><strong>${escapeHtml(item.dataDirection)}</strong></p><p class="page-subtitle">${escapeHtml(item.purposeProposal)}</p><h4>Redakte referans üst verisi</h4><pre class="integration-payload">${samplePayload}</pre></div></article><article class="card"><div class="card-body"><h3>Kurumsal inceleme kapısı</h3><dl class="integration-detail-list"><dt>Onay adayı</dt><dd>${escapeHtml(item.approvalGate)}</dd><dt>Kaynak durumu</dt><dd>${escapeHtml(item.sourceStatus)}</dd><dt>Denetim izi</dt><dd>${escapeHtml(item.auditPolicy)}</dd></dl><div class="permission-note"><strong>Sonuç</strong><span>Yalnızca referans ayrıntısı gösterildi; entegrasyon işi veya retry kaydı üretilmedi.</span></div></div></article></div>`
    : `<div class="grid grid-2 section"><article class="card"><div class="card-body"><h3>Veri yönü ve onay kapısı</h3><p class="page-subtitle"><strong>${escapeHtml(item.dataDirection)}</strong></p><p class="page-subtitle">${escapeHtml(item.approvalGate)}</p><h4>Dry-run örnek paketi</h4><pre class="integration-payload">${samplePayload}</pre></div></article><article class="card"><div class="card-body"><h3>Hata, retry ve audit</h3><dl class="integration-detail-list"><dt>Hata senaryosu</dt><dd>${escapeHtml(item.errorScenario)}</dd><dt>Yeniden deneme</dt><dd>${escapeHtml(item.retryPolicy)}</dd><dt>Denetim izi</dt><dd>${escapeHtml(item.auditPolicy)}</dd></dl><h4>Son deneme sonucu</h4><pre class="integration-payload">{\n  "mode": "simulation",\n  "target": "${escapeHtml(item.id)}",\n  "attempt": ${item.attempts || 0},\n  "realDataSent": false${lastResult}\n}</pre></div></article></div>`;
  openModal(modalTemplate(`${item.name} • ${item.consultationOnly ? "Referans taslağı" : "Entegrasyon taslağı"}`, `${safetyNotice}${governance}<div class="integration-detail-meta"><span>Tier ${item.stage}</span><span>MYYS: ${escapeHtml(item.myysRelevance)}</span><span>${escapeHtml(item.category)}</span><span>${escapeHtml(item.systemClass)}</span></div><p class="page-subtitle"><strong>Kaynak durumu:</strong> ${escapeHtml(item.sourceStatus)}</p>${source}${detailPanels}`, `<button class="button button--secondary" data-action="close-modal">Kapat</button>${operationAction}`));
}

function verifyCodeModal() {
  openModal(modalTemplate("Pilot belge koduyla doğrula", `<form id="verify-form"><div class="field"><label for="verify-input">Pilot yeterlilik kodu</label><input id="verify-input" name="code" value="MY-BEL-2026-0007" required /></div></form>`, `<button class="button button--secondary" data-action="close-modal">Vazgeç</button><button class="button" data-action="submit-verify">Doğrula</button>`));
}

document.addEventListener("click", (event) => {
  const nav = event.target.closest("[data-nav]");
  if (nav) {
    if (!isAllowed(nav.dataset.nav)) deny(`${currentRole().label} rolü bu sayfaya erişemez.`);
    else navigate(nav.dataset.nav);
    return;
  }
  const trigger = event.target.closest("[data-action]");
  if (!trigger) return;
  const { action } = trigger.dataset;
  if (action === "toggle-nav") { const open = document.body.classList.toggle("nav-open"); trigger.setAttribute("aria-expanded", String(open)); trigger.setAttribute("aria-label", open ? "Menüyü kapat" : "Menüyü aç"); }
  if (action === "close-nav") closeMobileNav(true);
  if (action === "close-modal") closeModal();
  if (action === "pilot-info") showPilotInfo();
  if (action === "data-mode") showDataMode();
  if (action === "demo-login") { saveState(); navigate("overview"); toast(`${currentRole().label} demo paneli açıldı.`); }
  if (action === "reset-demo") { const selectedRole = state.roleId; state = structuredClone(initialState); state.roleId = selectedRole; saveState(); render(); toast("Sentetik pilot verisi başlangıç durumuna döndürüldü; seçili rol korundu."); }
  if (action === "run-scenario") runNextScenario(trigger.dataset.kind);
  if (action === "open-scenario-result") {
    state.roleId = trigger.dataset.kind === "internal" ? "coordinator" : "it";
    saveState();
    navigate(trigger.dataset.kind === "internal" ? "applications" : "integrations");
  }
  if (action === "open-program") openProgram(trigger.dataset.id);
  if (action === "open-application") openApplication(trigger.dataset.id);
  if (action === "go-commission") {
    if (!isAllowed("commission")) { deny(`${currentRole().label} rolünün karar masasına erişimi yoktur.`); return; }
    closeModal(); navigate("commission");
  }
  if (action === "decision") decisionModal(trigger.dataset.id, trigger.dataset.status);
  if (action === "qualification-board-decision") qualificationBoardDecisionModal(trigger.dataset.id);
  if (action === "submit-qualification-board-decision") {
    event.preventDefault();
    const form = document.querySelector("#qualification-board-form");
    if (form) submitQualificationBoardDecision(form);
    return;
  }
  if (action === "commission-tab") activateCommissionTab(trigger.dataset.tab);
  if (action === "framework-tab") {
    if (!QUALIFICATION_FRAMEWORK_IDS.includes(trigger.dataset.framework)) { deny("Geçersiz yeterlilik çerçevesi seçildi."); return; }
    currentFrameworkTab = trigger.dataset.framework;
    if (!smartFrameworkLevels(currentFrameworkTab).includes(currentFrameworkLevel)) currentFrameworkLevel = smartFrameworkLevels(currentFrameworkTab)[0];
    render();
  }
  if (action === "load-framework-level") {
    const value = Number(document.querySelector("#framework-level")?.value);
    if (!smartFrameworkLevels(currentFrameworkTab).includes(value)) { deny(currentFrameworkTab === "tyyc" ? "TYYÇ düzeyi 5–8 arasında olmalıdır." : "Yeterlilik seviyesi 1 ile 8 arasında olmalıdır."); return; }
    currentFrameworkLevel = value;
    render();
  }
  if (action === "submit-decision") document.querySelector("#decision-form")?.requestSubmit();
  if (action === "save-draft") {
    const form = trigger.closest("form");
    if (form?.id === "proposal-form") saveProposalDraft(form);
    if (form?.id === "recognition-form") saveRecognitionDraft(form);
  }
  if (action === "preview-proposal") previewProposal(trigger.closest("form"));
  if (action === "reanalyze-smart-suggestions") analyzeProposalQualifications(trigger.closest("form"), { announce: true });
  if (action === "apply-smart-suggestion") applySmartSelection(Number(trigger.dataset.outcomeIndex), trigger.dataset.framework);
  if (action === "apply-smart-override") applySmartOverride(trigger.closest("[data-smart-override]"));
  if (action === "mock-upload") toast("Sentetik dosya üst verisi eklendi; dosya içeriği aktarılmadı.");
  if (action === "open-integration") openIntegration(trigger.dataset.id);
  if (action === "simulate-integration") simulateIntegration(trigger.dataset.id);
  if (action === "integration-dryrun") simulateAllIntegrations();
  if (action === "integration-category") {
    currentIntegrationCategory = document.querySelector("#integration-category")?.value || "all";
    currentIntegrationTier = document.querySelector("#integration-tier")?.value || "all";
    render();
  }
  if (action === "finance-simulate") simulateFinance();
  if (action === "finance-draft") createFinanceDraft();
  if (action === "directive-myd-generate") generateDirectiveMydCode();
  if (action === "directive-recognition-decision") recordDirectiveRecognition(trigger.dataset.kind);
  if (action === "directive-appeal") submitDirectiveAppeal(trigger.dataset.kind);
  if (action === "directive-commission-check") checkDirectiveCommission();
  if (action === "directive-seat-request") requestDirectiveSeat();
  if (action === "directive-ek1-validate") validateDirectiveEk1();
  if (action === "directive-finance-dryrun") createDirectiveFinanceDryRun();
  if (action === "payment-review") paymentReviewModal(trigger.dataset.id, trigger.dataset.status);
  if (action === "submit-payment-request") {
    event.preventDefault();
    const form = trigger.closest("form");
    if (form) submitPaymentDemo(form);
    return;
  }
  if (action === "submit-payment-review") {
    event.preventDefault();
    const form = document.querySelector("#payment-review-form");
    if (form) submitPaymentReview(form);
    return;
  }
  if (action === "handoff-finance") {
    state.roleId = "finance";
    state.selectedApplicationId = null;
    saveState();
    navigate("finance");
    toast("Finans / Döner Sermaye demo inceleme kuyruğuna geçildi.");
  }
  if (action === "assessment-run") runAssessment();
  if (action === "assessment-decision") decideAssessment();
  if (action === "verify-code") verifyCodeModal();
  if (action === "open-credential") navigate("verify", trigger.dataset.code);
  if (action === "submit-verify") document.querySelector("#verify-form")?.requestSubmit();
  if (action === "mark-notifications") {
    if (!isAllowed("notifications")) { deny("Bu rolün bildirim çalışma alanı yoktur."); return; }
    visibleNotifications().forEach((item)=>{ if (!item.readBy.includes(state.roleId)) item.readBy.push(state.roleId); }); saveState(); render(); toast("Bu role ait uygulama içi bildirimler okundu.");
  }
  if (action === "export-report") {
    if (!isAllowed("reports")) { deny("Bu rol rapor özeti oluşturamaz."); return; }
    toast("Sentetik pilot rapor özeti hazırlandı; bu demo gerçek veri dışa aktarmaz.");
  }
  if (action === "export-audit") {
    if (!isAllowed("audit")) { deny("Bu rol denetim izi özeti oluşturamaz."); return; }
    toast("Sentetik pilot rapor özeti hazırlandı; bu demo gerçek veri dışa aktarmaz.");
  }
  if (action === "apply-program") enrollProgram(trigger.dataset.id);
  if (action === "refresh-data") refreshRemote(true);
  if (action === "clear-catalog") { document.querySelector("#catalog-search").value=""; document.querySelector("#catalog-level").value=""; filterCatalog(); }
});

document.addEventListener("submit", (event) => {
  event.preventDefault();
  if (event.target.id === "proposal-form") submitProposal(event.target);
  if (event.target.id === "recognition-form") submitRecognition(event.target);
  if (event.target.id === "decision-form") submitDecision(event.target);
  if (event.target.id === "qualification-board-form") submitQualificationBoardDecision(event.target);
  if (event.target.id === "verify-form") submitVerify();
  if (event.target.id === "finance-parameters") saveFinanceParameters(event.target);
  if (event.target.id === "payment-request-form") submitPaymentDemo(event.target);
  if (event.target.id === "payment-review-form") submitPaymentReview(event.target);
  if (event.target.id === "qualification-matrix-form") saveQualificationMatrix(event.target);
  if (event.target.id === "directive-workload-form") validateDirectiveWorkloadForm(event.target);
});

document.addEventListener("input", (event) => {
  // A late read-only network response must never redraw a form after the user
  // has started editing it. The epoch is intentionally local to this tab.
  uiMutationEpoch += 1;
  if (event.target.id === "proposal-ects") document.querySelector("#proposal-workload").value = Number(event.target.value || 0) * 25;
  if (["proposal-outcomes", "proposal-level", "proposal-title"].includes(event.target.id)) scheduleSmartQualificationAnalysis(event.target.closest("form"));
  if (["catalog-search","catalog-level"].includes(event.target.id)) filterCatalog();
  if (["application-search","application-status"].includes(event.target.id)) filterApplications();
  if (event.target.id === "integration-search") filterIntegrations();
});

document.addEventListener("change", (event) => {
  // Native selects and checkboxes may emit only change in some automation or
  // assistive-technology paths; mark those edits before a late refresh lands.
  if (event.target.matches("input, select, textarea")) uiMutationEpoch += 1;
  if (["proposal-level"].includes(event.target.id)) scheduleSmartQualificationAnalysis(event.target.closest("form"));
  if (event.target.matches(".smart-override-level, .smart-override-dimension")) updateSmartOverrideDescriptor(event.target.closest("[data-smart-override]"));
});

roleSelect.addEventListener("change", () => {
  if (!roles.some((role) => role.id === roleSelect.value)) {
    state.roleId = initialState.roleId;
    saveState();
    render();
    deny("Geçersiz demo rolü algılandı; güvenli başlangıç rolüne dönüldü.");
    return;
  }
  state.roleId = roleSelect.value;
  state.selectedApplicationId = null;
  saveState();
  navigate("overview");
  toast(`${currentRole().label} demo görünümüne geçildi.`);
});

modalBackdrop.addEventListener("click", (event) => { if (event.target === modalBackdrop) closeModal(); });
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modalBackdrop.hidden) { closeModal(); return; }
  if (event.key === "Escape" && document.body.classList.contains("nav-open")) { closeMobileNav(true); return; }
  const activeTab = event.target.closest?.("[role='tab'][data-action='commission-tab']");
  if (activeTab && ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
    const tabs = [...document.querySelectorAll("[role='tab'][data-action='commission-tab']")];
    const currentIndex = tabs.indexOf(activeTab);
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? tabs.length - 1
        : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    event.preventDefault();
    activateCommissionTab(tabs[nextIndex]?.dataset.tab);
    return;
  }
  if (event.key === "Tab" && !modalBackdrop.hidden) {
    const focusable = [...modal.querySelectorAll("button, input, select, textarea, a[href], [tabindex]:not([tabindex='-1'])")].filter((element)=>!element.disabled);
    if (!focusable.length) return;
    const first = focusable[0]; const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});
window.addEventListener("hashchange", render);

function runNextScenario(kind) {
  try {
    const result = runScenarioStep(state, kind);
    if (result.role !== "system") state.roleId = result.role;
    saveState();
    render();
    toast(result.completed ? "Uçtan uca pilot senaryo tamamlandı." : `${result.label} — pilot durumu güncellendi.`);
  } catch (error) {
    toast(error.message, "error");
  }
}

function previewProposal(form) {
  if (!form) return;
  analyzeProposalQualifications(form);
  const data = new FormData(form);
  const snapshot = smartMappingSnapshot();
  const appliedCount = snapshot?.appliedSelections?.length || 0;
  openModal(modalTemplate("Program önerisi ön izlemesi", `<div class="program-meta"><span class="meta-pill">${escapeHtml(data.get("ects") || "—")} AKTS • Pilot</span><span class="meta-pill">TYÇ ${escapeHtml(data.get("level") || "—")} başlangıç bağlamı</span><span class="meta-pill">${appliedCount} akıllı eşleme uygulandı</span><span class="meta-pill">%${escapeHtml(data.get("remoteRate") || "0")} uzaktan sunum</span></div><h3>${escapeHtml(data.get("title") || "Başlıksız taslak")}</h3><p class="page-subtitle">${escapeHtml(data.get("summary") || "Program özeti henüz girilmedi.")}</p><div class="grid grid-2 section"><div><strong>Hedef kitle</strong><p class="page-subtitle">${escapeHtml(data.get("audience") || "—")}</p></div><div><strong>Eğitici yeterliliği</strong><p class="page-subtitle">${escapeHtml(data.get("qualifications") || "—")}</p></div><div><strong>Kalite güvence kanıtı</strong><p class="page-subtitle">${escapeHtml(data.get("quality") || "—")}</p></div><div><strong>Ücret modu</strong><p class="page-subtitle">${escapeHtml(data.get("feeMode") || "Ücretsiz")} • ${escapeHtml(data.get("fee") || "0")} TL pilot taslak</p></div></div>${snapshot ? `<section class="section" data-smart-review><h3>Akıllı yeterlilik eşleme ön izlemesi</h3>${smartProgramSummary(smartSuggestionReport)}<p class="table-subtitle">${appliedCount ? `${appliedCount} öneri eğitici tarafından seçilip uygulandı.` : "Öneriler üretildi; henüz eğitici tarafından uygulanmış seçim yok."}</p></section>` : ""}${notice("warning","Ön izleme — karar değildir","Bu görünüm yalnız form alanlarını ve açıklanabilir pilot öneriyi denetlemek içindir; Komisyona gönderim veya kurumsal onay oluşturmaz.")}`, `<button class="button" data-action="close-modal">Düzenlemeye dön</button>`));
}

function persistSmartAlignment(application, program, form, { analysisResult = null } = {}) {
  const analysis = analysisResult || analyzeProposalQualifications(form);
  if (!analysis?.ok || !analysis.report) return { ok: false, code: analysis?.code || "analysis_unavailable", message: analysis?.message || "Akıllı eşleme kalite kapısı geçilemedi.", record: null };
  const snapshot = smartMappingSnapshot(analysis.report);
  const liveOutcomes = splitLearningOutcomes(form?.elements?.outcomes?.value || "");
  if (!snapshot?.outcomes?.length || snapshot.outcomes.length !== liveOutcomes.length || snapshot.orderedOutcomeFingerprint !== smartOrderedOutcomeFingerprint(liveOutcomes)) {
    return { ok: false, code: "stale_snapshot", message: "Öğrenme çıktıları ile eşleme anlık görüntüsü uyuşmuyor; yeniden analiz gerekir.", record: null };
  }
  if (snapshot.manualOverrides.some((override) => !override.outcomeFingerprint || !override.recordedAt) || snapshot.appliedSelections.some((selection) => !selection.outcomeFingerprint)) {
    return { ok: false, code: "invalid_human_selection", message: "Eski veya bağlamsız insan seçimi algılandı; seçimleri yeniden uygulayın.", record: null };
  }
  state.smartAlignments ||= [];
  const now = new Date().toISOString();
  const suggestionSnapshot = createSmartSuggestionSnapshot(analysis.report, {
    orderedOutcomeFingerprint: snapshot.orderedOutcomeFingerprint,
    outcomes: snapshot.outcomes,
    program: snapshot.program,
    manualOverrides: snapshot.manualOverrides,
    appliedSelections: snapshot.appliedSelections,
    higherEducationCycleSuggestion: snapshot.higherEducationCycleSuggestion
  }, { capturedAt: now });
  const snapshotValidation = validateSmartSuggestionSnapshot(suggestionSnapshot, {
    engineVersion: snapshot.engineVersion,
    orderedOutcomeFingerprint: snapshot.orderedOutcomeFingerprint,
    outcomes: snapshot.outcomes,
    program: snapshot.program,
    manualOverrides: snapshot.manualOverrides,
    appliedSelections: snapshot.appliedSelections,
    higherEducationCycleSuggestion: snapshot.higherEducationCycleSuggestion
  });
  if (!snapshotValidation.valid) {
    return { ok: false, code: "snapshot_integrity_failed", message: `Tam öneri snapshot'ı doğrulanamadı: ${snapshotValidation.errors.join("; ")}`, record: null };
  }
  const record = {
    id: `ALIGN-${application.id}`,
    applicationId: application.id,
    programId: program?.id || "pending-program",
    applicationCode: application.code,
    programTitle: application.title,
    ownerRole: state.roleId,
    ownerName: currentRole().name,
    status: "pilot_suggestion",
    engineVersion: snapshot.engineVersion,
    advisoryNotice: snapshot.advisoryNotice,
    orderedOutcomeFingerprint: snapshot.orderedOutcomeFingerprint,
    updatedAt: now,
    outcomes: snapshot.outcomes,
    program: snapshot.program,
    manualOverrides: snapshot.manualOverrides,
    appliedSelections: snapshot.appliedSelections,
    higherEducationCycleSuggestion: snapshot.higherEducationCycleSuggestion,
    suggestionSnapshot,
    institutionalValidationRequired: true,
    boardDecision: null
  };
  const existingIndex = state.smartAlignments.findIndex((item) => item.applicationId === application.id);
  if (existingIndex >= 0) state.smartAlignments.splice(existingIndex, 1, record);
  else state.smartAlignments.unshift(record);
  application.smartAlignmentId = record.id;
  application.formData ||= {};
  application.formData.qualificationMapping = record;
  if (program) program.smartAlignmentId = record.id;
  state.audit.unshift({
    id: `AUD-${Date.now()}-ALIGN`,
    entityId: application.id,
    at: now,
    actor: currentRole().name,
    actorRole: state.roleId,
    action: "Açıklanabilir yeterlilik eşleme önerisi kaydedildi",
    from: application.status,
    to: application.status,
    reason: `${record.outcomes.length} öğrenme çıktısı • ${record.appliedSelections.length} eğitici seçimi • kaynak ${suggestionSnapshot.referenceDataVersion} • ${suggestionSnapshot.integrityHash} • karar değildir`
  });
  return { ok: true, code: "persisted", message: "Akıllı eşleme kaydedildi.", record };
}

function proposalWorkloadComponents(data) {
  return Object.fromEntries(workloadComponents.map(([key]) => [key, data.get(`workload_${key}`)]));
}

function numericWorkloadComponents(components) {
  return Object.fromEntries(workloadComponents.map(([key]) => [key, Number(components[key])]));
}

function saveProposalDraft(form) {
  if (!form) return;
  if (!PROPOSAL_ROLES.has(state.roleId)) { deny("Program önerisi yalnız iç veya kurum dışı eğitici rolüyle oluşturulabilir."); return; }
  const analysis = analyzeProposalQualifications(form);
  if (!analysis?.ok) { deny(analysis?.message || "Öğrenme çıktıları akıllı eşleme kalite kapısını geçmedi; taslak oluşturulmadı."); return; }
  const stateBeforeMutation = structuredClone(state);
  const data = new FormData(form);
  const title = String(data.get("title") || "Başlıksız program taslağı");
  const components = proposalWorkloadComponents(data);
  const workloadCheck = validateEctsWorkload({ ects: data.get("ects"), totalWorkload: data.get("workload"), components, requireComponents: true });
  if (!workloadCheck.valid) { deny(workloadCheck.errors.join(" ")); return; }
  const persistedComponents = numericWorkloadComponents(components);
  try {
    const application = createApplication(state, { kind: "internal", status: "draft", title, applicant: currentRole().name, actorRole: state.roleId, ects: data.get("ects") || 1, remoteRate: data.get("remoteRate") || 0, evidence: data.get("evidence") || 0, comparedCourse: "Kurumsal Bologna kataloğu", workloadComponents: persistedComponents, totalWorkload: Number(data.get("workload")) });
    application.formData = { ...Object.fromEntries(data.entries()), workloadComponents: persistedComponents, totalWorkload: Number(data.get("workload")) };
    const persisted = persistSmartAlignment(application, null, form, { analysisResult: analysis });
    if (!persisted.ok) throw new Error(persisted.message);
    saveState();
    toast(`${application.code} taslağı tarayıcıdaki izole pilot çalışma alanına kaydedildi.`);
  } catch (error) {
    state = stateBeforeMutation;
    deny(`${error.message} Taslak veya denetim izi oluşturulmadı.`);
  }
}

function saveRecognitionDraft(form) {
  if (!form) return;
  if (state.roleId !== "learner") { deny("Dış kazanım taslağı yalnız öğrenen rolüyle oluşturulabilir."); return; }
  const data = new FormData(form);
  const application = createApplication(state, { kind: "external", status: "draft", title: data.get("title") || "Başlıksız dış kazanım taslağı", applicant: currentRole().name, actorRole: state.roleId, provider: data.get("provider"), ects: data.get("ects") || 1, remoteRate: data.get("remoteRate") || 0, evidence: 1, comparedCourse: data.get("comparedCourse") });
  saveState();
  toast(`${application.code} dış kazanım taslağı kaydedildi.`);
}

function saveQualificationMatrix(form) {
  if (!PROPOSAL_ROLES.has(state.roleId)) { deny("TYÇ / AYÇ / TYYÇ matris taslağını yalnız iç veya kurum dışı eğitici kaydedebilir."); return; }
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const frameworkId = String(data.get("frameworkId") || "");
  const level = Number(data.get("level"));
  if (!QUALIFICATION_FRAMEWORK_IDS.includes(frameworkId) || !smartFrameworkLevels(frameworkId).includes(level)) {
    deny("Yeterlilik çerçevesi veya seviyesi geçersiz.");
    return;
  }
  const rows = ["knowledge", "skills", "competence"].map((dimension) => ({
    dimension,
    learningOutcome: String(data.get(`${dimension}Outcome`) || "").trim(),
    learningLevel: String(data.get(`${dimension}Level`) || "").trim(),
    courseContent: String(data.get(`${dimension}Content`) || "").trim(),
    assessmentMethod: String(data.get(`${dimension}Assessment`) || "").trim(),
    evidence: String(data.get(`${dimension}Evidence`) || "").trim(),
    alignmentRationale: String(data.get(`${dimension}Rationale`) || "").trim()
  }));
  if (rows.some((row) => Object.values(row).some((value) => !String(value).trim()))) {
    deny("Her resmî boyut için hedef, içerik, ölçme, ölçüt/kanıt ve uyum gerekçesi tamamlanmalıdır.");
    return;
  }
  state.qualificationDrafts ||= [];
  const id = `MATRIX-${frameworkId.toUpperCase()}-${level}-${state.roleId}`;
  const draft = {
    id,
    frameworkId,
    level,
    programTitle: String(data.get("programTitle") || "").trim(),
    ownerRole: state.roleId,
    ownerName: currentRole().name,
    status: "pilot_draft",
    updatedAt: new Date().toISOString(),
    rows
  };
  const existingIndex = state.qualificationDrafts.findIndex((item) => item.id === id && item.ownerName === draft.ownerName);
  if (existingIndex >= 0) state.qualificationDrafts.splice(existingIndex, 1, draft);
  else state.qualificationDrafts.unshift(draft);
  state.audit.unshift({
    id: `AUD-${Date.now()}`,
    entityId: draft.id,
    at: draft.updatedAt,
    actor: draft.ownerName,
    actorRole: draft.ownerRole,
    action: "TYÇ / AYÇ / TYYÇ pilot matris taslağı kaydedildi",
    from: "draft",
    to: "draft",
    reason: `${smartFrameworkCode(frameworkId)} ${level}. seviye önerisi; resmî seviye, eşdeğerlik veya akademik karar değildir`
  });
  saveState();
  render();
  toast("Yeterlilik eşleme matrisi izole pilot çalışma alanına kaydedildi.");
}

function enrollProgram(id) {
  if (state.roleId !== "learner") { deny("Programa pilot kayıt yalnız öğrenen rolüyle oluşturulabilir."); return; }
  const program = state.programs.find((item)=>item.id===id);
  if (!program) return;
  if (program.status !== "active" || !visiblePrograms().some((item) => item.id === program.id)) {
    deny("Yalnız öğrenene açık, aktif pilot programlara kayıt oluşturulabilir.");
    return;
  }
  const enrollmentId = `ENR-${program.code}`;
  if (state.enrollments.some((item) => item.id === enrollmentId)) {
    closeModal(); navigate("learning"); toast("Bu program için pilot eğitim kaydı zaten bulunuyor.");
    return;
  }
  if (Number(program.price) > 0) {
    try {
      const request = startPaymentRequest(state, program.id, state.roleId, currentRole().name);
      saveState(); closeModal(); navigate("payments");
      toast(`${request.id} ödeme demo taslağı açıldı; gerçek ödeme bilgisi istenmeyecek.`);
    } catch (error) {
      deny(error.message);
    }
    return;
  }
  if (!state.enrollments.some((item)=>item.id===enrollmentId)) {
    state.enrollments.unshift({ id:enrollmentId, programCode:program.code, title:program.title, learner:"Derya Örnek", status:"active", progress:10, ects:program.ects, remoteEcts:Number((program.ects * program.remoteRate / 100).toFixed(1)) });
    state.audit.unshift({ id:`AUD-${Date.now()}`, entityId:enrollmentId, at:new Date().toISOString(), actor:"Derya Örnek", actorRole:"learner", action:"Programa pilot kayıt oluşturuldu", from:"applied", to:"active", reason:"Gerçek kayıt veya ödeme oluşturulmadı" });
  }
  saveState(); closeModal(); navigate("learning"); toast(`${program.title} için pilot kayıt oluşturuldu.`);
}

function runAssessment() {
  if (!ASSESSMENT_START_ROLES.has(state.roleId)) { deny("Bu rol örnek değerlendirme oturumu başlatamaz."); return; }
  const existing = state.assessmentSessions.find((item)=>item.id==="ASM-DEMO-LIVE");
  if (existing && existing.status === "active") { toast("Örnek değerlendirme zaten devam ediyor.", "error"); return; }
  const previousStatus = existing?.status || "scheduled";
  const session = existing || { id:"ASM-DEMO-LIVE", enrollmentId:state.enrollments[0]?.id || "ENR-DEMO", title:"Kimlik ve değerlendirme oturumu", status:"active", score:null, evaluatorDecision:null, events:2 };
  if (!existing) state.assessmentSessions.unshift(session); else Object.assign(existing, session, { status:"active", score:null, evaluatorDecision:null });
  state.audit.unshift({ id:`AUD-${Date.now()}`, entityId:session.id, at:new Date().toISOString(), actor:currentRole().name, actorRole:state.roleId, action:"Örnek değerlendirme başlatıldı", from:previousStatus, to:"active", reason:"Kamera ve mikrofon izinleri kapalı; olaylar yalnız metinsel simülasyon" });
  saveState(); render(); toast("Örnek değerlendirme başlatıldı; kamera ve mikrofon erişimi kapalıdır.");
}

function decideAssessment() {
  const session = state.assessmentSessions.find((item)=>item.id==="ASM-DEMO-LIVE") || state.assessmentSessions[0];
  if (!session) { toast("İncelenecek pilot değerlendirme bulunamadı.", "error"); return; }
  if (!canRecordAssessmentDecision(state.roleId)) { deny("Bu rol insan değerlendirici kararı kaydedemez."); return; }
  try {
    recordAssessmentDecision(state, session.id, state.roleId, { score: session.score || 82, decision: "Başarılı • İnsan değerlendirici", reason: "Simüle olaylar tek başına karar olarak kullanılmadı" }, currentRole().name);
    saveState(); render(); toast("İnsan değerlendirici kararı pilot denetim izine kaydedildi.");
  } catch (error) {
    toast(error.message, "error");
  }
}

function submitProposal(form) {
  if (!PROPOSAL_ROLES.has(state.roleId)) { deny("Program önerisi yalnız iç veya kurum dışı eğitici rolüyle gönderilebilir."); return; }
  const analysis = analyzeProposalQualifications(form);
  if (!analysis?.ok) { deny(analysis?.message || "Öğrenme çıktıları akıllı eşleme kalite kapısını geçmedi; başvuru oluşturulmadı."); return; }
  if (!form.reportValidity()) return;
  const stateBeforeMutation = structuredClone(state);
  const data = new FormData(form);
  const components = proposalWorkloadComponents(data);
  const workloadCheck = validateEctsWorkload({ ects: data.get("ects"), totalWorkload: data.get("workload"), components, requireComponents: true });
  if (!workloadCheck.valid) { deny(workloadCheck.errors.join(" ")); return; }
  const persistedComponents = numericWorkloadComponents(components);
  try {
    const application = createApplication(state, { kind: "internal", title: data.get("title"), applicant: currentRole().name, actorRole: state.roleId, ects: data.get("ects"), remoteRate: data.get("remoteRate"), evidence: data.get("evidence"), comparedCourse: "Kurumsal Bologna kataloğu", workloadComponents: persistedComponents, totalWorkload: Number(data.get("workload")) });
    application.formData = { audience:data.get("audience"), outcomes:splitLearningOutcomes(data.get("outcomes")), ects:Number(data.get("ects")), totalWorkload:Number(data.get("workload")), workloadComponents:persistedComponents, assessment:data.get("assessment"), smartContent:data.get("smartContent"), smartAssessment:data.get("smartAssessment"), smartEvidence:data.get("smartEvidence"), qualifications:data.get("qualifications"), quality:data.get("quality"), feeMode:data.get("feeMode"), fee:Number(data.get("fee") || 0) };
    const program = { id:`program-${Date.now()}`, code:application.code, title:data.get("title"), unit:data.get("unit"), instructor:currentRole().name, ects:Number(data.get("ects")), workload:Number(data.get("workload")), workloadComponents:persistedComponents, level:Number(data.get("level")), mode:Number(data.get("remoteRate")) ? "Karma" : "Yüz yüze", remoteRate:Number(data.get("remoteRate")), status:"review", productionEligible:false, learners:0, price:Number(data.get("fee") || 0), summary:data.get("summary"), outcomes:splitLearningOutcomes(data.get("outcomes")) };
    state.programs.unshift(program);
    const persisted = persistSmartAlignment(application, program, form, { analysisResult: analysis });
    if (!persisted.ok) throw new Error(persisted.message);
    saveState();
    toast(`${application.code} pilot veri katmanına kaydedildi.`);
    navigate("applications");
  } catch (error) {
    state = stateBeforeMutation;
    deny(`${error.message} Başvuru, program veya denetim izi oluşturulmadı.`);
  }
}

function submitRecognition(form) {
  if (!form.reportValidity()) return;
  if (state.roleId !== "learner") { deny("Dış kazanım başvurusu yalnız öğrenen rolüyle gönderilebilir."); return; }
  const data = new FormData(form);
  const application = createApplication(state, { kind: "external", title:data.get("title"), applicant:currentRole().name, actorRole:state.roleId, provider:data.get("provider"), ects:data.get("ects"), remoteRate:data.get("remoteRate"), evidence:2, comparedCourse:data.get("comparedCourse") });
  saveState();
  toast(`${application.code} dış kazanım başvurusu ön incelemeye gönderildi.`);
  navigate("applications");
}

function submitDecision(form) {
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  try {
    const nextStatus = data.get("status");
    const application = state.applications.find((item)=>item.id===data.get("id"));
    if (!getAllowedApplicationTransitions(application, state.roleId, currentRole().name).includes(nextStatus)) throw new Error("Seçili demo rolü bu akademik kararı kaydedemez");
    const updated = transitionApplication(state, data.get("id"), nextStatus, state.roleId, data.get("reason"), currentRole().name);
    if (nextStatus === "approved") {
      const program = state.programs.find((item)=>item.code===updated.code);
      if (program) program.status = "active";
    }
    saveState(); closeModal(); render(); toast("Gerekçeli komisyon pilot kaydı audit izine eklendi.");
  } catch (error) { toast(error.message, "error"); }
}

function submitVerify() {
  const code = document.querySelector("#verify-input")?.value.trim();
  if (!code) return;
  closeModal(); navigate("verify", code);
}

function filterCatalog() {
  const query = document.querySelector("#catalog-search")?.value.toLocaleLowerCase("tr-TR") || "";
  const level = document.querySelector("#catalog-level")?.value || "";
  const cards = [...document.querySelectorAll("#catalog-grid .program-card")];
  cards.forEach((card)=>{ card.hidden = Boolean((query && !card.dataset.searchable.includes(query)) || (level && card.dataset.programLevel !== level)); });
  const empty = document.querySelector("#catalog-filter-empty");
  if (empty) empty.hidden = !cards.length || cards.some((card) => !card.hidden);
}

function filterApplications() {
  const query = document.querySelector("#application-search")?.value.toLocaleLowerCase("tr-TR") || "";
  const status = document.querySelector("#application-status")?.value || "";
  const rows = [...document.querySelectorAll("#application-rows tr")];
  rows.forEach((row)=>{
    if (!row.dataset.searchable) { row.hidden = false; return; }
    row.hidden = Boolean((query && !row.dataset.searchable.includes(query)) || (status && row.dataset.applicationStatus !== status));
  });
  const filterableRows = rows.filter((row) => row.dataset.searchable);
  const empty = document.querySelector("#application-filter-empty");
  if (empty) empty.hidden = !filterableRows.length || filterableRows.some((row) => !row.hidden);
}

function filterIntegrations() {
  const query = document.querySelector("#integration-search")?.value.toLocaleLowerCase("tr-TR") || "";
  const cards = [...document.querySelectorAll("#integration-catalog .integration-card")];
  cards.forEach((card) => { card.hidden = Boolean(query && !card.dataset.searchable.includes(query)); });
  const empty = document.querySelector("#integration-filter-empty");
  if (empty) empty.hidden = !cards.length || cards.some((card) => !card.hidden);
}

function simulateIntegration(id) {
  try {
    const { integration, job } = runIntegrationDryRun(state, id, state.roleId, currentRole().name);
    saveState(); closeModal(); render();
    toast(job.retryAvailable ? `${integration.name} için ${integration.errorScenario} simüle edildi; kontrollü yeniden deneme kullanılabilir.` : `${integration.name} yeniden denemesi tamamlandı; gerçek veri gönderilmedi.`, job.retryAvailable ? "error" : "success");
  } catch (error) {
    deny(error.message);
  }
}

function simulateAllIntegrations() {
  try {
    const jobs = runIntegrationBulkDryRun(state, state.roleId, currentRole().name);
    saveState(); render(); toast(`${jobs.length} entegrasyon kaydı için yalnız simülasyon logu üretildi.`);
  } catch (error) {
    deny(error.message);
  }
}

function submitPaymentDemo(form) {
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  try {
    const request = submitPaymentRequest(state, data.get("id"), data.get("channel"), state.roleId, currentRole().name);
    saveState(); render();
    toast(`${request.id} Finans / Döner Sermaye demo kuyruğuna iletildi; gerçek ödeme alınmadı.`);
  } catch (error) {
    deny(error.message);
  }
}

function submitPaymentReview(form) {
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  try {
    const request = reviewPaymentRequest(state, data.get("id"), data.get("status"), state.roleId, data.get("reason"), currentRole().name);
    saveState(); closeModal(); render();
    toast(`${request.id} mali demo durumu güncellendi; gerçek para hareketi oluşturulmadı.`);
  } catch (error) {
    deny(error.message);
  }
}

function simulateFinance() {
  if (!FINANCE_OPERATOR_ROLES.has(state.roleId)) { deny("Bu rol tahsilat simülasyonu oluşturamaz."); return; }
  const id = `TX-${String(Date.now()).slice(-4)}`;
  state.finance.transactions.unshift({ id, program:"Dijital Üretimde Veri Okuryazarlığı", learner:"Pilot Katılımcı 030", gross:1500, channel:"Sanal POS simülasyonu", status:"matched" });
  state.audit.unshift({ id:`AUD-${Date.now()}`, entityId:id, at:new Date().toISOString(), actor:currentRole().name, actorRole:state.roleId, action:"Tahsilat simülasyonu eşleştirildi", from:"pending", to:"matched", reason:"Gerçek ödeme veya kart verisi işlenmedi" });
  saveState(); render(); toast("Tahsilat simülasyonu oluşturuldu; gerçek ödeme alınmadı.");
}

function createFinanceDraft() {
  if (!FINANCE_OPERATOR_ROLES.has(state.roleId)) { deny("Bu rol fatura veya hak ediş taslağı oluşturamaz."); return; }
  const entitlement = state.finance.entitlements[0];
  if (!entitlement) { deny("Fatura veya hak ediş taslağı için önce kanıtlı bir sentetik hak ediş kaydı gerekir."); return; }
  state.finance.invoiceDrafts ||= [];
  const draft = { id:`INV-DRAFT-${String(Date.now()).slice(-5)}`, entitlementId:entitlement.id, status:"draft", realDocument:false, createdAt:new Date().toISOString() };
  state.finance.invoiceDrafts.unshift(draft);
  state.audit.unshift({ id:`AUD-${Date.now()}`, entityId:draft.id, at:draft.createdAt, actor:currentRole().name, actorRole:state.roleId, action:"Fatura / hak ediş taslağı oluşturuldu", from:"none", to:"draft", reason:"Gerçek mali belge üretilmedi; mali birim doğrulaması gerekir" });
  saveState(); render(); toast("Fatura / hak ediş taslağı kaydedildi. Gerçek mali belge üretilmedi.");
}

function addDirectiveAudit(entityId, action, from, to, reason) {
  state.audit.unshift({
    id: `AUD-DIR-${Date.now()}-${state.audit.length}`,
    entityId,
    at: new Date().toISOString(),
    actor: currentRole().name,
    actorRole: state.roleId,
    action,
    from,
    to,
    reason
  });
}

function validateDirectiveWorkloadForm(form) {
  if (!form?.reportValidity()) return;
  const data = new FormData(form);
  const components = Object.fromEntries(workloadComponents.map(([key]) => [key, data.get(key)]));
  const result = validateEctsWorkload({ ects: data.get("ects"), totalWorkload: data.get("totalWorkload"), components, requireComponents: true });
  const target = document.querySelector("#directive-workload-result");
  if (target) target.innerHTML = directiveWorkloadResult(result);
  toast(result.valid ? "AKTS–iş yükü bağı ve sekiz bileşen doğrulandı." : "İş yükü kontrolü başarısız; alanları düzeltin.", result.valid ? "success" : "error");
}

function generateDirectiveMydCode() {
  try {
    const record = generateMydCode(state.directivePilot, { actorRole: state.roleId, unitCode: "SEM", year: 2026 });
    addDirectiveAudit(record.id, "MYD pilot kodu rezerve edildi", "none", "pilot_reserved", `Program sürümü V${record.versionNo} ayrı kaydedildi; kurumsal değerlendirme taslağı; productionEligible=false`);
    saveState(); render(); toast(`${record.code} • V${record.versionNo} yalnız pilot siciline kaydedildi.`);
  } catch (error) { deny(error.message); }
}

function recordDirectiveRecognition(kind) {
  try {
    const record = recordRecognitionDecision(state.directivePilot, {
      applicationId: "APP-042",
      kind,
      status: "additional_evidence_required",
      rationale: `${recognitionDecisionLabel(kind)} için kurumsal kural doğrulaması tamamlanmadığından ek sentetik kanıt talep edildi.`,
      actorRole: state.roleId,
      decisionBody: "MY-KOM"
    });
    addDirectiveAudit(record.id, "Ayrı tanıma ek kanıt talebi kaydedildi", "pending_human_review", record.status, `${record.kind}; olumlu nihai sonuç bloke; diğer iki sonuç ve rozet/AKTS durumları değiştirilmedi`);
    saveState(); render(); toast(`${recognitionDecisionLabel(kind)} için ayrı ek kanıt talebi kaydedildi.`);
  } catch (error) { deny(error.message); }
}

function submitDirectiveAppeal(kind) {
  try {
    const decision = state.directivePilot.recognitionDecisions.find((item) => item.applicationId === "APP-042" && item.kind === kind);
    if (!decision || decision.status === "pending_human_review") throw new Error("İtirazdan önce ilgili ayrı insan kararı kaydedilmelidir.");
    const appeal = submitIndependentAppeal(state.directivePilot, {
      applicationId: "APP-042",
      decisionKind: kind,
      actorRole: state.roleId,
      reason: `${recognitionDecisionLabel(kind)} kararında kanıtların bağımsız üst incelemede yeniden değerlendirilmesi talep edilir.`,
      initialDecisionBody: decision.decisionBody,
      appealBody: "EGITIM-OGRETIM-KOM"
    });
    addDirectiveAudit(appeal.id, "Bağımsız itiraz gönderildi", decision.status, "submitted", `${appeal.initialDecisionBody} → ${appeal.appealBody}; karar mercileri ayrıdır`);
    saveState(); render(); toast("İtiraz ilk karardan farklı sentetik inceleme merciine gönderildi.");
  } catch (error) { deny(error.message); }
}

function checkDirectiveCommission() {
  try {
    const meeting = state.directivePilot.commission;
    const result = validateCommissionMeeting({
      actorRole: state.roleId,
      members: meeting.members,
      quorumRequired: meeting.quorumRequired,
      votes: meeting.members.filter((member) => member.present && !member.recused).map((member) => ({ memberId: member.id, vote: "approve" }))
    });
    meeting.lastValidation = { ...result, validatedAt: new Date().toISOString(), bodyId: meeting.bodyId, mandate: meeting.mandate };
    addDirectiveAudit("MEET-SENTETIK-2026-01", "Komisyon nisap ve çekilme kontrolü", "draft", result.valid ? "validated" : "blocked", `${result.eligibleCount} uygun üye; çıkar çatışması oy ihlali=${result.conflictViolations.length}; insan kararı üretilmedi`);
    saveState(); render(); toast(result.valid ? "Nisap, görev süresi, çekilme ve oy tekilliği kontrol edildi." : "Toplantı kontrolü bloklandı.", result.valid ? "success" : "error");
  } catch (error) { deny(error.message); }
}

function requestDirectiveSeat() {
  try {
    const offering = state.directivePilot.offerings[0];
    const nextSyntheticIndex = offering.requests.length + 1;
    const request = requestOfferingSeat(state.directivePilot, {
      offeringId: offering.id,
      learnerId: `SENTETIK-LEARNER-${String(nextSyntheticIndex).padStart(3, "0")}`,
      actorRole: state.roleId,
      requestedAt: new Date(Date.now() + offering.requests.length * 1000).toISOString(),
      idempotencyKey: `UI-SENTETIK-${String(nextSyntheticIndex).padStart(3, "0")}`
    });
    addDirectiveAudit(request.id, "Kontenjan talebi işlendi", "pending", request.status, `FIFO; idempotency=${request.idempotencyKey}; gerçek öğrenci kaydı yok`);
    saveState(); render(); toast(request.status === "enrolled" ? "Son pilot kontenjan ayrıldı." : `Bekleme listesi ${request.waitlistPosition}. sıra oluşturuldu.`);
  } catch (error) { deny(error.message); }
}

function validateDirectiveEk1() {
  if (state.roleId !== "it") { deny("EK-1 teknik kamu görünümü doğrulamasını yalnız Bilgi İşlem demo rolü çalıştırabilir."); return; }
  try {
    const record = {
      document_id: "MYBEL-2026-0007",
      learner_identification: "Maskeli pilot katılımcı",
      title: "Proje Temelli Öğrenme Tasarımı",
      issuer_country_region: "Türkiye",
      awarding_body: "Kütahya Dumlupınar Üniversitesi • Kontrollü Pilot",
      issue_date: "2026-08-04",
      learning_outcomes: ["Proje problemi tasarlar", "Ölçüt temelli rubrik hazırlar"],
      notional_workload: "2 AKTS • 50 saat",
      level: "Önerilen pedagojik referans düzeyi 6",
      participation_form: "Yüz yüze • SİMÜLASYON",
      assessment_type: "Proje + analitik rubrik",
      quality_assurance: "İnsan değerlendirmesi + sürümlü audit",
      status: "pilot_valid",
      revocation_status: "not_revoked"
    };
    const publicView = createPublicCredentialView(record);
    const result = validateEk1Credential(publicView, { publicView: true });
    addDirectiveAudit("MYBEL-2026-0007", "EK-1 kamu görünümü sızıntı kontrolü", "draft", result.valid ? "validated" : "blocked", `11 alan; personalNumberLeak=${result.personalNumberLeak}; gerçek kimlik yok`);
    saveState();
    openModal(modalTemplate("EK-1 kamu doğrulama görünümü", `${notice("success", "11 alan tam — kimlik sızıntısı yok", "Kamu görünümünde TCKN/YKN, iç kullanıcı kimliği, banka veya biyometrik veri bulunmaz.")}<pre class="integration-payload">${escapeHtml(JSON.stringify(publicView, null, 2))}</pre>`, `<button class="button" data-action="close-modal">Kapat</button>`));
  } catch (error) { deny(error.message); }
}

function createDirectiveFinanceDryRun() {
  try {
    const record = createFinancePersonnelDryRun(state.directivePilot, { actorRole: state.roleId, kind: "teaching_entitlement", amount: 9600 });
    addDirectiveAudit(record.id, "Mali/Personel hak ediş dry-run oluşturuldu", "none", record.status, "Gerçek ödeme/bordro/fatura yok; çift kurumsal onay gerekir");
    saveState(); render(); toast("Mali ve Personel onayı bekleyen hak ediş dry-run kaydı oluşturuldu.");
  } catch (error) { deny(error.message); }
}

function saveFinanceParameters(form) {
  if (!form.reportValidity()) return;
  if (!FINANCE_OPERATOR_ROLES.has(state.roleId)) { deny("Bu rol mali pilot parametrelerini değiştiremez."); return; }
  const data = new FormData(form);
  const parameters = { withholding:Number(data.get("withholding")), vat:Number(data.get("vat")), stamp:Number(data.get("stamp")) };
  if (Object.values(parameters).some((value) => !Number.isFinite(value) || value < 0 || value > 100)) { deny("Mali pilot parametreleri 0 ile 100 arasında sayısal değerler olmalıdır."); return; }
  state.finance.parameters = parameters;
  state.audit.unshift({ id:`AUD-${Date.now()}`, entityId:"FIN-PARAM", at:new Date().toISOString(), actor:currentRole().name, actorRole:state.roleId, action:"Mali pilot parametre taslağı güncellendi", from:"draft", to:"draft", reason:"Mali birim doğrulaması gerekir" });
  saveState(); render(); toast("Yapılandırılabilir mali pilot parametreleri kaydedildi.");
}

async function refreshRemote(fromModal = false) {
  const refreshGuard = createAsyncRefreshGuard();
  const snapshot = await loadPilotSnapshot();
  // Do not let a late network response overwrite a role, persisted state or
  // in-progress form mutation made after the request started.
  if (!canCommitAsyncRefresh(refreshGuard)) {
    if (fromModal) closeModal();
    return;
  }
  const referenceData = snapshot.referenceData;
  const institutionalData = snapshot.institutionalData;
  const publicSourceRemoteVerified = snapshot.publicSourceData?.remoteVerified === true;
  const protectedRemoteVerified = snapshot.protectedRemoteVerified === true;
  state.remoteSnapshot = snapshot.ok ? {
    programs: snapshot.programs.length,
    applications: snapshot.applications.length,
    credentials: snapshot.credentials.length,
    integrations: snapshot.integrations.length,
    qualificationLevels: referenceData?.qualificationLevels?.length || 0,
    officialQualifications: referenceData?.officialQualificationReferences?.length || 0,
    matrixTemplates: referenceData?.matrixTemplates?.length || 0,
    matrixDrafts: referenceData?.matrixDrafts?.length || 0,
    paymentRequests: referenceData?.paymentRequests?.length || 0,
    roleWorkflowRows: referenceData?.roleWorkflowRows?.length || 0,
    unavailableReferenceViews: referenceData?.unavailableViews?.length || 0,
    institutionalSystems: institutionalData?.systems?.length || 0,
    institutionalMappings: institutionalData?.mappings?.length || 0,
    institutionalScenarios: institutionalData?.scenarios?.length || 0,
    institutionalAuditEvents: institutionalData?.auditEvents?.length || 0,
    unavailableInstitutionalViews: institutionalData?.unavailableViews?.length || 0,
    publicOfficialSources: snapshot.publicSourceData?.sources?.length || 0,
    publicOfficialSourceSupports: snapshot.publicSourceData?.supports?.length || 0,
    publicSourceRemoteVerified,
    protectedRemoteVerified,
    coreRemoteVerified: snapshot.coreRemoteVerified === true,
    referenceSource: referenceData?.source || "local_reference_fallback",
    checkedAt: new Date().toISOString()
  } : null;
  const referenceIsFullyRemote = referenceData?.source === "supabase_read_only_views";
  state.dataMode = publicSourceRemoteVerified && !protectedRemoteVerified
    ? `Yerel çalışma alanı • Supabase kamu kaynak kataloğu doğrulandı (${snapshot.publicSourceData.sources.length} kaynak); korumalı DTO'larda anonim ağ isteği yok, yerel sentetik fallback etkin`
    : snapshot.ok
      ? `Yerel çalışma alanı • Supabase ${referenceIsFullyRemote ? "claim-kapsamlı salt-okunur katalog doğrulandı" : "korumalı DTO fallback etkin"} (${snapshot.programs.length} program, ${referenceData?.qualificationLevels?.length || 0} seviye)`
      : snapshot.mode;
  saveState();
  if (fromModal) closeModal();
  render();
  const refreshMessage = publicSourceRemoteVerified && !protectedRemoteVerified
    ? "Resmî kamu kaynak kataloğu doğrulandı; korumalı pilot DTO'larda güvenli yerel fallback kullanılıyor."
    : snapshot.ok
      ? "Supabase claim-kapsamlı salt-okunur pilot görünümü doğrulandı."
      : "Supabase kamu kaynağı doğrulanamadı; güvenli yerel pilot verisi kullanılmaya devam ediyor.";
  toast(refreshMessage, snapshot.ok ? "success" : "error");
}

// Persist the canonical v15 seed immediately when an older, snapshot-less,
// malformed or semantically inconsistent local state was rejected by loadState().
saveState();
render();
refreshRemote();
