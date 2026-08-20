import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { consultationOnlyIntegrationIds, externalPilotIntegrationGates, initialState, integrationMasterDataOwnership, pageMeta, roleNavigation, roles } from "../src/data.js";
import {
  actorNameForRole,
  canRecordAssessmentDecision,
  canViewApplication,
  cloneState,
  createApplication,
  filterApplicationsForRole,
  getAllowedApplicationTransitions,
  issueCredential,
  ownsApplication,
  recordAssessmentDecision,
  reviewPaymentRequest,
  runIntegrationBulkDryRun,
  runIntegrationDryRun,
  runScenarioStep,
  scenarioDefinitions,
  startPaymentRequest,
  submitPaymentRequest,
  transitionApplication,
  visibleApplicationsForRole,
  visiblePaymentRequestsForRole,
  visibleProgramsForRole
} from "../src/workflow.js";
import {
  findQualificationDescriptor,
  findQualificationTemplate,
  qualificationFrameworks,
  qualificationLevelDescriptors,
  qualificationMatrixColumns,
  qualificationMatrixExamples,
  qualificationMatrixTemplates
} from "../src/reference-data.js";
import {
  dpuInstitutionalSystems,
  pilotIntegrationAuditEvents,
  pilotIntegrationMappings,
  pilotIntegrationScenarios
} from "../src/institutional-integration-reference.js";
import {
  DIRECTIVE_PILOT_NOTICE,
  cloneDirectivePilotState,
  createFinancePersonnelDryRun,
  createPublicCredentialView,
  ectsWorkloadBands,
  euMicroCredentialMandatoryFields,
  evaluatePilotRule,
  generateMydCode,
  directiveRoleScopeRows,
  organizationScopes,
  policyVersionRegistry,
  recordRecognitionDecision,
  requestOfferingSeat,
  splitCredentialOutcomes,
  submitIndependentAppeal,
  validateCommissionMeeting,
  validateEctsWorkload,
  validateEk1Credential,
  versionedPilotRules,
  workloadComponents
} from "../src/directive-pilot.js";

const results = [];

function test(name, callback) {
  try {
    callback();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error });
  }
}

function codes(items) {
  return items.map((item) => item.code).sort();
}

function activeAssessmentState() {
  const state = cloneState(initialState);
  state.assessmentSessions.unshift({
    id: "ASM-NINE-ROLE-TEST",
    enrollmentId: "ENR-TEST",
    title: "Dokuz rol değerlendirme testi",
    status: "under_review",
    score: null,
    evaluatorDecision: null,
    events: 2
  });
  return state;
}

test("dokuz rol benzersiz ve bütün navigasyon hedefleri tanımlı", () => {
  assert.equal(roles.length, 9);
  assert.equal(new Set(roles.map((role) => role.id)).size, 9);
  assert.equal(new Set(roles.map((role) => role.name)).size, 9);
  assert.deepEqual(roles.map((role) => role.id), [
    "learner", "instructor", "externalInstructor", "coordinator", "commission",
    "studentAffairs", "it", "finance", "admin"
  ]);
  for (const role of roles) {
    assert.ok(roleNavigation[role.id]?.includes("overview"), `${role.id}: overview eksik`);
    for (const page of roleNavigation[role.id]) assert.ok(pageMeta[page], `${role.id}: ${page} metadata eksik`);
  }
  assert.ok(roleNavigation.learner.includes("payments"), "öğrenen ödeme demo rotası eksik");
  assert.ok(roleNavigation.finance.includes("notifications"), "mali işler bildirim rotası eksik");
});

test("rol kimliği ile sentetik aktör adı birebir eşleşiyor", () => {
  for (const role of roles) assert.equal(actorNameForRole(role.id), role.name, role.id);
});

test("TYÇ, AYÇ ve TYYÇ desteklenen düzeylerde kaynak izli tanımlayıcı ve hazır şablon sağlıyor", () => {
  assert.deepEqual(qualificationFrameworks.map((item) => item.id), ["tyc", "eqf", "tyyc"]);
  assert.ok(qualificationFrameworks.every((item) => item.sourceStatus === "official" && /^https:\/\//.test(item.officialSourceUrl)));
  for (const frameworkId of ["tyc", "eqf", "tyyc"]) {
    const descriptors = qualificationLevelDescriptors.filter((item) => item.frameworkId === frameworkId);
    const templates = qualificationMatrixTemplates.filter((item) => item.frameworkId === frameworkId);
    const expectedLevels = frameworkId === "tyyc" ? [5, 6, 7, 8] : [1, 2, 3, 4, 5, 6, 7, 8];
    assert.equal(descriptors.length, expectedLevels.length, `${frameworkId}: seviye tanımlayıcısı eksik`);
    assert.deepEqual(descriptors.map((item) => item.level), expectedLevels, `${frameworkId}: seviye dizisi hatalı`);
    assert.equal(templates.length, expectedLevels.length, `${frameworkId}: matris şablonu eksik`);
    for (const level of expectedLevels) {
      const descriptor = findQualificationDescriptor(frameworkId, level);
      const template = findQualificationTemplate(frameworkId, level);
      assert.ok(descriptor, `${frameworkId}-${level}: tanımlayıcı bulunamadı`);
      assert.ok(template, `${frameworkId}-${level}: şablon bulunamadı`);
      for (const field of ["knowledge", "skills", "competence"]) {
        assert.ok(String(descriptor[field]).trim().length >= 10, `${frameworkId}-${level}: ${field} boş`);
      }
      assert.equal(template.level, level);
      assert.equal(template.institutionalValidationRequired, true);
      assert.equal(template.isSyntheticTemplate, true);
      assert.equal(template.columns.length, qualificationMatrixColumns.length);
    }
  }
  assert.equal(qualificationMatrixColumns.length, 7);
  assert.ok(qualificationMatrixColumns.every((column) => column.required === true));
  assert.equal(qualificationMatrixExamples.filter((item) => item.frameworkId === "tyc").length, 4);
  assert.equal(qualificationMatrixExamples.filter((item) => item.frameworkId === "eqf").length, 4);
  assert.equal(qualificationMatrixExamples.filter((item) => item.frameworkId === "tyyc").length, 4);
  assert.ok(qualificationLevelDescriptors.filter((item) => item.frameworkId === "tyyc").every((item) => item.contentBasis === "official_form_operational_summary" && item.descriptorStatus === "advisory_summary_not_verbatim"));
});

test("TYÇ / AYÇ / TYYÇ matris rotası yalnız beş yetkili rol navigasyonunda", () => {
  const expected = ["instructor", "externalInstructor", "coordinator", "commission", "admin"];
  const actual = roles.filter((role) => roleNavigation[role.id].includes("frameworks")).map((role) => role.id);
  assert.deepEqual(actual, expected);
  assert.equal(pageMeta.frameworks.label, "TYÇ / AYÇ / TYYÇ Matrisleri");
  for (const roleId of ["learner", "studentAffairs", "it", "finance"]) {
    assert.equal(roleNavigation[roleId].includes("frameworks"), false, `${roleId}: yetkisiz frameworks rotası`);
  }
});

test("DPÜ entegrasyon UI kataloğu canonical sistem sözleşmesiyle birebir hizalı", () => {
  const canonicalCount = dpuInstitutionalSystems.length;
  const canonicalById = new Map(dpuInstitutionalSystems.map((item) => [item.id, item]));
  assert.ok(canonicalCount > 0, "kurumsal sistem kataloğu boş olamaz");
  assert.equal(pilotIntegrationMappings.length, canonicalCount);
  assert.equal(pilotIntegrationScenarios.length, canonicalCount);
  assert.equal(pilotIntegrationAuditEvents.length, canonicalCount);
  assert.deepEqual(
    initialState.integrations.map((item) => item.id).sort(),
    dpuInstitutionalSystems.map((item) => item.id).sort()
  );
  assert.equal(initialState.integrations.length, canonicalCount);
  for (const item of initialState.integrations) {
    const canonical = canonicalById.get(item.id);
    assert.ok(canonical, `${item.id}: canonical sistem kaydı bulunamadı`);
    for (const key of ["category", "systemClass", "owner", "sourceStatus", "purposeProposal", "dataDirection", "approvalGate", "errorScenario", "retryPolicy", "auditPolicy"]) {
      assert.ok(String(item[key]).trim(), `${item.id}: ${key} eksik`);
    }
    assert.match(item.sourceUrl, /^https:\/\//, `${item.id}: kamu kaynak URL'si eksik`);
    assert.equal(item.sourceUrl, canonical.sourceUrl, `${item.id}: UI canonical sourceUrl kullanmalı`);
    assert.ok([1, 2, 3].includes(item.stage), `${item.id}: tier/katman hatalı`);
    assert.equal(item.integrationTier, `tier${item.stage}`);
    assert.ok(["core", "supporting", "adjacent"].includes(item.myysRelevance));
    assert.equal(item.samplePayload.mode, "dry-run");
    assert.equal(item.samplePayload.realData, false);
    assert.equal(item.realDataEnabled, false);
    assert.ok(item.operatorRoles.includes("it") && item.operatorRoles.includes("admin"));
  }
  const ebys = initialState.integrations.find((item) => item.id === "dpu-ebys");
  assert.deepEqual([ebys?.integrationTier, ebys?.myysRelevance], ["tier3", "core"], "Tier ile MYYS önemi bağımsız modellenmiyor");
});

test("kullanıcının verdiği yedi DPÜ kaynağı ve geniş otomasyon envanteri canonical katalogda", () => {
  const urls = new Set(dpuInstitutionalSystems.map((item) => item.publicUrl));
  for (const url of [
    "https://dpusem.dpu.edu.tr/", "https://oys.dpu.edu.tr/almsp", "https://obs.dpu.edu.tr/oibs/bologna/index.aspx",
    "https://obs.dpu.edu.tr/", "https://dilmer.dpu.edu.tr/", "https://tomer.dpu.edu.tr/",
    "https://ydyo.dpu.edu.tr/tr/index/duyuru/21623/01-temmuz-2025-ydys-1-asama-sinav-sonuclari-2024-2025"
  ]) assert.ok(urls.has(url), `${url}: katalogda yok`);
  for (const id of [
    "dpu-bkys", "dpu-kodsis", "dpu-ebys", "dpu-ebap", "dpu-ekbys", "dpu-vetis", "dpu-ime", "dpu-extra-course", "dpu-mobile", "dpu-form", "dpu-software-request",
    "dpu-doner-sermaye", "dpu-library-catalog", "dpu-ulmer", "dpu-labsis", "dpu-erandevu", "dpu-web-cms", "dpu-kamer", "dpu-puantaj"
  ]) {
    assert.ok(initialState.integrations.some((item) => item.id === id), `${id}: geniş envanterde yok`);
  }
  assert.ok(consultationOnlyIntegrationIds.every((id) => initialState.integrations.some((item) => item.id === id)));
  assert.equal(integrationMasterDataOwnership.length, dpuInstitutionalSystems.filter((item) => item.masterDataDomains.length).length);
  assert.deepEqual(integrationMasterDataOwnership.slice(0, 7).map((item) => item.systemId), [
    "dpu-central-identity", "dpu-obs", "dpu-bologna", "dpu-oys", "dpu-bkys", "dpu-ebys", "dpu-doner-sermaye"
  ]);
  assert.ok(integrationMasterDataOwnership.every((item) => !item.domain.includes("_")), "ana-veri alanlarından Türkçeleştirilmemiş canonical anahtar sızdı");
  assert.ok(integrationMasterDataOwnership.some((item) => item.systemId === "dpu-bkys"), "BKYS canonical ana-veri sahipliği görünümünde yok");
  assert.ok(externalPilotIntegrationGates.some((item) => item.name === "Mali MYS / MAYS"));
  assert.ok(externalPilotIntegrationGates.some((item) => item.name === "YÖKSİS / TÖMERSİS" && item.boundary.includes("canlı entegrasyon")));
});

test("entegrasyon dry-run rol kapısı, hata-retry ve audit zinciri gerçek veri göndermiyor", () => {
  const studentState = cloneState(initialState);
  assert.throws(() => runIntegrationDryRun(studentState, "dpu-ebys", "studentAffairs", actorNameForRole("studentAffairs")), /dry-run/);
  const first = runIntegrationDryRun(studentState, "dpu-obs", "studentAffairs", actorNameForRole("studentAffairs"));
  assert.equal(first.job.status, "simulation_failed");
  assert.equal(first.job.retryAvailable, true);
  assert.equal(first.job.realDataSent, false);
  assert.equal(first.job.target, "dpu-obs");
  assert.equal(first.job.targetLabel, studentState.integrations.find((item) => item.id === "dpu-obs")?.name);
  const second = runIntegrationDryRun(studentState, "dpu-obs", "studentAffairs", actorNameForRole("studentAffairs"));
  assert.equal(second.job.status, "simulation_succeeded");
  assert.equal(second.job.retryAvailable, false);
  assert.ok(studentState.audit.some((item) => item.entityId === "INT-dpu-obs" && item.reason.includes("realDataSent=false")));

  const coordinatorState = cloneState(initialState);
  assert.doesNotThrow(() => runIntegrationDryRun(coordinatorState, "dpu-oys", "coordinator", actorNameForRole("coordinator")));
  const financeState = cloneState(initialState);
  assert.doesNotThrow(() => runIntegrationDryRun(financeState, "dpu-extra-course", "finance", actorNameForRole("finance")));
  const bulkState = cloneState(initialState);
  const jobs = runIntegrationBulkDryRun(bulkState, "it", actorNameForRole("it"));
  assert.equal(jobs.length, bulkState.integrations.filter((item) => item.consultationOnly === false).length);
  assert.ok(jobs.every((job) => job.realDataSent === false && job.status === "simulation_succeeded"));
  assert.ok(jobs.every((job) => job.target === job.targetId && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(job.target) && job.targetLabel));
  const consultationId = consultationOnlyIntegrationIds.find((id) => bulkState.integrations.some((item) => item.id === id));
  assert.ok(consultationId, "istişare-only canonical kayıt bulunamadı");
  assert.throws(() => runIntegrationDryRun(bulkState, consultationId, "it", actorNameForRole("it")), /dry-run/);
  assert.equal(bulkState.integrationJobs.some((job) => job.targetId === consultationId), false, "istişare-only kayda aktarım dry-run logu yazıldı");
  assert.throws(() => runIntegrationBulkDryRun(cloneState(initialState), "coordinator", actorNameForRole("coordinator")), /yalnız Bilgi İşlem/);
});

test("öğrenen ödeme demosu mali ön onay ve mutabakatla pilot eğitime dönüşüyor", () => {
  const state = cloneState(initialState);
  state.finance.paymentRequests = [];
  const program = state.programs.find((item) => item.id === "program-green-skills");
  const request = startPaymentRequest(state, program.id, "learner", actorNameForRole("learner"));
  assert.equal(request.status, "draft");
  assert.equal(request.realPayment, false);
  assert.deepEqual(visiblePaymentRequestsForRole(state, "learner", actorNameForRole("learner")).map((item) => item.id), [request.id]);
  assert.equal(visiblePaymentRequestsForRole(state, "instructor", actorNameForRole("instructor")).length, 0);

  submitPaymentRequest(state, request.id, "Havale/EFT simülasyonu", "learner", actorNameForRole("learner"));
  assert.equal(request.status, "pending_finance");
  assert.ok(state.notifications.some((item) => item.recipientRoles.includes("finance") && item.body.includes(request.id)));

  reviewPaymentRequest(state, request.id, "approved", "finance", "Sentetik mali ön kontrol tamamlandı", actorNameForRole("finance"));
  assert.equal(request.status, "approved");
  reviewPaymentRequest(state, request.id, "reconciled", "finance", "Mutabakat yalnız pilot kayıtla tamamlandı", actorNameForRole("finance"));
  assert.equal(request.status, "reconciled");
  assert.equal(request.enrollmentCreated, true);
  assert.ok(state.finance.transactions.some((item) => item.paymentRequestId === request.id && item.status === "matched"));
  assert.ok(state.enrollments.some((item) => item.programCode === program.code && item.learner === actorNameForRole("learner")));
  assert.ok(state.audit.some((item) => item.entityId === request.id && item.actorRole === "finance" && item.to === "reconciled"));
});

test("ödeme demo RBAC ve canlı ödeme sınırı mutasyon katmanında korunuyor", () => {
  const state = cloneState(initialState);
  state.finance.paymentRequests = [];
  const program = state.programs.find((item) => item.id === "program-green-skills");
  assert.throws(() => startPaymentRequest(state, program.id, "finance", actorNameForRole("finance")), /yalnız öğrenen/);
  const request = startPaymentRequest(state, program.id, "learner", actorNameForRole("learner"));
  assert.throws(() => submitPaymentRequest(state, request.id, "Gerçek kredi kartı", "learner", actorNameForRole("learner")), /geçerli bir pilot/i);
  submitPaymentRequest(state, request.id, "Sanal POS simülasyonu", "learner", actorNameForRole("learner"));
  assert.throws(() => reviewPaymentRequest(state, request.id, "approved", "admin", "Yetkisiz mali karar", actorNameForRole("admin")), /yalnız Finans/);
  assert.equal(request.realPayment, false);
});

test("arayüz domain yetki sınırlarını ve aynı-hash anlık render korumasını kullanıyor", () => {
  const appSource = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
  const htmlSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const styleSource = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  for (const symbol of [
    "filterApplicationsForRole", "visibleProgramsForRole", "getAllowedApplicationTransitions",
    "canRecordAssessmentDecision", "recordAssessmentDecision"
  ]) assert.match(appSource, new RegExp(`\\b${symbol}\\b`), `${symbol} arayüzde kullanılmıyor`);
  assert.match(appSource, /window\.location\.hash === nextHash\) render\(\)/, "aynı hash rol değişimi render koruması yok");
  assert.match(appSource, /hasCanonicalIntegrationCatalog\(saved\.integrations\)/, "eski veya eksik entegrasyon kataloğunu reddeden kalıcılık koruması yok");
  assert.match(appSource, /notificationButton\.hidden = !notificationAllowed/, "bildirim CTA rol kapısı yok");
  assert.match(appSource, /state\.roleId === "learner"[^\n]+data-nav="catalog"/, "katalog CTA öğrenen kapısı yok");
  assert.match(appSource, /actorRole:\s*state\.roleId/, "başvuru oluştururken etkin rol domain katmanına aktarılmıyor");
  assert.match(appSource, /program\.status !== "active" \|\| !visiblePrograms\(\)\.some/, "öğrenen kayıt mutasyonunda görünür ve aktif program kapısı yok");
  assert.match(appSource, /GİB \/ e-Arşiv taslak kapısı/, "ana sayfada GİB\/e-Arşiv açıklaması yok");
  assert.match(appSource, /MYS \/ MAYS kontrollü aktarım taslağı/, "ana sayfada MYS\/MAYS açıklaması yok");
  assert.match(appSource, /Finans \/ Döner Sermaye'ye gönder/, "öğrenen ödeme demosunda mali işlere yönlendirme CTA'sı yok");
  assert.match(appSource, /type="button" data-action="submit-payment-request"/, "ödeme demo CTA'sı deterministik eylem olarak tanımlı değil");
  assert.match(appSource, /action === "submit-payment-request"[\s\S]{0,220}submitPaymentDemo\(form\)/, "ödeme demo CTA'sı doğrulamalı ödeme gönderim yolunu doğrudan tetiklemiyor");
  assert.match(appSource, /type="button" data-action="submit-payment-review"/, "mali inceleme CTA'sı deterministik eylem olarak tanımlı değil");
  assert.match(appSource, /action === "submit-payment-review"[\s\S]{0,260}submitPaymentReview\(form\)/, "mali inceleme CTA'sı doğrulamalı durum geçişini doğrudan tetiklemiyor");
  assert.match(appSource, /data-role-overview="\$\{state\.roleId\}"/, "rol değişiminde ayırt edici çalışma alanı işareti yok");
  assert.match(appSource, /const editable = PROPOSAL_ROLES\.has\(state\.roleId\)/, "matris düzenleme yetkisi eğitici rolleriyle sınırlandırılmıyor");
  assert.match(appSource, /framework\.id === "tyyc"[\s\S]{0,220}data-framework-source-boundary[\s\S]{0,160}escapeHtml\(framework\.pilotNotice\)/, "TYYÇ kaynak kartında form sicili ve advisory pilot sınırı görünür değil");
  assert.match(appSource, /if \(!PROPOSAL_ROLES\.has\(state\.roleId\)\) \{ deny\("TYÇ \/ AYÇ \/ TYYÇ matris taslağını yalnız iç veya kurum dışı eğitici kaydedebilir\./, "matris kayıt mutasyonunda rol kapısı yok");
  assert.match(appSource, /Salt-okunur inceleme/, "koordinatör\/komisyon salt-okunur matris görünümü yok");
  assert.match(appSource, /state\.qualificationDrafts \|\|= \[\]/, "matris taslak veri katmanı yok");
  assert.match(appSource, /Ana veri sahipliği ve karar kaynağı/, "entegrasyon ana veri sahipliği tablosu yok");
  assert.match(appSource, /id="integration-search"/, "entegrasyon katalog araması yok");
  assert.match(appSource, /id="integration-category"/, "entegrasyon kategori filtresi yok");
  assert.match(appSource, /id="integration-tier"/, "entegrasyon Tier filtresi yok");
  assert.match(appSource, /data-public-url="\$\{escapeHtml\(item\.publicUrl\)\}"/, "entegrasyon kartında doğrudan kamu erişim adresi yok");
  assert.match(appSource, /Kaynak kanıtını aç/, "entegrasyon kartında erişim adresinden ayrı kaynak kanıtı yok");
  assert.match(appSource, /Tier, erişim ve işlem sınıfıdır; sistemin hazır, bağlı veya onaylanmış olduğunu göstermez/, "Tier hazırlık uyarısı yok");
  assert.match(appSource, /MYYS: \$\{relevanceLabels\[item\.myysRelevance\]/, "MYYS core\/supporting\/adjacent etiketi yok");
  assert.match(appSource, /Tier \$\{item\.stage\}/, "entegrasyon tier\/katman işareti yok");
  assert.match(appSource, /item\.consultationOnly \? "Referans ayrıntısı" : "Dry-run ayrıntısı"/, "istişare kayıtları için aktarım dry-run CTA'sı kapatılmıyor");
  assert.match(appSource, /Aktarıma yönelik dry-run kapalı/, "istişare-only modal güvenlik açıklaması yok");
  assert.match(appSource, /BKYS içindeki Memnuniyet Yönetim Sistemi \(kalite MYS\) ile mali MYS\/MAYS ayrı iş alanlarıdır/, "kalite MYS ile mali MYS\/MAYS ayrımı yok");
  assert.match(appSource, /runIntegrationDryRun\(state, id, state\.roleId/, "dry-run domain iş akışı arayüzde kullanılmıyor");
  assert.match(appSource, /const refreshGuard = createAsyncRefreshGuard\(\);[\s\S]+canCommitAsyncRefresh\(refreshGuard\)/, "gecikmeli Supabase yanıtı için başlangıç snapshot koruması yok");
  assert.match(appSource, /uiMutationEpoch \+= 1;[\s\S]+event\.target\.id === "proposal-ects"/, "form etkileşimi gecikmeli refresh yarışından korunmuyor");
  assert.match(appSource, /document\.addEventListener\("change",[\s\S]{0,300}uiMutationEpoch \+= 1/, "select ve checkbox change olayları gecikmeli refresh yarışından korunmuyor");
  assert.match(appSource, /Kamu, mali ve bildirim taslakları/, "haricî GİB\/mali MYS\/YÖKSİS kapıları ayrı gösterilmiyor");
  assert.match(appSource, /\["ArrowLeft", "ArrowRight", "Home", "End"\]/, "Komisyon sekmelerinin klavye yön tuşu desteği yok");
  assert.match(htmlSource, /id="notification-button"[^>]+data-nav="notifications"/, "bildirim düğmesi sabit seçicisi yok");
  assert.match(htmlSource, /data-action="toggle-nav"[^>]+aria-controls="sidebar"/, "mobil menü denetim ilişkisi tanımlı değil");
  assert.match(styleSource, /:focus-visible\s*\{[^}]+outline:\s*3px solid #fff[^}]+box-shadow:\s*0 0 0 5px #255f95/s, "yüksek kontrastlı çift katmanlı odak göstergesi yok");
  assert.match(styleSource, /html\s*\{[^}]+overflow-x:\s*clip[^}]+\}[\s\S]+body\s*\{[^}]+overflow-x:\s*clip/s, "kök sayfa yatay kaydırması engellenmiyor");
  assert.match(styleSource, /\.table-wrap\s*\{[^}]+display:\s*block[^}]+overflow-x:\s*auto/s, "geniş tablolar bağımsız yatay kaydırma konteyneri değil");
  assert.match(styleSource, /#main-content\s*\{[^}]+overflow-x:\s*clip[^}]+contain:\s*inline-size/s, "ana içerik geniş tablo overflow alanını kök sayfadan ayırmıyor");
  assert.match(styleSource, /\.sidebar\s*\{[^}]+visibility:\s*hidden[^}]+\}[\s\S]+body\.nav-open \.sidebar\s*\{[^}]+visibility:\s*visible/s, "kapalı mobil menü klavye sırasından çıkarılmıyor");

  const actions = new Set([...appSource.matchAll(/data-action="([a-z0-9-]+)"/g), ...htmlSource.matchAll(/data-action="([a-z0-9-]+)"/g)].map((match) => match[1]));
  const handlers = new Set([...appSource.matchAll(/action === "([a-z0-9-]+)"/g)].map((match) => match[1]));
  assert.deepEqual([...actions].sort(), [...handlers].sort(), "data-action ile olay işleyicileri birebir eşleşmiyor");
});

test("akıllı eşleme UI sözleşmesi v4/v15 tam snapshot kalıcılığı, kalite kapısı ve insan karar sınırını taşıyor", () => {
  const appSource = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
  const snapshotSource = readFileSync(new URL("../src/smart-snapshot.js", import.meta.url), "utf8");
  const buildPublicSource = readFileSync(new URL("./build-public.mjs", import.meta.url), "utf8");
  assert.equal(initialState.version, 15, "tam öneri snapshot bütünlüğü için seed version 15 olmalı");
  assert.match(appSource, /const STORAGE_KEY = "kdpu-myys-pilot-v4"/, "canonical v4 storage key yok");
  assert.doesNotMatch(appSource, /kdpu-myys-pilot-v3/, "eski v3 storage key hâlâ okunuyor");
  for (const marker of [
    'id="smart-alignment-form"',
    "data-smart-outcome",
    'data-action="reanalyze-smart-suggestions"',
    "data-smart-suggestion",
    'data-action="apply-smart-suggestion"',
    'data-smart-framework="${escapeHtml(frameworkId.toUpperCase())}"',
    "data-smart-coverage",
    "data-smart-override",
    'data-action="apply-smart-override"',
    "data-smart-review"
  ]) assert.ok(appSource.includes(marker), `akıllı eşleme DOM işareti eksik: ${marker}`);
  assert.match(appSource, /PROPOSAL_ROLES = new Set\(\["instructor", "externalInstructor"\]\)/, "mutasyon rol kapısı iki eğitici rolüyle sınırlı değil");
  assert.match(appSource, /state\.smartAlignments \|\|= \[\]/, "canonical smartAlignments pilot katmanı yok");
  assert.match(appSource, /function smartOutcomeFingerprint\(text, index\)/, "öğrenme çıktısı fingerprint sözleşmesi yok");
  assert.match(appSource, /orderedOutcomeFingerprint/, "çıktı sırasını değişiklikte geçersiz kılan fingerprint yok");
  assert.match(appSource, /createSmartSuggestionSnapshot\(analysis\.report/, "tam öneri raporu kalıcı snapshot'a alınmıyor");
  assert.match(appSource, /readSmartSuggestionSnapshot\(record\.suggestionSnapshot/, "salt-okunur inceleme saklanan snapshot yerine güncel motoru kullanıyor");
  assert.match(appSource, /applied \? \{ \.\.\.suggestion, \.\.\.applied \} : suggestion/, "azaltılmış insan seçimi tam snapshot ayrıntılarının üzerine güvenli biçimde birleştirilmiyor");
  assert.doesNotMatch(appSource, /function smartReportForAlignment[\s\S]{0,1800}suggestProgramQualificationAlignment\(/, "tarihsel inceleme güncel motorla sessizce yeniden hesaplanıyor");
  assert.match(appSource, /immutableSuggestionSnapshotBefore/, "insan kurul kararı öncesi snapshot değişmezlik koruması yok");
  assert.match(snapshotSource, /referenceDataVersion/, "snapshot kaynak veri sürümünü saklamıyor");
  assert.match(snapshotSource, /sourceContext/, "snapshot resmî kaynak bağlamını saklamıyor");
  assert.match(snapshotSource, /integrityHash/, "snapshot bütünlük hash'i taşımıyor");
  assert.match(buildPublicSource, /src\/smart-snapshot\.js/, "tam snapshot modülü Preview public paketine kopyalanmıyor");
  assert.match(appSource, /contextUnchanged = previousFingerprint === orderedOutcomeFingerprint/, "metin\/sıra değişikliğinde eski seçimlerin geçersiz kılınması yok");
  assert.match(appSource, /failSmartQualificationAnalysis\("insufficient_outcome"/, "ölçülemeyen çıktı kalite kapısı yok");
  assert.match(appSource, /QUALIFICATION_SUGGESTION_LIMITS\.maxOutcomeCount/, "40 çıktı üst sınırı UI kalite kapısında yok");
  assert.match(appSource, /QUALIFICATION_SUGGESTION_LIMITS\.maxOutcomeLength/, "600 karakter üst sınırı UI kalite kapısında yok");
  assert.match(appSource, /return \{ ok: false, code:[\s\S]{0,180}record: null \}/, "persistSmartAlignment yapılandırılmış başarısızlık döndürmüyor");
  assert.match(appSource, /const stateBeforeMutation = structuredClone\(state\)/, "başvuru\/program mutasyonları kalite kapısından sonra transaction snapshot kullanmıyor");
  assert.match(appSource, /state = stateBeforeMutation/, "kalıcılık hatasında state rollback yok");
  assert.match(appSource, /application\.smartAlignmentId !== alignment\.id/, "zorunlu çift yönlü application backlink doğrulaması yok");
  assert.match(appSource, /program\.smartAlignmentId !== alignment\.id/, "zorunlu çift yönlü program backlink doğrulaması yok");
  assert.match(appSource, /normalizeSmartOutcomeText\(text\) !== normalizeSmartOutcomeText\(alignmentOutcomes\[index\]\)/, "application outcome semantik eşdeğerlik doğrulaması yok");
  assert.match(appSource, /recordedAt: new Date\(\)\.toISOString\(\)/, "manuel override ISO recordedAt göndermiyor");
  assert.match(appSource, /SAFE_ID_PATTERN/, "kalıcı ID allowlist koruması yok");
  assert.match(appSource, /panel\.setAttribute\("aria-busy", "false"\)/, "akıllı analiz çıkışlarında aria-busy sıfırlanmıyor");
  assert.match(appSource, /application\.smartAlignmentId = record\.id/, "proposal → alignment application bağı yok");
  assert.match(appSource, /if \(program\) program\.smartAlignmentId = record\.id/, "program → alignment bağı yok");
  assert.match(appSource, /applyManualQualificationOverride\(smartSuggestionReport/, "gerekçeli manuel override motor sözleşmesini kullanmıyor");
  assert.match(appSource, /recordHumanBoardQualificationDecision\(/, "Komisyonun ayrı insan karar kaydı motor sözleşmesini kullanmıyor");
  assert.match(appSource, /Motor önerisi değiştirilemez/, "Komisyon kararında öneri mutasyon yasağı görünür değil");
  assert.match(appSource, /Öneri karar değildir/, "akıllı analiz pilot uyarısı görünür değil");
});

test("responsive QA dört kabul genişliğini gerçek pilot rotasına yönlendiriyor", () => {
  const qaSource = readFileSync(new URL("../qa-responsive.html", import.meta.url), "utf8");
  const browserSource = readFileSync(new URL("./browser-qa.cjs", import.meta.url), "utf8");
  for (const width of [1440, 1024, 768, 390]) {
    assert.match(qaSource, new RegExp(`width="${width}"`), `${width}px iframe eksik`);
    assert.match(browserSource, new RegExp(`width: ${width}`), `${width}px Playwright viewport eksik`);
  }
  assert.equal((qaSource.match(/src="\/pilot\.html#\/home"/g) || []).length, 4, "responsive iframe'ler /pilot.html uygulamasını açmıyor");
  assert.match(browserSource, /finalURL\.pathname === "\/pilot\.html"/, "Preview yönlendirme son rotası doğrulanmıyor");
  assert.match(browserSource, /reachablePageScroll/, "responsive QA iç tablo kaydırması ile sayfa taşmasını ayırmıyor");
  assert.match(browserSource, /undefined, \{ timeout: 3000 \}/, "ödeme durum beklemesinde Playwright timeout argümanı yanlış");
  assert.match(browserSource, /verifySmartAlignmentResponsive\(page, viewport, errors\)/, "akıllı eşleme dört viewport QA döngüsüne bağlı değil");
  assert.match(browserSource, /kdpu-myys-pilot-v4/, "tarayıcı QA canonical v4 state kullanmıyor");
  assert.doesNotMatch(browserSource, /kdpu-myys-pilot-v3/, "tarayıcı QA eski v3 state okuyor");
});

test("başvuru sahipliği aynı role sahip farklı kişileri ayırıyor", () => {
  const internal = initialState.applications.find((item) => item.id === "APP-014");
  assert.equal(ownsApplication(internal, "instructor", "Dr. Öğr. Üyesi Ekin Demir"), true);
  assert.equal(ownsApplication(internal, "instructor", "Dr. Öğr. Üyesi Zeynep Ata"), false);
  assert.equal(ownsApplication(internal, "externalInstructor", "Dr. Öğr. Üyesi Ekin Demir"), false);
});

test("dokuz rolün başvuru görünürlüğü kayıt ve kimlik seviyesinde uygulanıyor", () => {
  const expectations = {
    learner: ["MY-BSV-2026-0042"],
    instructor: ["MY-PRG-2026-014"],
    externalInstructor: [],
    coordinator: ["MY-PRG-2026-014", "MY-BSV-2026-0042", "MY-PRG-2026-009"],
    commission: ["MY-PRG-2026-014", "MY-BSV-2026-0042", "MY-PRG-2026-009"],
    studentAffairs: ["MY-BSV-2026-0042"],
    it: [],
    finance: [],
    admin: ["MY-PRG-2026-014", "MY-BSV-2026-0042", "MY-PRG-2026-009"]
  };
  for (const role of roles) {
    const expected = [...expectations[role.id]].sort();
    assert.deepEqual(codes(filterApplicationsForRole(initialState.applications, role.id, role.name)), expected, role.id);
    assert.deepEqual(codes(visibleApplicationsForRole(initialState, role.id, role.name)), expected, `${role.id} alias`);
  }
});

test("özel taslak yalnız sahibine ve teknik admin görünümüne açık", () => {
  const state = cloneState(initialState);
  const draft = createApplication(state, {
    kind: "internal",
    status: "draft",
    title: "Kurum Dışı Eğitici Taslak Programı",
    applicant: actorNameForRole("externalInstructor"),
    actorRole: "externalInstructor",
    ects: 2,
    remoteRate: 25,
    evidence: 2
  });
  assert.equal(canViewApplication(draft, "externalInstructor", actorNameForRole("externalInstructor")), true);
  assert.equal(canViewApplication(draft, "instructor", actorNameForRole("instructor")), false);
  assert.equal(canViewApplication(draft, "coordinator", actorNameForRole("coordinator")), false);
  assert.equal(canViewApplication(draft, "commission", actorNameForRole("commission")), false);
  assert.equal(canViewApplication(draft, "studentAffairs", actorNameForRole("studentAffairs")), false);
  assert.equal(canViewApplication(draft, "admin", actorNameForRole("admin")), true);
});

test("program listeleri role ve gerçek demo kimliğine göre süzülüyor", () => {
  assert.deepEqual(codes(visibleProgramsForRole(initialState, "instructor", actorNameForRole("instructor"))), ["MY-PRG-2026-014"]);
  assert.deepEqual(codes(visibleProgramsForRole(initialState, "externalInstructor", actorNameForRole("externalInstructor"))), []);
  assert.deepEqual(codes(visibleProgramsForRole(initialState, "learner", actorNameForRole("learner"))), ["MY-PRG-2026-008", "MY-PRG-2026-011"]);
  assert.deepEqual(codes(visibleProgramsForRole(initialState, "finance", actorNameForRole("finance"))), ["MY-PRG-2026-008", "MY-PRG-2026-011"]);
  assert.equal(visibleProgramsForRole(initialState, "admin", actorNameForRole("admin")).length, initialState.programs.length);
  assert.deepEqual(visibleProgramsForRole(initialState, "it", actorNameForRole("it")), []);
});

test("kurum dışı eğitici program önerisi sahiplik ve audit rolünü koruyor", () => {
  const state = cloneState(initialState);
  const application = createApplication(state, {
    kind: "internal",
    status: "draft",
    title: "Dış Eğitici Dijital Kanıt Programı",
    applicant: actorNameForRole("externalInstructor"),
    actorRole: "externalInstructor",
    ects: 2,
    remoteRate: 30,
    evidence: 3
  });
  assert.equal(application.ownerRole, "externalInstructor");
  assert.equal(state.audit[0].actorRole, "externalInstructor");
  assert.equal(state.audit[0].actor, actorNameForRole("externalInstructor"));
  transitionApplication(state, application.id, "review", "externalInstructor", "Dış eğitici pilot gönderimi", actorNameForRole("externalInstructor"));
  assert.equal(application.status, "review");
  assert.equal(state.audit[0].actorRole, "externalInstructor");
});

test("kurum dışı eğitici dış kazanım tanıma başvurusu oluşturamıyor", () => {
  const state = cloneState(initialState);
  assert.throws(() => createApplication(state, {
    kind: "external",
    title: "Yetkisiz dış kazanım",
    applicant: actorNameForRole("externalInstructor"),
    actorRole: "externalInstructor",
    ects: 2,
    remoteRate: 100
  }), /yalnız öğrenen/);
});

test("başvuru sahibi olmayan aynı roldeki kişi taslağı gönderemiyor", () => {
  const state = cloneState(initialState);
  const draft = createApplication(state, {
    kind: "internal",
    status: "draft",
    title: "Sahiplik Sınırı Test Programı",
    applicant: "Dr. Öğr. Üyesi Başka Kişi",
    actorRole: "instructor",
    ects: 1,
    remoteRate: 0
  });
  assert.throws(() => transitionApplication(
    state, draft.id, "review", "instructor", "Yetkisiz gönderim", actorNameForRole("instructor")
  ), /yalnızca kayıt sahibi/);
});

test("komisyon, koordinatör ve admin akademik karar sınırları doğru", () => {
  const commissionItem = cloneState(initialState).applications.find((item) => item.status === "commission");
  assert.deepEqual(
    getAllowedApplicationTransitions(commissionItem, "commission", actorNameForRole("commission")).sort(),
    ["deferred", "commission", "rejected", "revision"].sort()
  );
  assert.deepEqual(
    getAllowedApplicationTransitions(commissionItem, "coordinator", actorNameForRole("coordinator")),
    ["revision"]
  );
  assert.deepEqual(getAllowedApplicationTransitions(commissionItem, "admin", actorNameForRole("admin")), []);

  const deferredState = cloneState(initialState);
  const deferred = deferredState.applications.find((item) => item.status === "commission");
  assert.throws(() => transitionApplication(deferredState, deferred.id, "approved", "commission", "Pilot kurul kararı"), /Kurumsal doğrulama/);
  transitionApplication(deferredState, deferred.id, "deferred", "commission", "Kurumsal karar ve hukuk doğrulaması bekleniyor");
  assert.equal(deferred.status, "deferred");
  assert.ok(deferredState.audit.some((event) => event.entityId === deferred.id && event.to === "deferred"));

  const revisionState = cloneState(initialState);
  const revision = revisionState.applications.find((item) => item.status === "commission");
  transitionApplication(revisionState, revision.id, "revision", "coordinator", "Eksik kanıt");
  assert.equal(revision.status, "revision");

  const adminState = cloneState(initialState);
  const adminItem = adminState.applications.find((item) => item.status === "commission");
  assert.throws(() => transitionApplication(adminState, adminItem.id, "approved", "admin", "Yetkisiz akademik karar"), /admin/);
});

test("çekimser görüş durumu değiştirmeden ayrı audit eylemi oluşturuyor", () => {
  const state = cloneState(initialState);
  const application = state.applications.find((item) => item.status === "commission");
  transitionApplication(state, application.id, "commission", "commission", "Çıkar çatışması pilot beyanı");
  assert.equal(application.status, "commission");
  assert.equal(state.audit[0].action, "Çekimser komisyon görüşü eklendi");
  assert.equal(state.audit[0].from, "commission");
  assert.equal(state.audit[0].to, "commission");
});

test("değerlendirme kararı yalnız eğiticiler ve komisyon için açık", () => {
  const allowed = new Set(["instructor", "externalInstructor", "commission"]);
  for (const role of roles) assert.equal(canRecordAssessmentDecision(role.id), allowed.has(role.id), role.id);

  for (const roleId of allowed) {
    const state = activeAssessmentState();
    const session = recordAssessmentDecision(state, "ASM-NINE-ROLE-TEST", roleId, {
      score: 87,
      evaluatorDecision: "Başarılı • İnsan değerlendirici",
      reason: "Rubrik ve sentetik olaylar insan gözüyle incelendi"
    });
    assert.equal(session.status, "completed");
    assert.equal(session.score, 87);
    assert.equal(state.audit[0].actorRole, roleId);
    assert.equal(state.audit[0].entityId, session.id);
  }

  for (const role of roles.filter((item) => !allowed.has(item.id))) {
    const state = activeAssessmentState();
    const before = structuredClone(state);
    assert.throws(() => recordAssessmentDecision(state, "ASM-NINE-ROLE-TEST", role.id, { score: 90 }), /kaydedemez/, role.id);
    assert.deepEqual(state, before, `${role.id}: yetkisiz deneme veri değiştirdi`);
  }
});

test("tamamlanmış oturum tekrar sonuçlandırılamıyor ve puan doğrulanıyor", () => {
  const completedState = cloneState(initialState);
  assert.throws(() => recordAssessmentDecision(completedState, "ASM-008", "commission", { score: 90 }), /etkin veya insan incelemesindeki/);
  const invalidScoreState = activeAssessmentState();
  assert.throws(() => recordAssessmentDecision(invalidScoreState, "ASM-NINE-ROLE-TEST", "instructor", { score: 101 }), /0 ile 100/);
});

test("geçersiz durum geçişi reddediliyor", () => {
  const state = cloneState(initialState);
  const internal = state.applications.find((item) => item.kind === "internal");
  assert.throws(() => transitionApplication(state, internal.id, "draft", "commission", "Geçersiz geri dönüş"), /geçilemez/);

  for (const payload of [
    { kind: "unknown", title: "Geçersiz tür", applicant: actorNameForRole("instructor"), actorRole: "instructor", ects: 1, remoteRate: 0 },
    { kind: "internal", title: "Geçersiz AKTS", applicant: actorNameForRole("instructor"), actorRole: "instructor", ects: 0, remoteRate: 0 },
    { kind: "internal", title: "Geçersiz oran", applicant: actorNameForRole("instructor"), actorRole: "instructor", ects: 1, remoteRate: 101 },
    { kind: "internal", title: "Geçersiz kanıt", applicant: actorNameForRole("instructor"), actorRole: "instructor", ects: 1, remoteRate: 0, evidence: -1 }
  ]) {
    const invalidState = cloneState(initialState);
    const before = structuredClone(invalidState);
    assert.throws(() => createApplication(invalidState, payload));
    assert.deepEqual(invalidState, before, "geçersiz başvuru girdisi veri katmanını değiştirdi");
  }
});

test("pilot dijital yeterlilik oluşturma ve mükerrer kod kontrolü çalışıyor", () => {
  const state = cloneState(initialState);
  const before = state.credentials.length;
  const source = state.applications.find((item) => item.status === "commission");
  assert.throws(() => transitionApplication(state, source.id, "approved", "commission", "Pilot yeterlilik testi için gerekçeli onay"), /Kurumsal doğrulama/);
  source.institutionalValidationConfirmed = true;
  transitionApplication(state, source.id, "approved", "commission", "Yalıtılmış birim testi için doğrulama bayrağı");
  const payload = { sourceApplicationId: source.id, code: "MY-BEL-TEST-001", title: "Test Pilot Yeterliliği", ects: 1, level: 6, owner: "Derya Örnek" };
  assert.throws(() => issueCredential(state, payload, "system"), /production uygunluğu/);
  assert.throws(() => transitionApplication(state, source.id, "credentialed", "system", "Belge durumu güvenlik kapısı"), /production uygunluğu/);
  source.productionEligible = true;
  issueCredential(state, payload, "system");
  assert.equal(state.credentials.length, before + 1);
  assert.equal(state.credentials[0].sourceApplicationId, source.id);
  assert.throws(() => issueCredential(state, { ...payload, title: "Tekrar" }, "system"), /zaten var/);
  assert.throws(() => issueCredential(state, { ...payload, code: "MY-BEL-TEST-002" }, "commission"), /yalnız sistem/);
  transitionApplication(state, source.id, "credentialed", "system", "Yalıtılmış birim testinde iki güvenlik kapısı sağlandı");
  assert.equal(source.status, "credentialed");
});

test("iki uçtan uca senaryo veri katmanını ve güvenli aktarım loglarını güncelliyor", () => {
  const state = cloneState(initialState);
  const credentialCount = state.credentials.length;
  const recognizedCreditCount = state.recognizedCredits.length;
  const enrollmentCount = state.enrollments.length;
  const assessmentCount = state.assessmentSessions.length;
  for (const kind of Object.keys(scenarioDefinitions)) {
    for (let index = 0; index < scenarioDefinitions[kind].length; index += 1) runScenarioStep(state, kind);
    assert.equal(state.scenarios[kind].completed, true, kind);
    assert.equal(state.scenarios[kind].step, scenarioDefinitions[kind].length, kind);
  }
  assert.equal(state.credentials.length, credentialCount, "kurumsal doğrulamasız senaryo belge üretti");
  assert.equal(state.recognizedCredits.length, recognizedCreditCount, "kurumsal doğrulamasız senaryo kredi tanıdı");
  assert.equal(state.enrollments.length, enrollmentCount, "ertelenen program için kayıt üretildi");
  assert.equal(state.assessmentSessions.length, assessmentCount, "ertelenen program için değerlendirme üretildi");
  for (const kind of Object.keys(scenarioDefinitions)) {
    const application = state.applications.find((item) => item.id === state.scenarios[kind].applicationId);
    assert.equal(application.status, "deferred", kind);
    assert.equal(application.institutionalValidationConfirmed, false, kind);
    assert.equal(application.productionEligible, false, kind);
    assert.equal(Object.keys(application.workloadComponents).length, 8, `${kind}: iş yükü bileşenleri eksik`);
    assert.equal(Object.values(application.workloadComponents).reduce((sum, value) => sum + value, 0), application.totalWorkload, `${kind}: iş yükü toplamı uyuşmuyor`);
  }
  const transfers = state.integrationJobs.filter((item) => ["obis", "yoksis"].includes(item.target));
  assert.equal(transfers.length, 2);
  assert.deepEqual(new Set(transfers.map((item) => item.targetLabel)), new Set(["ÖBİS", "YÖKSİS"]));
  assert.ok(transfers.every((item) => item.target === item.targetId && item.realDataSent === false && item.status === "simulation_blocked" && item.errorCode === "INSTITUTIONAL_VALIDATION_REQUIRED"));
});

test("yönerge ve kural merkezi dokuz rolün tamamında kapsamlı ama rol-sınırlı görünür", () => {
  assert.match(DIRECTIVE_PILOT_NOTICE, /KURUMSAL DEĞERLENDİRME TASLAĞI/);
  assert.equal(policyVersionRegistry[0].senateApproval, false);
  assert.equal(policyVersionRegistry[0].productionEligible, false);
  assert.equal(directiveRoleScopeRows.length, 9);
  const canonicalByRole = new Map(directiveRoleScopeRows.map((row) => [row.roleKey, row]));
  for (const role of roles) {
    assert.ok(roleNavigation[role.id].includes("governance"), `${role.id}: governance rotası eksik`);
    const scope = organizationScopes[role.id];
    const canonical = canonicalByRole.get(role.id);
    assert.ok(canonical, `${role.id}: kanonik Supabase DTO satırı eksik`);
    assert.equal(scope.membership_id, canonical.id, `${role.id}: membership_id uyuşmuyor`);
    assert.equal(scope.unit_id, canonical.unitId, `${role.id}: unit_id uyuşmuyor`);
    assert.equal(scope.unit_type, canonical.unitType, `${role.id}: unit_type uyuşmuyor`);
    assert.equal(scope.body_type, canonical.bodyType, `${role.id}: body_type uyuşmuyor`);
    assert.equal(scope.membership_role, canonical.membershipRole, `${role.id}: membership_role uyuşmuyor`);
    assert.deepEqual(scope.body_membership, [canonical.id], `${role.id}: body_membership uyuşmuyor`);
    assert.equal(scope.mandate_from, canonical.mandateFrom, `${role.id}: mandate_from uyuşmuyor`);
    assert.equal(scope.mandate_to, canonical.mandateTo, `${role.id}: mandate_to uyuşmuyor`);
    assert.deepEqual(scope.decision_scope, canonical.decisionScope, `${role.id}: decision_scope uyuşmuyor`);
    assert.equal(scope.may_make_academic_decision, canonical.mayMakeAcademicDecision, `${role.id}: akademik yetki uyuşmuyor`);
    assert.equal(scope.may_make_financial_decision, canonical.mayMakeFinancialDecision, `${role.id}: mali yetki uyuşmuyor`);
    assert.match(scope.mandate, /2026-08-20.*2027-08-19/, `${role.id}: okunur görev dönemi eksik`);
    assert.ok(scope.decision_scope_note.length > 20, `${role.id}: okunur kapsam açıklaması eksik`);
  }
  assert.deepEqual(organizationScopes.admin.decision_scope, ["configuration_only"]);
  assert.equal(organizationScopes.admin.may_make_academic_decision, false);
  assert.equal(organizationScopes.admin.may_make_financial_decision, false);
  assert.match(organizationScopes.admin.decision_scope_note, /akademik, tanıma, mali veya personel kararı veremez/i);
  assert.equal(pageMeta.governance.label, "Yönerge ve Kural Merkezi");
});

test("AKTS iş yükü 1–6 bantlarını, sekiz bileşeni, yuvarlamayı ve band dışını doğruluyor", () => {
  assert.deepEqual(ectsWorkloadBands, [
    { ects: 1, minHours: 25, maxHours: 30 }, { ects: 2, minHours: 50, maxHours: 60 },
    { ects: 3, minHours: 75, maxHours: 90 }, { ects: 4, minHours: 100, maxHours: 120 },
    { ects: 5, minHours: 125, maxHours: 150 }, { ects: 6, minHours: 150, maxHours: 180 }
  ]);
  assert.equal(workloadComponents.length, 8);
  for (const record of [...initialState.applications.map((item) => ({ ...item, total: item.totalWorkload })), ...initialState.programs.map((item) => ({ ...item, total: item.workload }))]) {
    assert.deepEqual(Object.keys(record.workloadComponents), workloadComponents.map(([key]) => key));
    assert.equal(Object.values(record.workloadComponents).reduce((sum, value) => sum + value, 0), record.total);
    assert.ok(record.total >= 25 * record.ects && record.total <= 30 * record.ects);
  }
  for (const band of ectsWorkloadBands) {
    assert.equal(validateEctsWorkload({ ects: band.ects, totalWorkload: band.minHours }).valid, true);
    assert.equal(validateEctsWorkload({ ects: band.ects, totalWorkload: band.maxHours }).valid, true);
    assert.equal(validateEctsWorkload({ ects: band.ects, totalWorkload: band.minHours - 0.25 }).valid, false);
    assert.equal(validateEctsWorkload({ ects: band.ects, totalWorkload: band.maxHours + 0.25 }).valid, false);
  }
  const components = { synchronous: 10, asynchronous: 10, preparation: 10, practice: 10, project: 15, independent: 10, assessment: 5, feedback: 5 };
  const valid = validateEctsWorkload({ ects: 3, totalWorkload: 75, components });
  assert.equal(valid.valid, true);
  assert.equal(valid.componentTotal, 75);
  assert.match(valid.equation, /75 ≤ 75 ≤ 90/);
  assert.equal(validateEctsWorkload({ ects: 3, totalWorkload: 76, components }).valid, false, "bileşen toplamı uyuşmazlığı yakalanmadı");
  assert.ok(validateEctsWorkload({ ects: 3, totalWorkload: 75.5 }).warnings.some((item) => item.includes("yuvarlama")));
  assert.equal(validateEctsWorkload({ ects: 3, totalWorkload: 75, requireComponents: true }).valid, false, "zorunlu sekiz bileşen eksikliği işlemi bloke etmedi");
  assert.equal(validateEctsWorkload({ ects: 3, totalWorkload: 75, components: { ...components, feedback: "" }, requireComponents: true }).valid, false, "boş bileşen alanı yakalanmadı");
  assert.equal(validateEctsWorkload({ ects: 7, totalWorkload: 175 }).valid, false);
});

test("belirsiz sayısal sınırlar sürümlü, uyarı-only ve kurumsal blok olarak değerlendirilir", () => {
  assert.equal(versionedPilotRules.length, 6);
  for (const rule of versionedPilotRules) {
    for (const field of ["source_clause", "effective_from", "effective_to", "program_type", "calculation_basis", "numerator", "denominator", "rounding_rule", "exception_rule", "interpretation_note", "institutional_validation_required"]) {
      assert.ok(Object.hasOwn(rule, field), `${rule.id}: ${field} eksik`);
    }
    const result = evaluatePilotRule(rule.id);
    assert.equal(result.outcome, "warning_only");
    assert.equal(result.completionBlocked, true);
    assert.equal(result.autonomousDecision, false);
  }
  assert.ok(evaluatePilotRule("RULE-TERM-5", { requestedEcts: 6 }).warnings.some((item) => item.includes("6 AKTS")));
  assert.ok(evaluatePilotRule("RULE-REMOTE-50", { singleProgram: true }).warnings.some((item) => item.includes("Tek program")));
  assert.ok(evaluatePilotRule("RULE-SEMESTER-3-8", { programCycle: "associate" }).warnings.some((item) => item.includes("tanımlı değildir")));
});

test("MYD kodu koordinatörlükçe, idempotent ve production kapalı üretiliyor", () => {
  const state = cloneDirectivePilotState();
  assert.throws(() => generateMydCode(state, { actorRole: "admin", unitCode: "SEM" }), /yalnız Koordinatörlük/);
  const first = generateMydCode(state, { actorRole: "coordinator", unitCode: "SEM", year: 2026, sequence: 1 });
  const replay = generateMydCode(state, { actorRole: "coordinator", unitCode: "SEM", year: 2026, sequence: 1 });
  const otherUnit = generateMydCode(state, { actorRole: "coordinator", unitCode: "MUH", year: 2026, sequence: 1, version: 2 });
  assert.equal(first.code, "MYD-2026-SEM-001");
  assert.equal(first.versionNo, 1);
  assert.equal(first.id, "MYDREC-2026-SEM-001");
  assert.equal(otherUnit.code, "MYD-2026-MUH-001");
  assert.equal(otherUnit.versionNo, 2);
  assert.notEqual(otherUnit.id, first.id);
  assert.equal(replay.id, first.id);
  assert.equal(state.codes.length, 2);
  assert.equal(first.productionEligible, false);
});

test("tanıma üç ayrı karar, ayrı gerekçe ve bağımsız itiraz mercii olarak işler", () => {
  const state = cloneDirectivePilotState();
  assert.deepEqual(state.recognitionDecisions.map((item) => item.kind), ["credential", "ects", "course_substitution"]);
  assert.throws(() => recordRecognitionDecision(state, { applicationId: "APP-042", kind: "ects", status: "recognized", rationale: "Yetkisiz sistem yöneticisi kararı", actorRole: "admin" }), /yalnız Komisyon/);
  assert.throws(() => recordRecognitionDecision(state, { applicationId: "APP-042", kind: "credential", status: "additional_evidence_required", rationale: "Ek kanıt insan incelemesiyle talep edildi.", actorRole: "commission", decisionBody: "MY-KOM" }), /Geçerli toplantı/);
  const meetingResult = validateCommissionMeeting({ actorRole: "commission", members: state.commission.members, quorumRequired: 2, votes: [{ memberId: "MEM-1", vote: "approve" }, { memberId: "MEM-2", vote: "approve" }] });
  state.commission.lastValidation = { ...meetingResult, validatedAt: new Date().toISOString(), bodyId: state.commission.bodyId, mandate: state.commission.mandate };
  assert.throws(() => recordRecognitionDecision(state, { applicationId: "APP-042", kind: "credential", status: "recognized", rationale: "Olumlu tanıma için insan gerekçesi yazıldı.", actorRole: "commission", decisionBody: "MY-KOM" }), /olumlu nihai tanıma/);
  assert.throws(() => recordRecognitionDecision(state, { applicationId: "APP-042", kind: "credential", status: "partially_recognized", rationale: "Kısmi tanıma için insan gerekçesi yazıldı.", actorRole: "commission", decisionBody: "MY-KOM" }), /olumlu nihai tanıma/);
  const credential = recordRecognitionDecision(state, { applicationId: "APP-042", kind: "credential", status: "additional_evidence_required", rationale: "Belge sağlayıcısı için ek kanıt insan gözüyle talep edildi.", actorRole: "commission", decisionBody: "MY-KOM" });
  assert.equal(credential.status, "additional_evidence_required");
  assert.equal(state.recognitionDecisions.find((item) => item.kind === "ects").status, "pending_human_review");
  assert.equal(state.recognitionDecisions.find((item) => item.kind === "course_substitution").status, "pending_human_review");
  assert.throws(() => submitIndependentAppeal(state, { applicationId: "APP-042", decisionKind: "credential", actorRole: "learner", reason: "İnsan üst incelemesi talep ediyorum.", initialDecisionBody: "MY-KOM", appealBody: "MY-KOM" }), /farklı mercilerde/);
  const appeal = submitIndependentAppeal(state, { applicationId: "APP-042", decisionKind: "credential", actorRole: "learner", reason: "Kanıtların bağımsız insan üst incelemesinde değerlendirilmesi talep edilir.", initialDecisionBody: "MY-KOM", appealBody: "EGITIM-OGRETIM-KOM" });
  assert.equal(appeal.status, "submitted");
  assert.notEqual(appeal.initialDecisionBody, appeal.appealBody);
  const split = splitCredentialOutcomes({ applicationId: "APP-042", badgeStatus: "earned", creditStatus: "not_decided", substitutionStatus: "not_decided" });
  assert.equal(split.independentStates, true);
  assert.equal(split.credential.status, "earned");
  assert.equal(split.ects.status, "not_decided");
});

test("EK-1 on bir asgari alanı ve kamu TCKN/kurum içi kimlik sızıntısını engelliyor", () => {
  assert.equal(euMicroCredentialMandatoryFields.length, 11);
  const source = {
    document_id: "MYBEL-2026-0007", learner_identification: "Gerçek Ad Soyad", title: "Pilot Program",
    issuer_country_region: "Türkiye", awarding_body: "Kütahya Dumlupınar Üniversitesi • Kontrollü Pilot", issue_date: "2026-08-04",
    learning_outcomes: ["Ölçülebilir çıktı"], notional_workload: "2 AKTS • 50 saat", level: "Önerilen pedagojik referans düzeyi 6",
    participation_form: "Yüz yüze • SİMÜLASYON", assessment_type: "Proje + rubrik", quality_assurance: "İnsan incelemesi",
    status: "pilot_valid", revocation_status: "not_revoked"
  };
  const view = createPublicCredentialView(source);
  assert.equal(view.learner_identification, "Maskeli pilot katılımcı");
  assert.notEqual(view.learner_identification, source.learner_identification);
  assert.equal(validateEk1Credential(view, { publicView: true }).valid, true);
  assert.equal(Object.hasOwn(view, "internal_learner_id"), false);
  assert.equal(validateEk1Credential({ ...view, tckn: "12345678901" }, { publicView: true }).valid, false);
  assert.equal(validateEk1Credential({ ...view, learner_identification: "12345678901" }, { publicView: true }).personalNumberLeak, true);
  assert.equal(validateEk1Credential({ ...view, quality_assurance: "" }, { publicView: true }).missing.includes("quality_assurance"), true);
});

test("komisyon nisabı, görev süresi, çekilme, tekil oy ve yönetici negatif yetkisi çalışıyor", () => {
  const state = cloneDirectivePilotState();
  const meeting = state.commission;
  assert.throws(() => validateCommissionMeeting({ actorRole: "admin", members: meeting.members, quorumRequired: 2 }), /Sistem yöneticisi/);
  const valid = validateCommissionMeeting({ actorRole: "commission", members: meeting.members, quorumRequired: 2, votes: [{ memberId: "MEM-1", vote: "approve" }, { memberId: "MEM-2", vote: "approve" }] });
  assert.equal(valid.valid, true);
  assert.equal(valid.eligibleCount, 2);
  const recusedVote = validateCommissionMeeting({ actorRole: "commission", members: meeting.members, quorumRequired: 2, votes: [{ memberId: "MEM-3", vote: "approve" }] });
  assert.equal(recusedVote.valid, false);
  assert.equal(recusedVote.conflictViolations.length, 1);
  const duplicate = validateCommissionMeeting({ actorRole: "commission", members: meeting.members, quorumRequired: 2, votes: [{ memberId: "MEM-1", vote: "approve" }, { memberId: "MEM-1", vote: "reject" }] });
  assert.equal(duplicate.duplicateVotes, true);
  const unknown = validateCommissionMeeting({ actorRole: "commission", members: meeting.members, quorumRequired: 2, votes: [{ memberId: "UNKNOWN", vote: "approve" }, { memberId: "MEM-1", vote: "approve" }] });
  assert.equal(unknown.valid, false);
  assert.equal(unknown.unknownVotes.length, 1);
  const invalidVote = validateCommissionMeeting({ actorRole: "commission", members: meeting.members, quorumRequired: 2, votes: [{ memberId: "MEM-1", vote: "auto_approve" }, { memberId: "MEM-2", vote: "approve" }] });
  assert.equal(invalidVote.valid, false);
  assert.equal(invalidVote.invalidVotes.length, 1);
});

test("kontenjan eşzamanlı son yer, FIFO, bekleme ve idempotency sözleşmesini koruyor", () => {
  const state = cloneDirectivePilotState();
  const first = requestOfferingSeat(state, { offeringId: "OFF-2026-GUZ-001", learnerId: "SENTETIK-L-002", actorRole: "learner", requestedAt: "2026-08-20T08:00:01Z", idempotencyKey: "last-seat" });
  assert.equal(first.status, "enrolled");
  const wait = requestOfferingSeat(state, { offeringId: "OFF-2026-GUZ-001", learnerId: "SENTETIK-L-003", actorRole: "learner", requestedAt: "2026-08-20T08:00:01Z", idempotencyKey: "wait-seat" });
  assert.equal(wait.status, "waitlisted");
  assert.equal(wait.waitlistPosition, 1);
  const replay = requestOfferingSeat(state, { offeringId: "OFF-2026-GUZ-001", learnerId: "SENTETIK-L-003", actorRole: "learner", requestedAt: "2026-08-20T08:00:05Z", idempotencyKey: "wait-seat" });
  assert.equal(replay.id, wait.id);
  const learnerReplay = requestOfferingSeat(state, { offeringId: "OFF-2026-GUZ-001", learnerId: "SENTETIK-L-003", actorRole: "learner", requestedAt: "2026-08-20T08:00:06Z", idempotencyKey: "different-key-same-learner" });
  assert.equal(learnerReplay.id, wait.id);
  assert.equal(state.offerings[0].requests.length, 3);
  assert.throws(() => requestOfferingSeat(state, { offeringId: "OFF-2026-GUZ-001", learnerId: "SENTETIK-L-004", actorRole: "admin", idempotencyKey: "admin" }), /yalnız öğrenen/);
});

test("mali ve personel dry-run yalnız finans rolünde, gerçek işlem kapalıdır", () => {
  const state = cloneDirectivePilotState();
  assert.throws(() => createFinancePersonnelDryRun(state, { actorRole: "admin", amount: 9600 }), /yalnız Finans/);
  const record = createFinancePersonnelDryRun(state, { actorRole: "finance", kind: "teaching_entitlement", amount: 9600 });
  assert.equal(record.status, "approval_required");
  assert.equal(record.realPayment, false);
  assert.equal(record.realDocument, false);
  assert.equal(record.externalRequestSent, false);
  assert.equal(record.personnelApprovalRequired, true);
  assert.equal(record.financialApprovalRequired, true);
});

test("yönerge UI sözleşmesi kritik güvenlik ve ayrık karar dilini içeriyor", () => {
  const appSource = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
  const domainSource = readFileSync(new URL("../src/directive-pilot.js", import.meta.url), "utf8");
  for (const phrase of ["Yönerge ve kural merkezi", "Kurumsal değerlendirme taslağı — yürürlük yok", "Üç ayrı tanıma sonucu", "Sistem yöneticisi akademik toplantı veya karar kaydedemez"]) {
    assert.match(`${appSource}\n${domainSource}`, new RegExp(phrase, "i"), `${phrase}: UI/domain sözleşmesinde yok`);
  }
  assert.match(appSource, /const FINANCE_OPERATOR_ROLES = new Set\(\["finance"\]\)/);
  assert.doesNotMatch(appSource, /FINANCE_OPERATOR_ROLES = new Set\(\["finance",\s*"admin"\]\)/);
  assert.match(appSource, /requireComponents:\s*true/);
  assert.match(appSource, /workloadComponents:persistedComponents/);
  assert.doesNotMatch(appSource, /Pilot tavan:\s*24 AKTS|\$\{total\}\/24/);
  assert.match(appSource, /escapeHtml\(lastCode\?\.code/);
});

const failures = results.filter((result) => !result.ok);
for (const result of results) {
  console.log(`${result.ok ? "✓" : "✗"} ${result.name}`);
  if (!result.ok) console.error(result.error?.stack || result.error);
}

if (failures.length) {
  throw new Error(`${failures.length}/${results.length} dokuz-rol regresyon testi başarısız`);
}

console.log(`Dokuz rol domain testi başarılı: ${results.length}/${results.length} sözleşme; sahiplik, görünürlük, karar yetkisi, audit ve iki uçtan uca senaryo.`);
