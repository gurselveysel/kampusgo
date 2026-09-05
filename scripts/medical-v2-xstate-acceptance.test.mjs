import assert from "node:assert/strict";
import {
  buildDebrief,
  buildVisualizationRequest,
  createSession,
  DIFFICULTY_PROFILES,
  dispatchEvent,
  ENCOUNTER_CATALOG,
  getAvailableActions,
  parsePatientQuestion,
  replaySession,
  restoreSession,
  UCEP_EVIDENCE,
} from "../services/medical-simulation-v2/engine.js";
import { validateScenarioCatalog } from "../services/medical-simulation-v2/scenario-catalog.js";
import { DeterministicPhysiologyEngine } from "../services/medical-simulation-v2/physiology-engine.js";
import { clinicalMachine } from "../services/medical-simulation-v2/state-machine.js";

function run(events, mode = "training", seed = 20260827, encounterId = "enc_classic_stemi", difficulty = "standard") {
  let session = createSession({ mode, seed, encounterId, difficulty });
  for (const event of events) session = dispatchEvent(session, event);
  return session;
}

assert.equal(clinicalMachine.id, "teys-stemi-v2", "XState makinesi gerçek çalışma zamanı sözleşmesi olmalı");
assert.ok(Object.values(UCEP_EVIDENCE).every((item) => item.ucepVersion && item.learningOutcome && item.assessmentMethod && item.observableEvidence && item.expertApprovalStatus === "DOĞRULANMADI" && item.expertApprovalDate === null), "Her UÇEP görevi tam izlenebilirlik ve açık onay durumu taşımalı");
assert.deepEqual(validateScenarioCatalog(), { valid: true, errors: [], encounters: 3, difficulties: 3 }, "olgu kataloğu çalışma zamanı sözleşmesini geçmeli");
assert.equal(new Set(ENCOUNTER_CATALOG.map((item) => item.patient.id)).size, ENCOUNTER_CATALOG.length, "her olgu farklı sentetik hasta kimliği taşımalı");
assert.deepEqual(Object.keys(DIFFICULTY_PROFILES), ["guided", "standard", "advanced"], "üç zorluk profili yayınlanmalı");

for (const encounter of ENCOUNTER_CATALOG) {
  const encounterRun = run([{ type: "ASK_PATIENT", topic: "onset" }], "training", 71, encounter.id);
  assert.equal(encounterRun.state.encounterId, encounter.id, `${encounter.id} seçimi state'e taşınmalı`);
  assert.equal(encounterRun.state.interview[0].response, encounter.interviewFacts.onset, `${encounter.id} kendi öyküsünü açmalı`);
  assert.equal(replaySession(encounterRun.initial, encounterRun.records).matches, true, `${encounter.id} deterministik replay üretmeli`);
}

const guided = createSession({ mode: "osce", difficulty: "guided" });
const advanced = createSession({ mode: "osce", difficulty: "advanced" });
assert.equal(guided.state.osce.stationDurationSeconds, 1200, "rehberli OSCE süresi uygulanmalı");
assert.equal(advanced.state.osce.stationDurationSeconds, 720, "ileri OSCE süresi uygulanmalı");
assert.ok(advanced.state.physiology.configuration.progressionRate > guided.state.physiology.configuration.progressionRate, "zorluk fizyoloji hızını gerçekten değiştirmeli");

const physiology = new DeterministicPhysiologyEngine();
const initialPhysiology = physiology.initialize({ id: "synthetic-stemi-001" }, { id: "stemi-vf-rosc" }, 42);
const beforeAdvance = physiology.snapshot();
physiology.advanceTime(300);
assert.notDeepEqual(physiology.snapshot(), beforeAdvance, "zaman latent fizyolojiyi değiştirmeli");
physiology.restore(initialPhysiology);
assert.deepEqual(physiology.snapshot(), initialPhysiology, "snapshot restore kayıpsız olmalı");
assert.ok(physiology.observe(["vitals"]).vitals.heartRate > 0, "gözlem kanalı vital üretmeli");
assert.ok(physiology.explainTransition().summary, "motor geçiş açıklaması üretmeli");

assert.deepEqual(parsePatientQuestion("Ağrı ne zaman başladı ve nereye yayılıyor?", "assessment").intents, ["onset"], "serbest metin niyeti ayrıştırılmalı");
assert.equal(parsePatientQuestion("Beni duyuyor musunuz?", "vf").responseKind, "unresponsive", "VF fazında hasta sözel yanıt vermemeli");

const invalid = run([{ type: "PERFORM_INTERVENTION", actionId: "defibrillate" }]);
assert.equal(invalid.records[0].accepted, false, "geçersiz defibrilasyon reddedilmeli");
assert.equal(invalid.records[0].previousHash, invalid.records[0].nextHash, "reddedilen olay hasta durumunu değiştirmemeli");

const contraindication = run([
  { type: "ASK_PATIENT", question: "Düzenli veya son aldığınız ilaç var mı?" },
  { type: "ADMINISTER_MEDICATION", actionId: "nitroglycerin" },
]);
assert.equal(contraindication.state.safetyEvents.at(-1)?.code, "PDE5_NITRATE", "kontrendike nitrat kritik güvenlik olayı üretmeli");
assert.ok(contraindication.state.vitals.systolic < 90, "kontrendikasyon fizyoloji köprüsünden basıncı düşürmeli");

const noPde5 = run([
  { type: "ASK_PATIENT", topic: "medications" },
  { type: "ADMINISTER_MEDICATION", actionId: "nitroglycerin" },
], "training", 72, "enc_atypical_diabetes");
assert.equal(noPde5.state.safetyEvents.length, 0, "PDE5 maruziyeti olmayan olguda tamamlanmış ilaç öyküsü yanlış alarm üretmemeli");

const reasoning = run([
  { type: "DOCUMENT_REASONING", problemRepresentation: "Zaman kritik göğüs rahatsızlığı ve otonom bulguları olan yüksek riskli sentetik hasta.", differentials: ["stemi", "aortic_dissection", "pulmonary_embolism"], workingDiagnosis: "stemi", reassessmentPlan: "EKG ve vital değişimini iki dakika içinde yeniden değerlendir." },
  { type: "DOCUMENT_REASONING", problemRepresentation: "EKG sonucu beklenirken perfüzyon riski süren zaman kritik göğüs ağrısı olgusu.", differentials: ["stemi", "aortic_dissection"], workingDiagnosis: "stemi", reassessmentPlan: "Sonuç geldiğinde ritim, tansiyon ve transfer önceliğini yeniden değerlendir." },
]);
assert.equal(reasoning.state.reasoning.length, 2, "klinik gerekçe revizyonları üzerine yazılmadan saklanmalı");
assert.notEqual(reasoning.state.reasoning[0].problemRepresentation, reasoning.state.reasoning[1].problemRepresentation, "gerekçe geçmişi değişmez kalmalı");
assert.ok(reasoning.state.score.clinicalReasoning > 0 && reasoning.state.elapsedSeconds === 180, "gerekçe kararı puan ve klinik zaman üretmeli");

const diagnostics = run([{ type: "ORDER_TEST", actionId: "ecg" }]);
assert.equal(diagnostics.state.orders[0].status, "pending", "tetkik hemen sonuçlanmamalı");
assert.ok(diagnostics.state.financialCost > 0, "tetkik maliyet üretmeli");
const diagnosticsReady = dispatchEvent(diagnostics, { type: "ADVANCE_TIME", seconds: 120 });
assert.equal(diagnosticsReady.state.orders[0].status, "ready", "zaman ilerleyince EKG sonucu açılmalı");
assert.equal(diagnosticsReady.state.phase, "stemi", "EKG sonucu XState fazını STEMI'ye taşımalı");

const goldenEvents = [
  { type: "ASK_PATIENT", question: "Ağrı ne zaman başladı ve nereye yayılıyor?" },
  { type: "ASK_PATIENT", question: "Bulantı, terleme veya nefes darlığı var mı?" },
  { type: "ASK_PATIENT", question: "Son kullandığınız ilaçlar neler?" },
  { type: "PERFORM_EXAM", actionId: "cardiac-auscultation" },
  { type: "PERFORM_EXAM", actionId: "lung-auscultation" },
  { type: "ORDER_TEST", actionId: "ecg" },
  { type: "DOCUMENT_REASONING", problemRepresentation: "Baskı tarzı göğüs ağrısı ve otonom bulguları olan yüksek riskli sentetik hasta.", differentials: ["stemi", "aortic_dissection", "pulmonary_embolism"], workingDiagnosis: "stemi", reassessmentPlan: "EKG, ritim ve perfüzyonu sonuçla birlikte yeniden değerlendir." },
  { type: "PERFORM_INTERVENTION", actionId: "monitor_iv" },
  { type: "TEAM_ACTION", actionId: "assign_roles" },
  { type: "ADVANCE_TIME", seconds: 120 },
  { type: "ADMINISTER_MEDICATION", actionId: "aspirin" },
  { type: "PERFORM_INTERVENTION", actionId: "activate_cath" },
  { type: "ADVANCE_TIME", seconds: 600 },
  { type: "PERFORM_INTERVENTION", actionId: "call_code" },
  { type: "PERFORM_INTERVENTION", actionId: "start_cpr" },
  { type: "PERFORM_INTERVENTION", actionId: "defibrillate" },
  { type: "PERFORM_INTERVENTION", actionId: "resume_cpr" },
  { type: "PERFORM_INTERVENTION", actionId: "post_rosc" },
  { type: "TEAM_ACTION", actionId: "closed_loop" },
  { type: "PERFORM_INTERVENTION", actionId: "handoff_sbar" },
];

const golden = run(goldenEvents);
assert.equal(golden.state.phase, "handoff", "senaryo ROSC sonrası SBAR devrine ulaşmalı");
assert.equal(golden.state.status, "completed", "devir oturumu tamamlamalı");
assert.equal(golden.state.physiology.rhythm, "rosc", "resüsitasyon organize ritim üretmeli");
assert.equal(replaySession(golden.initial, golden.records).matches, true, "aynı olaylar aynı final hash'ini üretmeli");
assert.equal(restoreSession(JSON.stringify(golden)).stateHash, golden.stateHash, "serileştirilmiş oturum geri yüklenmeli");
assert.equal(buildDebrief(golden).completed, true, "tam senaryo debriefing üretmeli");

const training = run([{ type: "ASK_PATIENT", question: "Ağrı ne zaman başladı?" }], "training");
const assessment = run([{ type: "ASK_PATIENT", question: "Ağrı ne zaman başladı?" }], "assessment");
const osce = run([{ type: "ASK_PATIENT", question: "Ağrı ne zaman başladı?" }], "osce");
assert.ok(training.records[0].publicFeedback.includes("35 dakika"), "eğitim anlık açıklayıcı yanıt göstermeli");
assert.equal(assessment.records[0].mechanismVisible, false, "değerlendirme mekanizmayı gizlemeli");
assert.equal(osce.records[0].mechanismVisible, false, "OSCE mekanizmayı gizlemeli");
assert.ok(osce.state.osce.remainingSeconds < assessment.state.osce.remainingSeconds, "OSCE istasyon saati ilerlemeli");

const vfActions = getAvailableActions(golden.state, "intervention");
assert.ok(vfActions.every((item) => typeof item.available === "boolean"), "her görünür araç eylemi açıklanabilir uygunluk üretmeli");

const visualization = buildVisualizationRequest(golden.records.find((record) => record.event.actionId === "defibrillate"), golden.state);
assert.equal(visualization.request_ai_generation, false, "sağlayıcı yokken AI üretimi uydurulmamalı");
assert.equal(visualization.synthetic_patient_confirmed, true, "görselleştirme yalnız sentetik hasta kullanmalı");
assert.match(visualization.scenario_id, /^scn_/);
assert.ok(visualization.learning_objective.length >= 12, "render API öğrenme hedefi almalı");
assert.match(visualization.learner_action.action_id, /^[a-z0-9][a-z0-9-]{2,80}$/, "render API eylem kimliği geçerli olmalı");
assert.ok(visualization.clinical_rationale.length >= 12, "fizyoloji motorunun kararı render gerekçesi olmalı");
assert.equal(visualization.patient_state_before.phase, "vf", "olay öncesi faz render sözleşmesine aktarılmalı");
assert.equal(visualization.patient_state_after.phase, "vf", "olay sonrası faz render sözleşmesine aktarılmalı");

console.log("medical-v2-xstate-acceptance: XState, fizyoloji, araç, replay, mod ve render sözleşmeleri başarılı");
