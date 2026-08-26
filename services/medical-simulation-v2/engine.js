import { DeterministicPhysiologyEngine, PHYSIOLOGY_ENGINE_VERSION } from "./physiology-engine.js";
import { phaseFromMachine, replayMachine, teamStateFromMachine } from "./state-machine.js";

export const ENGINE_VERSION = "teys-stemi-event-engine/3.0.0";
export const SCENARIO_ID = "scn_stemi_vf_rosc";
export const SCENARIO_VERSION = "2.0.0";
export const SIMULATION_MODES = ["training", "assessment", "osce"];

export const TOOL_CATALOG = {
  interview: [
    { id: "onset", label: "Ağrının başlangıcını, niteliğini ve yayılımını sor", timeCostSeconds: 60, evidenceId: "ucep-history" },
    { id: "associated", label: "Eşlik eden belirtileri sor", timeCostSeconds: 60, evidenceId: "ucep-history" },
    { id: "medications", label: "İlaçları ve son kullanım zamanını sor", timeCostSeconds: 60, evidenceId: "ucep-history" },
    { id: "allergies", label: "Alerji öyküsünü sor", timeCostSeconds: 45, evidenceId: "ucep-history" },
    { id: "risk", label: "Kardiyovasküler riskleri sor", timeCostSeconds: 60, evidenceId: "ucep-history" },
  ],
  exam: [
    { id: "general-inspection", label: "Genel görünüm ve bilinç", region: "head", technique: "İnspeksiyon", timeCostSeconds: 45, evidenceId: "ucep-vitals" },
    { id: "cardiac-auscultation", label: "Kalp odaklarını dinle", region: "chest", technique: "Oskültasyon", timeCostSeconds: 90, evidenceId: "ucep-cardiovascular-exam" },
    { id: "lung-auscultation", label: "Akciğer alanlarını dinle", region: "chest", technique: "Oskültasyon", timeCostSeconds: 90, evidenceId: "ucep-respiratory-exam" },
    { id: "peripheral-perfusion", label: "Nabız ve kapiller dolumu değerlendir", region: "arm", technique: "Palpasyon", timeCostSeconds: 60, evidenceId: "ucep-vitals" },
  ],
  test: [
    { id: "ecg", label: "12 derivasyonlu EKG", timeCostSeconds: 30, resultDelaySeconds: 120, cost: 95, evidenceId: "ucep-ecg" },
    { id: "troponin", label: "Yüksek duyarlılıklı troponin", timeCostSeconds: 30, resultDelaySeconds: 900, cost: 180, evidenceId: "ucep-lab-request" },
    { id: "basic_labs", label: "Temel laboratuvar paneli", timeCostSeconds: 30, resultDelaySeconds: 600, cost: 260, evidenceId: "ucep-lab-request" },
    { id: "chest_xray", label: "Sentetik taşınabilir akciğer grafisi", timeCostSeconds: 30, resultDelaySeconds: 600, cost: 320, evidenceId: "ucep-direct-radiography" },
    { id: "pocus", label: "Yatak başı odaklı ultrason", timeCostSeconds: 120, resultDelaySeconds: 180, cost: 450, evidenceId: "ucep-vitals" },
  ],
  medication: [
    { id: "aspirin", label: "Aspirin protokol kartını uygula", protocolDose: "DOĞRULANMADI", route: "oral", timeCostSeconds: 30, evidenceId: "ucep-medication" },
    { id: "heparin", label: "Antikoagülan protokol kartını uygula", protocolDose: "DOĞRULANMADI", route: "IV/SC — yerel protokole bağlı", timeCostSeconds: 60, evidenceId: "ucep-medication" },
    { id: "nitroglycerin", label: "Nitrat protokol kartını uygula", protocolDose: "DOĞRULANMADI", route: "yerel protokole bağlı", timeCostSeconds: 30, evidenceId: "ucep-medication" },
    { id: "routine_oxygen", label: "Endikasyonsuz rutin yüksek akım oksijen", protocolDose: "DOĞRULANMADI", route: "inhalasyon", timeCostSeconds: 30, evidenceId: "ucep-oxygen" },
  ],
  intervention: [
    { id: "monitor_iv", label: "Monitörizasyon ve damar yolu", timeCostSeconds: 90, evidenceId: "ucep-iv" },
    { id: "safe_position", label: "Güvenli pozisyon ve yatak başı düzeni", timeCostSeconds: 45, evidenceId: "ucep-vitals" },
    { id: "titrated_oxygen", label: "Ölçüme göre titre oksijen", timeCostSeconds: 60, evidenceId: "ucep-oxygen" },
    { id: "activate_cath", label: "STEMI yolunu aktive et", timeCostSeconds: 60, evidenceId: "ucep-acute-coronary" },
    { id: "transfer_cath", label: "Kateter laboratuvarına güvenli transfer", timeCostSeconds: 300, evidenceId: "ucep-referral" },
    { id: "call_code", label: "Arrest ekibini aktive et", timeCostSeconds: 15, evidenceId: "ucep-emergency-organization" },
    { id: "start_cpr", label: "Yüksek kaliteli CPR başlat", timeCostSeconds: 15, evidenceId: "ucep-bls" },
    { id: "defibrillate", label: "Güvenli defibrilasyon uygula", timeCostSeconds: 15, evidenceId: "ucep-defibrillation" },
    { id: "resume_cpr", label: "Şok sonrası CPR'a hemen dön", timeCostSeconds: 120, evidenceId: "ucep-als" },
    { id: "post_rosc", label: "ROSC sonrası ABCDE değerlendirmesi", timeCostSeconds: 120, evidenceId: "ucep-als" },
    { id: "handoff_sbar", label: "SBAR ile sorumluluğu devret", timeCostSeconds: 120, evidenceId: "ucep-referral" },
  ],
  team: [
    { id: "assign_roles", label: "Kritik ekip rollerini ata", timeCostSeconds: 30, evidenceId: "ucep-emergency-organization" },
    { id: "closed_loop", label: "Kapalı döngü iletişimi başlat", timeCostSeconds: 30, evidenceId: "ucep-emergency-organization" },
    { id: "cardiology_consult", label: "Kardiyoloji konsültasyonu iste", timeCostSeconds: 60, evidenceId: "ucep-referral" },
  ],
};

const UCEP_EVIDENCE_BASE = {
  "ucep-acute-coronary": { task: "Göğüs ağrısında akut koroner sendromu önceliklendirme", practiceLevel: null, source: "Mezuniyet Öncesi Tıp Eğitimi UÇEP 2020, Tablo 2.3, s. 85", status: "DOĞRULANMADI" },
  "ucep-history": { task: "Genel ve soruna yönelik öykü alma", practiceLevel: 4, source: "UÇEP 2020, Tablo 2.4, s. 122", status: "DOĞRULANMADI" },
  "ucep-vitals": { task: "Genel durum ve vital bulguları değerlendirme", practiceLevel: 4, source: "UÇEP 2020, Tablo 2.4, s. 122", status: "DOĞRULANMADI" },
  "ucep-cardiovascular-exam": { task: "Kardiyovasküler sistem muayenesi", practiceLevel: 4, source: "UÇEP 2020, Tablo 2.4, s. 122", status: "DOĞRULANMADI" },
  "ucep-respiratory-exam": { task: "Solunum sistemi muayenesi", practiceLevel: 4, source: "UÇEP 2020, Tablo 2.4, s. 122", status: "DOĞRULANMADI" },
  "ucep-ecg": { task: "EKG çekme ve değerlendirme", practiceLevel: 3, source: "UÇEP 2020, Tablo 2.4, s. 123", status: "DOĞRULANMADI" },
  "ucep-lab-request": { task: "Laboratuvar tetkiki isteme", practiceLevel: 4, source: "UÇEP 2020, Tablo 2.4, s. 123", status: "DOĞRULANMADI" },
  "ucep-direct-radiography": { task: "Doğrudan grafiyi değerlendirme", practiceLevel: 3, source: "UÇEP 2020, Tablo 2.4, s. 123", status: "DOĞRULANMADI" },
  "ucep-iv": { task: "Damar yolu açma", practiceLevel: 3, source: "UÇEP 2020, Tablo 2.4, s. 124", status: "DOĞRULANMADI" },
  "ucep-defibrillation": { task: "Defibrilasyon uygulama", practiceLevel: 4, source: "UÇEP 2020, Tablo 2.4, s. 124", status: "DOĞRULANMADI" },
  "ucep-medication": { task: "İlacı güvenli hazırlama ve uygulama", practiceLevel: 3, source: "UÇEP 2020, Tablo 2.4, s. 126", status: "DOĞRULANMADI" },
  "ucep-oxygen": { task: "Oksijen tedavisi uygulama", practiceLevel: 4, source: "UÇEP 2020, Tablo 2.4, s. 125", status: "DOĞRULANMADI" },
  "ucep-als": { task: "İleri yaşam desteği", practiceLevel: 3, source: "UÇEP 2020, Tablo 2.4, s. 125", status: "DOĞRULANMADI" },
  "ucep-bls": { task: "Temel yaşam desteği", practiceLevel: 4, source: "UÇEP 2020, Tablo 2.4, s. 126", status: "DOĞRULANMADI" },
  "ucep-referral": { task: "Uygun sevk ve klinik devir", practiceLevel: 4, source: "UÇEP 2020, Tablo 2.4, s. 125", status: "DOĞRULANMADI" },
  "ucep-emergency-organization": { task: "Acil yardım organizasyonu ve ekip çalışması", practiceLevel: 3, source: "UÇEP 2020, Tablo 2.4, s. 126", status: "DOĞRULANMADI" },
};

export const UCEP_EVIDENCE = Object.fromEntries(Object.entries(UCEP_EVIDENCE_BASE).map(([id, evidence]) => [id, {
  ...evidence,
  ucepVersion: "2020",
  symptomOrCondition: "Akut göğüs ağrısı → STEMI şüphesi → olası VF/ROSC sentetik eğitim olgusu",
  basicMedicalPractice: evidence.task,
  learningOutcome: `${evidence.task} uygulamasını doğru faz, güvenlik ön koşulu ve yeniden değerlendirme ile gerçekleştirebilme.`,
  assessmentMethod: "Olay günlüğü, önce/sonra durum hash'i, süre, güvenlik olayı ve senaryo kontrol listesi",
  observableEvidence: `Kabul edilmiş ${id} olayı; zaman damgası, araç, gerçekleşen etki ve rubrik değişimi`,
  expertApprovalStatus: "DOĞRULANMADI",
  expertApprovalDate: null,
}]));

export const TYC_EVIDENCE = {
  knowledge: "Akut göğüs ağrısı ve zaman kritik riskleri açıklama bağlamı",
  skill: "Bilgiyi klinik eylem sırasına dönüştürme bağlamı",
  competence: "Belirsizlik altında güvenli ekip sorumluluğu bağlamı",
  proposedLevel: null,
  officialPlacementStatus: "DOĞRULANMADI",
};

const interviewFacts = {
  onset: "Ağrı yaklaşık 35 dakika önce merdiven çıkarken başladı; göğsümün ortasında baskı gibi ve sol koluma yayılıyor.",
  associated: "Soğuk terleme ve bulantı başladı. Nefesim de daralıyor.",
  medications: "Dün gece erektil disfonksiyon için tadalafil aldım. Tansiyon ilacımı bazen unutuyorum.",
  allergies: "Bilinen ilaç alerjim yok.",
  risk: "Günde bir paket sigara içiyorum. Tansiyonum yüksek; babam 52 yaşında kalp krizi geçirmişti.",
};

const examFindings = {
  "general-inspection": "Endişeli, soluk ve terli; konuşabiliyor ancak belirgin sıkıntılı.",
  "cardiac-auscultation": "Taşikardi ve düzenli ritim; yeni belirgin üfürüm yok. Periferik perfüzyon hafif azalmış.",
  "lung-auscultation": "Her iki akciğer alanında solunum sesleri eşit; belirgin ral yok.",
  "peripheral-perfusion": "Radial nabızlar simetrik fakat zayıf; kapiller dolum yaklaşık 3 saniye.",
};

const testResults = {
  ecg: "V2–V5 derivasyonlarında belirgin ST yükselmesi; akut anterior STEMI ile uyumlu sentetik eğitim bulgusu.",
  troponin: "Sentetik yüksek duyarlılıklı troponin referans üst sınırının üzerinde; seri ölçüm bağlamı gerekir.",
  basic_labs: "Hemoglobin, trombosit ve kreatinin sentetik aralıkta; potasyum 4,1 mmol/L.",
  chest_xray: "Sentetik görüntüde belirgin pulmoner ödem, pnömotoraks veya mediastinal genişleme yok.",
  pocus: "Sol ventrikül ön duvar hareketinde bölgesel azalma; belirgin perikardiyal efüzyon yok.",
};

const intentDefinitions = {
  onset: ["ne zaman", "başladı", "başlangıç", "süre", "yayılıyor", "yayılım", "nerede", "nasıl ağrı", "baskı"],
  associated: ["bulantı", "terleme", "nefes", "kusma", "eşlik", "baş dönmesi"],
  medications: ["ilaç", "tablet", "hap", "son doz", "tadalafil", "sildenafil", "viagra"],
  allergies: ["alerji", "alerjik", "reaksiyon"],
  risk: ["sigara", "tansiyon", "aile", "şeker", "diyabet", "kolesterol", "risk"],
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function hash(value) {
  const text = stableStringify(value);
  let result = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    result ^= text.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return `fnv1a-${(result >>> 0).toString(16).padStart(8, "0")}`;
}

function stateForHash(state) {
  const copy = clone(state);
  delete copy.stateHash;
  return copy;
}

function normalizeQuestion(value) {
  return String(value ?? "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKC")
    .replace(/[^a-zçğıöşü0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parsePatientQuestion(question, phase = "assessment") {
  if (phase === "vf") return { intents: [], responseKind: "unresponsive", confidence: 1 };
  const normalized = normalizeQuestion(question);
  const tokens = new Set(normalized.split(" ").filter(Boolean));
  const scored = Object.entries(intentDefinitions).map(([intent, clues]) => {
    const score = clues.reduce((total, clue) => {
      const clueTokens = clue.split(" ");
      if (clueTokens.length > 1) return total + (normalized.includes(clue) ? 3 : 0);
      return total + (tokens.has(clue) ? 2 : 0);
    }, 0);
    return { intent, score };
  }).filter((item) => item.score > 0).sort((left, right) => right.score - left.score || left.intent.localeCompare(right.intent));
  const bestScore = scored[0]?.score ?? 0;
  return {
    intents: scored.filter((item) => item.score === bestScore).map((item) => item.intent),
    responseKind: phase === "rosc" ? "recovering" : bestScore ? "matched" : "clarification",
    confidence: Math.min(1, bestScore / 6),
  };
}

function actionFor(tool, actionId) {
  return TOOL_CATALOG[tool]?.find((item) => item.id === actionId) ?? null;
}

function addUnique(items, value) {
  if (!items.includes(value)) items.push(value);
}

function machineEvent(state, eventType) {
  const before = replayMachine(state.machineEvents);
  const candidate = [...state.machineEvents, eventType];
  const after = replayMachine(candidate);
  if (stableStringify(before) !== stableStringify(after)) state.machineEvents = candidate;
  state.machine = after;
  state.phase = phaseFromMachine(after);
  state.teamState = teamStateFromMachine(after);
  state.status = after.lifecycle === "completed" ? "completed" : state.phase === "vf" ? "critical" : "active";
}

function syncPhysiology(state, physics) {
  physics.setPhase(state.phase);
  state.physiology = physics.snapshot();
  state.elapsedSeconds = state.physiology.elapsedSeconds;
  state.vitals = clone(state.physiology.vitals);
  if (state.mode === "osce") state.osce.remainingSeconds = Math.max(0, state.osce.stationDurationSeconds - state.elapsedSeconds);
}

function releaseOrders(state) {
  for (const order of state.orders) {
    if (order.status === "pending" && order.readyAtSeconds <= state.elapsedSeconds) {
      order.status = "ready";
      order.result = testResults[order.id];
      addUnique(state.knowledge, `test:${order.id}`);
      if (order.id === "ecg" && !state.flags.ecgReady) {
        state.flags.ecgReady = true;
        machineEvent(state, "ECG_CONFIRMED");
      }
    }
  }
}

function advanceTime(state, physics, seconds) {
  physics.setPhase(state.phase);
  const transition = physics.advanceTime(seconds);
  state.physiology = transition.snapshot;
  state.elapsedSeconds = transition.snapshot.elapsedSeconds;
  state.vitals = clone(transition.snapshot.vitals);
  if (state.mode === "osce") state.osce.remainingSeconds = Math.max(0, state.osce.stationDurationSeconds - state.elapsedSeconds);
  releaseOrders(state);
  if (state.physiology.latent.rhythm === "vf" && state.phase !== "vf") machineEvent(state, "VF_DETECTED");
  syncPhysiology(state, physics);
  return transition.explanation;
}

function scoreTemplate() {
  return { informationGathering: 0, clinicalReasoning: 0, treatment: 0, patientSafety: 100, teamwork: 0, timeManagement: 100 };
}

export function createInitialState({ mode = "training", seed = 20260827 } = {}) {
  if (!SIMULATION_MODES.includes(mode)) throw new Error(`Desteklenmeyen simülasyon modu: ${mode}`);
  const physics = new DeterministicPhysiologyEngine();
  const physiology = physics.initialize({ id: "synthetic-stemi-001" }, { id: SCENARIO_ID }, seed);
  const machineEvents = [];
  const machine = replayMachine(machineEvents);
  const state = {
    version: ENGINE_VERSION,
    scenarioId: SCENARIO_ID,
    scenarioVersion: SCENARIO_VERSION,
    seed,
    mode,
    status: "active",
    phase: phaseFromMachine(machine),
    teamState: teamStateFromMachine(machine),
    machine,
    machineEvents,
    elapsedSeconds: 0,
    financialCost: 0,
    patient: { id: "synthetic-stemi-001", synthetic: true, age: 58, sex: "Erkek", chiefComplaint: "Göğsümde çok güçlü bir baskı var." },
    physiology,
    vitals: clone(physiology.vitals),
    knowledge: [],
    interview: [],
    examinations: [],
    orders: [],
    medications: [],
    interventions: [],
    teamActions: [],
    safetyEvents: [],
    visualizations: [],
    score: scoreTemplate(),
    osce: { stationDurationSeconds: 900, remainingSeconds: 900, checklistVisible: false },
    flags: {
      ecgReady: false,
      pde5Disclosed: false,
      aspirinGiven: false,
      heparinGiven: false,
      monitorIv: false,
      titratedOxygen: false,
      cathActivated: false,
      transferredToCath: false,
      codeCalled: false,
      cprActive: false,
      shockDelivered: false,
      postRoscAssessed: false,
      rolesAssigned: false,
      closedLoop: false,
      cardiologyConsulted: false,
      handoffComplete: false,
    },
    lastMessage: "Sentetik hasta resüsitasyon alanına alındı.",
    lastMechanism: "Koroner akım kısıtlı; latent iskemi ve elektriksel instabilite zamanla birlikte evriliyor.",
    validation: { physiology: "DOĞRULANMADI", ucep: "DOĞRULANMADI", tyc: "DOĞRULANMADI" },
    stateHash: "",
  };
  state.stateHash = hash(stateForHash(state));
  return state;
}

export function createSession(options = {}) {
  const initial = createInitialState(options);
  return { initial: clone(initial), state: clone(initial), records: [], stateHash: initial.stateHash };
}

export function getActionAvailability(state, tool, actionId) {
  const action = actionFor(tool, actionId);
  if (!action) return { available: false, reason: "Tanımsız araç eylemi." };
  if (state.status === "completed") return { available: false, reason: "Oturum tamamlandı." };
  if (tool === "interview" && state.phase === "vf") return { available: false, reason: "Hasta arrestte; sözel yanıt yok." };
  if (tool === "exam" && ["vf", "handoff"].includes(state.phase)) return { available: false, reason: "Bu klinik fazda rutin muayene kullanılamaz." };
  if (tool === "test" && state.orders.some((item) => item.id === actionId)) return { available: false, reason: "Tetkik zaten istendi." };
  if (tool === "medication" && state.medications.some((item) => item.id === actionId)) return { available: false, reason: "İlaç kararı zaten kaydedildi." };
  if (tool === "medication" && actionId === "heparin" && !state.flags.ecgReady) return { available: false, reason: "EKG sonucu henüz görünür değil." };
  if (tool === "intervention" && actionId === "monitor_iv" && state.flags.monitorIv) return { available: false, reason: "Monitör ve damar yolu hazır." };
  if (tool === "intervention" && actionId === "safe_position" && state.interventions.includes(actionId)) return { available: false, reason: "Güvenli pozisyon zaten verildi." };
  if (tool === "intervention" && actionId === "titrated_oxygen" && state.flags.titratedOxygen) return { available: false, reason: "Titre oksijen zaten uygulanıyor." };
  if (tool === "intervention" && actionId === "activate_cath" && !state.flags.ecgReady) return { available: false, reason: "STEMI bulgusu açılmadı." };
  if (tool === "intervention" && actionId === "activate_cath" && state.flags.cathActivated) return { available: false, reason: "STEMI yolu zaten aktif." };
  if (tool === "intervention" && actionId === "transfer_cath" && !state.flags.cathActivated) return { available: false, reason: "Önce STEMI yolunu aktive et." };
  if (tool === "intervention" && ["call_code", "start_cpr", "defibrillate", "resume_cpr"].includes(actionId) && state.phase !== "vf") return { available: false, reason: "Yalnız şoklanabilir arrest fazında kullanılabilir." };
  if (tool === "intervention" && actionId === "start_cpr" && !state.flags.codeCalled) return { available: false, reason: "Önce arrest ekibini aktive et." };
  if (tool === "intervention" && actionId === "defibrillate" && !state.flags.cprActive) return { available: false, reason: "Önce CPR başlat." };
  if (tool === "intervention" && actionId === "resume_cpr" && !state.flags.shockDelivered) return { available: false, reason: "Şok henüz uygulanmadı." };
  if (tool === "intervention" && actionId === "post_rosc" && state.phase !== "rosc") return { available: false, reason: "ROSC henüz oluşmadı." };
  if (tool === "intervention" && actionId === "handoff_sbar" && !(state.phase === "rosc" && state.flags.postRoscAssessed && state.flags.closedLoop)) return { available: false, reason: "Post-ROSC değerlendirme ve kapalı döngü iletişim tamamlanmalı." };
  if (tool === "team" && actionId === "closed_loop" && !state.flags.rolesAssigned) return { available: false, reason: "Önce ekip rollerini ata." };
  if (tool === "team" && actionId === "cardiology_consult" && !state.flags.ecgReady) return { available: false, reason: "EKG bulgusu henüz görünür değil." };
  return { available: true, reason: "" };
}

export function getAvailableActions(state, tool) {
  return (TOOL_CATALOG[tool] ?? []).map((action) => ({ ...action, ...getActionAvailability(state, tool, action.id) }));
}

function rejected(state, message) {
  return { accepted: false, state, message, mechanism: "XState fazı veya klinik ön koşul geçişi reddetti; hasta durumu değişmedi.", expectedEffect: "Geçerli faz ve ön koşul", actualEffect: "Geçiş reddedildi", rubricEffect: {}, safetyAlert: null, evidenceId: null };
}

function accepted(state, fields) {
  return { accepted: true, state, safetyAlert: null, rubricEffect: {}, ...fields };
}

function patientStateSummary(state) {
  const phase = state.phase === "handoff" ? "integrated" : state.phase === "stemi" ? "diagnostics" : state.phase;
  return {
    phase,
    consciousness: state.phase === "vf" ? "unresponsive" : state.phase === "rosc" ? "verbal" : "alert",
    pain_score: state.phase === "vf" ? 0 : state.phase === "rosc" ? 3 : 9,
    heart_rate: state.vitals.heartRate,
    systolic_bp: state.vitals.systolic,
    diastolic_bp: state.vitals.diastolic,
    spo2: state.vitals.spo2,
    respiratory_rate: state.vitals.respiratoryRate,
    temperature_c: state.vitals.temperature,
    rhythm: state.vitals.rhythm === "stemi" ? "stemi" : state.vitals.rhythm === "vf" ? "vf" : state.vitals.rhythm === "rosc" ? "rosc" : "sinus",
    visible_signs: state.phase === "vf" ? ["Yanıtsız", "Normal solunum yok", "VF monitör ritmi"] : state.phase === "rosc" ? ["Organize ritim", "Palpe edilebilir nabız", "Spontan solunum"] : ["Terleme", "Göğüs ağrısı", "Endişe"],
    active_interventions: [...state.interventions],
  };
}

function applyInterview(state, event, physics) {
  if (state.phase === "vf") return rejected(state, "Hasta arrestte; sözel yanıt yok.");
  const selected = event.topic ? { intents: [event.topic], responseKind: state.phase === "rosc" ? "recovering" : "matched", confidence: 1 } : parsePatientQuestion(event.question, state.phase);
  const intent = selected.intents[0] ?? "clarification";
  const action = actionFor("interview", intent) ?? { label: "Serbest soru", timeCostSeconds: 60, evidenceId: "ucep-history" };
  const repeated = intent !== "clarification" && state.interview.some((entry) => entry.intents.includes(intent));
  const response = selected.responseKind === "recovering"
    ? "Neredeyim? Göğsüm hâlâ ağrıyor ama daha az."
    : intent === "clarification"
      ? "Soruyu tam anlayamadım; göğsümdeki baskıyla ilgili biraz daha açık sorabilir misiniz?"
      : interviewFacts[intent];
  state.interview.push({ question: event.question ?? action.label, response, intents: selected.intents, confidence: selected.confidence, repeated });
  if (intent !== "clarification") addUnique(state.knowledge, `history:${intent}`);
  if (intent === "medications") state.flags.pde5Disclosed = true;
  state.score.informationGathering = clamp(state.score.informationGathering + (repeated ? 0 : intent === "clarification" ? 2 : 12));
  if (repeated) state.score.timeManagement = clamp(state.score.timeManagement - 3);
  const explanation = advanceTime(state, physics, action.timeCostSeconds);
  return accepted(state, {
    message: `Hasta: “${response}”`,
    mechanism: repeated ? "Tekrarlanan soru yeni bilgi üretmedi; fizyolojik saat ilerledi." : explanation.summary,
    expectedEffect: "Duruma bağlı bilgi açılımı",
    actualEffect: intent === "clarification" ? "Özgül bilgi açılmadı" : `${intent} öyküsü açıldı`,
    rubricEffect: { informationGathering: repeated ? 0 : intent === "clarification" ? 2 : 12, timeManagement: repeated ? -3 : 0 },
    evidenceId: action.evidenceId,
  });
}

function applyExam(state, event, physics) {
  const availability = getActionAvailability(state, "exam", event.actionId);
  if (!availability.available) return rejected(state, availability.reason);
  const action = actionFor("exam", event.actionId);
  const repeated = state.examinations.some((item) => item.id === action.id);
  state.examinations.push({ id: action.id, region: action.region, technique: action.technique, finding: examFindings[action.id], repeated });
  addUnique(state.knowledge, `exam:${action.id}`);
  state.score.informationGathering = clamp(state.score.informationGathering + (repeated ? 0 : 10));
  if (repeated) state.score.timeManagement = clamp(state.score.timeManagement - 4);
  const explanation = advanceTime(state, physics, action.timeCostSeconds);
  return accepted(state, { message: examFindings[action.id], mechanism: repeated ? "Tekrarlanan muayene ek bulgu üretmedi; zaman ilerledi." : explanation.summary, expectedEffect: `${action.region} · ${action.technique}`, actualEffect: examFindings[action.id], rubricEffect: { informationGathering: repeated ? 0 : 10, timeManagement: repeated ? -4 : 0 }, evidenceId: action.evidenceId });
}

function applyTest(state, event, physics) {
  const availability = getActionAvailability(state, "test", event.actionId);
  if (!availability.available) return rejected(state, availability.reason);
  const action = actionFor("test", event.actionId);
  state.orders.push({ id: action.id, label: action.label, orderedAtSeconds: state.elapsedSeconds, readyAtSeconds: state.elapsedSeconds + action.resultDelaySeconds, cost: action.cost, status: "pending", result: null });
  state.financialCost += action.cost;
  state.score.clinicalReasoning = clamp(state.score.clinicalReasoning + (action.id === "ecg" ? 18 : 6));
  if (["chest_xray", "basic_labs"].includes(action.id) && !state.flags.ecgReady) state.score.timeManagement = clamp(state.score.timeManagement - 4);
  const explanation = advanceTime(state, physics, action.timeCostSeconds);
  return accepted(state, { message: `${action.label} istendi; sonuç ${Math.round(action.resultDelaySeconds / 60)} dakika sonra hazır olacak.`, mechanism: explanation.summary, expectedEffect: "Gecikmeli klinik bilgi", actualEffect: `${action.cost} TL sentetik maliyet`, rubricEffect: { clinicalReasoning: action.id === "ecg" ? 18 : 6 }, evidenceId: action.evidenceId });
}

function applyMedication(state, event, physics) {
  const availability = getActionAvailability(state, "medication", event.actionId);
  if (!availability.available) return rejected(state, availability.reason);
  const action = actionFor("medication", event.actionId);
  const contraindicated = action.id === "nitroglycerin" && state.flags.pde5Disclosed;
  state.medications.push({ id: action.id, atSeconds: state.elapsedSeconds, protocolDose: action.protocolDose, route: action.route, contraindicated });
  let message = `${action.label}; doz ve yol alanları DOĞRULANMADI protokol kartıyla kaydedildi.`;
  let safetyAlert = null;
  let treatment = 8;
  let safety = 0;
  if (action.id === "aspirin") {
    state.flags.aspirinGiven = true;
    treatment = 18;
  }
  if (action.id === "heparin") {
    state.flags.heparinGiven = true;
    treatment = 12;
  }
  if (contraindicated) {
    state.safetyEvents.push({ severity: "critical", code: "PDE5_NITRATE", message: "Yakın PDE5 inhibitörü öyküsü varken nitrat uygulandı." });
    state.score.patientSafety = clamp(state.score.patientSafety - 45);
    safety = -45;
    safetyAlert = "KRİTİK: PDE5 inhibitörü öyküsüyle nitrat güvenlik olayı.";
    message = "Sentetik hastanın perfüzyonu bozuldu; kritik güvenlik olayı kaydedildi.";
  } else if (action.id === "nitroglycerin") {
    state.safetyEvents.push({ severity: "major", code: "HISTORY_MISSING", message: "PDE5 öyküsü açılmadan nitrat kararı verildi." });
    state.score.patientSafety = clamp(state.score.patientSafety - 20);
    safety = -20;
    safetyAlert = "GÜVENLİK: İlaç öyküsü tamamlanmadı.";
  }
  if (action.id === "routine_oxygen") {
    state.safetyEvents.push({ severity: "minor", code: "ROUTINE_OXYGEN", message: "Ölçüme dayalı hedef olmadan rutin yüksek akım oksijen seçildi." });
    state.score.patientSafety = clamp(state.score.patientSafety - 8);
    safety = -8;
    safetyAlert = "Rutin oksijen yerine ölçüme dayalı titrasyon beklenir.";
  }
  physics.applyClinicalEvent({ actionId: action.id, contraindicated });
  state.score.treatment = clamp(state.score.treatment + treatment);
  const explanation = advanceTime(state, physics, action.timeCostSeconds);
  return accepted(state, { message, mechanism: explanation.summary, expectedEffect: action.label, actualEffect: message, rubricEffect: { treatment, patientSafety: safety }, safetyAlert, evidenceId: action.evidenceId });
}

function applyIntervention(state, event, physics) {
  const availability = getActionAvailability(state, "intervention", event.actionId);
  if (!availability.available) return rejected(state, availability.reason);
  const action = actionFor("intervention", event.actionId);
  addUnique(state.interventions, action.id);
  let message = `${action.label} tamamlandı.`;
  let treatment = 8;
  let teamwork = 0;

  if (action.id === "monitor_iv") state.flags.monitorIv = true;
  if (action.id === "titrated_oxygen") state.flags.titratedOxygen = true;
  if (action.id === "activate_cath") {
    state.flags.cathActivated = true;
    machineEvent(state, "CATH_ACTIVATED");
    treatment = 14;
    message = "STEMI yolu aktive edildi; transfer seçeneği açıldı.";
  }
  if (action.id === "transfer_cath") {
    state.flags.transferredToCath = true;
    treatment = 22;
    message = "Sentetik reperfüzyon geçişi uygulandı; oklüzyon yükü azaltıldı.";
  }
  if (action.id === "call_code") {
    state.flags.codeCalled = true;
    teamwork = 10;
    treatment = 0;
  }
  if (action.id === "start_cpr") {
    state.flags.cprActive = true;
    treatment = 14;
  }
  if (action.id === "defibrillate") {
    state.flags.shockDelivered = true;
    state.flags.cprActive = false;
    treatment = 18;
    message = "Şok uygulandı; CPR'a hemen dönme seçeneği açıldı.";
  }
  physics.applyClinicalEvent({ actionId: action.id });
  let explanation = advanceTime(state, physics, action.timeCostSeconds);
  if (action.id === "resume_cpr") {
    physics.applyClinicalEvent({ actionId: "achieve_rosc" });
    machineEvent(state, "ROSC_ACHIEVED");
    syncPhysiology(state, physics);
    state.flags.cprActive = false;
    treatment = 20;
    message = "Organize ritim ve sentetik ROSC oluştu; post-ROSC değerlendirme açıldı.";
    explanation = physics.explainTransition();
  }
  if (action.id === "post_rosc") state.flags.postRoscAssessed = true;
  if (action.id === "handoff_sbar") {
    state.flags.handoffComplete = true;
    machineEvent(state, "HANDOFF_COMPLETED");
    syncPhysiology(state, physics);
    teamwork = 18;
    treatment = 0;
    message = "SBAR devri tamamlandı; oturum debriefing için kapatıldı.";
  }
  state.score.treatment = clamp(state.score.treatment + treatment);
  state.score.teamwork = clamp(state.score.teamwork + teamwork);
  return accepted(state, { message, mechanism: explanation.summary, expectedEffect: action.label, actualEffect: message, rubricEffect: { treatment, teamwork }, evidenceId: action.evidenceId });
}

function applyTeam(state, event, physics) {
  const availability = getActionAvailability(state, "team", event.actionId);
  if (!availability.available) return rejected(state, availability.reason);
  const action = actionFor("team", event.actionId);
  addUnique(state.teamActions, action.id);
  if (action.id === "assign_roles") {
    state.flags.rolesAssigned = true;
    machineEvent(state, "ROLES_ASSIGNED");
  }
  if (action.id === "closed_loop") {
    state.flags.closedLoop = true;
    machineEvent(state, "CLOSED_LOOP_STARTED");
  }
  if (action.id === "cardiology_consult") state.flags.cardiologyConsulted = true;
  state.score.teamwork = clamp(state.score.teamwork + 14);
  const explanation = advanceTime(state, physics, action.timeCostSeconds);
  return accepted(state, { message: `${action.label}: görev sahibi, geri okuma ve zaman damgası kaydedildi.`, mechanism: explanation.summary, expectedEffect: "Ekip koordinasyonu", actualEffect: action.label, rubricEffect: { teamwork: 14 }, evidenceId: action.evidenceId });
}

function applyAdvance(state, event, physics) {
  const seconds = Math.round(Number(event.seconds));
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 900) return rejected(state, "Zaman adımı 1–900 saniye arasında olmalıdır.");
  const before = state.phase;
  const explanation = advanceTime(state, physics, seconds);
  const penalty = Math.max(1, Math.round(seconds / 120));
  state.score.timeManagement = clamp(state.score.timeManagement - penalty);
  const vfStarted = before !== "vf" && state.phase === "vf";
  return accepted(state, { message: vfStarted ? "Monitörde ventriküler fibrilasyon başladı; hasta yanıtsız ve nabızsız." : `${Math.round(seconds / 60)} dakikalık klinik zaman ilerledi.`, mechanism: explanation.summary, expectedEffect: "Zamana bağlı fizyolojik evrim", actualEffect: vfStarted ? "VF arrest" : "Latent durum ve vital değerler güncellendi", rubricEffect: { timeManagement: -penalty }, safetyAlert: vfStarted ? "KRİTİK: Şoklanabilir kardiyak arrest." : null, evidenceId: vfStarted ? "ucep-als" : "ucep-acute-coronary" });
}

function applyVisualization(state, event) {
  if (event.type === "REQUEST_VISUALIZATION") {
    const target = event.recordId;
    if (!target) return rejected(state, "Görselleştirilecek olay kimliği eksik.");
    const id = `viz_${target}`;
    const existing = state.visualizations.find((item) => item.id === id);
    if (existing?.status === "requested" || existing?.status === "running") return rejected(state, "Bu olay için render işi zaten çalışıyor.");
    state.visualizations = [...state.visualizations.filter((item) => item.id !== id), { id, recordId: target, status: "requested", videoUrl: null, reason: null }];
    return accepted(state, { message: "arXivisual/Manim iş isteği kaydedildi.", mechanism: "Hasta durumu değişmedi; doğrulanmış olay görselleştirme adaptörüne gönderilecek.", expectedEffect: "Render işi", actualEffect: "İstek hazırlandı", evidenceId: null });
  }
  const item = state.visualizations.find((candidate) => candidate.id === event.visualizationId);
  if (!item) return rejected(state, "Görselleştirme işi bulunamadı.");
  item.status = event.status;
  item.videoUrl = event.videoUrl ?? null;
  item.reason = event.reason ?? null;
  return accepted(state, { message: event.status === "ready" ? "Karara özel Manim çıktısı hazır." : `Manim çıktısı kullanılamadı: ${item.reason ?? event.status}`, mechanism: event.status === "ready" ? "Render sonucu olay kaydıyla ilişkilendirildi." : "Simülasyon devam ediyor; erişilebilir metin fallback'i etkin.", expectedEffect: "Render sonucu", actualEffect: event.status, evidenceId: null });
}

function execute(state, event) {
  const physics = new DeterministicPhysiologyEngine();
  physics.restore(state.physiology);
  physics.setPhase(state.phase);
  if (!event || typeof event.type !== "string") return rejected(state, "Geçersiz olay sözleşmesi.");
  if (event.type === "ASK_PATIENT") return applyInterview(state, event, physics);
  if (event.type === "PERFORM_EXAM") return applyExam(state, event, physics);
  if (event.type === "ORDER_TEST") return applyTest(state, event, physics);
  if (event.type === "ADMINISTER_MEDICATION") return applyMedication(state, event, physics);
  if (event.type === "PERFORM_INTERVENTION") return applyIntervention(state, event, physics);
  if (event.type === "TEAM_ACTION") return applyTeam(state, event, physics);
  if (event.type === "ADVANCE_TIME") return applyAdvance(state, event, physics);
  if (["REQUEST_VISUALIZATION", "VISUALIZATION_RESULT"].includes(event.type)) return applyVisualization(state, event);
  return rejected(state, `Tanımsız olay: ${event.type}`);
}

function toolForEvent(type) {
  return { ASK_PATIENT: "interview", PERFORM_EXAM: "exam", ORDER_TEST: "test", ADMINISTER_MEDICATION: "medication", PERFORM_INTERVENTION: "intervention", TEAM_ACTION: "team", ADVANCE_TIME: "time", REQUEST_VISUALIZATION: "visualization", VISUALIZATION_RESULT: "visualization" }[type] ?? "unknown";
}

export function dispatchEvent(session, event) {
  const state = clone(session.state);
  const previousHash = session.stateHash ?? state.stateHash ?? hash(stateForHash(state));
  const patientStateBefore = patientStateSummary(state);
  const result = execute(state, clone(event));
  if (result.accepted) {
    result.state.lastMessage = result.message;
    result.state.lastMechanism = result.mechanism;
    result.state.stateHash = hash(stateForHash(result.state));
  }
  const nextHash = result.accepted ? result.state.stateHash : previousHash;
  const recordIndex = session.records.length + 1;
  const record = {
    id: `evt_stemi_${String(recordIndex).padStart(4, "0")}`,
    index: recordIndex,
    engineVersion: ENGINE_VERSION,
    physiologyEngineVersion: PHYSIOLOGY_ENGINE_VERSION,
    scenarioId: SCENARIO_ID,
    scenarioVersion: SCENARIO_VERSION,
    seed: result.state.seed,
    event: clone(event),
    accepted: result.accepted,
    simulationSecond: result.state.elapsedSeconds,
    previousHash,
    nextHash,
    tool: toolForEvent(event.type),
    expectedEffect: result.expectedEffect,
    actualEffect: result.actualEffect,
    rubricEffect: result.rubricEffect,
    safetyAlert: result.safetyAlert,
    evidenceId: result.evidenceId,
    mechanism: result.mechanism,
    mechanismVisible: result.state.mode === "training" || result.state.status === "completed",
    publicFeedback: event.type === "ASK_PATIENT" && result.accepted
      ? result.message
      : result.state.mode === "training"
        ? result.message
        : result.accepted ? "Karar kaydedildi." : "Geçersiz geçiş kaydedildi.",
    patientStateBefore,
    patientStateAfter: patientStateSummary(result.state),
  };
  return { initial: clone(session.initial), state: result.state, records: [...session.records, record], stateHash: nextHash };
}

export function replaySession(initial, records) {
  let session = { initial: clone(initial), state: clone(initial), records: [], stateHash: initial.stateHash ?? hash(stateForHash(initial)) };
  for (const record of records) session = dispatchEvent(session, record.event);
  const expected = records.at(-1)?.nextHash ?? session.stateHash;
  return { session, matches: session.stateHash === expected, finalHash: session.stateHash };
}

export function restoreSession(serialized) {
  const parsed = typeof serialized === "string" ? JSON.parse(serialized) : clone(serialized);
  if (parsed?.state?.version !== ENGINE_VERSION || !Array.isArray(parsed.records)) throw new Error("Uyumsuz veya bozuk V2 oturumu.");
  const replay = replaySession(parsed.initial, parsed.records);
  if (!replay.matches || replay.finalHash !== parsed.stateHash) throw new Error("Oturum bütünlük hash'i uyuşmuyor.");
  return replay.session;
}

export function buildDebrief(session) {
  const state = session.state;
  const required = [
    ["En az üç öykü alanı", state.knowledge.filter((item) => item.startsWith("history:")).length >= 3],
    ["En az iki odaklı muayene", state.examinations.length >= 2],
    ["EKG sonucu", state.flags.ecgReady],
    ["Monitör ve damar yolu", state.flags.monitorIv],
    ["STEMI yolu", state.flags.cathActivated],
    ["Ekip rolleri", state.flags.rolesAssigned],
    ["ROSC veya reperfüzyon", state.phase === "rosc" || state.phase === "handoff" || state.flags.transferredToCath],
    ["SBAR devir", state.flags.handoffComplete],
  ];
  const criticalSafety = state.safetyEvents.filter((event) => event.severity === "critical");
  return {
    completed: state.status === "completed",
    competencyMet: state.status === "completed" && criticalSafety.length === 0 && required.filter(([, passed]) => passed).length >= 7,
    checklist: required.map(([label, passed]) => ({ label, passed })),
    dimensions: clone(state.score),
    criticalSafety,
    criticalDelays: session.records.filter((record) => record.actualEffect === "VF arrest").map((record) => `VF ${Math.round(record.simulationSecond / 60)}. dakikada gelişti.`),
    unnecessaryActions: session.records.filter((record) => record.rubricEffect?.timeManagement < -3).map((record) => record.actualEffect),
    finalHash: session.stateHash,
    replayableEvents: session.records.length,
    note: "Sentetik eğitim prototipi; klinik motor, UÇEP eşlemesi ve yeterlilik kararı uzman onayı olmadan DOĞRULANMADI.",
  };
}

export function buildVisualizationRequest(record, state) {
  if (!record) throw new Error("Görselleştirme için olay kaydı gerekir.");
  const actionId = String(record.event.actionId ?? record.event.type).toLocaleLowerCase("tr-TR").replaceAll("_", "-");
  const action = "actionId" in record.event ? actionFor(record.tool, record.event.actionId) : null;
  const category = record.tool === "intervention"
    ? record.event.actionId === "handoff_sbar" ? "handoff" : record.event.actionId === "defibrillate" || record.event.actionId === "start_cpr" || record.event.actionId === "resume_cpr" ? "resuscitation" : "procedure"
    : record.tool === "test" ? "diagnostic_test"
      : record.tool === "medication" ? "medication"
        : record.tool === "interview" ? "history"
          : record.tool === "exam" ? "examination"
            : record.tool === "team" ? "team_management"
              : "reassessment";
  const timeCostSeconds = record.event.type === "ADVANCE_TIME"
    ? record.event.seconds
    : action?.timeCostSeconds ?? 0;
  const criticalSignal = record.safetyAlert
    ?? (record.patientStateAfter.rhythm === "vf"
      ? "Sentetik monitörde şoklanabilir VF ritmi ve dolaşım kaybı."
      : "Belirgin kritik alarm yok; olay öncesi ve sonrası sentetik fizyolojik değişim izlenir.");
  return {
    scenario_id: SCENARIO_ID,
    scenario_version: SCENARIO_VERSION,
    module_id: 6,
    learning_objective: `Öğrenci kararının sentetik hasta durumunda oluşturduğu değişimi ve güvenlik gerekçesini olay öncesi ve sonrası kanıtla açıklamak: ${record.expectedEffect}.`,
    patient_state_before: clone(record.patientStateBefore),
    learner_action: {
      action_id: actionId,
      label: record.expectedEffect || record.event.type,
      category,
      learner_justification: null,
      time_cost_seconds: Math.max(0, Math.min(7200, Math.round(timeCostSeconds))),
    },
    patient_state_after: clone(record.patientStateAfter),
    clinical_rationale: `${record.mechanism} Manim bu sonucu üretmez; yalnızca önceden hesaplanmış olay geçişini görselleştirir.`,
    critical_signal: criticalSignal,
    debrief_question: `“${record.expectedEffect}” kararından sonra hangi hasta durumu değişikliği yeniden değerlendirme önceliğinizi belirler?`,
    expert_approval_reference: "DOĞRULANMADI-SYNTHETIC-V2",
    source_references: [{ source_id: record.evidenceId ?? "TEYS synthetic scenario contract", source_version: SCENARIO_VERSION, locator: record.id }],
    rights_confirmed: true,
    synthetic_patient_confirmed: true,
    request_ai_generation: false,
    visual_focus: record.patientStateAfter.rhythm === "vf" ? "monitor_transition" : category === "team_management" || category === "handoff" ? "team_management" : category === "resuscitation" ? "procedure" : "patient_response",
    voiceover_language: "tr",
    duration_seconds: 20,
    safety_constraints: ["Yalnız sentetik hasta", "Tanı, doz veya fizyoloji üretme", "Yerel protokol yerine geçme"],
  };
}
