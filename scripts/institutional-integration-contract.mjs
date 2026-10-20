import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  INSTITUTIONAL_INTEGRATION_REFERENCE_VERSION,
  INSTITUTIONAL_INTEGRATION_SEED_BATCH,
  dpuInstitutionalSystems,
  pilotIntegrationMappings,
  pilotIntegrationScenarios,
  pilotIntegrationAuditEvents,
  dpuIntegrationReferenceSnapshot
} from "../src/institutional-integration-reference.js";
import { loadInstitutionalIntegrationSnapshot } from "../src/supabase.js";

const migrationUrl = new URL("../supabase/migrations/20260820012000_dpu_institutional_integration_catalog.sql", import.meta.url);
const sql = await readFile(migrationUrl, "utf8");
const provenanceSql = await readFile(new URL("../supabase/migrations/20260820014000_dpu_institutional_source_provenance.sql", import.meta.url), "utf8");
const supabaseAdapter = await readFile(new URL("../src/supabase.js", import.meta.url), "utf8");

function unique(values, label) {
  assert.equal(new Set(values).size, values.length, `${label} benzersiz olmalı`);
}

function extractJsonSeed(tag) {
  const match = sql.match(new RegExp(`\\$${tag}\\$(\\[[\\s\\S]*?\\])\\$${tag}\\$::jsonb`));
  assert.ok(match, `${tag} JSON seed bloğu bulunamadı`);
  return JSON.parse(match[1]);
}

function camelizeObject(row) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [
    key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
    value
  ]));
}

function canonicalSystemRow(item) {
  const { code, nameTr, category, ...rest } = item;
  return { ...rest, systemCode: code, systemNameTr: nameTr, systemCategory: category };
}

function tableColumns(tableName) {
  const match = sql.match(new RegExp(`create table if not exists public\\.${tableName} \\(\\r?\\n([\\s\\S]*?)\\r?\\n\\);`));
  assert.ok(match, `${tableName} DDL bulunamadı`);
  return match[1].split(/\r?\n/)
    .map((line) => line.trim().match(/^([a-z][a-z0-9_]*)\s/))
    .filter(Boolean)
    .map((matchItem) => matchItem[1])
    .filter((name) => !["unique", "check", "constraint", "primary", "foreign"].includes(name));
}

assert.equal(INSTITUTIONAL_INTEGRATION_REFERENCE_VERSION, "2026-08-20.2");
assert.equal(INSTITUTIONAL_INTEGRATION_SEED_BATCH, "dpu-integration-20260820-01");
assert.equal(dpuInstitutionalSystems.length, 32, "32 kanonik DPÜ sistem kaydı olmalı");
assert.equal(pilotIntegrationMappings.length, 32, "Her kanonik sistem için bir mapping olmalı");
assert.equal(pilotIntegrationScenarios.length, 32, "Her mapping için bir kontrollü pilot senaryosu olmalı");
assert.equal(pilotIntegrationAuditEvents.length, 32, "Her senaryo için bir sentetik audit seed olmalı");

unique(dpuInstitutionalSystems.map((item) => item.id), "Sistem id");
unique(dpuInstitutionalSystems.map((item) => item.code), "Sistem kodu");
unique(dpuInstitutionalSystems.map((item) => item.sourceUrl), "Sistem kaynak URL'si");
unique(pilotIntegrationMappings.map((item) => item.id), "Mapping id");
unique(pilotIntegrationScenarios.map((item) => item.id), "Senaryo id");
unique(pilotIntegrationScenarios.map((item) => item.scenarioOrder), "Senaryo sırası");
unique(pilotIntegrationAuditEvents.map((item) => item.id), "Audit id");
unique(pilotIntegrationAuditEvents.map((item) => item.correlationLabel), "Audit korelasyon etiketi");

const systemIds = new Set(dpuInstitutionalSystems.map((item) => item.id));
const mappingById = new Map(pilotIntegrationMappings.map((item) => [item.id, item]));
const scenarioById = new Map(pilotIntegrationScenarios.map((item) => [item.id, item]));

for (const item of dpuInstitutionalSystems) {
  assert.match(item.publicUrl, /^https:\/\//, `${item.id} public URL HTTPS olmalı`);
  assert.match(item.sourceUrl, /^https:\/\//, `${item.id} source URL HTTPS olmalı`);
  assert.equal(item.registryStatus, "candidate");
  assert.equal(item.integrationContractStatus, "not_verified");
  assert.equal(item.institutionalValidationRequired, true);
  assert.equal(item.publicMetadataOnly, true);
  assert.equal(item.realDataEnabled, false);
  assert.equal(item.realDataSent, false);
  assert.equal(item.secretsStored, false);
  assert.equal(item.productionAllowed, false);
  assert.equal(item.isPublicReference, true);
  assert.ok(["tier1", "tier2", "tier3"].includes(item.integrationTier));
  assert.ok(["core", "supporting", "adjacent"].includes(item.myysRelevance));
  assert.equal(item.catalogVersion, INSTITUTIONAL_INTEGRATION_REFERENCE_VERSION);
  assert.equal(item.seedBatch, INSTITUTIONAL_INTEGRATION_SEED_BATCH);
  assert.ok(Array.isArray(item.masterDataDomains) && item.masterDataDomains.length > 0);
  assert.ok(item.masterDataBoundary.length > 20);
  assert.ok(item.recordOwner.length > 3);
  assert.ok(item.consumerMode.length > 3);
  assert.ok(item.syncMode.length > 3);
  assert.ok(item.conflictPolicy.length > 20);
  assert.equal(typeof item.consultationOnly, "boolean");
}

const requiredPublicUrls = [
  "https://dpusem.dpu.edu.tr/",
  "https://oys.dpu.edu.tr/almsp",
  "https://obs.dpu.edu.tr/oibs/bologna/index.aspx",
  "https://obs.dpu.edu.tr/",
  "https://dilmer.dpu.edu.tr/",
  "https://tomer.dpu.edu.tr/",
  "https://ydyo.dpu.edu.tr/tr/index/duyuru/21623/01-temmuz-2025-ydys-1-asama-sinav-sonuclari-2024-2025"
];
for (const url of requiredPublicUrls) {
  assert.ok(dpuInstitutionalSystems.some((item) => item.publicUrl === url), `${url} katalogda olmalı`);
}

const requiredSpecificSources = new Map([
  ["dpu-portal", "https://haber.dpu.edu.tr/tr/haber_oku/570f85b0a97f8/turkiyenin-en-buyuk-akademik-portali-dpuportal-yayinda"],
  ["dpu-mezun", "https://mezun.dpu.edu.tr/"],
  ["dpu-ebap", "https://ebap.dpu.edu.tr/"],
  ["dpu-ekbys", "https://etikkurul.dpu.edu.tr/"],
  ["dpu-bkys", "https://bkys.dpu.edu.tr/"],
  ["dpu-extra-course", "https://sgtest.dpu.edu.tr/"],
  ["dpu-mobile", "https://www.dpu.edu.tr/index/duyuru/1159/e-yoklama-icin-dpumobil-baglantisi"],
  ["dpu-puantaj", "https://performans.dpu.edu.tr/"]
]);
for (const [id, sourceUrl] of requiredSpecificSources) {
  assert.equal(dpuInstitutionalSystems.find((item) => item.id === id)?.sourceUrl, sourceUrl, `${id} özgül resmî sourceUrl kullanmalı`);
  assert.match(provenanceSql, new RegExp(`\\('${id}',[^\\n]+${sourceUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`), `${id} follow-up provenance migration'ında olmalı`);
}
assert.match(provenanceSql, /updated_rows <> 8/);
assert.doesNotMatch(provenanceSql, /\b(?:grant|create policy|alter policy|enable row level security|disable row level security)\b/i);
assert.doesNotMatch(provenanceSql, /(?:real_data_enabled|real_data_sent|secrets_stored|production_allowed)\s*=\s*true/i);

for (const requiredId of [
  "dpu-kodsis", "dpu-tomer-application", "dpu-tomer-verification", "dpu-form",
  "dpu-software-request", "dpu-ebys", "dpu-ebap", "dpu-ekbys", "dpu-bkys",
  "dpu-mezun", "dpu-portal", "dpu-vetis", "dpu-extra-course", "dpu-ime", "dpu-mobile",
  "dpu-doner-sermaye", "dpu-library-catalog", "dpu-ulmer", "dpu-labsis",
  "dpu-erandevu", "dpu-web-cms", "dpu-kamer", "dpu-puantaj"
]) {
  assert.ok(systemIds.has(requiredId), `${requiredId} keşif kataloğunda olmalı`);
}

const obs = dpuInstitutionalSystems.find((item) => item.id === "dpu-obs");
const bologna = dpuInstitutionalSystems.find((item) => item.id === "dpu-bologna");
const bkys = dpuInstitutionalSystems.find((item) => item.id === "dpu-bkys");
assert.ok(obs.masterDataDomains.includes("earned_ects"));
assert.ok(bologna.masterDataDomains.includes("planned_ects"));
assert.match(bkys.scopeNote, /mali MYS\/MAYS değildir/);
assert.equal(dpuInstitutionalSystems.find((item) => item.id === "dpu-ebys").integrationTier, "tier3");
assert.equal(dpuInstitutionalSystems.find((item) => item.id === "dpu-ebys").myysRelevance, "core");
assert.equal(dpuInstitutionalSystems.find((item) => item.id === "dpu-bologna").integrationTier, "tier1");
assert.equal(dpuInstitutionalSystems.find((item) => item.id === "dpu-bologna").myysRelevance, "core");
assert.equal(dpuInstitutionalSystems.find((item) => item.id === "dpu-obs").integrationTier, "tier2");
assert.equal(dpuInstitutionalSystems.find((item) => item.id === "dpu-obs").myysRelevance, "core");
assert.ok(dpuInstitutionalSystems.filter((item) => item.consultationOnly).length >= 4);

for (const item of pilotIntegrationMappings) {
  assert.ok(systemIds.has(item.systemId), `${item.id} geçerli sisteme bağlanmalı`);
  assert.ok(Array.isArray(item.dataObjects) && item.dataObjects.length > 0);
  assert.ok(["inbound", "outbound", "bidirectional"].includes(item.direction));
  assert.ok(["p0", "p1", "p2"].includes(item.priority));
  assert.equal(item.mappingStatus, "design_draft");
  assert.equal(item.institutionalValidationRequired, true);
  assert.equal(item.realDataEnabled, false);
  assert.equal(item.realDataSent, false);
  assert.equal(item.liveRequestEnabled, false);
  assert.equal(item.productionAllowed, false);
  assert.equal(item.isSynthetic, true);
  assert.ok(item.authoritativeOwner.length > 10);
  assert.match(item.boundaryNote, /MYYS veriyi sahiplenmez/);
  assert.equal(item.catalogVersion, INSTITUTIONAL_INTEGRATION_REFERENCE_VERSION);
  assert.equal(item.seedBatch, INSTITUTIONAL_INTEGRATION_SEED_BATCH);
}

assert.equal(new Set(pilotIntegrationMappings.map((item) => item.systemId)).size, 32);
for (const item of pilotIntegrationScenarios) {
  const mapping = mappingById.get(item.mappingId);
  assert.ok(mapping, `${item.id} mapping'i bulunmalı`);
  assert.equal(item.systemId, mapping.systemId, `${item.id} mapping/system tutarlı olmalı`);
  assert.equal(item.status, "not_executed");
  assert.equal(item.expectedResult, "dry_run_only");
  assert.equal(item.realDataEnabled, false);
  assert.equal(item.realDataSent, false);
  assert.equal(item.liveRequestEnabled, false);
  assert.equal(item.isSynthetic, true);
  assert.equal(item.productionAllowed, false);
  assert.equal(item.catalogVersion, INSTITUTIONAL_INTEGRATION_REFERENCE_VERSION);
  assert.equal(item.seedBatch, INSTITUTIONAL_INTEGRATION_SEED_BATCH);
}

for (const item of pilotIntegrationAuditEvents) {
  const scenario = scenarioById.get(item.scenarioId);
  assert.ok(scenario, `${item.id} senaryosu bulunmalı`);
  assert.equal(item.mappingId, scenario.mappingId);
  assert.equal(item.systemId, scenario.systemId);
  assert.equal(item.eventType, "catalog_seeded");
  assert.equal(item.outcome, "not_executed");
  assert.equal(item.realDataSent, false);
  assert.equal(item.liveRequestMade, false);
  assert.equal(item.hasPersonalIdentifiers, false);
  assert.equal(item.isSynthetic, true);
  assert.equal(item.institutionalValidationRequired, true);
  assert.equal(item.realDataEnabled, false);
  assert.equal(item.productionAllowed, false);
  assert.equal(item.catalogVersion, INSTITUTIONAL_INTEGRATION_REFERENCE_VERSION);
  assert.equal(item.seedBatch, INSTITUTIONAL_INTEGRATION_SEED_BATCH);
}

assert.deepEqual(dpuIntegrationReferenceSnapshot.boundaries, {
  productionAllowed: false,
  realDataEnabled: false,
  liveRequestsEnabled: false,
  liveInstitutionalRequestsEnabled: false,
  secretsStored: false,
  automaticDiscoveryEnabled: false,
  institutionalValidationRequired: true
});

assert.equal((sql.match(/create table if not exists public\./g) || []).length, 4);
assert.equal((sql.match(/create or replace view public\./g) || []).length, 4);
assert.equal((sql.match(/with \(security_invoker = true\)/g) || []).length, 4);
assert.equal((sql.match(/enable row level security;/g) || []).length, 4);
assert.equal((sql.match(/force row level security;/g) || []).length, 4);
assert.equal((sql.match(/create policy /g) || []).length, 4);
assert.equal((sql.match(/grant select on table public\./g) || []).length, 8);
assert.doesNotMatch(sql, /\b(api_endpoint|access_token|service_role_key|password_hash|client_secret)\b/i);
assert.match(sql, /integration_contract_status text not null check \(integration_contract_status = 'not_verified'\)/);
assert.match(sql, /real_data_enabled boolean not null default false check \(not real_data_enabled\)/);
assert.match(sql, /real_data_sent boolean not null default false check \(not real_data_sent\)/);
assert.doesNotMatch(sql, /integration_tier\s*=\s*'tier1'[\s\S]{0,120}myys_relevance\s*=\s*'core'/, "Tier ve MYYS relevance SQL CHECK ile eşlenmemeli");

const sqlSystems = extractJsonSeed("systems");
const sqlMappings = extractJsonSeed("mappings");
const sqlScenarios = extractJsonSeed("scenarios");
const sqlAudits = extractJsonSeed("audits");
assert.equal(sqlSystems.length, dpuInstitutionalSystems.length);
assert.equal(sqlMappings.length, pilotIntegrationMappings.length);
assert.equal(sqlScenarios.length, pilotIntegrationScenarios.length);
assert.equal(sqlAudits.length, pilotIntegrationAuditEvents.length);
assert.deepEqual(sqlSystems.map((item) => item.id), dpuInstitutionalSystems.map((item) => item.id));
assert.deepEqual(sqlMappings.map((item) => item.id), pilotIntegrationMappings.map((item) => item.id));
assert.deepEqual(sqlScenarios.map((item) => item.id), pilotIntegrationScenarios.map((item) => item.id));
assert.deepEqual(sqlAudits.map((item) => item.id), pilotIntegrationAuditEvents.map((item) => item.id));
assert.deepEqual(sqlSystems.map(camelizeObject), dpuInstitutionalSystems.map(canonicalSystemRow), "System JS/SQL field parity");
assert.deepEqual(sqlMappings.map(camelizeObject), pilotIntegrationMappings, "Mapping JS/SQL field parity");
assert.deepEqual(sqlScenarios.map(camelizeObject), pilotIntegrationScenarios, "Scenario JS/SQL field parity");
assert.deepEqual(sqlAudits.map(camelizeObject), pilotIntegrationAuditEvents, "Audit JS/SQL field parity");

const registryColumns = tableColumns("institutional_system_registry");
const mappingColumns = tableColumns("pilot_integration_mappings");
const scenarioColumns = tableColumns("pilot_integration_scenarios");
const auditColumns = tableColumns("pilot_integration_audit_events");
assert.deepEqual(new Set(registryColumns), new Set(Object.keys(sqlSystems[0])), "Registry DDL/seed columns");
assert.deepEqual(new Set(mappingColumns), new Set(Object.keys(sqlMappings[0])), "Mapping DDL/seed columns");
assert.deepEqual(new Set(scenarioColumns), new Set(Object.keys(sqlScenarios[0])), "Scenario DDL/seed columns");
assert.deepEqual(new Set(auditColumns), new Set(Object.keys(sqlAudits[0])), "Audit DDL/seed columns");
assert.match(sql, /select \* from public\.institutional_system_registry/);
assert.match(sql, /select m\.\*, s\.system_code, s\.system_name_tr, s\.integration_tier, s\.myys_relevance/);
assert.match(sql, /select c\.\*, s\.system_code, s\.system_name_tr/);
assert.match(sql, /select a\.\*, s\.system_code/);
assert.ok(sqlSystems.every((item) => item.integration_contract_status === "not_verified"));
assert.ok(sqlMappings.every((item) => item.real_data_enabled === false && item.real_data_sent === false));
assert.ok(sqlScenarios.every((item) => item.live_request_enabled === false));
assert.ok(sqlAudits.every((item) => item.has_personal_identifiers === false));

for (const view of [
  "institutional_system_catalog", "pilot_integration_mapping_catalog",
  "pilot_integration_scenario_catalog", "pilot_integration_audit_catalog"
]) {
  assert.match(supabaseAdapter, new RegExp(`\\["${view}"`), `${view} Supabase adaptöründe okunmalı`);
}
assert.match(supabaseAdapter, /export async function loadInstitutionalIntegrationSnapshot/);
assert.match(supabaseAdapter, /institutionalData/);
assert.match(supabaseAdapter, /local_institutional_reference_fallback/);
assert.match(supabaseAdapter, /validateInstitutionalRemoteSnapshot/);
assert.match(supabaseAdapter, /remoteAccepted \? remote\.systems : fallback\.systems/);
assert.match(supabaseAdapter, /liveInstitutionalRequestsEnabled: false/);

const systemSeedById = new Map(sqlSystems.map((item) => [item.id, item]));
const validViewRows = {
  institutional_system_catalog: sqlSystems,
  pilot_integration_mapping_catalog: sqlMappings.map((item) => ({
    ...item,
    system_code: systemSeedById.get(item.system_id).system_code,
    system_name_tr: systemSeedById.get(item.system_id).system_name_tr,
    integration_tier: systemSeedById.get(item.system_id).integration_tier,
    myys_relevance: systemSeedById.get(item.system_id).myys_relevance
  })),
  pilot_integration_scenario_catalog: sqlScenarios.map((item) => ({
    ...item,
    system_code: systemSeedById.get(item.system_id).system_code,
    system_name_tr: systemSeedById.get(item.system_id).system_name_tr
  })),
  pilot_integration_audit_catalog: sqlAudits.map((item) => ({
    ...item,
    system_code: systemSeedById.get(item.system_id).system_code
  }))
};

const originalFetch = globalThis.fetch;
let mockedViewRows = structuredClone(validViewRows);
globalThis.fetch = async (url) => {
  const view = Object.keys(validViewRows).find((name) => String(url).includes(`/rest/v1/${name}?`));
  assert.ok(view, `Beklenmeyen institutional view isteği: ${url}`);
  return { ok: true, status: 200, json: async () => mockedViewRows[view] };
};
try {
  const acceptedSnapshot = await loadInstitutionalIntegrationSnapshot({ accessToken: "test.claim.scoped.jwt" });
  assert.equal(acceptedSnapshot.ok, true, "İlişkisel olarak tutarlı remote snapshot kabul edilmeli");
  assert.equal(acceptedSnapshot.source, "supabase_read_only_institutional_views");

  mockedViewRows = structuredClone(validViewRows);
  mockedViewRows.pilot_integration_scenario_catalog[0].system_id = sqlScenarios[1].system_id;
  const rejectedSnapshot = await loadInstitutionalIntegrationSnapshot({ accessToken: "test.claim.scoped.jwt" });
  assert.equal(rejectedSnapshot.ok, false, "Mapping/system ilişkisi bozuk remote snapshot reddedilmeli");
  assert.equal(rejectedSnapshot.source, "local_institutional_reference_fallback");
  assert.match(rejectedSnapshot.validationErrors.join(" | "), /relationship mismatch/);
  assert.deepEqual(rejectedSnapshot.scenarios.map((item) => item.id), pilotIntegrationScenarios.map((item) => item.id), "Reddedilen remote snapshot yerine tam local fallback seçilmeli");
} finally {
  globalThis.fetch = originalFetch;
}

console.log("PASS institutional integration contract");
console.log(`  ${dpuInstitutionalSystems.length} systems / ${pilotIntegrationMappings.length} mappings / ${pilotIntegrationScenarios.length} scenarios / ${pilotIntegrationAuditEvents.length} audit events`);
console.log("  4 RLS tables / 4 security_invoker views / SELECT-only public catalog");
