import { qualificationReferenceSnapshot } from "./reference-data.js";
import { dpuIntegrationReferenceSnapshot } from "./institutional-integration-reference.js";

// Supabase publishable keys identify a project but are not secrets. Access remains
// constrained by explicit grants and RLS. No service-role/secret key is present.
const SUPABASE_URL = "https://xpjkrwzgimdxsasqszfi.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_v_AI0cizKIbiJqeqWYHDSQ__g2fSY4p";

const headers = {
  apikey: SUPABASE_PUBLISHABLE_KEY,
  Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
  Accept: "application/json"
};

async function readTable(table, query = "select=*") {
  const controller = new AbortController();
  // Public Preview may cold-start the PostgREST path. Keep the read bounded,
  // but allow enough time for all catalog views to return before falling back.
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      headers,
      signal: controller.signal,
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`Supabase ${table}: HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

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
  paymentEvents: ["pilot_payment_event_catalog", "select=*&order=payment_request_id.asc,event_order.asc"]
});

const institutionalViewQueries = Object.freeze({
  systems: ["institutional_system_catalog", "select=*&order=integration_tier.asc,system_code.asc"],
  mappings: ["pilot_integration_mapping_catalog", "select=*&order=priority.asc,system_code.asc,flow_key.asc"],
  scenarios: ["pilot_integration_scenario_catalog", "select=*&order=scenario_order.asc"],
  auditEvents: ["pilot_integration_audit_catalog", "select=*&order=occurred_at.asc,event_order.asc"]
});

function camelizeRow(row) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [
    key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
    value
  ]));
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

export async function loadInstitutionalIntegrationSnapshot() {
  const fallback = localInstitutionalCatalogFallback();
  try {
    const entries = Object.entries(institutionalViewQueries);
    const results = await Promise.allSettled(entries.map(([, [view, query]]) => readTable(view, query)));
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
      unavailableViews: Object.keys(institutionalViewQueries),
      validationErrors: ["Institutional view read failed; complete local catalog selected"],
      liveInstitutionalRequestsEnabled: false,
      error: error instanceof Error ? error.message : "Bilinmeyen kurumsal entegrasyon veri hatası",
      ...fallback,
      boundaries: dpuIntegrationReferenceSnapshot.boundaries
    };
  }
}

async function loadReferenceViews() {
  const entries = Object.entries(referenceViewQueries);
  const results = await Promise.allSettled(entries.map(([, [view, query]]) => readTable(view, query)));
  const remote = {};
  const unavailable = [];
  results.forEach((result, index) => {
    const key = entries[index][0];
    if (result.status === "fulfilled") remote[key] = result.value;
    else unavailable.push(key);
  });

  const fallback = qualificationReferenceSnapshot;
  return {
    version: fallback.version,
    source: unavailable.length === 0 ? "supabase_read_only_views" : "supabase_with_local_reference_fallback",
    unavailableViews: unavailable,
    qualificationLevels: (remote.qualificationLevels || fallback.descriptors).map(camelizeRow),
    bilingualEqfLevels: (remote.bilingualEqfLevels || fallback.descriptorTranslations).map(camelizeRow),
    datasetRegistry: (remote.datasetRegistry || fallback.datasetRegistry).map(camelizeRow),
    officialQualificationReferences: (remote.officialQualificationReferences || fallback.officialQualificationReferences).map(camelizeRow),
    matrixTemplates: (remote.matrixTemplates || fallback.matrixTemplates).map(camelizeRow),
    matrixDrafts: remote.matrixDraftRows ? groupMatrixDraftRows(remote.matrixDraftRows) : fallback.matrixDrafts,
    financeRoutes: (remote.financeRoutes || fallback.financeRoutes).map(camelizeRow),
    roleWorkflowRows: (remote.roleWorkflowRows || fallback.roleSteps).map(camelizeRow),
    paymentRequests: remote.paymentRequests ? remote.paymentRequests.map(mapPaymentRequest) : fallback.paymentRequests,
    paymentEvents: (remote.paymentEvents || fallback.paymentEvents).map(camelizeRow)
  };
}

export async function loadQualificationReferenceSnapshot() {
  try {
    const referenceData = await loadReferenceViews();
    return {
      ok: referenceData.unavailableViews.length === 0,
      ...referenceData
    };
  } catch (error) {
    return {
      ok: false,
      version: qualificationReferenceSnapshot.version,
      source: "local_reference_fallback",
      error: error instanceof Error ? error.message : "Bilinmeyen referans veri hatası",
      ...qualificationReferenceSnapshot
    };
  }
}

export async function loadPilotSnapshot() {
  try {
    const [programs, applications, credentials, integrations, referenceData, institutionalData] = await Promise.all([
      readTable("pilot_programs", "select=*&order=code.asc"),
      readTable("pilot_applications", "select=*&order=submitted_at.desc"),
      readTable("pilot_credentials", "select=*&order=issued_at.desc"),
      readTable("pilot_integrations", "select=*&order=name.asc"),
      loadQualificationReferenceSnapshot(),
      loadInstitutionalIntegrationSnapshot()
    ]);
    return {
      ok: true,
      mode: "Supabase salt-okunur pilot görünümü",
      programs,
      applications,
      credentials,
      integrations,
      referenceData,
      institutionalData
    };
  } catch (error) {
    return { ok: false, mode: "Yerel pilot veri katmanı", error: error instanceof Error ? error.message : "Bilinmeyen bağlantı hatası" };
  }
}

export function getSupabasePublicConfig() {
  return { projectRef: "xpjkrwzgimdxsasqszfi", mode: "Salt-okunur sentetik pilot veri" };
}
