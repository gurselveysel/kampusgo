import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { initialState, pageMeta, roleNavigation, roles } from "../src/data.js";
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
  runScenarioStep,
  scenarioDefinitions,
  transitionApplication,
  visibleApplicationsForRole,
  visibleProgramsForRole
} from "../src/workflow.js";

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
});

test("rol kimliği ile sentetik aktör adı birebir eşleşiyor", () => {
  for (const role of roles) assert.equal(actorNameForRole(role.id), role.name, role.id);
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
  assert.match(appSource, /notificationButton\.hidden = !notificationAllowed/, "bildirim CTA rol kapısı yok");
  assert.match(appSource, /state\.roleId === "learner"[^\n]+data-nav="catalog"/, "katalog CTA öğrenen kapısı yok");
  assert.match(appSource, /actorRole:\s*state\.roleId/, "başvuru oluştururken etkin rol domain katmanına aktarılmıyor");
  assert.match(appSource, /program\.status !== "active" \|\| !visiblePrograms\(\)\.some/, "öğrenen kayıt mutasyonunda görünür ve aktif program kapısı yok");
  assert.match(appSource, /\["ArrowLeft", "ArrowRight", "Home", "End"\]/, "Komisyon sekmelerinin klavye yön tuşu desteği yok");
  assert.match(htmlSource, /id="notification-button"[^>]+data-nav="notifications"/, "bildirim düğmesi sabit seçicisi yok");
  assert.match(htmlSource, /data-action="toggle-nav"[^>]+aria-controls="sidebar"/, "mobil menü denetim ilişkisi tanımlı değil");
  assert.match(styleSource, /:focus-visible\s*\{[^}]+outline:\s*3px solid #fff[^}]+box-shadow:\s*0 0 0 5px #255f95/s, "yüksek kontrastlı çift katmanlı odak göstergesi yok");
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
