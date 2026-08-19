import { qualificationReferenceSnapshot } from "./reference-data.js";

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
  const timeout = setTimeout(() => controller.abort(), 4200);
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
    const [programs, applications, credentials, integrations, referenceData] = await Promise.all([
      readTable("pilot_programs", "select=*&order=code.asc"),
      readTable("pilot_applications", "select=*&order=submitted_at.desc"),
      readTable("pilot_credentials", "select=*&order=issued_at.desc"),
      readTable("pilot_integrations", "select=*&order=name.asc"),
      loadQualificationReferenceSnapshot()
    ]);
    return {
      ok: true,
      mode: "Supabase salt-okunur pilot görünümü",
      programs,
      applications,
      credentials,
      integrations,
      referenceData
    };
  } catch (error) {
    return { ok: false, mode: "Yerel pilot veri katmanı", error: error instanceof Error ? error.message : "Bilinmeyen bağlantı hatası" };
  }
}

export function getSupabasePublicConfig() {
  return { projectRef: "xpjkrwzgimdxsasqszfi", mode: "Salt-okunur sentetik pilot veri" };
}
