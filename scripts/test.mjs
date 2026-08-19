import { initialState } from "../src/data.js";
import { cloneState, issueCredential, runScenarioStep, scenarioDefinitions, transitionApplication } from "../src/workflow.js";

const state = cloneState(initialState);
const internal = state.applications.find((item) => item.kind === "internal");
transitionApplication(state, internal.id, "approved", "commission", "Pilot kurul kararı");
if (internal.status !== "approved") throw new Error("Başvuru durumu güncellenmedi");
if (!state.audit.some((event) => event.entityId === internal.id && event.to === "approved")) {
  throw new Error("Denetim izi oluşturulmadı");
}

const before = state.credentials.length;
issueCredential(state, {
  code: "MY-BEL-TEST-001",
  title: "Test Pilot Yeterliliği",
  ects: 1,
  level: 6,
  owner: "Derya Örnek"
});
if (state.credentials.length !== before + 1) throw new Error("Pilot yeterlilik oluşturulmadı");

let rejected = false;
try {
  transitionApplication(state, internal.id, "draft", "commission", "Geçersiz geri dönüş");
} catch {
  rejected = true;
}
if (!rejected) throw new Error("Geçersiz durum geçişi engellenmedi");

const recognition = state.applications.find((item) => item.kind === "external");
transitionApplication(state, recognition.id, "revision", "coordinator", "Sağlayıcı doğrulama kanıtı eksik");
if (recognition.status !== "revision") throw new Error("Dış kazanım revizyon akışı güncellenmedi");
if (!state.audit.some((event) => event.entityId === recognition.id && event.actorRole === "coordinator")) {
  throw new Error("Koordinatörlük audit kaydı oluşturulmadı");
}

let adminBlocked = false;
const authorityState = cloneState(initialState);
try {
  transitionApplication(authorityState, authorityState.applications.find((item)=>item.status === "commission").id, "approved", "admin", "Yetkisiz akademik karar");
} catch {
  adminBlocked = true;
}
if (!adminBlocked) throw new Error("Sistem yöneticisinin akademik kararı engellenmedi");

const scenarioState = cloneState(initialState);
for (const kind of Object.keys(scenarioDefinitions)) {
  for (let index = 0; index < scenarioDefinitions[kind].length; index += 1) runScenarioStep(scenarioState, kind);
  if (!scenarioState.scenarios[kind].completed) throw new Error(`${kind} senaryosu tamamlanmadı`);
}
if (!scenarioState.credentials.some((item)=>item.code.startsWith("MY-BEL-SCN-"))) throw new Error("Senaryo 1 pilot yeterlilik üretmedi");
if (!scenarioState.recognizedCredits.length) throw new Error("Senaryo 2 tanınan kredi üretmedi");
if (scenarioState.integrationJobs.filter((item)=>["ÖBİS","YÖKSİS"].includes(item.target) && item.realDataSent === false).length < 2) {
  throw new Error("Senaryo 2 güvenli aktarım simülasyon loglarını üretmedi");
}

console.log("İş akışı testleri başarılı: iki uçtan uca senaryo, rol yetkisi, audit izi, yeterlilik ve aktarım simülasyonu.");
