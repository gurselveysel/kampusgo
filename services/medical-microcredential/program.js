import { buildDebrief } from "../medical-simulation-v2/engine.js";

export const MICRO_CREDENTIAL_VERSION = "teys-mams-microcredential/1.0.0";
export const MICRO_CREDENTIAL_STORAGE_KEY = "teys-mams-microcredential-v1";

export const MICRO_CREDENTIAL_PROGRAM = {
  id: "mc-acute-chest-pain-safe-first-response",
  title: "Akut Göğüs Ağrısında Güvenli İlk Yaklaşım",
  shortTitle: "Akut Göğüs Ağrısı Mikro-Yeterliliği",
  country: "Türkiye",
  issuer: "Yetkili yükseköğretim kurumu tarafından belirlenecek",
  awardingBodyStatus: "DOĞRULANMADI",
  credentialStatus: "PİLOT — RESMÎ BELGE DEĞİLDİR",
  targetGroup: "Tıp fakültesi Dönem 4-6 öğrencileri ve gözetimli klinik eğitime katılan hekim adayları",
  participationForm: "Çevrim içi, etkileşimli sentetik hasta simülasyonu ve performans değerlendirmesi",
  notionalWorkloadHours: 25,
  proposedCredit: 1,
  creditStatus: "KURUM ONAYI BEKLİYOR",
  tycLevel: null,
  eqfLevel: null,
  levelStatus: "DOĞRULANMADI",
  assessmentType: "Olay günlüğüne dayalı performans değerlendirmesi, klinik gerekçe ve kontrol listesi",
  assessmentSupervision: "Pilot sürüm gözetimsizdir; resmî uygulama için kimlik doğrulama ve kurumca belirlenen gözetim gerekir.",
  qualityAssurance: "İç kalite kapıları uygulanır; dış kalite güvencesi ve yetkili kurum onayı DOĞRULANMADI.",
  stackability: "Bağımsız pilot birim; başka bir yeterliliğe biriktirme ve tanınma kararı yetkili kuruma aittir.",
  prerequisites: "Dönem 4 ve üzeri klinik eğitim veya kurumun eşdeğer kabul ettiği önceki öğrenme",
  learningOutcomes: [
    "Zaman kritik göğüs ağrısında odaklı öykü ve muayeneyi güvenli sırayla yürütür.",
    "EKG ve hasta yanıtını birlikte değerlendirerek öncelikli klinik yolu seçer.",
    "İlaç ve müdahale kararlarında kontrendikasyon ve hasta güvenliği kapılarını gözetir.",
    "Klinik kötüleşmede ekip rollerini, kapalı döngü iletişimi ve yaşam desteği adımlarını uygular.",
    "Karar gerekçesini, ayırıcı tanıyı, yeniden değerlendirme planını ve SBAR devrini kaydeder.",
  ],
};

export const MICRO_CREDENTIAL_SOURCES = [
  {
    id: "tyc-microcredential-procedure",
    label: "TYÇ kapsamında mikro yeterliliklere ilişkin usul ve esaslar",
    publisher: "Meslekî Yeterlilik Kurumu / Türkiye Yeterlilikler Çerçevesi",
    url: "https://www.tyc.gov.tr/indir/turkiye-yeterlilikler-cercevesi-kapsaminda-mikro-yeterliliklere-iliskin-usul-ve-esaslar-i187.html",
    status: "RESMÎ KAYNAK",
  },
  {
    id: "eu-2022-microcredentials",
    label: "Mikro-yeterliliklere Avrupa yaklaşımı Konsey Tavsiye Kararı",
    publisher: "Avrupa Birliği Konseyi",
    url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex:32022H0627(02)",
    status: "RESMÎ KAYNAK",
  },
  {
    id: "ucep-2020",
    label: "Mezuniyet Öncesi Tıp Eğitimi UÇEP 2020",
    publisher: "Yükseköğretim Kurulu",
    url: "https://www.yok.gov.tr/Documents/Kurumsal/egitim_ogretim_dairesi/Ulusal-cekirdek-egitimi-programlari/mezuniyet-oncesi-tip-egitimi-cekirdek-egitimi-programi.pdf",
    status: "RESMÎ KAYNAK",
  },
  {
    id: "tyc-credit-guide",
    label: "TYÇ yeterliliklerin kredilendirilmesi rehberi",
    publisher: "Meslekî Yeterlilik Kurumu / Türkiye Yeterlilikler Çerçevesi",
    url: "https://www.tyc.gov.tr/uploads/dosyalar/1620213194b56212ce761efbabbbd18d0cc30c4e3e.pdf",
    status: "RESMÎ KAYNAK",
  },
];

export const STANDARD_ELEMENTS = [
  "Öğrenenin kimliği",
  "Mikro-yeterliliğin başlığı",
  "Düzenleyenin ülkesi/bölgesi",
  "Belgeyi düzenleyen kuruluş",
  "Düzenlenme tarihi",
  "Öğrenme çıktıları",
  "Tahminî iş yükü",
  "Yeterlilik seviyesi",
  "Ölçme-değerlendirme türü",
  "Öğrenmeye katılım biçimi",
  "Kalite güvencesi türü",
];

export function evaluatePractice(session) {
  const state = session.state;
  const gates = [
    { id: "history", label: "En az iki odaklı öykü alanı", passed: state.knowledge.filter((item) => item.startsWith("history:")).length >= 2 },
    { id: "exam", label: "En az iki odaklı muayene", passed: state.examinations.length >= 2 },
    { id: "ecg", label: "12 derivasyonlu EKG istemi", passed: state.orders.some((item) => item.id === "ecg") },
    { id: "reasoning", label: "Yapılandırılmış klinik gerekçe", passed: state.reasoning.length >= 1 },
    { id: "monitor", label: "Monitörizasyon ve damar yolu", passed: state.flags.monitorIv },
  ];
  return { passed: gates.every((gate) => gate.passed), gates };
}

export function evaluateAssessment(session, context = {}) {
  const debrief = buildDebrief(session);
  const achievementGates = [
    { id: "orientation", label: "Program ve güvenlik kapsamı kabul edildi", passed: Boolean(context.orientationAccepted) },
    { id: "identity", label: "Öğrenen adı kaydedildi", passed: Boolean(String(context.learnerName ?? "").trim()) },
    { id: "practice", label: "Öğrenme uygulaması tamamlandı", passed: Boolean(context.practiceCompleted) },
    { id: "scenario", label: "Değerlendirme olgusu tamamlandı", passed: debrief.completed },
    { id: "competency", label: "Performans kontrol listesi karşılandı", passed: debrief.competencyMet },
    { id: "safety", label: "Kritik hasta güvenliği olayı yok", passed: debrief.criticalSafety.length === 0 },
  ];
  const issuanceGates = [
    { id: "issuer", label: "Yetkili belge düzenleyen kuruluş", passed: false, status: "DOĞRULANMADI" },
    { id: "level", label: "TYÇ/AYÇ seviye kararı", passed: false, status: "DOĞRULANMADI" },
    { id: "external-quality", label: "Dış kalite güvencesi", passed: false, status: "DOĞRULANMADI" },
    { id: "supervision", label: "Kimlik doğrulamalı gözetimli değerlendirme", passed: false, status: "DOĞRULANMADI" },
  ];
  return {
    debrief,
    achievementGates,
    issuanceGates,
    learningAchievementMet: achievementGates.every((gate) => gate.passed),
    officialIssuanceReady: achievementGates.every((gate) => gate.passed) && issuanceGates.every((gate) => gate.passed),
  };
}

export function buildEvidencePackage({ learnerName, assessmentSession, orientationAccepted, practiceCompleted, generatedAt = new Date().toISOString() }) {
  const result = evaluateAssessment(assessmentSession, { learnerName, orientationAccepted, practiceCompleted });
  return {
    schema: MICRO_CREDENTIAL_VERSION,
    status: result.learningAchievementMet ? "ÖĞRENME BAŞARISI KANITLANDI — RESMÎ BELGE DEĞİL" : "TAMAMLANMAMIŞ KANIT PAKETİ",
    officialIssuanceReady: result.officialIssuanceReady,
    learner: { displayName: String(learnerName ?? "").trim(), identityVerification: "DOĞRULANMADI" },
    microCredential: {
      title: MICRO_CREDENTIAL_PROGRAM.title,
      issuerCountry: MICRO_CREDENTIAL_PROGRAM.country,
      awardingBody: MICRO_CREDENTIAL_PROGRAM.issuer,
      awardingBodyStatus: MICRO_CREDENTIAL_PROGRAM.awardingBodyStatus,
      issuingDate: null,
      learningOutcomes: MICRO_CREDENTIAL_PROGRAM.learningOutcomes,
      notionalWorkloadHours: MICRO_CREDENTIAL_PROGRAM.notionalWorkloadHours,
      proposedCredit: MICRO_CREDENTIAL_PROGRAM.proposedCredit,
      creditStatus: MICRO_CREDENTIAL_PROGRAM.creditStatus,
      tycLevel: MICRO_CREDENTIAL_PROGRAM.tycLevel,
      eqfLevel: MICRO_CREDENTIAL_PROGRAM.eqfLevel,
      levelStatus: MICRO_CREDENTIAL_PROGRAM.levelStatus,
      assessmentType: MICRO_CREDENTIAL_PROGRAM.assessmentType,
      participationForm: MICRO_CREDENTIAL_PROGRAM.participationForm,
      qualityAssurance: MICRO_CREDENTIAL_PROGRAM.qualityAssurance,
      stackability: MICRO_CREDENTIAL_PROGRAM.stackability,
    },
    assessment: {
      completed: result.debrief.completed,
      competencyMet: result.debrief.competencyMet,
      criticalSafetyEvents: result.debrief.criticalSafety.length,
      dimensions: result.debrief.dimensions,
      checklist: result.debrief.checklist,
      finalStateIntegrityRecord: result.debrief.finalHash,
      replayableEventCount: result.debrief.replayableEvents,
      supervision: MICRO_CREDENTIAL_PROGRAM.assessmentSupervision,
    },
    gates: { learningAchievement: result.achievementGates, officialIssuance: result.issuanceGates },
    sources: MICRO_CREDENTIAL_SOURCES,
    generatedAt,
    disclosure: "Bu paket sentetik pilot değerlendirme kanıtıdır. Yetkili kurum kararı, kimlik doğrulaması, uzman onayı ve dış kalite güvencesi olmadan diploma, sertifika veya resmî mikro-yeterlilik değildir.",
  };
}
