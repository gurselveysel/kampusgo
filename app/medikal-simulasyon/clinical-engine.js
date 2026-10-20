export const ENGINE_VERSION = "teys-stemi-engine/2.0.0";
export const SCENARIO_ID = "stemi-vf-rosc-vertical-slice-v2";

export const SIMULATION_MODES = ["training", "assessment", "osce"];

export const TOOL_CATALOG = {
  interview: [
    { id: "onset", label: "Ağrının başlangıcını ve niteliğini sor", minutes: 1, evidenceId: "ucep-history" },
    { id: "associated", label: "Eşlik eden belirtileri sor", minutes: 1, evidenceId: "ucep-history" },
    { id: "medications", label: "İlaç ve son doz öyküsünü sor", minutes: 1, evidenceId: "ucep-history" },
    { id: "allergies", label: "Alerji öyküsünü sor", minutes: 1, evidenceId: "ucep-history" },
    { id: "risk", label: "Kardiyovasküler riskleri sor", minutes: 1, evidenceId: "ucep-history" },
  ],
  exam: [
    { id: "general", label: "Genel durum ve vital değerlendirme", minutes: 1, evidenceId: "ucep-vitals" },
    { id: "cardiovascular", label: "Kardiyovasküler sistem muayenesi", minutes: 2, evidenceId: "ucep-cardiovascular-exam" },
    { id: "respiratory", label: "Solunum sistemi muayenesi", minutes: 2, evidenceId: "ucep-respiratory-exam" },
    { id: "peripheral", label: "Periferik dolaşım ve nabız muayenesi", minutes: 1, evidenceId: "ucep-vitals" },
  ],
  test: [
    { id: "ecg", label: "12 derivasyonlu EKG", minutes: 0.5, readyMinutes: 2, cost: 95, evidenceId: "ucep-ecg" },
    { id: "troponin", label: "Yüksek duyarlılıklı troponin", minutes: 0.5, readyMinutes: 15, cost: 180, evidenceId: "ucep-lab-request" },
    { id: "basic_labs", label: "Temel laboratuvar paneli", minutes: 0.5, readyMinutes: 10, cost: 260, evidenceId: "ucep-lab-request" },
    { id: "chest_xray", label: "Taşınabilir akciğer grafisi", minutes: 0.5, readyMinutes: 10, cost: 320, evidenceId: "ucep-direct-radiography" },
    { id: "pocus", label: "Yatak başı odaklı ultrason", minutes: 2, readyMinutes: 3, cost: 450, evidenceId: "ucep-vitals" },
  ],
  medication: [
    { id: "aspirin", label: "Protokol kartından aspirin uygula", minutes: 0.5, evidenceId: "ucep-medication" },
    { id: "heparin", label: "Onaylı senaryo protokolünden antikoagülan uygula", minutes: 1, evidenceId: "ucep-medication" },
    { id: "nitroglycerin", label: "Nitrat uygula", minutes: 0.5, evidenceId: "ucep-medication" },
    { id: "routine_oxygen", label: "Rutin yüksek akım oksijen başla", minutes: 0.5, evidenceId: "ucep-oxygen" },
  ],
  intervention: [
    { id: "monitor_iv", label: "Monitörizasyon ve damar yolu", minutes: 1.5, evidenceId: "ucep-iv" },
    { id: "titrated_oxygen", label: "Endikasyona göre titre oksijen", minutes: 1, evidenceId: "ucep-oxygen" },
    { id: "activate_cath", label: "STEMI yolunu aktive et", minutes: 1, evidenceId: "ucep-acute-coronary" },
    { id: "transfer_cath", label: "Kateter laboratuvarına güvenli devri başlat", minutes: 5, evidenceId: "ucep-referral" },
    { id: "call_code", label: "Arrest ekibini aktive et", minutes: 0.25, evidenceId: "ucep-emergency-organization" },
    { id: "start_cpr", label: "Yüksek kaliteli CPR başlat", minutes: 0.25, evidenceId: "ucep-bls" },
    { id: "defibrillate", label: "Defibrilasyon uygula", minutes: 0.25, evidenceId: "ucep-defibrillation" },
    { id: "resume_cpr", label: "Şok sonrası CPR'a hemen dön", minutes: 2, evidenceId: "ucep-als" },
    { id: "post_rosc", label: "ROSC sonrası ABCDE yeniden değerlendirme", minutes: 2, evidenceId: "ucep-als" },
    { id: "handoff_sbar", label: "SBAR ile sorumluluğu devret", minutes: 2, evidenceId: "ucep-referral" },
  ],
  team: [
    { id: "assign_roles", label: "Kritik ekip rollerini ata", minutes: 0.5, evidenceId: "ucep-emergency-organization" },
    { id: "closed_loop", label: "Kapalı döngü iletişimi başlat", minutes: 0.5, evidenceId: "ucep-emergency-organization" },
    { id: "cardiology_consult", label: "Kardiyoloji konsültasyonu iste", minutes: 1, evidenceId: "ucep-referral" },
  ],
};

export const UCEP_EVIDENCE = [
  {
    id: "ucep-acute-coronary",
    task: "Göğüs ağrısında akut koroner sendromu önceliklendirme",
    clinicalCondition: "Göğüs ağrısı → Akut Koroner Sendromlar",
    practice: "Klinik problem yönetimi",
    practiceLevel: null,
    learningLevel: "T-A-K",
    source: "Mezuniyet Öncesi Tıp Eğitimi UÇEP 2020, Tablo 2.3",
    sourcePage: 85,
    status: "DOĞRULANMADI",
  },
  {
    id: "ucep-history",
    task: "Soruna yönelik öykü alma",
    clinicalCondition: "Akut göğüs ağrısı",
    practice: "Genel ve soruna yönelik öykü alabilme",
    practiceLevel: 4,
    source: "UÇEP 2020, Tablo 2.4",
    sourcePage: 122,
    status: "DOĞRULANMADI",
  },
  {
    id: "ucep-vitals",
    task: "Genel durum ve vital bulguları değerlendirme",
    clinicalCondition: "Akut göğüs ağrısı",
    practice: "Genel durum ve vital bulguların değerlendirilmesi",
    practiceLevel: 4,
    source: "UÇEP 2020, Tablo 2.4",
    sourcePage: 122,
    status: "DOĞRULANMADI",
  },
  {
    id: "ucep-cardiovascular-exam",
    task: "Kardiyovasküler sistem muayenesi",
    clinicalCondition: "Akut göğüs ağrısı",
    practice: "Kardiyovasküler sistem muayenesi",
    practiceLevel: 4,
    source: "UÇEP 2020, Tablo 2.4",
    sourcePage: 122,
    status: "DOĞRULANMADI",
  },
  {
    id: "ucep-respiratory-exam",
    task: "Solunum sistemi muayenesi",
    clinicalCondition: "Akut göğüs ağrısı",
    practice: "Solunum sistemi muayenesi",
    practiceLevel: 4,
    source: "UÇEP 2020, Tablo 2.4",
    sourcePage: 122,
    status: "DOĞRULANMADI",
  },
  {
    id: "ucep-ecg",
    task: "EKG çekme ve değerlendirme",
    clinicalCondition: "Akut göğüs ağrısı",
    practice: "EKG çekebilme ve değerlendirebilme",
    practiceLevel: 3,
    source: "UÇEP 2020, Tablo 2.4",
    sourcePage: 123,
    status: "DOĞRULANMADI",
  },
  {
    id: "ucep-lab-request",
    task: "Laboratuvar tetkiki isteme",
    clinicalCondition: "Akut göğüs ağrısı",
    practice: "Laboratuvar inceleme için istek formunu doldurabilme",
    practiceLevel: 4,
    source: "UÇEP 2020, Tablo 2.4",
    sourcePage: 123,
    status: "DOĞRULANMADI",
  },
  {
    id: "ucep-direct-radiography",
    task: "Doğrudan grafiyi değerlendirme",
    clinicalCondition: "Akut göğüs ağrısı",
    practice: "Direkt radyografileri değerlendirebilme",
    practiceLevel: 3,
    source: "UÇEP 2020, Tablo 2.4",
    sourcePage: 123,
    status: "DOĞRULANMADI",
  },
  {
    id: "ucep-iv",
    task: "Damar yolu açma",
    clinicalCondition: "Akut göğüs ağrısı",
    practice: "Damar yolu açabilme",
    practiceLevel: 3,
    source: "UÇEP 2020, Tablo 2.4",
    sourcePage: 124,
    status: "DOĞRULANMADI",
  },
  {
    id: "ucep-defibrillation",
    task: "Defibrilasyon uygulama",
    clinicalCondition: "Şoklanabilir kardiyak arrest",
    practice: "Defibrilasyon uygulayabilme",
    practiceLevel: 4,
    source: "UÇEP 2020, Tablo 2.4",
    sourcePage: 124,
    status: "DOĞRULANMADI",
  },
  {
    id: "ucep-medication",
    task: "İlacı güvenli biçimde hazırlama ve uygulama",
    clinicalCondition: "Akut koroner sendrom",
    practice: "Uygulanacak ilaçları doğru şekilde hazırlayabilme",
    practiceLevel: 3,
    source: "UÇEP 2020, Tablo 2.4",
    sourcePage: 126,
    status: "DOĞRULANMADI",
  },
  {
    id: "ucep-oxygen",
    task: "Oksijen tedavisi uygulama",
    clinicalCondition: "Hipoksemi riski",
    practice: "Oksijen ve nebul-inhaler tedavisi uygulayabilme",
    practiceLevel: 4,
    source: "UÇEP 2020, Tablo 2.4",
    sourcePage: 125,
    status: "DOĞRULANMADI",
  },
  {
    id: "ucep-als",
    task: "İleri yaşam desteği",
    clinicalCondition: "Kardiyak arrest ve ROSC",
    practice: "İleri yaşam desteği sağlayabilme",
    practiceLevel: 3,
    source: "UÇEP 2020, Tablo 2.4",
    sourcePage: 125,
    status: "DOĞRULANMADI",
  },
  {
    id: "ucep-bls",
    task: "Temel yaşam desteği",
    clinicalCondition: "Kardiyak arrest",
    practice: "Temel yaşam desteği uygulayabilme",
    practiceLevel: 4,
    source: "UÇEP 2020, Tablo 2.4",
    sourcePage: 126,
    status: "DOĞRULANMADI",
  },
  {
    id: "ucep-referral",
    task: "Uygun sevk ve klinik devir",
    clinicalCondition: "Zaman kritik STEMI",
    practice: "Hastayı uygun biçimde sevk edebilme",
    practiceLevel: 4,
    source: "UÇEP 2020, Tablo 2.4",
    sourcePage: 125,
    status: "DOĞRULANMADI",
  },
  {
    id: "ucep-emergency-organization",
    task: "Acil yardım organizasyonu ve ekip çalışması",
    clinicalCondition: "Kardiyak arrest",
    practice: "Acil yardımların organizasyonunu yapabilme",
    practiceLevel: 3,
    source: "UÇEP 2020, Tablo 2.4",
    sourcePage: 126,
    status: "DOĞRULANMADI",
  },
];

export const TYC_EVIDENCE = {
  knowledge: "Akut göğüs ağrısı ve zaman kritik riskleri açıklama bağlamı",
  skill: "Bilgiyi klinik eylem sırasına dönüştürme bağlamı",
  competence: "Belirsizlik altında güvenli ekip sorumluluğu bağlamı",
  proposedLevel: null,
  officialPlacementStatus: "DOĞRULANMADI",
  note: "TYÇ 1–8 seviyesi, UÇEP uygulama düzeyi 1–4 ile aynı alan değildir.",
};

const interviewResponses = {
  onset: "Ağrı yaklaşık 35 dakika önce merdiven çıkarken başladı; göğsümün ortasında baskı gibi ve sol koluma yayılıyor.",
  associated: "Soğuk terleme ve bulantı başladı. Nefesim de daralıyor.",
  medications: "Dün gece erektil disfonksiyon için tadalafil aldım. Tansiyon ilacımı bazen unutuyorum.",
  allergies: "Bilinen ilaç alerjim yok.",
  risk: "Günde bir paket sigara içiyorum. Tansiyonum yüksek; babam 52 yaşında kalp krizi geçirmişti.",
  open: "Soruyu tam anlayamadım; göğsümdeki baskı hâlâ sürüyor.",
};

const examFindings = {
  general: "Endişeli, soluk ve terli; konuşabiliyor ancak belirgin sıkıntılı.",
  cardiovascular: "Taşikardi, düzenli ritim; yeni belirgin üfürüm yok. Periferik perfüzyon hafif azalmış.",
  respiratory: "Her iki akciğer alanında solunum sesleri eşit; belirgin ral yok.",
  peripheral: "Radial nabızlar simetrik fakat zayıf; kapiller dolum yaklaşık 3 saniye.",
};

const testResults = {
  ecg: "V2–V5 derivasyonlarında belirgin ST yükselmesi; akut anterior STEMI ile uyumlu sentetik eğitim bulgusu.",
  troponin: "Başlangıç yüksek duyarlılıklı troponin referans üst sınırının üzerinde; seri ölçüm bağlamı gerektirir.",
  basic_labs: "Hemoglobin, trombosit ve kreatinin sentetik senaryo aralığında; potasyum 4,1 mmol/L.",
  chest_xray: "Belirgin pulmoner ödem, pnömotoraks veya mediastinal genişleme bulgusu yok.",
  pocus: "Sol ventrikül ön duvar hareketinde bölgesel azalma; belirgin perikardiyal efüzyon yok.",
};

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

export function hashState(state) {
  const text = stableStringify(state);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function seededUnit(seed, step) {
  let value = (seed ^ Math.imul(step + 1, 0x9e3779b1)) >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return (value >>> 0) / 4294967295;
}

function includes(items, value) {
  return items.includes(value);
}

function addUnique(items, value) {
  if (!items.includes(value)) items.push(value);
}

function physiologyToVitals(state) {
  if (state.phase === "vf") {
    return {
      heartRate: 0,
      systolic: 0,
      diastolic: 0,
      spo2: Math.max(58, Math.round(78 - state.physiology.arrestSeconds / 45)),
      respiratoryRate: 0,
      temperature: 36.6,
      etco2: state.flags.cprActive ? Math.round(18 + state.physiology.cprQuality * 14) : 5,
      rhythm: "vf",
    };
  }

  const p = state.physiology;
  const harm = p.vasodilationInjury;
  const recovery = state.phase === "rosc" || p.reperfused ? 1 : 0;
  const heartRate = clamp(88 + p.ischemiaBurden * 34 + p.catecholamine * 12 - recovery * 15, 45, 175);
  const systolic = clamp(130 * p.perfusion - p.ischemiaBurden * 22 - harm * 48 + recovery * 12, 48, 190);
  const respiratoryRate = clamp(14 + p.ischemiaBurden * 10 + p.catecholamine * 3 - recovery * 4, 8, 38);
  const spo2 = clamp(97 - (1 - p.oxygenReserve) * 18 + (state.flags.titratedOxygen ? 2 : 0), 72, 100);
  return {
    heartRate: Math.round(heartRate),
    systolic: Math.round(systolic),
    diastolic: Math.round(systolic * 0.62),
    spo2: Math.round(spo2),
    respiratoryRate: Math.round(respiratoryRate),
    temperature: 36.6,
    etco2: null,
    rhythm: recovery ? "post-ischemic" : state.phase === "stemi" || state.phase === "treatment" ? "stemi" : "sinus",
  };
}

function releaseReadyTests(state) {
  for (const order of state.orders) {
    if (order.status === "pending" && order.readyAtSeconds <= state.elapsedSeconds) {
      order.status = "ready";
      order.result = testResults[order.id];
      addUnique(state.knowledge, `test:${order.id}`);
      if (order.id === "ecg") {
        state.flags.ecgReady = true;
        if (state.phase === "assessment") state.phase = "stemi";
      }
    }
  }
}

function advancePhysiology(state, seconds) {
  let remaining = Math.max(0, Math.round(seconds));
  while (remaining > 0) {
    const step = Math.min(30, remaining);
    const minutes = step / 60;
    state.elapsedSeconds += step;
    const p = state.physiology;

    if (state.phase === "vf") {
      p.arrestSeconds += step;
      if (state.flags.cprActive) {
        p.cprQuality = clamp(p.cprQuality + minutes * 0.08);
        p.oxygenReserve = clamp(p.oxygenReserve - minutes * 0.015);
      } else {
        p.oxygenReserve = clamp(p.oxygenReserve - minutes * 0.065);
      }
      releaseReadyTests(state);
      remaining -= step;
      continue;
    }

    const occlusionLoad = p.reperfused ? 0.08 : p.coronaryOcclusion;
    const plateletProtection = state.flags.aspirinGiven ? 0.78 : 1;
    p.ischemiaBurden = clamp(p.ischemiaBurden + minutes * 0.012 * occlusionLoad * plateletProtection);
    p.electricalInstability = clamp(
      p.electricalInstability + minutes * (0.009 + Math.max(0, p.ischemiaBurden - 0.64) * 0.035),
    );
    p.oxygenReserve = clamp(
      p.oxygenReserve - minutes * (state.flags.titratedOxygen ? 0.001 : 0.006),
    );
    p.catecholamine = clamp(p.catecholamine + minutes * 0.005 - (p.reperfused ? minutes * 0.02 : 0));
    p.vasodilationInjury = clamp(p.vasodilationInjury - minutes * 0.025);
    p.perfusion = clamp(
      p.perfusion - minutes * (0.002 + p.ischemiaBurden * 0.0025) - p.vasodilationInjury * minutes * 0.012 + (p.reperfused ? minutes * 0.018 : 0),
      0.28,
      1,
    );

    releaseReadyTests(state);
    const vfThreshold = 0.45 + seededUnit(state.seed, Math.floor(state.elapsedSeconds / 30)) * 0.035;
    if (
      !p.reperfused &&
      state.elapsedSeconds >= 660 &&
      p.electricalInstability >= vfThreshold &&
      (state.phase === "stemi" || state.phase === "treatment")
    ) {
      state.phase = "vf";
      state.flags.vfAtSeconds = state.elapsedSeconds;
      p.arrestSeconds = 0;
      state.status = "critical";
      remaining = 0;
    } else {
      remaining -= step;
    }
  }
  state.vitals = physiologyToVitals(state);
}

function initialScore() {
  return {
    informationGathering: 0,
    clinicalReasoning: 0,
    treatment: 0,
    patientSafety: 100,
    teamwork: 0,
    timeManagement: 100,
  };
}

export function createInitialState({ seed = 20260827, mode = "training" } = {}) {
  if (!SIMULATION_MODES.includes(mode)) throw new Error(`Unsupported simulation mode: ${mode}`);
  const state = {
    version: ENGINE_VERSION,
    scenarioId: SCENARIO_ID,
    seed,
    mode,
    status: "active",
    phase: "assessment",
    elapsedSeconds: 0,
    financialCost: 0,
    patient: {
      id: "synthetic-stemi-001",
      synthetic: true,
      age: 58,
      sex: "Erkek",
      chiefComplaint: "Göğsümde çok güçlü bir baskı var.",
    },
    physiology: {
      coronaryOcclusion: 0.94,
      ischemiaBurden: 0.62,
      electricalInstability: 0.28,
      perfusion: 0.82,
      oxygenReserve: 0.82,
      catecholamine: 0.48,
      vasodilationInjury: 0,
      reperfused: false,
      arrestSeconds: 0,
      cprQuality: 0,
      shockCount: 0,
    },
    vitals: null,
    knowledge: [],
    interview: [],
    examinations: [],
    orders: [],
    medications: [],
    interventions: [],
    teamActions: [],
    safetyEvents: [],
    score: initialScore(),
    flags: {
      ecgReady: false,
      aspirinGiven: false,
      heparinGiven: false,
      pde5Disclosed: false,
      monitorIv: false,
      titratedOxygen: false,
      cathActivated: false,
      cprActive: false,
      shockDelivered: false,
      postRoscAssessed: false,
      handoffComplete: false,
      rolesAssigned: false,
      closedLoop: false,
      cardiologyConsulted: false,
      vfAtSeconds: null,
    },
    lastMessage: "Sentetik hasta acil değerlendirme alanına alındı.",
    lastMechanism: "Koroner akım kısıtlı; iskemi ve elektriksel instabilite zamanla artıyor.",
  };
  state.vitals = physiologyToVitals(state);
  return state;
}

export function createSession(options = {}) {
  return { initial: createInitialState(options), state: createInitialState(options), records: [] };
}

function lookupAction(tool, actionId) {
  return TOOL_CATALOG[tool]?.find((item) => item.id === actionId) ?? null;
}

function classifyQuestion(question) {
  const normalized = question.toLocaleLowerCase("tr-TR");
  if (/ne zaman|başla|süre|yayıl|nasıl ağrı|niteli/.test(normalized)) return "onset";
  if (/bulant|ter|nefes|eşlik|kus/.test(normalized)) return "associated";
  if (/ilaç|tablet|hap|tadalafil|sildenafil|viagra|doz/.test(normalized)) return "medications";
  if (/alerj/.test(normalized)) return "allergies";
  if (/sigara|tansiyon|aile|şeker|risk/.test(normalized)) return "risk";
  return "open";
}

export function getActionAvailability(state, tool, actionId) {
  const action = lookupAction(tool, actionId);
  if (!action) return { available: false, reason: "Tanımsız araç eylemi." };
  if (state.status === "completed") return { available: false, reason: "Oturum tamamlandı." };
  if (tool === "interview" && state.phase === "vf") return { available: false, reason: "Hasta kardiyak arrestte; sözel yanıt yok." };
  if (tool === "exam" && ["vf", "handoff"].includes(state.phase)) return { available: false, reason: "Bu fazda odaklanmış rutin muayene kullanılamaz." };
  if (tool === "test" && state.orders.some((item) => item.id === actionId)) return { available: false, reason: "Bu tetkik zaten istendi." };
  if (tool === "medication" && state.medications.some((item) => item.id === actionId)) return { available: false, reason: "Bu ilaç kararı zaten kaydedildi." };
  if (tool === "medication" && actionId === "heparin" && !state.flags.ecgReady) return { available: false, reason: "Senaryo protokolü için EKG sonucu henüz görünür değil." };
  if (tool === "intervention" && actionId === "monitor_iv" && state.flags.monitorIv) return { available: false, reason: "Monitör ve damar yolu hazır." };
  if (tool === "intervention" && actionId === "titrated_oxygen" && state.flags.titratedOxygen) return { available: false, reason: "Titre oksijen zaten uygulanıyor." };
  if (tool === "intervention" && actionId === "activate_cath" && !state.flags.ecgReady) return { available: false, reason: "STEMI bulgusu henüz açılmadı." };
  if (tool === "intervention" && actionId === "activate_cath" && state.flags.cathActivated) return { available: false, reason: "STEMI yolu zaten aktive edildi." };
  if (tool === "intervention" && actionId === "transfer_cath" && !state.flags.cathActivated) return { available: false, reason: "Önce STEMI yolunu aktive et." };
  if (tool === "intervention" && ["call_code", "start_cpr", "defibrillate", "resume_cpr"].includes(actionId) && state.phase !== "vf") return { available: false, reason: "Bu eylem yalnız şoklanabilir arrest fazında kullanılabilir." };
  if (tool === "intervention" && actionId === "start_cpr" && !includes(state.interventions, "call_code")) return { available: false, reason: "Arrest ekibini aktive et." };
  if (tool === "intervention" && actionId === "defibrillate" && !includes(state.interventions, "start_cpr")) return { available: false, reason: "Önce CPR başlat." };
  if (tool === "intervention" && actionId === "resume_cpr" && !state.flags.shockDelivered) return { available: false, reason: "Şok henüz uygulanmadı." };
  if (tool === "intervention" && actionId === "post_rosc" && state.phase !== "rosc") return { available: false, reason: "ROSC henüz oluşmadı." };
  if (tool === "intervention" && actionId === "handoff_sbar" && !(state.phase === "rosc" || state.physiology.reperfused)) return { available: false, reason: "Stabil devir fazı henüz açılmadı." };
  if (tool === "team" && actionId === "cardiology_consult" && !state.flags.ecgReady) return { available: false, reason: "Konsültasyon için EKG bulgusu henüz görünür değil." };
  return { available: true, reason: "" };
}

function reject(state, message) {
  return {
    state,
    accepted: false,
    message,
    mechanism: "Durum makinesi geçersiz geçişi reddetti; hasta durumu değiştirilmedi.",
    expectedEffect: "Geçerli faz ve ön koşul",
    actualEffect: "Geçiş reddedildi",
    rubricEffect: { patientSafety: 0 },
    safetyAlert: null,
    evidenceId: null,
  };
}

function applyInterview(state, event) {
  if (state.phase === "vf") return reject(state, "Hasta kardiyak arrestte; görüşme yapılamaz.");
  const topic = event.topic || classifyQuestion(event.question || "");
  const catalogAction = lookupAction("interview", topic) ?? { id: topic, minutes: 1, evidenceId: "ucep-history" };
  const response = state.phase === "rosc" ? "Neredeyim? Göğsüm hâlâ ağrıyor ama daha az." : interviewResponses[topic] ?? interviewResponses.open;
  const repeated = state.interview.some((item) => item.topic === topic);
  state.interview.push({ topic, question: event.question || catalogAction.label || topic, response, repeated });
  addUnique(state.knowledge, `history:${topic}`);
  if (topic === "medications") state.flags.pde5Disclosed = true;
  state.score.informationGathering = clamp(state.score.informationGathering + (repeated ? 0 : topic === "open" ? 4 : 12), 0, 100);
  if (repeated) state.score.timeManagement = clamp(state.score.timeManagement - 3, 0, 100);
  advancePhysiology(state, Math.round((catalogAction.minutes || 1) * 60));
  return {
    state,
    accepted: true,
    message: `Hasta: “${response}”`,
    mechanism: repeated ? "Tekrarlanan soru yeni bilgi üretmedi; iskemi zamanı ilerledi." : "Yeni öykü bilgisi görünür hasta durumuna eklendi; fizyolojik saat ilerledi.",
    expectedEffect: "Duruma bağlı bilgi açılımı",
    actualEffect: topic === "open" ? "Genel yanıt; özgül bilgi açılmadı" : `${topic} öyküsü açıldı`,
    rubricEffect: { informationGathering: repeated ? 0 : topic === "open" ? 4 : 12, timeManagement: repeated ? -3 : 0 },
    safetyAlert: null,
    evidenceId: catalogAction.evidenceId,
  };
}

function applyExam(state, event) {
  const availability = getActionAvailability(state, "exam", event.actionId);
  if (!availability.available) return reject(state, availability.reason);
  const action = lookupAction("exam", event.actionId);
  const repeated = state.examinations.includes(event.actionId);
  if (!repeated) state.examinations.push(event.actionId);
  addUnique(state.knowledge, `exam:${event.actionId}`);
  state.score.informationGathering = clamp(state.score.informationGathering + (repeated ? 0 : 10), 0, 100);
  if (repeated) state.score.timeManagement = clamp(state.score.timeManagement - 4, 0, 100);
  advancePhysiology(state, Math.round(action.minutes * 60));
  return {
    state,
    accepted: true,
    message: examFindings[event.actionId],
    mechanism: repeated ? "Tekrarlanan muayene ek bulgu üretmedi; zaman ilerledi." : "Muayene bulgusu görünür bilgi modeline eklendi.",
    expectedEffect: "Odaklı fizik muayene bulgusu",
    actualEffect: examFindings[event.actionId],
    rubricEffect: { informationGathering: repeated ? 0 : 10, timeManagement: repeated ? -4 : 0 },
    safetyAlert: null,
    evidenceId: action.evidenceId,
  };
}

function applyTest(state, event) {
  const availability = getActionAvailability(state, "test", event.actionId);
  if (!availability.available) return reject(state, availability.reason);
  const action = lookupAction("test", event.actionId);
  const order = {
    id: action.id,
    label: action.label,
    orderedAtSeconds: state.elapsedSeconds,
    readyAtSeconds: state.elapsedSeconds + Math.round(action.readyMinutes * 60),
    cost: action.cost,
    status: "pending",
    result: null,
  };
  state.orders.push(order);
  state.financialCost += action.cost;
  state.score.clinicalReasoning = clamp(state.score.clinicalReasoning + (action.id === "ecg" ? 18 : 6), 0, 100);
  if (["chest_xray", "basic_labs"].includes(action.id) && !state.flags.ecgReady) state.score.timeManagement = clamp(state.score.timeManagement - 4, 0, 100);
  advancePhysiology(state, Math.round(action.minutes * 60));
  return {
    state,
    accepted: true,
    message: `${action.label} istendi; tahmini sonuç süresi ${action.readyMinutes} dk.`,
    mechanism: "Tetkik hemen yanıt üretmedi; sonuç zamanı ve maliyeti olay motoruna kaydedildi.",
    expectedEffect: "Gecikmeli klinik bilgi",
    actualEffect: `${action.cost} TL sentetik maliyet; sonuç ${action.readyMinutes} dk sonra`,
    rubricEffect: { clinicalReasoning: action.id === "ecg" ? 18 : 6 },
    safetyAlert: null,
    evidenceId: action.evidenceId,
  };
}

function applyMedication(state, event) {
  const availability = getActionAvailability(state, "medication", event.actionId);
  if (!availability.available) return reject(state, availability.reason);
  const action = lookupAction("medication", event.actionId);
  state.medications.push({ id: action.id, atSeconds: state.elapsedSeconds });
  let message = "İlaç kararı uygulandı ve yeniden değerlendirme başlatıldı.";
  let mechanism = "Farmakolojik etki, fizyoloji motorundaki latent değişkenlere işlendi.";
  let treatment = 0;
  let safety = 0;
  let safetyAlert = null;

  if (action.id === "aspirin") {
    state.flags.aspirinGiven = true;
    treatment = 18;
    message = "Senaryo protokolü aspirin uygulamasını kaydetti; iskemi ilerleme katsayısı azaldı.";
  } else if (action.id === "heparin") {
    state.flags.heparinGiven = true;
    treatment = 12;
    message = "Antikoagülan, yalnız bu sentetik senaryo protokolü kapsamında uygulandı.";
  } else if (action.id === "nitroglycerin") {
    if (state.flags.pde5Disclosed) {
      state.physiology.vasodilationInjury = clamp(state.physiology.vasodilationInjury + 0.72);
      state.physiology.perfusion = clamp(state.physiology.perfusion - 0.24, 0.28, 1);
      state.score.patientSafety = clamp(state.score.patientSafety - 45, 0, 100);
      state.safetyEvents.push({ severity: "critical", code: "PDE5_NITRATE", message: "Yakın zamanda PDE5 inhibitörü öyküsü varken nitrat uygulandı." });
      safety = -45;
      safetyAlert = "KRİTİK: PDE5 inhibitörü öyküsüyle nitrat kontrendikasyonu tetiklendi.";
      message = "Hastanın perfüzyonu belirgin bozuldu; kritik güvenlik olayı kaydedildi.";
      mechanism = "Sentetik kontrendikasyon kuralı vazodilatasyon hasarını artırdı ve kan basıncını düşürdü.";
    } else {
      state.score.patientSafety = clamp(state.score.patientSafety - 20, 0, 100);
      state.safetyEvents.push({ severity: "major", code: "HISTORY_MISSING", message: "PDE5 öyküsü sorgulanmadan nitrat uygulandı." });
      safety = -20;
      safetyAlert = "GÜVENLİK: İlaç öyküsü tamamlanmadan nitrat uygulandı.";
      message = "Eksik ilaç öyküsü nedeniyle güvenlik uyarısı oluştu.";
    }
  } else if (action.id === "routine_oxygen") {
    state.score.patientSafety = clamp(state.score.patientSafety - 8, 0, 100);
    state.safetyEvents.push({ severity: "minor", code: "ROUTINE_OXYGEN", message: "Endikasyon ve hedef belirtilmeden rutin yüksek akım oksijen seçildi." });
    safety = -8;
    safetyAlert = "Rutin oksijen yerine ölçüme dayalı titrasyon beklenir.";
  }

  state.score.treatment = clamp(state.score.treatment + treatment, 0, 100);
  advancePhysiology(state, Math.round(action.minutes * 60));
  return {
    state,
    accepted: true,
    message,
    mechanism,
    expectedEffect: action.label,
    actualEffect: message,
    rubricEffect: { treatment, patientSafety: safety },
    safetyAlert,
    evidenceId: action.evidenceId,
  };
}

function applyIntervention(state, event) {
  const availability = getActionAvailability(state, "intervention", event.actionId);
  if (!availability.available) return reject(state, availability.reason);
  const action = lookupAction("intervention", event.actionId);
  addUnique(state.interventions, action.id);
  let message = `${action.label} tamamlandı.`;
  let mechanism = "Müdahale, klinik durum ve zaman motoruna işlendi.";
  let treatment = 8;
  let teamwork = 0;

  if (action.id === "monitor_iv") state.flags.monitorIv = true;
  if (action.id === "titrated_oxygen") {
    state.flags.titratedOxygen = true;
    state.physiology.oxygenReserve = clamp(state.physiology.oxygenReserve + 0.08);
  }
  if (action.id === "activate_cath") {
    state.flags.cathActivated = true;
    state.phase = "treatment";
    state.score.clinicalReasoning = clamp(state.score.clinicalReasoning + 18, 0, 100);
    treatment = 14;
    message = "STEMI yolu aktive edildi; güvenli transfer seçeneği açıldı.";
  }
  if (action.id === "transfer_cath") {
    state.physiology.reperfused = true;
    state.physiology.coronaryOcclusion = 0.08;
    state.physiology.electricalInstability = clamp(state.physiology.electricalInstability - 0.18);
    state.physiology.perfusion = clamp(state.physiology.perfusion + 0.12);
    state.phase = "treatment";
    treatment = 22;
    message = "Sentetik reperfüzyon geçişi tamamlandı; iskemi ilerleme hızı düştü.";
    mechanism = "Koroner oklüzyon latent değişkeni azaltıldı; vital bulgular doğrudan delta ile değil fizyoloji modelinden yeniden hesaplandı.";
  }
  if (action.id === "call_code") {
    teamwork = 10;
    treatment = 0;
    message = "Arrest ekibi aktive edildi; CPR seçeneği açıldı.";
  }
  if (action.id === "start_cpr") {
    state.flags.cprActive = true;
    state.physiology.cprQuality = 0.68;
    treatment = 14;
    message = "CPR başladı; EtCO₂ sentetik perfüzyon göstergesi olarak izleniyor.";
  }
  if (action.id === "defibrillate") {
    state.flags.shockDelivered = true;
    state.flags.cprActive = false;
    state.physiology.shockCount += 1;
    treatment = 18;
    message = "Şok uygulandı; hemen CPR'a dönülmesi gerekiyor.";
  }
  if (action.id === "resume_cpr") {
    state.flags.cprActive = true;
    state.physiology.cprQuality = clamp(state.physiology.cprQuality + 0.18);
    treatment = 20;
    advancePhysiology(state, Math.round(action.minutes * 60));
    state.phase = "rosc";
    state.status = "active";
    state.flags.cprActive = false;
    state.physiology.reperfused = true;
    state.physiology.coronaryOcclusion = 0.1;
    state.physiology.perfusion = 0.78;
    state.physiology.oxygenReserve = 0.86;
    state.physiology.electricalInstability = 0.2;
    state.vitals = physiologyToVitals(state);
    message = "Organize ritim ve sentetik ROSC oluştu; post-ROSC değerlendirme açıldı.";
    mechanism = "Şok + kesintisiz CPR olay dizisi, ROSC durum geçişinin ön koşullarını karşıladı.";
  } else {
    advancePhysiology(state, Math.round(action.minutes * 60));
  }
  if (action.id === "post_rosc") {
    state.flags.postRoscAssessed = true;
    treatment = 12;
  }
  if (action.id === "handoff_sbar") {
    state.flags.handoffComplete = true;
    state.phase = "handoff";
    state.status = "completed";
    teamwork = 18;
    treatment = 0;
    message = "SBAR devir kaydı tamamlandı; oturum debriefing için kapatıldı.";
  }
  state.score.treatment = clamp(state.score.treatment + treatment, 0, 100);
  state.score.teamwork = clamp(state.score.teamwork + teamwork, 0, 100);
  return {
    state,
    accepted: true,
    message,
    mechanism,
    expectedEffect: action.label,
    actualEffect: message,
    rubricEffect: { treatment, teamwork },
    safetyAlert: null,
    evidenceId: action.evidenceId,
  };
}

function applyTeamAction(state, event) {
  const availability = getActionAvailability(state, "team", event.actionId);
  if (!availability.available) return reject(state, availability.reason);
  const action = lookupAction("team", event.actionId);
  addUnique(state.teamActions, action.id);
  if (action.id === "assign_roles") state.flags.rolesAssigned = true;
  if (action.id === "closed_loop") state.flags.closedLoop = true;
  if (action.id === "cardiology_consult") state.flags.cardiologyConsulted = true;
  state.score.teamwork = clamp(state.score.teamwork + 14, 0, 100);
  advancePhysiology(state, Math.round(action.minutes * 60));
  return {
    state,
    accepted: true,
    message: `${action.label}: görev sahibi, geri okuma ve zaman damgası kaydedildi.`,
    mechanism: "Ekip durumu ve sorumluluk izi güncellendi; fizyolojik saat eşzamanlı ilerledi.",
    expectedEffect: "Ekip koordinasyonu",
    actualEffect: action.label,
    rubricEffect: { teamwork: 14 },
    safetyAlert: null,
    evidenceId: action.evidenceId,
  };
}

function applyAdvanceTime(state, event) {
  const seconds = Math.round(Number(event.seconds));
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 900) return reject(state, "Zaman adımı 1–900 saniye arasında olmalıdır.");
  const beforePhase = state.phase;
  advancePhysiology(state, seconds);
  const penalty = Math.max(1, Math.round(seconds / 120));
  state.score.timeManagement = clamp(state.score.timeManagement - penalty, 0, 100);
  const vfStarted = beforePhase !== "vf" && state.phase === "vf";
  return {
    state,
    accepted: true,
    message: vfStarted ? "Monitörde ventriküler fibrilasyon başladı; hasta yanıtsız ve nabızsız." : `${Math.round(seconds / 60)} dakikalık klinik zaman ilerledi.`,
    mechanism: vfStarted ? "Tedavi edilmemiş iskemi, seed'e bağlı elektriksel instabilite eşiğini aştı." : "İskemi, perfüzyon, oksijen rezervi ve elektriksel instabilite birlikte yeniden hesaplandı.",
    expectedEffect: "Zamana bağlı fizyolojik evrim",
    actualEffect: vfStarted ? "VF arrest" : "Vital ve latent durum güncellendi",
    rubricEffect: { timeManagement: -penalty },
    safetyAlert: vfStarted ? "KRİTİK: Şoklanabilir kardiyak arrest." : null,
    evidenceId: vfStarted ? "ucep-als" : "ucep-acute-coronary",
  };
}

function transition(currentState, event) {
  const state = deepClone(currentState);
  let result;
  if (!event || typeof event !== "object" || typeof event.type !== "string") return reject(currentState, "Geçersiz olay sözleşmesi.");
  if (event.type === "ASK_PATIENT") result = applyInterview(state, event);
  else if (event.type === "PERFORM_EXAM") result = applyExam(state, event);
  else if (event.type === "ORDER_TEST") result = applyTest(state, event);
  else if (event.type === "ADMINISTER_MEDICATION") result = applyMedication(state, event);
  else if (event.type === "PERFORM_INTERVENTION") result = applyIntervention(state, event);
  else if (event.type === "TEAM_ACTION") result = applyTeamAction(state, event);
  else if (event.type === "ADVANCE_TIME") result = applyAdvanceTime(state, event);
  else result = reject(currentState, `Tanımsız olay: ${event.type}`);
  if (result.accepted) {
    result.state.lastMessage = result.message;
    result.state.lastMechanism = result.mechanism;
  }
  return result;
}

export function reduceSession(session, event) {
  const eventIndex = session.records.length + 1;
  const previousHash = hashState(session.state);
  const result = transition(session.state, event);
  const nextHash = hashState(result.state);
  const record = {
    id: `evt-${String(eventIndex).padStart(3, "0")}`,
    index: eventIndex,
    engineVersion: ENGINE_VERSION,
    scenarioId: SCENARIO_ID,
    event: deepClone(event),
    accepted: result.accepted,
    simulationSecond: result.state.elapsedSeconds,
    previousHash,
    nextHash,
    tool: event.type,
    expectedEffect: result.expectedEffect,
    actualEffect: result.actualEffect,
    rubricEffect: result.rubricEffect,
    safetyAlert: result.safetyAlert,
    evidenceId: result.evidenceId,
    publicFeedback: session.state.mode === "training" ? result.message : result.accepted ? "Karar kaydedildi." : "Geçersiz geçiş kaydedildi.",
    mechanism: result.mechanism,
  };
  return {
    initial: session.initial,
    state: result.state,
    records: [...session.records, record],
  };
}

export function replaySession(initial, records) {
  let session = { initial: deepClone(initial), state: deepClone(initial), records: [] };
  for (const record of records) session = reduceSession(session, record.event);
  return {
    session,
    matches: hashState(session.state) === (records.at(-1)?.nextHash ?? hashState(initial)),
    finalHash: hashState(session.state),
  };
}

export function buildDebrief(session) {
  const state = session.state;
  const required = [
    ["Öykü ve risk", state.interview.length >= 3],
    ["Odaklı muayene", state.examinations.length >= 2],
    ["EKG sonucu", state.flags.ecgReady],
    ["Monitör ve damar yolu", state.flags.monitorIv],
    ["Antiplatelet tedavi", state.flags.aspirinGiven],
    ["STEMI yolu", state.flags.cathActivated],
    ["Ekip rolleri", state.flags.rolesAssigned],
    ["Güvenli son durum", state.physiology.reperfused || state.phase === "rosc" || state.phase === "handoff"],
    ["SBAR devir", state.flags.handoffComplete],
  ];
  const passedItems = required.filter(([, passed]) => passed).length;
  const criticalSafety = state.safetyEvents.filter((event) => event.severity === "critical");
  const ecgOrder = state.orders.find((order) => order.id === "ecg");
  const cathRecord = session.records.find((record) => record.event.actionId === "activate_cath");
  const vfRecord = session.records.find((record) => record.actualEffect === "VF arrest");
  return {
    completed: state.status === "completed",
    competencyMet: state.status === "completed" && criticalSafety.length === 0 && passedItems >= 8,
    checklist: required.map(([label, passed]) => ({ label, passed })),
    dimensions: deepClone(state.score),
    criticalSafety,
    criticalDelays: [
      ecgOrder && ecgOrder.orderedAtSeconds > 300 ? `EKG istemi ${Math.round(ecgOrder.orderedAtSeconds / 60)}. dakikada yapıldı.` : null,
      cathRecord && cathRecord.simulationSecond > 600 ? `STEMI yolu ${Math.round(cathRecord.simulationSecond / 60)}. dakikada aktive edildi.` : null,
      vfRecord ? `VF ${Math.round(vfRecord.simulationSecond / 60)}. dakikada gelişti.` : null,
    ].filter(Boolean),
    unnecessaryActions: session.records.filter((record) => record.rubricEffect?.timeManagement < -3).map((record) => record.actualEffect),
    finalHash: hashState(state),
    replayableEvents: session.records.length,
    note: "Bu sonuç klinik yeterlilik belgesi veya tıbbi karar desteği değildir; uzman onayı DOĞRULANMADI.",
  };
}
