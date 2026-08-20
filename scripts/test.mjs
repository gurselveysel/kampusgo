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

test("TYÇ ve AYÇ ayrı ayrı sekiz resmî seviye tanımlayıcısı ve hazır şablon sağlıyor", () => {
  assert.deepEqual(qualificationFrameworks.map((item) => item.id), ["tyc", "eqf"]);
  assert.ok(qualificationFrameworks.every((item) => item.sourceStatus === "official" && /^https:\/\//.test(item.officialSourceUrl)));
  for (const frameworkId of ["tyc", "eqf"]) {
    const descriptors = qualificationLevelDescriptors.filter((item) => item.frameworkId === frameworkId);
    const templates = qualificationMatrixTemplates.filter((item) => item.frameworkId === frameworkId);
    assert.equal(descriptors.length, 8, `${frameworkId}: 8 seviye tanımlayıcısı yok`);
    assert.deepEqual(descriptors.map((item) => item.level), [1, 2, 3, 4, 5, 6, 7, 8], `${frameworkId}: seviye dizisi hatalı`);
    assert.equal(templates.length, 8, `${frameworkId}: 8 matris şablonu yok`);
    for (let level = 1; level <= 8; level += 1) {
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
});

test("TYÇ / AYÇ matris rotası yalnız beş yetkili rol navigasyonunda", () => {
  const expected = ["instructor", "externalInstructor", "coordinator", "commission", "admin"];
  const actual = roles.filter((role) => roleNavigation[role.id].includes("frameworks")).map((role) => role.id);
  assert.deepEqual(actual, expected);
  assert.equal(pageMeta.frameworks.label, "TYÇ / AYÇ Matrisleri");
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
  assert.match(appSource, /data-role-overview="\$\{state\.roleId\}"/, "rol değişiminde ayırt edici çalışma alanı işareti yok");
  assert.match(appSource, /const editable = PROPOSAL_ROLES\.has\(state\.roleId\)/, "matris düzenleme yetkisi eğitici rolleriyle sınırlandırılmıyor");
  assert.match(appSource, /if \(!PROPOSAL_ROLES\.has\(state\.roleId\)\) \{ deny\("TYÇ \/ AYÇ matris taslağını yalnız iç veya kurum dışı eğitici kaydedebilir\./, "matris kayıt mutasyonunda rol kapısı yok");
  assert.match(appSource, /Salt-okunur inceleme/, "koordinatör\/komisyon salt-okunur matris görünümü yok");
  assert.match(appSource, /state\.qualificationDrafts \|\|= \[\]/, "matris taslak veri katmanı yok");
  assert.match(appSource, /Ana veri sahipliği ve karar kaynağı/, "entegrasyon ana veri sahipliği tablosu yok");
  assert.match(appSource, /id="integration-search"/, "entegrasyon katalog araması yok");
  assert.match(appSource, /id="integration-category"/, "entegrasyon kategori filtresi yok");
  assert.match(appSource, /id="integration-tier"/, "entegrasyon Tier filtresi yok");
  assert.match(appSource, /Tier, erişim ve işlem sınıfıdır; sistemin hazır, bağlı veya onaylanmış olduğunu göstermez/, "Tier hazırlık uyarısı yok");
  assert.match(appSource, /MYYS: \$\{relevanceLabels\[item\.myysRelevance\]/, "MYYS core\/supporting\/adjacent etiketi yok");
  assert.match(appSource, /Tier \$\{item\.stage\}/, "entegrasyon tier\/katman işareti yok");
  assert.match(appSource, /item\.consultationOnly \? "Referans ayrıntısı" : "Dry-run ayrıntısı"/, "istişare kayıtları için aktarım dry-run CTA'sı kapatılmıyor");
  assert.match(appSource, /Aktarıma yönelik dry-run kapalı/, "istişare-only modal güvenlik açıklaması yok");
  assert.match(appSource, /BKYS içindeki Memnuniyet Yönetim Sistemi \(kalite MYS\) ile mali MYS\/MAYS ayrı iş alanlarıdır/, "kalite MYS ile mali MYS\/MAYS ayrımı yok");
  assert.match(appSource, /runIntegrationDryRun\(state, id, state\.roleId/, "dry-run domain iş akışı arayüzde kullanılmıyor");
  assert.match(appSource, /const refreshGuard = createAsyncRefreshGuard\(\);[\s\S]+canCommitAsyncRefresh\(refreshGuard\)/, "gecikmeli Supabase yanıtı için başlangıç snapshot koruması yok");
  assert.match(appSource, /uiMutationEpoch \+= 1;[\s\S]+event\.target\.id === "proposal-ects"/, "form etkileşimi gecikmeli refresh yarışından korunmuyor");
  assert.match(appSource, /Kamu, mali ve bildirim taslakları/, "haricî GİB\/mali MYS\/YÖKSİS kapıları ayrı gösterilmiyor");
  assert.match(appSource, /\["ArrowLeft", "ArrowRight", "Home", "End"\]/, "Komisyon sekmelerinin klavye yön tuşu desteği yok");
  assert.match(htmlSource, /id="notification-button"[^>]+data-nav="notifications"/, "bildirim düğmesi sabit seçicisi yok");
  assert.match(htmlSource, /data-action="toggle-nav"[^>]+aria-controls="sidebar"/, "mobil menü denetim ilişkisi tanımlı değil");
  assert.match(styleSource, /:focus-visible\s*\{[^}]+outline:\s*3px solid #fff[^}]+box-shadow:\s*0 0 0 5px #255f95/s, "yüksek kontrastlı çift katmanlı odak göstergesi yok");
  assert.match(styleSource, /html\s*\{[^}]+overflow-x:\s*clip[^}]+\}[\s\S]+body\s*\{[^}]+overflow-x:\s*clip/s, "kök sayfa yatay kaydırması engellenmiyor");
  assert.match(styleSource, /\.table-wrap\s*\{[^}]+display:\s*block[^}]+overflow-x:\s*auto/s, "geniş tablolar bağımsız yatay kaydırma konteyneri değil");
  assert.match(styleSource, /\.sidebar\s*\{[^}]+visibility:\s*hidden[^}]+\}[\s\S]+body\.nav-open \.sidebar\s*\{[^}]+visibility:\s*visible/s, "kapalı mobil menü klavye sırasından çıkarılmıyor");

  const actions = new Set([...appSource.matchAll(/data-action="([a-z0-9-]+)"/g), ...htmlSource.matchAll(/data-action="([a-z0-9-]+)"/g)].map((match) => match[1]));
  const handlers = new Set([...appSource.matchAll(/action === "([a-z0-9-]+)"/g)].map((match) => match[1]));
  assert.deepEqual([...actions].sort(), [...handlers].sort(), "data-action ile olay işleyicileri birebir eşleşmiyor");
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
    ["approved", "commission", "rejected", "revision"].sort()
  );
  assert.deepEqual(
    getAllowedApplicationTransitions(commissionItem, "coordinator", actorNameForRole("coordinator")),
    ["revision"]
  );
  assert.deepEqual(getAllowedApplicationTransitions(commissionItem, "admin", actorNameForRole("admin")), []);

  const approvedState = cloneState(initialState);
  const approved = approvedState.applications.find((item) => item.status === "commission");
  transitionApplication(approvedState, approved.id, "approved", "commission", "Pilot kurul kararı");
  assert.equal(approved.status, "approved");
  assert.ok(approvedState.audit.some((event) => event.entityId === approved.id && event.to === "approved"));

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
  transitionApplication(state, source.id, "approved", "commission", "Pilot yeterlilik testi için gerekçeli onay");
  const payload = { sourceApplicationId: source.id, code: "MY-BEL-TEST-001", title: "Test Pilot Yeterliliği", ects: 1, level: 6, owner: "Derya Örnek" };
  issueCredential(state, payload, "system");
  assert.equal(state.credentials.length, before + 1);
  assert.equal(state.credentials[0].sourceApplicationId, source.id);
  assert.throws(() => issueCredential(state, { ...payload, title: "Tekrar" }, "system"), /zaten var/);
  assert.throws(() => issueCredential(state, { ...payload, code: "MY-BEL-TEST-002" }, "commission"), /yalnız sistem/);
});

test("iki uçtan uca senaryo veri katmanını ve güvenli aktarım loglarını güncelliyor", () => {
  const state = cloneState(initialState);
  for (const kind of Object.keys(scenarioDefinitions)) {
    for (let index = 0; index < scenarioDefinitions[kind].length; index += 1) runScenarioStep(state, kind);
    assert.equal(state.scenarios[kind].completed, true, kind);
    assert.equal(state.scenarios[kind].step, scenarioDefinitions[kind].length, kind);
  }
  assert.ok(state.credentials.some((item) => item.code.startsWith("MY-BEL-SCN-")));
  assert.ok(state.recognizedCredits.length > 0);
  const transfers = state.integrationJobs.filter((item) => ["ÖBİS", "YÖKSİS"].includes(item.target));
  assert.equal(transfers.length, 2);
  assert.ok(transfers.every((item) => item.realDataSent === false && item.status === "simulation_succeeded"));
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
