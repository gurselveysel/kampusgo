export const SCENARIO_ID = "scn_stemi_vf_rosc";
export const SCENARIO_VERSION = "3.0.0";

export const DIFFICULTY_PROFILES = {
  guided: {
    id: "guided",
    label: "Rehberli",
    description: "Daha yavaş fizyolojik ilerleme ve 20 dakikalık OSCE süresi.",
    progressionRate: 0.78,
    deteriorationAtSeconds: 720,
    osceSeconds: 1200,
  },
  standard: {
    id: "standard",
    label: "Standart",
    description: "Varsayılan fizyolojik hız ve 15 dakikalık OSCE süresi.",
    progressionRate: 1,
    deteriorationAtSeconds: 600,
    osceSeconds: 900,
  },
  advanced: {
    id: "advanced",
    label: "İleri",
    description: "Daha hızlı bozulma, düşük başlangıç rezervi ve 12 dakikalık OSCE süresi.",
    progressionRate: 1.24,
    deteriorationAtSeconds: 480,
    osceSeconds: 720,
  },
};

const sharedTests = {
  ecg: "V2–V5 derivasyonlarında belirgin ST yükselmesi; akut anterior STEMI ile uyumlu sentetik eğitim bulgusu.",
  troponin: "Sentetik yüksek duyarlılıklı troponin referans üst sınırının üzerinde; seri ölçüm bağlamı gerekir.",
  basic_labs: "Hemoglobin, trombosit ve kreatinin sentetik aralıkta; potasyum 4,1 mmol/L.",
  chest_xray: "Sentetik görüntüde belirgin pulmoner ödem, pnömotoraks veya mediastinal genişleme yok.",
  pocus: "Sol ventrikül ön duvar hareketinde bölgesel azalma; belirgin perikardiyal efüzyon yok.",
};

const sharedObjectives = [
  "Zaman kritik göğüs ağrısında odaklı öykü ve muayeneyi yürütmek",
  "Tetkik ve tedavi kararlarını değişen hasta durumuna göre sıralamak",
  "Şoklanabilir arrestte ekip koordinasyonu ve güvenli geçişleri uygulamak",
  "Karar gerekçesini, ayırıcı tanıyı ve yeniden değerlendirme planını kaydetmek",
];

export const ENCOUNTER_CATALOG = [
  {
    id: "enc_classic_stemi",
    title: "Klasik başlangıç · güvenlik tuzağı",
    briefing: "Eforla başlayan baskı tarzı göğüs ağrısı; ilaç öyküsü tedavi güvenliğini değiştirir.",
    environment: "Acil resüsitasyon odası",
    tags: ["Göğüs ağrısı", "STEMI", "İlaç güvenliği", "VF"],
    patient: { id: "synthetic-stemi-001", synthetic: true, age: 58, sex: "Erkek", chiefComplaint: "Göğsümde çok güçlü bir baskı var." },
    safety: { pde5Exposure: true },
    physiology: {
      coronaryOcclusion: 0.94,
      ischemiaBurden: 0.61,
      electricalInstability: 0.24,
      perfusion: 0.83,
      oxygenReserve: 0.84,
      catecholamine: 0.46,
    },
    interviewFacts: {
      onset: "Ağrı yaklaşık 35 dakika önce merdiven çıkarken başladı; göğsümün ortasında baskı gibi ve sol koluma yayılıyor.",
      associated: "Soğuk terleme ve bulantı başladı. Nefesim de daralıyor.",
      medications: "Dün gece erektil disfonksiyon için tadalafil aldım. Tansiyon ilacımı bazen unutuyorum.",
      allergies: "Bilinen ilaç alerjim yok.",
      risk: "Günde bir paket sigara içiyorum. Tansiyonum yüksek; babam 52 yaşında kalp krizi geçirmişti.",
    },
    examFindings: {
      "general-inspection": "Endişeli, soluk ve terli; konuşabiliyor ancak belirgin sıkıntılı.",
      "cardiac-auscultation": "Taşikardi ve düzenli ritim; yeni belirgin üfürüm yok. Periferik perfüzyon hafif azalmış.",
      "lung-auscultation": "Her iki akciğer alanında solunum sesleri eşit; belirgin ral yok.",
      "peripheral-perfusion": "Radial nabızlar simetrik fakat zayıf; kapiller dolum yaklaşık 3 saniye.",
    },
    testResults: sharedTests,
    expectedDiagnosis: "stemi",
    objectives: sharedObjectives,
    runtimeStatus: "RUNTIME_READY",
    expertApprovalStatus: "DOĞRULANMADI",
  },
  {
    id: "enc_atypical_diabetes",
    title: "Atipik başlangıç · diyabet",
    briefing: "Belirsiz epigastrik rahatsızlık ve halsizlik; risk örüntüsünü erken tanımak gerekir.",
    environment: "Acil gözlem alanı",
    tags: ["Atipik sunum", "Diyabet", "STEMI", "Gecikme riski"],
    patient: { id: "synthetic-stemi-002", synthetic: true, age: 67, sex: "Kadın", chiefComplaint: "Midem bulanıyor, çok halsizim; göğsümde hafif bir ağırlık var." },
    safety: { pde5Exposure: false },
    physiology: {
      coronaryOcclusion: 0.91,
      ischemiaBurden: 0.66,
      electricalInstability: 0.27,
      perfusion: 0.79,
      oxygenReserve: 0.8,
      catecholamine: 0.39,
    },
    interviewFacts: {
      onset: "Yaklaşık 50 dakika önce yemek sonrası mide yanması gibi başladı; şimdi göğsümde ağırlık ve sırtımda rahatsızlık var.",
      associated: "Bulantı, belirgin halsizlik ve soğuk terleme var. Ağrı çok şiddetli değil.",
      medications: "Metformin ve tansiyon ilacı kullanıyorum; son iki günde yeni bir ilaç almadım.",
      allergies: "Bilinen ilaç alerjim yok.",
      risk: "On beş yıldır diyabetim ve hipertansiyonum var; sigara kullanmıyorum.",
    },
    examFindings: {
      "general-inspection": "Soluk, terli ve bitkin; sorulara yavaş fakat uygun yanıt veriyor.",
      "cardiac-auscultation": "Ritim düzenli ve hızlı; belirgin yeni üfürüm yok.",
      "lung-auscultation": "Bazallerde çok hafif ince ek sesler duyuluyor; bulgu sentetiktir.",
      "peripheral-perfusion": "Ekstremiteler serin; kapiller dolum yaklaşık 4 saniye.",
    },
    testResults: { ...sharedTests, ecg: "V2–V4 derivasyonlarında ST yükselmesi; sentetik anterior STEMI örüntüsü." },
    expectedDiagnosis: "stemi",
    objectives: sharedObjectives,
    runtimeStatus: "RUNTIME_READY",
    expertApprovalStatus: "DOĞRULANMADI",
  },
  {
    id: "enc_delayed_transfer",
    title: "Gecikmiş başvuru · düşük rezerv",
    briefing: "Uzamış ağrı ve bozulmuş perfüzyon; gereksiz bekleme daha erken ritim bozukluğu üretir.",
    environment: "Sevk kabul alanı",
    tags: ["Gecikmiş başvuru", "Düşük perfüzyon", "STEMI", "VF"],
    patient: { id: "synthetic-stemi-003", synthetic: true, age: 72, sex: "Erkek", chiefComplaint: "Ağrım saatlerdir geçmedi; şimdi başım dönüyor." },
    safety: { pde5Exposure: false },
    physiology: {
      coronaryOcclusion: 0.97,
      ischemiaBurden: 0.73,
      electricalInstability: 0.31,
      perfusion: 0.72,
      oxygenReserve: 0.76,
      catecholamine: 0.54,
      deteriorationOffsetSeconds: -90,
    },
    interviewFacts: {
      onset: "Ağrı iki saatten uzun süredir var; dinlenmekle geçmedi ve son yarım saatte arttı.",
      associated: "Baş dönmesi, nefes darlığı ve yoğun terleme var; kısa süre bayılacak gibi oldum.",
      medications: "Tansiyon ve kolesterol ilaçlarımı kullanıyorum; yakın zamanda PDE5 inhibitörü almadım.",
      allergies: "Penisilinle geçmişte döküntü olmuştu; başka bilinen alerjim yok.",
      risk: "Hipertansiyon ve hiperlipidemi öyküm var; sigarayı beş yıl önce bıraktım.",
    },
    examFindings: {
      "general-inspection": "Soluk, soğuk terli ve ajite; kısa cümlelerle konuşuyor.",
      "cardiac-auscultation": "Taşikardi; kalp sesleri derinden geliyor, yeni belirgin üfürüm yok.",
      "lung-auscultation": "Bazallerde iki taraflı ince raller mevcut; bulgu sentetiktir.",
      "peripheral-perfusion": "Periferik nabızlar zayıf; kapiller dolum 4 saniyeden uzun.",
    },
    testResults: { ...sharedTests, pocus: "Sol ventrikül ön duvar hareketinde belirgin bölgesel azalma; sentetik düşük debi bağlamı." },
    expectedDiagnosis: "stemi",
    objectives: sharedObjectives,
    runtimeStatus: "RUNTIME_READY",
    expertApprovalStatus: "DOĞRULANMADI",
  },
];

export function getEncounter(id = "enc_classic_stemi") {
  return ENCOUNTER_CATALOG.find((encounter) => encounter.id === id) ?? ENCOUNTER_CATALOG[0];
}

export function getDifficulty(id = "standard") {
  return DIFFICULTY_PROFILES[id] ?? DIFFICULTY_PROFILES.standard;
}

export function validateScenarioCatalog() {
  const encounterIds = new Set();
  const errors = [];
  for (const encounter of ENCOUNTER_CATALOG) {
    if (encounterIds.has(encounter.id)) errors.push(`Tekrarlanan olgu kimliği: ${encounter.id}`);
    encounterIds.add(encounter.id);
    if (!encounter.patient?.synthetic) errors.push(`${encounter.id}: yalnız sentetik hasta kabul edilir.`);
    if (!encounter.interviewFacts || !encounter.examFindings || !encounter.testResults) errors.push(`${encounter.id}: çalışma zamanı klinik içeriği eksik.`);
    if (encounter.expertApprovalStatus !== "DOĞRULANMADI") errors.push(`${encounter.id}: uzman onayı kanıtsız biçimde yükseltilemez.`);
  }
  return { valid: errors.length === 0, errors, encounters: ENCOUNTER_CATALOG.length, difficulties: Object.keys(DIFFICULTY_PROFILES).length };
}
