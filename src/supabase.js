import {
  higherEducationCycleCrosswalk,
  qualificationReferenceSnapshot,
  tyycQualificationTypeDescriptors
} from "./reference-data.js";
import { initialState } from "./data.js";
import { dpuIntegrationReferenceSnapshot } from "./institutional-integration-reference.js";
import {
  QUALIFICATION_ADVISORY_NOTICE,
  QUALIFICATION_FRAMEWORK_IDS,
  QUALIFICATION_SUGGESTION_ENGINE_VERSION,
  applyManualQualificationOverride,
  buildQualificationSelectionOptions,
  recordHumanBoardQualificationDecision,
  suggestOutcomeQualificationAlignment,
  suggestProgramQualificationAlignment
} from "./qualification-suggestion.js";
import { directiveRoleScopeRows } from "./directive-pilot.js";

// Supabase publishable keys identify a project but are not secrets. Access remains
// constrained by explicit grants and RLS. No service-role/secret key is present.
const SUPABASE_URL = "https://xpjkrwzgimdxsasqszfi.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_v_AI0cizKIbiJqeqWYHDSQ__g2fSY4p";

export function createSupabaseReadContext(options = {}) {
  const accessToken = typeof options?.accessToken === "string" && options.accessToken.trim()
    ? options.accessToken.trim()
    : null;
  const fetchImpl = typeof options?.fetchImpl === "function" ? options.fetchImpl : globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new Error("Supabase read context requires fetch");
  return Object.freeze({
    accessToken,
    fetchImpl,
    authenticated: Boolean(accessToken),
    mode: accessToken ? "authenticated_claim_scoped" : "anonymous_public_reference_only"
  });
}

function requestHeaders(context) {
  // A publishable key identifies the public client; it is not a user session.
  // Only an explicit access token is forwarded as Authorization so anonymous
  // Preview traffic remains the Postgres `anon` role and never impersonates an
  // authenticated principal.
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    ...(context.authenticated ? { Authorization: `Bearer ${context.accessToken}` } : {}),
    Accept: "application/json"
  };
}

async function readTable(table, query = "select=*", options = {}) {
  const context = createSupabaseReadContext(options);
  const controller = new AbortController();
  // Public Preview may cold-start the PostgREST path. Keep the read bounded,
  // but allow enough time for all catalog views to return before falling back.
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await context.fetchImpl(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      headers: requestHeaders(context),
      signal: controller.signal,
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`Supabase ${table}: HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

const publicOfficialSourceViewQueries = Object.freeze({
  sources: ["pilot_directive_public_source_catalog", "select=*&order=source_id.asc"],
  supports: ["pilot_directive_public_source_support_catalog", "select=*&order=source_id.asc,id.asc"]
});

const referenceViewQueries = Object.freeze({
  qualificationLevels: ["qualification_level_catalog", "select=*&order=framework_code.asc,level.asc"],
  bilingualEqfLevels: ["qualification_level_bilingual_catalog", "select=*&order=level.asc"],
  datasetRegistry: ["qualification_dataset_catalog", "select=*&order=id.asc"],
  officialQualificationReferences: ["official_qualification_reference_catalog", "select=*&order=tyc_level.asc,qualification_code.asc"],
  matrixTemplates: ["pilot_matrix_template_catalog", "select=*&order=framework_code.asc,level.asc"],
  matrixDraftRows: ["pilot_matrix_draft_catalog", "select=*&order=draft_id.asc,row_order.asc"],
  financeRoutes: ["pilot_finance_handoff_catalog", "select=*&order=route_order.asc"],
  roleWorkflowRows: ["pilot_role_workflow_catalog", "select=*&order=role_id.asc,step_order.asc"],
  paymentRequests: ["pilot_payment_request_catalog", "select=*&order=updated_at.desc"],
  paymentEvents: ["pilot_payment_event_catalog", "select=*&order=payment_request_id.asc,event_order.asc"],
  higherEducationCycles: ["qualification_higher_education_cycle_catalog", "select=*&order=tyc_level.asc"],
  suggestionEngineProfiles: ["pilot_qualification_suggestion_profile_catalog", "select=*&order=engine_version.desc"],
  tyycTypeDescriptors: ["qualification_tyyc_type_descriptor_catalog", "select=*&order=level.asc,qualification_type.asc"],
  programSuggestionSummaries: ["pilot_qualification_program_summary_v2_catalog", "select=*&order=program_id.asc"],
  learningOutcomeSuggestions: ["pilot_learning_outcome_suggestion_v2_catalog", "select=*&order=program_id.asc,outcome_order.asc,framework_id.asc"],
  manualOverrideExamples: ["pilot_qualification_manual_override_catalog", "select=*&order=outcome_id.asc,framework_id.asc"],
  boardDecisionExamples: ["pilot_qualification_board_decision_v2_catalog", "select=*&order=program_id.asc,id.asc"],
  programSpine: ["pilot_qualification_program_spine_catalog", "select=*&order=smart_program_id.asc"],
  constructiveAlignment: ["pilot_constructive_alignment_catalog", "select=*&order=smart_program_id.asc,outcome_order.asc"]
});

const institutionalViewQueries = Object.freeze({
  systems: ["institutional_system_catalog", "select=*&order=integration_tier.asc,system_code.asc"],
  mappings: ["pilot_integration_mapping_catalog", "select=*&order=priority.asc,system_code.asc,flow_key.asc"],
  scenarios: ["pilot_integration_scenario_catalog", "select=*&order=scenario_order.asc"],
  auditEvents: ["pilot_integration_audit_catalog", "select=*&order=occurred_at.asc,event_order.asc"]
});

// Directive alignment contract views are intentionally read-only and synthetic.
// Migrations 20260820030000 and 20260820033000 define these views with
// security_invoker=true; incomplete/unauthorized snapshots fail closed.
const directiveViewQueries = Object.freeze({
  policyVersions: ["pilot_directive_policy_catalog", "select=*&order=version_label.desc"],
  rules: ["pilot_directive_rule_catalog", "select=*&order=rule_key.asc,version_no.desc"],
  governance: ["pilot_directive_role_scope_catalog", "select=*&order=role_key.asc,id.asc"],
  programs: ["pilot_directive_program_compliance_catalog", "select=*&order=myd_code.asc,version_no.desc"],
  recognitionDecisions: ["pilot_directive_recognition_catalog", "select=*&order=case_reference.asc,decision_type.asc"],
  commission: ["pilot_directive_commission_catalog", "select=*&order=meeting_reference.asc,resolution_key.asc"],
  publicCredentials: ["pilot_directive_credential_public_catalog", "select=*&order=issue_date.desc"],
  awardStates: ["pilot_directive_award_state_catalog", "select=*&order=program_id.asc,id.asc"],
  qualityFinance: ["pilot_directive_quality_finance_catalog", "select=*&order=program_id.asc,program_version_no.desc"],
  readiness: ["pilot_directive_readiness_catalog", "select=*"]
});

function camelizeRow(row) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [
    key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
    value
  ]));
}

export function validatePublicOfficialSourceSnapshot(snapshot) {
  const errors = [];
  const sources = Array.isArray(snapshot?.sources) ? snapshot.sources : [];
  const supports = Array.isArray(snapshot?.supports) ? snapshot.supports : [];
  const expectedSourceIds = new Set(Array.from({ length: 27 }, (_, index) => `S${String(index + 1).padStart(2, "0")}`));
  const actualSourceIds = new Set(sources.map((row) => row.sourceId));
  if (sources.length !== 27 || actualSourceIds.size !== 27 || [...expectedSourceIds].some((id) => !actualSourceIds.has(id))) {
    errors.push("public sources: exact S01-S27 catalog required");
  }
  if (supports.length !== 33 || new Set(supports.map((row) => row.id)).size !== 33) {
    errors.push("public supports: exact 33-row catalog required");
  }
  if (supports.some((row) => !expectedSourceIds.has(row.sourceId))) {
    errors.push("public supports: unknown source relationship");
  }
  const serialized = JSON.stringify({ sources, supports });
  if (/(?:tckn|ykn|holder_internal|synthetic_actor|decision_scope|app_metadata)/i.test(serialized) || /(^|[^0-9])[0-9]{11}([^0-9]|$)/.test(serialized)) {
    errors.push("public sources: protected or identity-bearing field detected");
  }
  if (sources.some((row) => row.officialPrimarySource !== true || row.institutionalValidationRequired !== true || !/^https:\/\//.test(row.sourceUrl || ""))) {
    errors.push("public sources: official/source-validation contract mismatch");
  }
  if (supports.some((row) => row.institutionalValidationRequired !== true)) {
    errors.push("public supports: institutional-validation contract mismatch");
  }
  return errors;
}

export async function loadPublicOfficialSourceSnapshot(options = {}) {
  const context = createSupabaseReadContext(options);
  const entries = Object.entries(publicOfficialSourceViewQueries);
  const results = await Promise.allSettled(entries.map(([, [view, query]]) => readTable(view, query, context)));
  const remote = {};
  const unavailableViews = [];
  results.forEach((result, index) => {
    const [key, [view]] = entries[index];
    if (result.status === "fulfilled" && Array.isArray(result.value)) remote[key] = result.value.map(camelizeRow);
    else unavailableViews.push(view);
  });
  const validationErrors = unavailableViews.length === 0
    ? validatePublicOfficialSourceSnapshot(remote)
    : ["Both anonymous official-source views must be available"];
  const remoteVerified = unavailableViews.length === 0 && validationErrors.length === 0;
  return {
    ok: remoteVerified,
    source: remoteVerified ? "supabase_anon_allowlisted_official_source_catalogs" : "public_official_source_catalog_unavailable",
    accessMode: context.mode,
    remoteVerified,
    protectedDataIncluded: false,
    realIdentityDataIncluded: false,
    unavailableViews,
    validationErrors,
    sources: remoteVerified ? remote.sources : [],
    supports: remoteVerified ? remote.supports : []
  };
}

function localCorePilotFallback() {
  return {
    programs: structuredClone(initialState.programs),
    applications: structuredClone(initialState.applications),
    credentials: structuredClone(initialState.credentials),
    integrations: structuredClone(initialState.integrations)
  };
}

function localQualificationReferenceCatalog() {
  const suggestionFallback = normalizeQualificationSuggestionCatalog({}, getLocalQualificationSuggestionCatalog());
  return {
    version: qualificationReferenceSnapshot.version,
    qualificationLevels: structuredClone(qualificationReferenceSnapshot.descriptors),
    tyycTypeDescriptors: structuredClone(qualificationReferenceSnapshot.tyycTypeDescriptors),
    bilingualEqfLevels: structuredClone(qualificationReferenceSnapshot.descriptorTranslations),
    datasetRegistry: structuredClone(qualificationReferenceSnapshot.datasetRegistry),
    officialQualificationReferences: structuredClone(qualificationReferenceSnapshot.officialQualificationReferences),
    matrixTemplates: structuredClone(qualificationReferenceSnapshot.matrixTemplates),
    matrixDrafts: structuredClone(qualificationReferenceSnapshot.matrixDrafts),
    financeRoutes: structuredClone(qualificationReferenceSnapshot.financeRoutes),
    roleWorkflowRows: structuredClone(qualificationReferenceSnapshot.roleSteps),
    paymentRequests: structuredClone(qualificationReferenceSnapshot.paymentRequests),
    paymentEvents: structuredClone(qualificationReferenceSnapshot.paymentEvents),
    ...suggestionFallback
  };
}

export function getLocalDirectivePilotCatalog() {
  // The fail-closed local catalog and the UI role-scope projection share the
  // exact normalized DTO rows of pilot_directive_role_scope_catalog.
  const roleScopeCatalog = directiveRoleScopeRows.map((row) => ({
    ...row,
    decisionScope: [...row.decisionScope]
  }));
  return {
    policyVersions: [{
      id: "DIR-DPU-MY-2026-DRAFT",
      documentType: "yonerge",
      versionLabel: "2026.08.20-review-1",
      title: "DPÜ Mikro Yeterlilik Programları Yönergesi — Kurumsal Değerlendirme Taslağı",
      status: "draft_for_institutional_review",
      legalCounselValidationStatus: "pending",
      institutionalValidationRequired: true,
      productionAllowed: false,
      sourceKey: "dpu_micro_directive_draft_v3",
      sourceUrl: "https://www.dpu.edu.tr/",
      verificationStatus: "source_not_verified"
    }],
    rules: [
      ["total_program_ects_ten_percent", "manual_block_pending_validation"],
      ["remote_recognition_fifty_percent", "warning_only"],
      ["term_five_ects", "manual_block_pending_validation"],
      ["activity_half_of_allowed_load", "warning_only"],
      ["eligible_semesters_three_to_eight", "warning_only"],
      ["review_target_thirty_days", "warning_only"]
    ].map(([ruleKey, enforcementMode], index) => ({
      id: `RULE-LOCAL-${index + 1}`,
      directiveVersionId: "DIR-DPU-MY-2026-DRAFT",
      ruleKey,
      versionNo: 1,
      sourceClause: "Taslak hüküm — payda, istisna veya yorum kurumsal doğrulama bekliyor",
      effectiveFrom: null,
      effectiveTo: null,
      programType: "all",
      calculationBasis: "Kurumsal doğrulama bekleyen sürümlü pilot hesap",
      numerator: null,
      denominator: null,
      roundingRule: "Kurumsal karar bekliyor",
      exceptionRule: "İnsan incelemesi gerekir",
      interpretationNote: "Kesin mevzuat sınırı değildir; otomatik nihai karar üretmez.",
      enforcementMode,
      institutionalValidationRequired: true
    })),
    governance: roleScopeCatalog,
    programs: [{
      programId: "PROGRAM-DATA-LITERACY",
      mydCode: "MYD-2026-DPU-001",
      title: "Veri Okuryazarlığı Mikro Yeterliliği — SENTETİK",
      programType: "formal_elective",
      versionNo: 1,
      versionLabel: "1.0-SENTETIK",
      ects: 3,
      totalLearnerWorkloadHours: 82.5,
      workloadComponentTotal: 82.5,
      ectsBandValid: true,
      componentSumValid: true,
      workloadComponentCount: 8,
      deliveryMode: "hybrid",
      pedagogicalReferenceLevel: 6,
      levelClaimStatus: "advisory_only",
      status: "simulation_ready",
      institutionalValidationRequired: true
    }],
    recognitionDecisions: [
      ["credential_verification_or_recognition", "additional_evidence_required", null, null],
      ["ects_credit_recognition", "deferred", null, null],
      ["course_or_requirement_substitution", "rejected", null, "SEC-2XX"]
    ].map(([decisionType, outcome, recognizedEcts, substitutedCourseCode], index) => ({
      caseId: "REC-CASE-001",
      caseReference: "SENTETIK-TANIMA-2026-001",
      providerName: "SENTETİK dış sağlayıcı",
      awardingBodyName: "SENTETİK awarding body",
      requestedEcts: 2.5,
      requestedCourseCode: "SEC-2XX",
      onlineDelivery: true,
      decisionId: `REC-DEC-LOCAL-${index + 1}`,
      decisionType,
      decisionRound: 1,
      outcome,
      recognizedEcts,
      substitutedCourseCode,
      decidingBody: "SENTETİK Birim Komisyonu",
      rationale: "Üç ayrı insan kararı modelinde kaydedilmiş sentetik sonuç.",
      appealPath: "Bağımsız üst inceleme — SENTETİK",
      appealRecorded: decisionType === "course_or_requirement_substitution",
      institutionalValidationRequired: true,
      institutionalValidationConfirmed: false
    })),
    commission: [{
      meetingId: "MEETING-001",
      meetingReference: "SENTETIK-TOPLANTI-2026-08-20",
      quorumRequired: 2,
      presentVoters: 2,
      quorumMet: true,
      resolutionId: "RESOLUTION-001",
      resolutionKey: "RES-PROGRAM-DATA-001",
      subjectType: "program_version",
      subjectReference: "PROGRAM-DATA-LITERACY:1",
      decisionStage: "first_instance",
      outcome: "deferred",
      rationale: "Kurumsal kural doğrulaması bulunmadığından ertelenen sentetik insan komisyon kaydı.",
      independentReviewConfirmed: false,
      recordedVoteCount: 2,
      eligibleVoterCount: 2,
      quorumIntegrityValid: true,
      conflictCount: 1,
      recusalCount: 1,
      institutionalValidationRequired: true,
      institutionalValidationConfirmed: false
    }],
    publicCredentials: [{
      publicDocumentId: "MYD-VERIFY-A1B2C3D4E5F6",
      holderDisplayMasked: "Ö***** Ö*****",
      credentialTitle: "Veri Okuryazarlığı Mikro Yeterliliği — SENTETİK",
      issuingCountryOrRegion: "Türkiye",
      awardingBody: "Kütahya Dumlupınar Üniversitesi — SENTETİK PİLOT",
      issueDate: "2026-08-20",
      learningOutcomes: ["Veri problemini kanıta dayalı analiz eder"],
      learnerWorkloadHours: 82.5,
      learnerWorkloadUnit: "hours",
      pedagogicalReferenceLevel: 6,
      levelStatus: "advisory_not_official_placement",
      participationForm: "Hibrit — SENTETİK",
      assessmentType: "Proje, rubrik ve sözlü savunma — SENTETİK",
      qualityAssuranceBasis: "İnsan incelemeli PUKÖ pilot kaydı",
      status: "issued_simulation",
      expiresOn: null,
      institutionalValidationRequired: true,
      officialTycPlacementClaim: false,
      realCredential: false
    }],
    awardStates: [{
      id: "AWARD-STATE-001",
      syntheticHolderRef: "SENTETIK-OGRENEN-001",
      programId: "PROGRAM-DATA-LITERACY",
      programVersionNo: 1,
      completionStatus: "completed_simulation",
      badgeStatus: "issued_simulation",
      credentialStatus: "issued_simulation",
      ectsRecognitionStatus: "not_recognized",
      courseSubstitutionStatus: "not_substituted",
      stateRationale: { badgeAndCredential: "achievement_recorded", ects: "separate_human_decision_not_granted" },
      institutionalValidationRequired: true
    }],
    qualityFinance: [{
      qualityReviewId: "QUALITY-REVIEW-001",
      programId: "PROGRAM-DATA-LITERACY",
      programVersionNo: 1,
      reviewType: "initial_quality_gate",
      pdcaStage: "check",
      reviewOutcome: "improvement_required",
      nextReviewOn: "2027-02-20",
      financeCaseId: "FINANCE-CASE-001",
      workloadApprovalStatus: "pending_personnel_validation",
      budgetApprovalStatus: "pending_financial_validation",
      paymentEligibilityStatus: "not_evaluated",
      estimatedAmount: 0,
      dryRunOnly: true,
      paymentExecuted: false,
      invoiceCreated: false,
      institutionalValidationRequired: true
    }],
    readiness: [{
      contractVersion: "directive-alignment-2026-08-20-1",
      versionedRuleCount: 6,
      roleMembershipCount: 9,
      distinctRoleCount: 9,
      workloadComponentCount: 8,
      recognitionDecisionTypeCount: 3,
      institutionalDecisionCount: 4,
      productionNoGo: true,
      integrationDryRunOnly: true,
      financeDryRunOnly: true,
      syntheticDataOnly: true,
      senateApprovalAbsent: true,
      pilotNotice: "KURUMSAL DEĞERLENDİRME TASLAĞI — SENATO ONAYI YOKTUR — PRODUCTION NO-GO"
    }]
  };
}

export function validateDirectivePilotCatalog(catalog) {
  const errors = [];
  const requiredArrays = [
    "policyVersions", "rules", "governance", "programs", "recognitionDecisions",
    "commission", "publicCredentials", "awardStates", "qualityFinance", "readiness"
  ];
  requiredArrays.forEach((key) => {
    if (!Array.isArray(catalog[key]) || catalog[key].length === 0) errors.push(`${key}: missing`);
  });
  const readiness = catalog.readiness?.[0];
  if (readiness) {
    if (readiness.distinctRoleCount < 9) errors.push("readiness: nine roles are not represented");
    if (readiness.workloadComponentCount !== 8) errors.push("readiness: workload component contract mismatch");
    if (readiness.recognitionDecisionTypeCount !== 3) errors.push("readiness: recognition decisions are not separated");
    if (!readiness.productionNoGo || !readiness.integrationDryRunOnly || !readiness.financeDryRunOnly) errors.push("readiness: NO-GO/dry-run boundary invalid");
    if (!readiness.syntheticDataOnly || !readiness.senateApprovalAbsent) errors.push("readiness: draft/synthetic flags invalid");
  }
  const expectedRoles = new Set(["learner", "instructor", "externalInstructor", "coordinator", "commission", "studentAffairs", "it", "finance", "admin"]);
  const actualRoles = new Set((catalog.governance || []).map((row) => row.roleKey));
  if ((catalog.governance || []).length !== 9 || expectedRoles.size !== actualRoles.size || [...expectedRoles].some((role) => !actualRoles.has(role))) errors.push("governance: canonical nine-role set mismatch");
  if ((catalog.governance || []).some((row) => !row.unitId || !row.unitType || !row.bodyType || !row.syntheticActorRef || !row.membershipRole || !row.mandateFrom || !Array.isArray(row.decisionScope) || row.decisionScope.length === 0)) errors.push("governance: unit/body/mandate/decision-scope DTO incomplete");
  const adminScope = (catalog.governance || []).find((row) => row.roleKey === "admin");
  if (adminScope && (!adminScope.systemAdminRestriction || adminScope.mayMakeAcademicDecision || adminScope.mayMakeFinancialDecision || !adminScope.decisionScope.includes("configuration_only"))) errors.push("governance: system administrator decision boundary invalid");
  const expectedDecisionTypes = new Set(["credential_verification_or_recognition", "ects_credit_recognition", "course_or_requirement_substitution"]);
  const actualDecisionTypes = new Set((catalog.recognitionDecisions || []).map((row) => row.decisionType));
  if ([...expectedDecisionTypes].some((type) => !actualDecisionTypes.has(type))) errors.push("recognition: three-decision contract mismatch");
  if ((catalog.recognitionDecisions || []).some((row) =>
    ["approved", "partially_approved"].includes(row.outcome) && row.institutionalValidationConfirmed !== true
  )) errors.push("recognition: unvalidated positive outcome detected");
  if ((catalog.programs || []).some((row) => !row.ectsBandValid || !row.componentSumValid || row.workloadComponentCount !== 8)) errors.push("programs: ECTS/workload contract invalid");
  if ((catalog.commission || []).some((row) => !row.quorumMet || !row.quorumIntegrityValid || row.recordedVoteCount > row.eligibleVoterCount)) errors.push("commission: quorum/vote integrity invalid");
  if ((catalog.commission || []).some((row) => row.outcome === "approved" && row.institutionalValidationConfirmed !== true)) errors.push("commission: unvalidated approval detected");
  if ((catalog.publicCredentials || []).some((row) =>
    row.realCredential !== false
    || row.officialTycPlacementClaim !== false
    || "holderInternalRef" in row
    || "tckn" in row
    || "ykn" in row
    || /(^|[^0-9])[0-9]{11}([^0-9]|$)/.test(JSON.stringify(row))
  )) errors.push("credentials: public minimization contract invalid");
  if ((catalog.policyVersions || []).some((row) => !row.institutionalValidationRequired || row.productionAllowed !== false || !String(row.status).includes("draft"))) errors.push("policy: draft validation boundary invalid");
  if ((catalog.rules || []).some((row) => !row.institutionalValidationRequired || row.enforcementMode === "validated_block")) errors.push("rules: unvalidated block detected");
  if ((catalog.qualityFinance || []).some((row) => !row.dryRunOnly || row.paymentExecuted || row.invoiceCreated || Number(row.estimatedAmount) !== 0)) errors.push("finance: real-effect boundary invalid");
  return errors;
}

export function normalizeDirectivePilotCatalog(remote = {}, fallback = getLocalDirectivePilotCatalog()) {
  const requiredKeys = Object.keys(directiveViewQueries);
  const completeRemoteSnapshot = requiredKeys.every((key) => Array.isArray(remote[key]) && remote[key].length > 0);
  if (!completeRemoteSnapshot) {
    return {
      ...fallback,
      validationErrors: ["Directive remote snapshot incomplete; partial rows discarded and complete local fallback selected"],
      remoteAccepted: false,
      remoteVerified: false,
      fallbackUsed: true,
      partialRemoteDiscarded: requiredKeys.some((key) => Array.isArray(remote[key]) && remote[key].length > 0)
    };
  }
  const normalized = Object.fromEntries(requiredKeys.map((key) => [key, remote[key].map(camelizeRow)]));
  const validationErrors = validateDirectivePilotCatalog(normalized);
  return validationErrors.length === 0
    ? { ...normalized, validationErrors, remoteAccepted: true, remoteVerified: true, fallbackUsed: false, partialRemoteDiscarded: false }
    : { ...fallback, validationErrors, remoteAccepted: false, remoteVerified: false, fallbackUsed: true, partialRemoteDiscarded: false };
}

function groupMatrixDraftRows(rows) {
  const drafts = new Map();
  rows.map(camelizeRow).forEach((row) => {
    if (!drafts.has(row.draftId)) {
      drafts.set(row.draftId, {
        id: row.draftId,
        frameworkId: String(row.frameworkCode || "").toLowerCase().startsWith("ty") ? "tyc" : "eqf",
        level: Number(row.targetLevel),
        programTitle: row.title,
        ownerRole: row.ownerRole,
        ownerName: row.ownerLabel,
        status: row.status,
        updatedAt: row.updatedAt,
        rows: [],
        sourceUrl: row.sourceUrl,
        institutionalValidationRequired: row.institutionalValidationRequired
      });
    }
    drafts.get(row.draftId).rows.push({
      dimension: row.frameworkDimension,
      learningOutcome: row.learningOutcome,
      learningLevel: row.learningLevel,
      courseContent: row.courseContent,
      assessmentMethod: row.assessmentMethod,
      evidence: row.evidence,
      alignmentRationale: row.alignmentRationale
    });
  });
  return [...drafts.values()];
}

function mapPaymentRequest(row) {
  const item = camelizeRow(row);
  return {
    id: item.id,
    applicationId: item.applicationId,
    programId: item.programId,
    programCode: item.programCode,
    program: item.programTitle,
    learner: item.learnerLabel,
    amount: Number(item.amount),
    currency: item.currency,
    channel: item.channel,
    status: item.status,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    reviewReason: item.reviewNote || undefined,
    realPayment: false,
    enrollmentCreated: Boolean(item.enrollmentCreated)
  };
}

export function getLocalQualificationSuggestionCatalog() {
  const outcomes = [
    { id: "LO-1", text: "Karmaşık ve öngörülemeyen bir veri sorununu eleştirel olarak analiz eder ve yenilikçi çözüm geliştirir." },
    { id: "LO-2", text: "Ekip performansını değerlendirir ve stratejik dönüşümü yönetir." }
  ];
  const program = suggestProgramQualificationAlignment({ programId: "program-smart-alignment-demo", outcomes });
  const overridden = applyManualQualificationOverride(program, {
    id: "OVR-DEMO-LO-1-TYC-1",
    outcomeId: "LO-1",
    frameworkId: "tyc",
    level: 6,
    dimension: "knowledge",
    reason: "Aday eğitici, çıktının öncelikle eleştirel bilgi kanıtı ürettiğini gerekçelendirmiştir.",
    actorRole: "instructor",
    recordedAt: "2026-08-20T02:00:00.000Z"
  });
  const decided = recordHumanBoardQualificationDecision(overridden, {
    actorRole: "commission",
    decision: "approved",
    decidedBy: "Sentetik Mikro Yeterlilik Komisyonu",
    rationale: "Kurul; öğrenme çıktıları, ölçme kanıtları ve açıklanabilir önerileri insan incelemesiyle değerlendirmiştir.",
    tycLevel: 6,
    eqfLevel: 6,
    tyycLevel: 6,
    decidedAt: "2026-08-20T02:10:00.000Z",
    meetingReference: "SENTETIK-TOPLANTI-2026-08"
  });
  return {
    higherEducationCycles: higherEducationCycleCrosswalk,
    suggestionEngineProfiles: [{
      id: "qualification-engine-2026-08-20-1",
      engineVersion: QUALIFICATION_SUGGESTION_ENGINE_VERSION,
      engineMode: "deterministic_explainable_pilot",
      methodKey: "deterministic_weighted_rules_and_descriptor_overlap",
      aggregationMethod: "score_weighted_median",
      advisoryNotice: QUALIFICATION_ADVISORY_NOTICE,
      editableRoles: ["instructor", "externalInstructor"],
      reviewerRoles: ["coordinator", "commission"],
      deterministic: true,
      autoDecisionEnabled: false,
      finalDecisionAuthority: "yetkili_kurul",
      institutionalValidationRequired: true
    }],
    tyycTypeDescriptors: tyycQualificationTypeDescriptors,
    programSuggestionSummaries: [{
      programId: program.programId,
      directiveProgramId: "PROGRAM-DATA-LITERACY",
      directiveProgramVersionNo: 1,
      ...program.program
    }],
    learningOutcomeSuggestions: program.outcomes.flatMap((outcome, outcomeIndex) => QUALIFICATION_FRAMEWORK_IDS.map((frameworkId) => ({
      id: `SUG-DEMO-${outcome.outcomeId}-${frameworkId.toUpperCase()}`,
      programId: program.programId,
      directiveProgramId: "PROGRAM-DATA-LITERACY",
      directiveProgramVersionNo: 1,
      outcomeOrder: outcomeIndex + 1,
      outcomeId: outcome.outcomeId,
      outcomeText: outcome.outcomeText,
      inputQuality: outcome.inputQuality,
      frameworkId,
      ...outcome.suggestions[frameworkId],
      crossFrameworkConsistency: outcome.crossFrameworkConsistency
    }))),
    manualOverrideExamples: overridden.manualOverrides,
    boardDecisionExamples: [{
      id: "DEC-DEMO-001",
      programId: program.programId,
      directiveProgramId: "PROGRAM-DATA-LITERACY",
      directiveProgramVersionNo: 1,
      ...decided.finalDecision
    }],
    programSpine: [{
      smartProgramId: program.programId,
      engineProfileId: "qualification-engine-2026-08-20-1",
      directiveProgramId: "PROGRAM-DATA-LITERACY",
      directiveProgramVersionNo: 1,
      linkStatus: "canonical_demo_mapping",
      outcomeCount: 2,
      suggestionCount: 6,
      manualOverrideCount: 1,
      matrixDraftCount: 3,
      constructiveAlignmentRowCount: 2,
      boardDecisionCount: 1,
      institutionalValidationRequired: true
    }],
    constructiveAlignment: [
      {
        id: "ALIGN-LO-1", smartProgramId: program.programId,
        engineProfileId: "qualification-engine-2026-08-20-1", outcomeId: "LO-1", outcomeOrder: 1,
        outcomeText: outcomes[0].text, directiveProgramId: "PROGRAM-DATA-LITERACY", directiveProgramVersionNo: 1,
        contentItem: "Veri kalitesi, kaynak güvenilirliği, çözüm tasarımı ve doğrulama",
        learningActivity: "Karmaşık vaka laboratuvarı, prototipleme ve insan geri bildirimi",
        assessmentTask: "Performans görevi, ürün dosyası ve sözlü savunma",
        rubricReference: "RUBRIC-DATA-LO1-V1 — SENTETİK",
        successThreshold: "Analitik rubrikte en az %70 — kurumsal doğrulama gerekir",
        evidenceRequirement: "Çalışan ürün, karar günlüğü, kaynak izi, rubrik ve savunma tutanağı",
        workloadComponentType: "project_assignment_portfolio", workloadHours: 16, componentPlannedHours: 16,
        chainStatus: "human_review_required", institutionalValidationRequired: true
      },
      {
        id: "ALIGN-LO-2", smartProgramId: program.programId,
        engineProfileId: "qualification-engine-2026-08-20-1", outcomeId: "LO-2", outcomeOrder: 2,
        outcomeText: outcomes[1].text, directiveProgramId: "PROGRAM-DATA-LITERACY", directiveProgramVersionNo: 1,
        contentItem: "Stratejik dönüşüm, ekip performansı, etik ve erişilebilirlik",
        learningActivity: "Ekip simülasyonu, değişim senaryosu ve yansıtıcı değerlendirme",
        assessmentTask: "Stratejik etki dosyası, ekip savunması ve çok kaynaklı rubrik",
        rubricReference: "RUBRIC-TEAM-LO2-V1 — SENTETİK",
        successThreshold: "Rubrikte yeterli düzey ve kritik etik ölçütlerde başarısızlık bulunmaması — doğrulama gerekir",
        evidenceRequirement: "Karar günlüğü, risk kaydı, ekip geri bildirimi, rubrik ve savunma tutanağı",
        workloadComponentType: "feedback_and_revision", workloadHours: 4.5, componentPlannedHours: 4.5,
        chainStatus: "human_review_required", institutionalValidationRequired: true
      }
    ]
  };
}

function selectedDimensionDescriptor(row, frameworkId, level, dimension) {
  const option = buildQualificationSelectionOptions(frameworkId).find((item) => item.level === level);
  const canonical = option?.dimensions.find((item) => item.dimension === dimension);
  const remoteDescriptor = row[`${dimension}Descriptor`];
  return {
    descriptor: remoteDescriptor || canonical?.descriptor || "",
    descriptorDisplayTr: canonical?.descriptorDisplayTr || remoteDescriptor || "",
    dimensionLabel: canonical?.dimensionLabel || dimension
  };
}

function normalizeSignal(signal, fallbackSignal, dimension, level) {
  const item = signal && typeof signal === "object" ? signal : { label: String(signal || "") };
  const category = item.category || fallbackSignal?.category || "level";
  return {
    pattern: item.pattern || fallbackSignal?.pattern || item.label || "pilot-sinyal",
    label: item.label || fallbackSignal?.label || "pilot sinyal",
    weight: Number(item.weight ?? fallbackSignal?.weight ?? 0),
    category,
    ...(category === "dimension" ? { dimension: item.dimension || fallbackSignal?.dimension || dimension } : { level: Number(item.level ?? fallbackSignal?.level ?? level) })
  };
}

function normalizeAssessment(item, fallback) {
  return {
    method: item?.method || fallback?.method || "Pilot ölçme yöntemi",
    evidence: item?.evidence || fallback?.evidence || "Karşılaştırılabilir pilot kanıt",
    rationale: item?.rationale || fallback?.rationale || "Önerilen ölçme yöntemi insan ve kurul incelemesi gerektirir."
  };
}

function normalizeTyycTypeDescriptorRow(row) {
  const item = camelizeRow(row);
  const fallback = tyycQualificationTypeDescriptors.find((candidate) => candidate.id === item.id) || {};
  return {
    id: item.id || fallback.id,
    frameworkId: item.frameworkId || fallback.frameworkId || "tyyc",
    level: Number(item.level ?? fallback.level),
    qualificationType: item.qualificationType || fallback.qualificationType,
    titleTr: item.titleTr || fallback.titleTr,
    orientation: item.orientation || fallback.orientation,
    contextSignals: Array.isArray(item.contextSignals) ? item.contextSignals : (fallback.contextSignals || []),
    officialSourceUrl: item.officialSourceUrl || fallback.officialSourceUrl,
    officialFormRegistryUrl: item.officialFormRegistryUrl || fallback.officialFormRegistryUrl,
    sourcePublisher: item.sourcePublisher || fallback.sourcePublisher,
    sourceStatus: item.sourceStatus || fallback.sourceStatus || "official_form_registry_verified",
    operationalDescriptorStatus: item.operationalDescriptorStatus || fallback.operationalDescriptorStatus || "advisory_summary_not_verbatim",
    equivalenceClaim: Boolean(item.equivalenceClaim),
    placementClaim: Boolean(item.placementClaim),
    logoRightClaim: Boolean(item.logoRightClaim),
    autonomousDecision: Boolean(item.autonomousDecision),
    institutionalValidationRequired: Boolean(item.institutionalValidationRequired ?? true),
    verifiedAt: item.verifiedAt || fallback.verifiedAt
  };
}

function normalizeTyycTypeCandidate(row, index) {
  const item = camelizeRow(row || {});
  const descriptor = normalizeTyycTypeDescriptorRow(item);
  return {
    ...descriptor,
    typeFitScore: Number(item.typeFitScore ?? item.score ?? 52),
    matchedTypeSignals: Array.isArray(item.matchedTypeSignals) ? item.matchedTypeSignals : [],
    rank: Number(item.rank ?? index + 1),
    rationale: item.rationale || "Yeterlilik türü adayı yalnız pedagojik insan incelemesi için gösterilir."
  };
}

function normalizeQualificationTypeSuggestion(item, engineSuggestion) {
  if (engineSuggestion.frameworkId !== "tyyc") return null;
  const remoteCandidates = Array.isArray(item.qualificationTypeCandidates) ? item.qualificationTypeCandidates : [];
  const engineCandidates = [
    engineSuggestion.qualificationTypeSuggestion?.selected,
    ...(engineSuggestion.qualificationTypeSuggestion?.alternatives || [])
  ].filter(Boolean);
  const engineCandidateById = new Map(engineCandidates.map((candidate) => [candidate.id, candidate]));
  const candidates = (remoteCandidates.length
    ? remoteCandidates.map((candidate) => ({ ...(engineCandidateById.get(candidate.id) || {}), ...candidate }))
    : engineCandidates)
    .map(normalizeTyycTypeCandidate)
    .sort((left, right) => left.rank - right.rank || right.typeFitScore - left.typeFitScore);
  return {
    selected: candidates[0] || null,
    alternatives: candidates.slice(1),
    advisoryOnly: true,
    officialPlacementClaim: false,
    equivalenceClaim: false,
    logoRightClaim: false,
    institutionalValidationRequired: true
  };
}

function normalizeLearningOutcomeSuggestionRow(row) {
  const item = camelizeRow(row);
  const frameworkId = item.frameworkId;
  const level = Number(item.proposedLevel ?? item.level);
  const dimension = item.proposedDimension ?? item.dimension;
  const engineOutcome = suggestOutcomeQualificationAlignment({ id: item.outcomeId, text: item.outcomeText });
  const engineSuggestion = engineOutcome.suggestions[frameworkId];
  const descriptor = selectedDimensionDescriptor(item, frameworkId, level, dimension);
  const score = Number(item.score ?? engineSuggestion.score);
  const confidence = item.confidence || engineSuggestion.confidence;
  const rationale = item.rationale || engineSuggestion.rationale;
  const remoteSignals = Array.isArray(item.matchedSignals) ? item.matchedSignals : [];
  const matchedSignals = (remoteSignals.length ? remoteSignals : engineSuggestion.matchedSignals)
    .map((signal, index) => normalizeSignal(signal, engineSuggestion.matchedSignals[index], dimension, level));
  const remoteAssessments = Array.isArray(item.suggestedAssessments) ? item.suggestedAssessments : [];
  const suggestedAssessments = (remoteAssessments.length ? remoteAssessments : engineSuggestion.suggestedAssessments)
    .map((assessment, index) => normalizeAssessment(assessment, engineSuggestion.suggestedAssessments[index]));
  const rowCrossFrameworkConsistency = item.crossFrameworkConsistency || {};
  const crossFrameworkLevels = item.crossFrameworkLevels || {};
  const engineCross = engineOutcome.crossFrameworkConsistency;
  const peerLevel = Number(item.crossFrameworkPeerLevel ?? level);
  const tycLevel = Number(crossFrameworkLevels.tyc ?? rowCrossFrameworkConsistency.tycLevel ?? (frameworkId === "tyc" ? level : engineCross.tycLevel ?? peerLevel));
  const eqfLevel = Number(crossFrameworkLevels.eqf ?? rowCrossFrameworkConsistency.eqfLevel ?? (frameworkId === "eqf" ? level : engineCross.eqfLevel ?? peerLevel));
  const tyycLevel = Number(crossFrameworkLevels.tyyc ?? rowCrossFrameworkConsistency.tyycLevel ?? (frameworkId === "tyyc" ? level : engineCross.tyycLevel ?? Math.max(5, peerLevel)));
  const levelDifference = Math.abs(tycLevel - eqfLevel);
  const threeFrameworkSpread = Math.max(tycLevel, eqfLevel, tyycLevel) - Math.min(tycLevel, eqfLevel, tyycLevel);
  const allExact = threeFrameworkSpread === 0;
  const classification = item.crossFrameworkStatus || rowCrossFrameworkConsistency.classification || (
    levelDifference === 0 ? "aligned" : levelDifference === 1 ? "adjacent_review" : "material_discrepancy"
  );
  const threeFrameworkClassification = item.crossFrameworkStatus || rowCrossFrameworkConsistency.threeFrameworkClassification || (
    allExact ? "aligned" : threeFrameworkSpread === 1 ? "adjacent_review" : "material_discrepancy"
  );
  const qualificationTypeSuggestion = normalizeQualificationTypeSuggestion(item, engineSuggestion);
  const effectiveSelection = {
    level,
    dimension,
    source: item.selectionSource || "engine_suggestion",
    reason: rationale,
    actorRole: null,
    institutionalValidationRequired: Boolean(item.institutionalValidationRequired ?? true)
  };
  return {
    id: item.id,
    programId: item.programId,
    directiveProgramId: item.directiveProgramId || "PROGRAM-DATA-LITERACY",
    directiveProgramVersionNo: Number(item.directiveProgramVersionNo ?? 1),
    outcomeOrder: Number(item.outcomeOrder ?? (item.outcomeId === "LO-2" ? 2 : 1)),
    outcomeId: item.outcomeId,
    outcomeText: item.outcomeText,
    inputQuality: { ...engineOutcome.inputQuality, ...(item.inputQuality || {}) },
    frameworkId,
    frameworkCode: item.frameworkCode || engineSuggestion.frameworkCode,
    level,
    dimension,
    dimensionLabel: descriptor.dimensionLabel,
    score,
    confidence,
    dimensionConfidence: engineSuggestion.dimensionConfidence,
    descriptor: descriptor.descriptor,
    descriptorDisplayTr: descriptor.descriptorDisplayTr,
    officialSourceUrl: item.officialSourceUrl || engineSuggestion.officialSourceUrl,
    matchedSignals,
    suggestedContent: Array.isArray(item.suggestedContent) ? item.suggestedContent : engineSuggestion.suggestedContent,
    suggestedAssessments,
    alternatives: engineSuggestion.alternatives,
    qualificationTypeSuggestion,
    evidenceGapWarnings: Array.isArray(item.evidenceGapWarnings) ? item.evidenceGapWarnings : engineSuggestion.evidenceGapWarnings,
    descriptorStatus: frameworkId === "tyyc" ? (item.descriptorContentBasis === "official_form_operational_summary" ? "advisory_summary_not_verbatim" : engineSuggestion.descriptorStatus) : undefined,
    pedagogicalReferenceLevelLabel: frameworkId === "tyyc" ? `Önerilen pedagojik referans düzeyi: TYYÇ ${level}` : undefined,
    officialPlacementClaim: false,
    equivalenceClaim: false,
    logoRightClaim: false,
    higherEducationCycleSuggestion: higherEducationCycleCrosswalk.find((cycle) => cycle.tycLevel === level && cycle.eqfLevel === level) || null,
    method: engineSuggestion.method,
    autonomousDecision: Boolean(item.autonomousDecision),
    institutionalValidationRequired: Boolean(item.institutionalValidationRequired ?? true),
    suggestedAssessmentMethods: suggestedAssessments.map((assessment) => assessment.method),
    rationale,
    computedSelection: { level, dimension, score, confidence },
    effectiveSelection,
    crossFrameworkConsistency: {
      tycLevel,
      eqfLevel,
      tyycLevel,
      levelDifference,
      exactMatch: levelDifference === 0,
      classification,
      threeFrameworkSpread,
      allExact,
      threeFrameworkClassification,
      requiresHumanReview: !allExact,
      discrepancyRationale: item.crossFrameworkRationale || rowCrossFrameworkConsistency.discrepancyRationale || engineOutcome.crossFrameworkConsistency.discrepancyRationale,
      institutionalValidationRequired: true,
      equalityForced: false
    }
  };
}

function normalizeProgramSuggestionSummaryRow(row) {
  const item = camelizeRow(row);
  const cycle = item.higherEducationCycleSuggestion || higherEducationCycleCrosswalk.find((candidate) => candidate.id === item.higherEducationCycleId) || null;
  return {
    programId: item.programId,
    directiveProgramId: item.directiveProgramId || "PROGRAM-DATA-LITERACY",
    directiveProgramVersionNo: Number(item.directiveProgramVersionNo ?? 1),
    suggestedLevels: item.suggestedLevels || {
      tyc: Number(item.suggestedTycLevel),
      eqf: Number(item.suggestedEqfLevel),
      tyyc: Number(item.suggestedTyycLevel)
    },
    levelSummaries: item.levelSummaries || {},
    dimensionCoverage: item.dimensionCoverage || {},
    coverage: item.coverage || {},
    consistency: item.consistency || {},
    crossFrameworkConsistency: item.crossFrameworkConsistency || {},
    higherEducationCycleSuggestion: cycle,
    rationale: item.rationale,
    aggregationMethod: item.aggregationMethod || "score_weighted_median",
    autonomousDecision: Boolean(item.autonomousDecision),
    institutionalValidationRequired: Boolean(item.institutionalValidationRequired ?? true)
  };
}

function normalizeManualOverrideRow(row) {
  const item = camelizeRow(row);
  const level = Number(item.level ?? item.selectedLevel);
  const dimension = item.dimension ?? item.selectedDimension;
  return {
    id: item.id,
    outcomeId: item.outcomeId,
    frameworkId: item.frameworkId,
    computedLevel: Number(item.computedLevel),
    computedDimension: item.computedDimension,
    level,
    dimension,
    selectedLevel: level,
    selectedDimension: dimension,
    reason: item.reason,
    actorRole: item.actorRole,
    recordedAt: item.recordedAt,
    isHumanSelection: Boolean(item.isHumanSelection),
    finalBoardDecision: Boolean(item.finalBoardDecision)
  };
}

function normalizeBoardDecisionRow(row) {
  const item = camelizeRow(row);
  const rawSuggestionSnapshot = item.suggestionSnapshot || {};
  const suggestionSnapshot = {
    engineVersion: rawSuggestionSnapshot.engineVersion,
    suggestedLevels: rawSuggestionSnapshot.suggestedLevels || {}
  };
  const decidedLevels = item.decidedLevels || {
    tyc: Number(item.decidedTycLevel),
    eqf: Number(item.decidedEqfLevel),
    tyyc: Number(item.decidedTyycLevel)
  };
  const suggestedLevels = suggestionSnapshot.suggestedLevels || {};
  return {
    id: item.id,
    programId: item.programId,
    directiveProgramId: item.directiveProgramId || "PROGRAM-DATA-LITERACY",
    directiveProgramVersionNo: Number(item.directiveProgramVersionNo ?? 1),
    status: item.status || "recorded_human_board_decision",
    decision: item.decision || item.decisionStatus,
    source: item.source || "human_commission",
    actorRole: item.actorRole,
    decidedBy: item.decidedBy || item.decidedByLabel,
    rationale: item.rationale,
    decidedAt: item.decidedAt,
    meetingReference: item.meetingReference || null,
    decidedLevels,
    differsFromSuggestion: item.differsFromSuggestion ?? (
      decidedLevels.tyc !== suggestedLevels.tyc || decidedLevels.eqf !== suggestedLevels.eqf || decidedLevels.tyyc !== suggestedLevels.tyyc
    ),
    suggestionSnapshot,
    suggestionMutated: Boolean(item.suggestionMutated),
    autonomousDecision: Boolean(item.autonomousDecision),
    institutionalValidationRequired: Boolean(item.institutionalValidationRequired ?? true)
  };
}

function normalizeProgramSpineRow(row) {
  const item = camelizeRow(row);
  return {
    smartProgramId: item.smartProgramId,
    engineProfileId: item.engineProfileId,
    directiveProgramId: item.directiveProgramId,
    directiveProgramVersionNo: Number(item.directiveProgramVersionNo),
    linkStatus: item.linkStatus,
    outcomeCount: Number(item.outcomeCount),
    suggestionCount: Number(item.suggestionCount),
    manualOverrideCount: Number(item.manualOverrideCount),
    matrixDraftCount: Number(item.matrixDraftCount),
    constructiveAlignmentRowCount: Number(item.constructiveAlignmentRowCount),
    boardDecisionCount: Number(item.boardDecisionCount),
    institutionalValidationRequired: Boolean(item.institutionalValidationRequired)
  };
}

function normalizeConstructiveAlignmentRow(row) {
  const item = camelizeRow(row);
  return {
    id: item.id,
    smartProgramId: item.smartProgramId,
    engineProfileId: item.engineProfileId,
    outcomeId: item.outcomeId,
    outcomeOrder: Number(item.outcomeOrder),
    outcomeText: item.outcomeText,
    directiveProgramId: item.directiveProgramId,
    directiveProgramVersionNo: Number(item.directiveProgramVersionNo),
    contentItem: item.contentItem,
    learningActivity: item.learningActivity,
    assessmentTask: item.assessmentTask,
    rubricReference: item.rubricReference,
    successThreshold: item.successThreshold,
    evidenceRequirement: item.evidenceRequirement,
    workloadComponentType: item.workloadComponentType,
    workloadHours: Number(item.workloadHours),
    componentPlannedHours: Number(item.componentPlannedHours),
    chainStatus: item.chainStatus,
    institutionalValidationRequired: Boolean(item.institutionalValidationRequired)
  };
}

function normalizeEngineProfileRow(row) {
  const item = camelizeRow(row);
  return {
    id: item.id,
    engineVersion: item.engineVersion,
    engineMode: item.engineMode,
    methodKey: item.methodKey,
    aggregationMethod: item.aggregationMethod,
    advisoryNotice: item.advisoryNotice,
    editableRoles: item.editableRoles,
    reviewerRoles: item.reviewerRoles,
    deterministic: Boolean(item.deterministic),
    autoDecisionEnabled: Boolean(item.autoDecisionEnabled),
    finalDecisionAuthority: item.finalDecisionAuthority,
    institutionalValidationRequired: Boolean(item.institutionalValidationRequired ?? true)
  };
}

function normalizeCycleRow(row) {
  const item = camelizeRow(row);
  return {
    id: item.id,
    tycLevel: Number(item.tycLevel),
    eqfLevel: Number(item.eqfLevel),
    tyycCycleTr: item.tyycCycleTr,
    bolognaCycleTr: item.bolognaCycleTr,
    awardContextTr: item.awardContextTr,
    mappingStatus: item.mappingStatus,
    equivalenceClaim: Boolean(item.equivalenceClaim),
    placementClaim: Boolean(item.placementClaim),
    institutionalValidationRequired: Boolean(item.institutionalValidationRequired),
    officialValidationRequired: Boolean(item.officialValidationRequired),
    tyycSourceUrl: item.tyycSourceUrl,
    bolognaSourceUrl: item.bolognaSourceUrl,
    pilotNotice: item.pilotNotice
  };
}

export function normalizeQualificationSuggestionCatalog(remote = {}, fallback = getLocalQualificationSuggestionCatalog()) {
  const rowsOrFallback = (key) => Array.isArray(remote[key]) && remote[key].length ? remote[key] : fallback[key];
  return {
    higherEducationCycles: rowsOrFallback("higherEducationCycles").map(normalizeCycleRow),
    suggestionEngineProfiles: rowsOrFallback("suggestionEngineProfiles").map(normalizeEngineProfileRow),
    tyycTypeDescriptors: rowsOrFallback("tyycTypeDescriptors").map(normalizeTyycTypeDescriptorRow),
    programSuggestionSummaries: rowsOrFallback("programSuggestionSummaries").map(normalizeProgramSuggestionSummaryRow),
    learningOutcomeSuggestions: rowsOrFallback("learningOutcomeSuggestions").map(normalizeLearningOutcomeSuggestionRow),
    manualOverrideExamples: rowsOrFallback("manualOverrideExamples").map(normalizeManualOverrideRow),
    boardDecisionExamples: rowsOrFallback("boardDecisionExamples").map(normalizeBoardDecisionRow),
    programSpine: rowsOrFallback("programSpine").map(normalizeProgramSpineRow),
    constructiveAlignment: rowsOrFallback("constructiveAlignment").map(normalizeConstructiveAlignmentRow)
  };
}

function localInstitutionalCatalogFallback() {
  const systemsById = new Map(dpuIntegrationReferenceSnapshot.systems.map((item) => [item.id, item]));
  const mappingsById = new Map(dpuIntegrationReferenceSnapshot.mappings.map((item) => [item.id, item]));
  return {
    systems: dpuIntegrationReferenceSnapshot.systems.map((item) => ({
      id: item.id,
      catalogVersion: item.catalogVersion,
      seedBatch: item.seedBatch,
      systemCode: item.code,
      systemNameTr: item.nameTr,
      shortName: item.shortName,
      ownerUnit: item.ownerUnit,
      systemCategory: item.category,
      registryKind: item.registryKind,
      publicUrl: item.publicUrl,
      sourceUrl: item.sourceUrl,
      sourceBasis: item.sourceBasis,
      verificationStatus: item.verificationStatus,
      sourceCheckedAt: item.sourceCheckedAt,
      registryStatus: item.registryStatus,
      integrationContractStatus: item.integrationContractStatus,
      integrationTier: item.integrationTier,
      myysRelevance: item.myysRelevance,
      masterDataDomains: item.masterDataDomains,
      masterDataBoundary: item.masterDataBoundary,
      recordOwner: item.recordOwner,
      consumerMode: item.consumerMode,
      syncMode: item.syncMode,
      conflictPolicy: item.conflictPolicy,
      consultationOnly: item.consultationOnly,
      consultationScopeNote: item.consultationScopeNote,
      capabilities: item.capabilities,
      dataDomains: item.dataDomains,
      expectedDataClassification: item.expectedDataClassification,
      recommendedAdapter: item.recommendedAdapter,
      scopeNote: item.scopeNote,
      institutionalValidationRequired: item.institutionalValidationRequired,
      publicMetadataOnly: item.publicMetadataOnly,
      realDataEnabled: item.realDataEnabled,
      realDataSent: item.realDataSent,
      secretsStored: item.secretsStored,
      productionAllowed: item.productionAllowed,
      isPublicReference: item.isPublicReference
    })),
    mappings: dpuIntegrationReferenceSnapshot.mappings.map((item) => {
      const system = systemsById.get(item.systemId);
      return {
        ...item,
        systemCode: system?.code || "",
        systemNameTr: system?.nameTr || "",
        integrationTier: system?.integrationTier || "tier3",
        myysRelevance: system?.myysRelevance || "adjacent"
      };
    }),
    scenarios: dpuIntegrationReferenceSnapshot.scenarios.map((item) => {
      const system = systemsById.get(item.systemId);
      return {
        ...item,
        systemCode: system?.code || "",
        systemNameTr: system?.nameTr || ""
      };
    }),
    auditEvents: dpuIntegrationReferenceSnapshot.auditEvents.map((item) => {
      const system = systemsById.get(item.systemId);
      const mapping = mappingsById.get(item.mappingId);
      return {
        ...item,
        systemCode: system?.code || "",
        mappingId: mapping?.id || item.mappingId
      };
    })
  };
}

function validateInstitutionalRemoteSnapshot(remote) {
  const errors = [];
  const expectedVersion = dpuIntegrationReferenceSnapshot.catalogVersion;
  const expectedSeedBatch = dpuIntegrationReferenceSnapshot.seedBatch;
  const datasets = ["systems", "mappings", "scenarios", "auditEvents"];
  const expectedRows = {
    systems: dpuIntegrationReferenceSnapshot.systems,
    mappings: dpuIntegrationReferenceSnapshot.mappings,
    scenarios: dpuIntegrationReferenceSnapshot.scenarios,
    auditEvents: dpuIntegrationReferenceSnapshot.auditEvents
  };
  const sameSet = (left, right) => left.size === right.size && [...left].every((value) => right.has(value));

  function uniqueValues(rows, key, label) {
    if (!Array.isArray(rows)) return new Set();
    const values = rows.map((row) => row?.[key]);
    if (values.some((value) => value === undefined || value === null || value === "")) {
      errors.push(`${label}: ${key} missing`);
    }
    const unique = new Set(values);
    if (unique.size !== values.length) errors.push(`${label}: ${key} must be unique`);
    return unique;
  }

  function exactSet(values, expected, label) {
    if (!sameSet(values, expected)) errors.push(`${label}: canonical cardinality/set mismatch`);
  }

  datasets.forEach((key) => {
    if (!Array.isArray(remote[key]) || remote[key].length !== 32) {
      errors.push(`${key}: expected 32 rows`);
      return;
    }
    if (remote[key].some((row) => row.catalogVersion !== expectedVersion || row.seedBatch !== expectedSeedBatch)) {
      errors.push(`${key}: catalogVersion/seedBatch mismatch`);
    }
    if (remote[key].some((row) => row.institutionalValidationRequired !== true || row.realDataEnabled !== false || row.realDataSent !== false || row.productionAllowed !== false)) {
      errors.push(`${key}: controlled-pilot safety flags invalid`);
    }

    const remoteIds = uniqueValues(remote[key], "id", key);
    const canonicalIds = new Set(expectedRows[key].map((row) => row.id));
    exactSet(remoteIds, canonicalIds, `${key} ids`);
  });

  if (Array.isArray(remote.systems) && remote.systems.some((row) =>
    row.integrationContractStatus !== "not_verified" || row.publicMetadataOnly !== true || row.secretsStored !== false || row.isPublicReference !== true
  )) errors.push("systems: registry safety flags invalid");

  if (Array.isArray(remote.systems)) {
    exactSet(
      uniqueValues(remote.systems, "systemCode", "systems"),
      new Set(dpuIntegrationReferenceSnapshot.systems.map((row) => row.code)),
      "system codes"
    );
    uniqueValues(remote.systems, "sourceUrl", "systems");
    const canonicalSystemById = new Map(dpuIntegrationReferenceSnapshot.systems.map((row) => [row.id, row]));
    remote.systems.forEach((row) => {
      const canonical = canonicalSystemById.get(row.id);
      if (!/^https:\/\//.test(row.publicUrl || "") || !/^https:\/\//.test(row.sourceUrl || "")) {
        errors.push(`${row.id || "systems"}: public/source URL invalid`);
      }
      if (canonical && (
        row.systemCode !== canonical.code || row.systemNameTr !== canonical.nameTr ||
        row.integrationTier !== canonical.integrationTier || row.myysRelevance !== canonical.myysRelevance ||
        row.publicUrl !== canonical.publicUrl || row.sourceUrl !== canonical.sourceUrl ||
        row.sourceBasis !== canonical.sourceBasis || row.verificationStatus !== canonical.verificationStatus
      )) errors.push(`${row.id}: canonical system snapshot mismatch`);
    });
  }

  if (Array.isArray(remote.mappings) && remote.mappings.some((row) => row.liveRequestEnabled !== false || row.isSynthetic !== true)) {
    errors.push("mappings: live/synthetic flags invalid");
  }
  if (Array.isArray(remote.scenarios) && remote.scenarios.some((row) => row.liveRequestEnabled !== false || row.isSynthetic !== true || row.status !== "not_executed" || row.expectedResult !== "dry_run_only")) {
    errors.push("scenarios: dry-run flags invalid");
  }
  if (Array.isArray(remote.auditEvents) && remote.auditEvents.some((row) => row.liveRequestMade !== false || row.hasPersonalIdentifiers !== false || row.isSynthetic !== true)) {
    errors.push("auditEvents: audit safety flags invalid");
  }

  if (datasets.every((key) => Array.isArray(remote[key]) && remote[key].length === 32)) {
    const systemsById = new Map(remote.systems.map((row) => [row.id, row]));
    const mappingsById = new Map(remote.mappings.map((row) => [row.id, row]));
    const scenariosById = new Map(remote.scenarios.map((row) => [row.id, row]));
    const canonicalMappingsById = new Map(expectedRows.mappings.map((row) => [row.id, row]));
    const canonicalScenariosById = new Map(expectedRows.scenarios.map((row) => [row.id, row]));
    const canonicalAuditsById = new Map(expectedRows.auditEvents.map((row) => [row.id, row]));
    const systemIds = new Set(systemsById.keys());
    const mappingIds = new Set(mappingsById.keys());
    const scenarioIds = new Set(scenariosById.keys());

    exactSet(uniqueValues(remote.mappings, "systemId", "mappings"), systemIds, "mapping/system relationships");
    exactSet(
      uniqueValues(remote.mappings, "flowKey", "mappings"),
      new Set(expectedRows.mappings.map((row) => row.flowKey)),
      "mapping flow keys"
    );
    exactSet(uniqueValues(remote.scenarios, "mappingId", "scenarios"), mappingIds, "scenario/mapping relationships");
    exactSet(uniqueValues(remote.scenarios, "systemId", "scenarios"), systemIds, "scenario/system relationships");
    exactSet(
      uniqueValues(remote.scenarios, "scenarioOrder", "scenarios"),
      new Set(expectedRows.scenarios.map((row) => row.scenarioOrder)),
      "scenario order"
    );
    exactSet(uniqueValues(remote.auditEvents, "scenarioId", "auditEvents"), scenarioIds, "audit/scenario relationships");
    exactSet(uniqueValues(remote.auditEvents, "mappingId", "auditEvents"), mappingIds, "audit/mapping relationships");
    exactSet(uniqueValues(remote.auditEvents, "systemId", "auditEvents"), systemIds, "audit/system relationships");
    exactSet(
      uniqueValues(remote.auditEvents, "correlationLabel", "auditEvents"),
      new Set(expectedRows.auditEvents.map((row) => row.correlationLabel)),
      "audit correlation labels"
    );

    remote.mappings.forEach((mapping) => {
      const system = systemsById.get(mapping.systemId);
      const canonicalMapping = canonicalMappingsById.get(mapping.id);
      if (!system || !canonicalMapping || mapping.systemId !== canonicalMapping.systemId ||
        mapping.flowKey !== canonicalMapping.flowKey ||
        mapping.systemCode !== system.systemCode || mapping.systemNameTr !== system.systemNameTr ||
        mapping.integrationTier !== system.integrationTier || mapping.myysRelevance !== system.myysRelevance) {
        errors.push(`${mapping.id}: mapping/system relationship mismatch`);
      }
    });
    remote.scenarios.forEach((scenario) => {
      const mapping = mappingsById.get(scenario.mappingId);
      const system = systemsById.get(scenario.systemId);
      const canonicalScenario = canonicalScenariosById.get(scenario.id);
      if (!mapping || !system || !canonicalScenario || mapping.systemId !== scenario.systemId ||
        scenario.mappingId !== canonicalScenario.mappingId || scenario.systemId !== canonicalScenario.systemId ||
        scenario.scenarioOrder !== canonicalScenario.scenarioOrder ||
        scenario.systemCode !== system.systemCode || scenario.systemNameTr !== system.systemNameTr) {
        errors.push(`${scenario.id}: scenario/mapping/system relationship mismatch`);
      }
    });
    remote.auditEvents.forEach((auditEvent) => {
      const scenario = scenariosById.get(auditEvent.scenarioId);
      const mapping = mappingsById.get(auditEvent.mappingId);
      const system = systemsById.get(auditEvent.systemId);
      const canonicalAudit = canonicalAuditsById.get(auditEvent.id);
      if (!scenario || !mapping || !system || !canonicalAudit ||
        auditEvent.scenarioId !== canonicalAudit.scenarioId || auditEvent.mappingId !== canonicalAudit.mappingId ||
        auditEvent.systemId !== canonicalAudit.systemId || auditEvent.correlationLabel !== canonicalAudit.correlationLabel ||
        scenario.mappingId !== auditEvent.mappingId ||
        scenario.systemId !== auditEvent.systemId || mapping.systemId !== auditEvent.systemId ||
        auditEvent.systemCode !== system.systemCode) {
        errors.push(`${auditEvent.id}: audit/scenario/mapping/system relationship mismatch`);
      }
    });
  }

  return errors;
}

export async function loadInstitutionalIntegrationSnapshot(options = {}) {
  const context = createSupabaseReadContext(options);
  const fallback = localInstitutionalCatalogFallback();
  if (!context.authenticated) {
    return {
      ok: false,
      version: dpuIntegrationReferenceSnapshot.version,
      catalogVersion: dpuIntegrationReferenceSnapshot.catalogVersion,
      seedBatch: dpuIntegrationReferenceSnapshot.seedBatch,
      source: "local_institutional_reference_fallback",
      accessMode: context.mode,
      protectedViewsRequested: false,
      remoteVerified: false,
      unavailableViews: [],
      deferredProtectedViews: Object.values(institutionalViewQueries).map(([view]) => view),
      validationErrors: ["Anonymous Preview does not request protected institutional DTO views"],
      liveInstitutionalRequestsEnabled: false,
      ...fallback,
      boundaries: dpuIntegrationReferenceSnapshot.boundaries
    };
  }
  try {
    const entries = Object.entries(institutionalViewQueries);
    const results = await Promise.allSettled(entries.map(([, [view, query]]) => readTable(view, query, context)));
    const remote = {};
    const unavailableViews = [];
    results.forEach((result, index) => {
      const key = entries[index][0];
      if (result.status === "fulfilled") remote[key] = result.value.map(camelizeRow);
      else unavailableViews.push(key);
    });
    const validationErrors = unavailableViews.length === 0
      ? validateInstitutionalRemoteSnapshot(remote)
      : ["All four institutional views must be available before remote data is accepted"];
    const remoteAccepted = unavailableViews.length === 0 && validationErrors.length === 0;
    return {
      ok: remoteAccepted,
      version: dpuIntegrationReferenceSnapshot.version,
      catalogVersion: dpuIntegrationReferenceSnapshot.catalogVersion,
      seedBatch: dpuIntegrationReferenceSnapshot.seedBatch,
      source: remoteAccepted ? "supabase_read_only_institutional_views" : "local_institutional_reference_fallback",
      accessMode: context.mode,
      protectedViewsRequested: true,
      remoteVerified: remoteAccepted,
      unavailableViews,
      validationErrors,
      liveInstitutionalRequestsEnabled: false,
      systems: remoteAccepted ? remote.systems : fallback.systems,
      mappings: remoteAccepted ? remote.mappings : fallback.mappings,
      scenarios: remoteAccepted ? remote.scenarios : fallback.scenarios,
      auditEvents: remoteAccepted ? remote.auditEvents : fallback.auditEvents,
      boundaries: dpuIntegrationReferenceSnapshot.boundaries
    };
  } catch (error) {
    return {
      ok: false,
      version: dpuIntegrationReferenceSnapshot.version,
      catalogVersion: dpuIntegrationReferenceSnapshot.catalogVersion,
      seedBatch: dpuIntegrationReferenceSnapshot.seedBatch,
      source: "local_institutional_reference_fallback",
      accessMode: context.mode,
      protectedViewsRequested: true,
      remoteVerified: false,
      unavailableViews: Object.keys(institutionalViewQueries),
      validationErrors: ["Institutional view read failed; complete local catalog selected"],
      liveInstitutionalRequestsEnabled: false,
      error: error instanceof Error ? error.message : "Bilinmeyen kurumsal entegrasyon veri hatası",
      ...fallback,
      boundaries: dpuIntegrationReferenceSnapshot.boundaries
    };
  }
}

export async function loadDirectivePilotSnapshot(options = {}) {
  const context = createSupabaseReadContext(options);
  const fallback = getLocalDirectivePilotCatalog();
  const publicSourceData = await loadPublicOfficialSourceSnapshot(context);
  if (!context.authenticated) {
    return {
      ...fallback,
      ok: publicSourceData.remoteVerified,
      version: fallback.readiness[0].contractVersion,
      source: "local_directive_contract_fallback_anonymous_public_sources",
      accessMode: context.mode,
      unavailableViews: [],
      deferredProtectedViews: Object.values(directiveViewQueries).map(([view]) => view),
      validationErrors: ["Anonymous Preview does not request protected directive DTO views"],
      remoteAccepted: false,
      remoteVerified: false,
      protectedViewsRequested: false,
      fallbackUsed: true,
      productionAllowed: false,
      liveInstitutionalRequestsEnabled: false,
      realPaymentsEnabled: false,
      realIdentityDataEnabled: false,
      publicSourceData,
      publicOfficialSources: publicSourceData.sources,
      publicOfficialSourceSupports: publicSourceData.supports
    };
  }
  try {
    const entries = Object.entries(directiveViewQueries);
    const results = await Promise.allSettled(entries.map(([, [view, query]]) => readTable(view, query, context)));
    const remote = {};
    const unavailableViews = [];
    results.forEach((result, index) => {
      const key = entries[index][0];
      if (result.status === "fulfilled" && Array.isArray(result.value) && result.value.length > 0) remote[key] = result.value;
      else unavailableViews.push(key);
    });
    const normalized = normalizeDirectivePilotCatalog(remote, fallback);
    const remoteAccepted = unavailableViews.length === 0 && normalized.remoteAccepted && normalized.validationErrors.length === 0;
    return {
      ok: remoteAccepted,
      version: fallback.readiness[0].contractVersion,
      source: remoteAccepted ? "supabase_read_only_directive_views" : "local_directive_contract_fallback_unverified_remote",
      accessMode: context.mode,
      unavailableViews,
      validationErrors: normalized.validationErrors,
      remoteVerified: remoteAccepted,
      protectedViewsRequested: true,
      fallbackUsed: !remoteAccepted,
      productionAllowed: false,
      liveInstitutionalRequestsEnabled: false,
      realPaymentsEnabled: false,
      realIdentityDataEnabled: false,
      publicSourceData,
      publicOfficialSources: publicSourceData.sources,
      publicOfficialSourceSupports: publicSourceData.supports,
      ...normalized
    };
  } catch (error) {
    return {
      ok: false,
      version: fallback.readiness[0].contractVersion,
      source: "local_directive_contract_fallback_unverified_remote",
      accessMode: context.mode,
      unavailableViews: Object.keys(directiveViewQueries),
      validationErrors: ["Directive catalog read failed; complete local contract selected"],
      remoteVerified: false,
      protectedViewsRequested: true,
      fallbackUsed: true,
      productionAllowed: false,
      liveInstitutionalRequestsEnabled: false,
      realPaymentsEnabled: false,
      realIdentityDataEnabled: false,
      publicSourceData,
      publicOfficialSources: publicSourceData.sources,
      publicOfficialSourceSupports: publicSourceData.supports,
      error: error instanceof Error ? error.message : "Bilinmeyen yönerge pilot veri hatası",
      ...fallback
    };
  }
}

async function loadReferenceViews(options = {}) {
  const context = createSupabaseReadContext(options);
  const entries = Object.entries(referenceViewQueries);
  const results = await Promise.allSettled(entries.map(([, [view, query]]) => readTable(view, query, context)));
  const remote = {};
  const unavailable = [];
  results.forEach((result, index) => {
    const key = entries[index][0];
    if (result.status === "fulfilled") remote[key] = result.value;
    else unavailable.push(key);
  });

  const fallback = qualificationReferenceSnapshot;
  const suggestionFallback = getLocalQualificationSuggestionCatalog();
  const normalizedSuggestionCatalog = normalizeQualificationSuggestionCatalog({
    higherEducationCycles: remote.higherEducationCycles,
    suggestionEngineProfiles: remote.suggestionEngineProfiles,
    tyycTypeDescriptors: remote.tyycTypeDescriptors,
    programSuggestionSummaries: remote.programSuggestionSummaries,
    learningOutcomeSuggestions: remote.learningOutcomeSuggestions,
    manualOverrideExamples: remote.manualOverrideExamples,
    boardDecisionExamples: remote.boardDecisionExamples,
    programSpine: remote.programSpine,
    constructiveAlignment: remote.constructiveAlignment
  }, suggestionFallback);
  return {
    version: fallback.version,
    source: unavailable.length === 0 ? "supabase_read_only_views" : "supabase_with_local_reference_fallback",
    unavailableViews: unavailable,
    qualificationLevels: (remote.qualificationLevels || fallback.descriptors).map(camelizeRow),
    tyycTypeDescriptors: normalizedSuggestionCatalog.tyycTypeDescriptors,
    bilingualEqfLevels: (remote.bilingualEqfLevels || fallback.descriptorTranslations).map(camelizeRow),
    datasetRegistry: (remote.datasetRegistry || fallback.datasetRegistry).map(camelizeRow),
    officialQualificationReferences: (remote.officialQualificationReferences || fallback.officialQualificationReferences).map(camelizeRow),
    matrixTemplates: (remote.matrixTemplates || fallback.matrixTemplates).map(camelizeRow),
    matrixDrafts: remote.matrixDraftRows ? groupMatrixDraftRows(remote.matrixDraftRows) : fallback.matrixDrafts,
    financeRoutes: (remote.financeRoutes || fallback.financeRoutes).map(camelizeRow),
    roleWorkflowRows: (remote.roleWorkflowRows || fallback.roleSteps).map(camelizeRow),
    paymentRequests: remote.paymentRequests ? remote.paymentRequests.map(mapPaymentRequest) : fallback.paymentRequests,
    paymentEvents: (remote.paymentEvents || fallback.paymentEvents).map(camelizeRow),
    ...normalizedSuggestionCatalog
  };
}

export async function loadQualificationReferenceSnapshot(options = {}) {
  const context = createSupabaseReadContext(options);
  if (!context.authenticated) {
    return {
      ok: false,
      ...localQualificationReferenceCatalog(),
      source: "local_reference_fallback_anonymous_protected",
      accessMode: context.mode,
      protectedViewsRequested: false,
      remoteVerified: false,
      unavailableViews: [],
      deferredProtectedViews: Object.values(referenceViewQueries).map(([view]) => view),
      validationErrors: ["Anonymous Preview does not request protected qualification/operational DTO views"]
    };
  }
  try {
    const referenceData = await loadReferenceViews(context);
    return {
      ok: referenceData.unavailableViews.length === 0,
      accessMode: context.mode,
      protectedViewsRequested: true,
      remoteVerified: referenceData.unavailableViews.length === 0,
      ...referenceData
    };
  } catch (error) {
    const suggestionFallback = getLocalQualificationSuggestionCatalog();
    const normalizedSuggestionFallback = normalizeQualificationSuggestionCatalog({}, suggestionFallback);
    return {
      ok: false,
      ...localQualificationReferenceCatalog(),
      source: "local_reference_fallback",
      accessMode: context.mode,
      protectedViewsRequested: true,
      remoteVerified: false,
      error: error instanceof Error ? error.message : "Bilinmeyen referans veri hatası",
      ...normalizedSuggestionFallback
    };
  }
}

export async function loadPilotSnapshot(options = {}) {
  const context = createSupabaseReadContext(options);
  if (!context.authenticated) {
    const [referenceData, institutionalData, directiveData] = await Promise.all([
      loadQualificationReferenceSnapshot(context),
      loadInstitutionalIntegrationSnapshot(context),
      loadDirectivePilotSnapshot(context)
    ]);
    return {
      ok: directiveData.publicSourceData.remoteVerified,
      mode: directiveData.publicSourceData.remoteVerified
        ? "Supabase anonim resmî kaynak kataloğu + yerel korumalı pilot DTO fallback"
        : "Yerel korumalı pilot DTO ve resmî kaynak fallback",
      accessMode: context.mode,
      protectedViewsRequested: false,
      protectedRemoteVerified: false,
      coreRemoteVerified: false,
      publicSourceData: directiveData.publicSourceData,
      ...localCorePilotFallback(),
      referenceData,
      institutionalData,
      directiveData
    };
  }
  try {
    const [programs, applications, credentials, integrations, referenceData, institutionalData, directiveData] = await Promise.all([
      readTable("pilot_programs", "select=*&order=code.asc", context),
      readTable("pilot_applications", "select=*&order=submitted_at.desc", context),
      readTable("pilot_credentials", "select=*&order=issued_at.desc", context),
      readTable("pilot_integrations", "select=*&order=name.asc", context),
      loadQualificationReferenceSnapshot(context),
      loadInstitutionalIntegrationSnapshot(context),
      loadDirectivePilotSnapshot(context)
    ]);
    return {
      ok: true,
      mode: "Supabase salt-okunur pilot görünümü",
      accessMode: context.mode,
      protectedViewsRequested: true,
      protectedRemoteVerified: Boolean(referenceData.remoteVerified && institutionalData.remoteVerified && directiveData.remoteVerified),
      coreRemoteVerified: true,
      publicSourceData: directiveData.publicSourceData,
      programs,
      applications,
      credentials,
      integrations,
      referenceData,
      institutionalData,
      directiveData
    };
  } catch (error) {
    return { ok: false, mode: "Yerel pilot veri katmanı", error: error instanceof Error ? error.message : "Bilinmeyen bağlantı hatası" };
  }
}

export function getSupabasePublicConfig() {
  return { projectRef: "xpjkrwzgimdxsasqszfi", mode: "Anonim resmî kaynak kataloğu • korumalı DTO'lar yalnız claim-kapsamlı oturumda" };
}
