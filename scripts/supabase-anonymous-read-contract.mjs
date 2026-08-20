import assert from "node:assert/strict";
import {
  createSupabaseReadContext,
  getLocalDirectivePilotCatalog,
  loadDirectivePilotSnapshot,
  loadPilotSnapshot,
  loadPublicOfficialSourceSnapshot,
  validatePublicOfficialSourceSnapshot
} from "../src/supabase.js";
import { directiveRoleScopeRows } from "../src/directive-pilot.js";

const publicSourceRows = Array.from({ length: 27 }, (_, index) => {
  const id = `S${String(index + 1).padStart(2, "0")}`;
  return {
    source_id: id,
    title: `Resmî kaynak ${id}`,
    issuing_institution: "SENTETİK TEST KURUMU",
    source_date_label: "2026",
    publication_date: "2026-01-01",
    version_or_decision_no: `TEST-${id}`,
    source_url: `https://example.gov.tr/${id.toLowerCase()}`,
    accessed_on: "2026-08-20",
    supported_topics: ["test"],
    source_hash: `sha256:${id.toLowerCase()}`,
    hash_basis: "canonical_url",
    official_primary_source: true,
    verification_status: "verified",
    institutional_validation_required: true
  };
});

const publicSupportRows = Array.from({ length: 33 }, (_, index) => ({
  id: `SOURCE-SUPPORT-${String(index + 1).padStart(2, "0")}`,
  source_id: `S${String((index % 27) + 1).padStart(2, "0")}`,
  source_title: "Resmî kaynak",
  directive_version_id: null,
  rule_parameter_id: null,
  link_type: "supports",
  clause_reference: `Madde ${index + 1}`,
  supported_topics: ["test"],
  traceability_note: "Kamuya açık test izi",
  institutional_validation_required: true
}));

function publicResponseFor(url) {
  const value = String(url);
  if (value.includes("/pilot_directive_public_source_catalog?")) return publicSourceRows;
  if (value.includes("/pilot_directive_public_source_support_catalog?")) return publicSupportRows;
  return null;
}

const anonymousRequests = [];
const anonymousFetch = async (url, options) => {
  anonymousRequests.push({ url: String(url), headers: options.headers });
  const payload = publicResponseFor(url);
  assert.ok(payload, `Anonymous path requested non-allowlisted relation: ${url}`);
  assert.equal(options.headers.Authorization, undefined, "Anonymous request must not forge a Bearer session from the publishable key");
  assert.match(options.headers.apikey, /^sb_publishable_/, "Anonymous request must use only the public project key");
  return { ok: true, status: 200, json: async () => structuredClone(payload) };
};

const anonymousSnapshot = await loadPilotSnapshot({ fetchImpl: anonymousFetch });
assert.equal(anonymousRequests.length, 2, "Anonymous bootstrap must perform exactly two allowlisted reads");
assert.deepEqual(
  new Set(anonymousRequests.map(({ url }) => new URL(url).pathname.split("/").at(-1))),
  new Set(["pilot_directive_public_source_catalog", "pilot_directive_public_source_support_catalog"]),
  "Anonymous network surface must equal the two official-source catalogs"
);
assert.equal(anonymousSnapshot.accessMode, "anonymous_public_reference_only");
assert.equal(anonymousSnapshot.protectedViewsRequested, false);
assert.equal(anonymousSnapshot.protectedRemoteVerified, false);
assert.equal(anonymousSnapshot.coreRemoteVerified, false);
assert.equal(anonymousSnapshot.publicSourceData.remoteVerified, true);
assert.equal(anonymousSnapshot.publicSourceData.sources.length, 27);
assert.equal(anonymousSnapshot.publicSourceData.supports.length, 33);
assert.equal(anonymousSnapshot.referenceData.remoteVerified, false);
assert.equal(anonymousSnapshot.referenceData.protectedViewsRequested, false);
assert.equal(anonymousSnapshot.institutionalData.remoteVerified, false);
assert.equal(anonymousSnapshot.institutionalData.protectedViewsRequested, false);
assert.equal(anonymousSnapshot.directiveData.remoteVerified, false);
assert.equal(anonymousSnapshot.directiveData.protectedViewsRequested, false);
assert.equal(anonymousSnapshot.directiveData.fallbackUsed, true);
assert.deepEqual(anonymousSnapshot.directiveData.governance, directiveRoleScopeRows, "Anonymous fallback must preserve the exact nine-role DTO spine");
assert.equal(anonymousSnapshot.directiveData.governance.length, 9);
assert.ok(anonymousSnapshot.referenceData.learningOutcomeSuggestions.length > 0, "Protected smart DTO fallback must remain deterministic and complete");
assert.ok(anonymousSnapshot.institutionalData.systems.length > 0, "Protected institutional DTO fallback must remain deterministic and complete");

const secondAnonymousRequests = [];
const secondAnonymousSnapshot = await loadPilotSnapshot({
  fetchImpl: async (url, options) => {
    secondAnonymousRequests.push(String(url));
    assert.equal(options.headers.Authorization, undefined);
    return { ok: true, status: 200, json: async () => structuredClone(publicResponseFor(url)) };
  }
});
assert.equal(secondAnonymousRequests.length, 2);
assert.deepEqual(secondAnonymousSnapshot.referenceData, anonymousSnapshot.referenceData, "Anonymous qualification fallback must be deterministic");
assert.deepEqual(secondAnonymousSnapshot.institutionalData, anonymousSnapshot.institutionalData, "Anonymous institutional fallback must be deterministic");
assert.deepEqual(secondAnonymousSnapshot.directiveData.governance, anonymousSnapshot.directiveData.governance, "Anonymous role DTO fallback must be deterministic");

const failedPublicRequests = [];
const failedPublicSnapshot = await loadPilotSnapshot({
  fetchImpl: async (url, options) => {
    failedPublicRequests.push(String(url));
    assert.equal(options.headers.Authorization, undefined);
    const payload = publicResponseFor(url);
    return String(url).includes("public_source_support")
      ? { ok: false, status: 401, json: async () => ({}) }
      : { ok: true, status: 200, json: async () => structuredClone(payload) };
  }
});
assert.equal(failedPublicRequests.length, 2, "A failed public catalog read must not trigger protected retries");
assert.equal(failedPublicSnapshot.ok, false);
assert.equal(failedPublicSnapshot.protectedViewsRequested, false);
assert.equal(failedPublicSnapshot.directiveData.remoteVerified, false);
assert.deepEqual(failedPublicSnapshot.directiveData.governance, directiveRoleScopeRows);

const malformed = { sources: structuredClone(publicSourceRows).map((row) => ({
  ...row,
  sourceId: row.source_id,
  officialPrimarySource: row.official_primary_source,
  institutionalValidationRequired: row.institutional_validation_required,
  sourceUrl: row.source_url
})), supports: structuredClone(publicSupportRows).map((row) => ({
  ...row,
  sourceId: row.source_id,
  institutionalValidationRequired: row.institutional_validation_required
})) };
malformed.sources[0].holder_internal_ref = "12345678901";
assert.ok(validatePublicOfficialSourceSnapshot(malformed).some((error) => error.includes("identity-bearing")), "Public catalog validator must reject identity-bearing fields");

const directiveFallback = getLocalDirectivePilotCatalog();
const directiveViewRows = {
  pilot_directive_policy_catalog: directiveFallback.policyVersions,
  pilot_directive_rule_catalog: directiveFallback.rules,
  pilot_directive_role_scope_catalog: directiveFallback.governance,
  pilot_directive_program_compliance_catalog: directiveFallback.programs,
  pilot_directive_recognition_catalog: directiveFallback.recognitionDecisions,
  pilot_directive_commission_catalog: directiveFallback.commission,
  pilot_directive_credential_public_catalog: directiveFallback.publicCredentials,
  pilot_directive_award_state_catalog: directiveFallback.awardStates,
  pilot_directive_quality_finance_catalog: directiveFallback.qualityFinance,
  pilot_directive_readiness_catalog: directiveFallback.readiness
};
const authenticatedRequests = [];
const authenticatedFetch = async (url, options) => {
  authenticatedRequests.push(String(url));
  assert.equal(options.headers.Authorization, "Bearer test.claim.scoped.jwt", "Explicit session token must be forwarded only on the authenticated path");
  const publicPayload = publicResponseFor(url);
  if (publicPayload) return { ok: true, status: 200, json: async () => structuredClone(publicPayload) };
  const view = Object.keys(directiveViewRows).find((name) => String(url).includes(`/rest/v1/${name}?`));
  assert.ok(view, `Unexpected authenticated directive view: ${url}`);
  return { ok: true, status: 200, json: async () => structuredClone(directiveViewRows[view]) };
};
const authenticatedDirective = await loadDirectivePilotSnapshot({ accessToken: "test.claim.scoped.jwt", fetchImpl: authenticatedFetch });
assert.equal(authenticatedDirective.accessMode, "authenticated_claim_scoped");
assert.equal(authenticatedDirective.protectedViewsRequested, true);
assert.equal(authenticatedDirective.remoteVerified, true);
assert.equal(authenticatedRequests.length, 12, "Authenticated directive path must read two public plus ten scoped views");
assert.deepEqual(authenticatedDirective.governance, directiveRoleScopeRows, "Authenticated and fallback role DTOs must have exact parity");

const anonymousContext = createSupabaseReadContext({ fetchImpl: anonymousFetch });
const authenticatedContext = createSupabaseReadContext({ accessToken: "test.claim.scoped.jwt", fetchImpl: authenticatedFetch });
assert.equal(anonymousContext.authenticated, false);
assert.equal(authenticatedContext.authenticated, true);

const publicOnly = await loadPublicOfficialSourceSnapshot({ fetchImpl: anonymousFetch });
assert.equal(publicOnly.remoteVerified, true);
assert.equal(publicOnly.protectedDataIncluded, false);
assert.equal(publicOnly.realIdentityDataIncluded, false);

console.log("supabase anonymous read contract: PASS (anon=2 public views, protected fallback unverified, authenticated path preserved)");
