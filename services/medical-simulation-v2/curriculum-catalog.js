export const CURRICULUM_REGISTRY_VERSION = "2026-08-28.1";

export const OFFICIAL_SOURCE_REGISTRY = [
  {
    id: "ucep-2020",
    title: "Mezuniyet Öncesi Tıp Eğitimi Ulusal Çekirdek Eğitim Programı 2020",
    publisher: "Yükseköğretim Kurulu",
    version: "2020",
    url: "https://www.yok.gov.tr/Documents/Kurumsal/egitim_ogretim_dairesi/Ulusal-cekirdek-egitimi-programlari/mezuniyet-oncesi-tip-egitimi-cekirdek-egitimi-programi.pdf",
    scope: "Ulusal çekirdek görevler, belirti ve durumlar, temel hekimlik uygulamaları",
    location: "Tablo 2.3 s. 85; Tablo 2.4 s. 122-126 (bu olgunun kullandığı kayıtlar)",
    verificationStatus: "RESMİ KAYNAK DOĞRULANDI",
    accessedAt: "2026-08-28",
    expertApprovalStatus: "UZMAN ONAYI DOĞRULANMADI",
  },
  {
    id: "tyc",
    title: "Türkiye Yeterlilikler Çerçevesi",
    publisher: "Mesleki Yeterlilik Kurumu",
    version: "Güncel resmî kitapçık",
    url: "https://tyc.gov.tr/indir/turkiye-yeterlilikler-cercevesi-kitapcigi-i3.html",
    scope: "Bilgi, beceri ve yetkinlik boyutlarında sekiz seviyeli ulusal çerçeve",
    location: "TYÇ seviyeleri ve AYÇ ile ilişki bölümleri",
    verificationStatus: "RESMİ KAYNAK DOĞRULANDI",
    accessedAt: "2026-08-28",
    expertApprovalStatus: "PROGRAM YERLEŞTİRMESİ DOĞRULANMADI",
  },
  {
    id: "tyyc-health",
    title: "Türkiye Yükseköğretim Yeterlilikler Çerçevesi - Sağlık Temel Alanı",
    publisher: "Yükseköğretim Kurulu",
    version: "YÖK resmî temel alan raporu",
    url: "https://uluslararasi.yok.gov.tr/en/Documents/Sayfalar/Internationalisation/NQF-HETR/ReportsOnFieldsOfEducation/72.pdf",
    scope: "Sağlık temel alanı bilgi, beceri ve yetkinlikleri",
    location: "Temel alan yeterlilikleri; program düzeyi yerleştirme ayrıca doğrulanmalıdır",
    verificationStatus: "RESMİ KAYNAK DOĞRULANDI",
    accessedAt: "2026-08-28",
    expertApprovalStatus: "TIP PROGRAMI EŞLEMESİ DOĞRULANMADI",
  },
  {
    id: "eqf",
    title: "Avrupa Yeterlilikler Çerçevesi",
    publisher: "Avrupa Birliği - Europass",
    version: "Güncel resmî açıklama",
    url: "https://europass.europa.eu/en/european-qualifications-framework-eqf",
    scope: "Ulusal yeterliliklerin karşılaştırılmasına yarayan sekiz seviyeli üst çerçeve",
    location: "Seviye tanımlayıcıları: bilgi, beceri, sorumluluk ve bağımsızlık",
    verificationStatus: "RESMİ KAYNAK DOĞRULANDI",
    accessedAt: "2026-08-28",
    expertApprovalStatus: "PROGRAM EŞDEĞERLİĞİ DOĞRULANMADI",
  },
  {
    id: "tepdad-2025",
    title: "Mezuniyet Öncesi Tıp Eğitimi Programı Ulusal Standartları 2025",
    publisher: "TEPDAD",
    version: "2025",
    url: "https://tepdad.org.tr/wp-content/uploads/2025/06/2025-Standartlar-Aciklamali.pdf",
    scope: "Program tasarımı, program matrisi, ölçme-değerlendirme ve kalite geliştirme standartları",
    location: "2025 açıklamalı standartlar; kurum öz değerlendirmesi için kaynak",
    verificationStatus: "RESMİ KAYNAK DOĞRULANDI",
    accessedAt: "2026-08-28",
    expertApprovalStatus: "AKREDİTASYON İDDİASI YOK",
  },
  {
    id: "yok-atlas-medicine",
    title: "YÖK Lisans Atlası - Tıp Programları",
    publisher: "Yükseköğretim Kurulu",
    version: "2026 erişimi",
    url: "https://yokatlas.yok.gov.tr/lisans-bolum.php?b=39001",
    scope: "Türkiye'deki tıp programlarının resmî keşif başlangıç noktası",
    location: "Tıp programları listesi; fakülte müfredatının içeriğini tek başına kanıtlamaz",
    verificationStatus: "RESMİ KAYNAK DOĞRULANDI",
    accessedAt: "2026-08-28",
    expertApprovalStatus: "FAKÜLTE MÜFREDATLARI TEK TEK DOĞRULANMADI",
  },
];

export const CURRICULUM_PERIODS = [
  {
    id: "d1",
    label: "Dönem 1",
    stage: "Bilimsel temel ve sağlıklı insan",
    modules: ["Hücre ve doku", "Anatomiye giriş", "Fizyolojik denge", "Hekimlik ve etik", "İletişime giriş"],
    simulationRole: "Temel kavramları güvenli gözlem ve iletişim görevleriyle ilişkilendirir.",
  },
  {
    id: "d2",
    label: "Dönem 2",
    stage: "Sistemlerin normal yapı ve işlevi",
    modules: ["Kardiyovasküler sistem", "Solunum sistemi", "Sinir sistemi", "Endokrin sistem", "Kan ve bağışıklık"],
    simulationRole: "Normal fizyolojiyi canlı bulgular ve sistemler arası ilişkilerle karşılaştırır.",
  },
  {
    id: "d3",
    label: "Dönem 3",
    stage: "Hastalık mekanizmaları ve klinik bilimlere geçiş",
    modules: ["Patoloji", "Farmakoloji", "Klinik öykü", "Fizik muayene", "Tanısal akıl yürütme"],
    simulationRole: "Belirti, mekanizma, muayene ve tetkik sonuçlarını bütünleştirir.",
  },
  {
    id: "d4",
    label: "Dönem 4",
    stage: "Klinik stajlar ve gözetimli uygulama",
    modules: ["İç hastalıkları", "Kardiyoloji", "Çocuk sağlığı", "Genel cerrahi", "Kadın hastalıkları ve doğum"],
    simulationRole: "Sık ve zaman kritik durumlarda gözetimli karar sıralaması uygular.",
  },
  {
    id: "d5",
    label: "Dönem 5",
    stage: "İleri klinik stajlar ve bütünleşik bakım",
    modules: ["Acil tıp", "Kardiyoloji", "Nöroloji", "Psikiyatri", "Halk sağlığı ve adli tıp"],
    simulationRole: "Belirsizlikte güvenli karar, ekip çalışması, sevk ve yeniden değerlendirme yapar.",
  },
  {
    id: "d6",
    label: "Dönem 6",
    stage: "İntörnlük ve mesleğe hazır oluş",
    modules: ["Acil yaklaşım", "İç hastalıkları", "Cerrahi bakım", "Çocuk acilleri", "Birinci basamak ve toplum sağlığı"],
    simulationRole: "Önceliklendirme, ilk yönetim, ekip iletişimi ve güvenli klinik devir sorumluluğunu üstlenir.",
  },
];

export const INSTITUTION_MODELS = [
  { id: "national-core", label: "Ulusal ortak çekirdek", description: "Kurum adı veya yerel ders kodu varsaymadan UÇEP görevleriyle ilerler." },
  { id: "integrated", label: "Entegre kurul modeli", description: "Temel ve klinik bilimleri dönem kurulları içinde birlikte gösterir." },
  { id: "systems", label: "Sistem temelli model", description: "İçeriği organ sistemleri ve yaşam döngüsü çevresinde düzenler." },
  { id: "hybrid", label: "Hibrit model", description: "Kurul, staj, probleme dayalı öğrenme ve simülasyonu birlikte eşler." },
  { id: "discipline", label: "Disiplin / staj modeli", description: "Ders ve staj sorumluluğunu anabilim dalı yapısıyla ilişkilendirir." },
];

export const SCENARIO_CURRICULUM_ALIGNMENT = {
  enc_classic_stemi: {
    recommendedPeriods: ["d4", "d5", "d6"],
    modules: ["Acil tıp", "Kardiyoloji", "İç hastalıkları"],
    ucepScope: "Göğüs ağrısı, EKG, ilk tedavi, yaşam desteği, sevk ve klinik devir",
    practiceLevelStatus: "Eylem bazında UÇEP kaynağı gösterilir; senaryo geneli için tek düzey atanmaz.",
    qualificationDimensions: ["Bilgi", "Beceri", "Yetkinlik"],
    assessmentMethods: ["Eğitim", "Değerlendirme", "OSCE"],
    approvalStatus: "UZMAN VE KURUM ONAYI DOĞRULANMADI",
  },
  enc_atypical_diabetes: {
    recommendedPeriods: ["d4", "d5", "d6"],
    modules: ["Acil tıp", "Kardiyoloji", "Endokrinoloji"],
    ucepScope: "Atipik göğüs ağrısı, risk değerlendirmesi, EKG ve güvenli ilk yönetim",
    practiceLevelStatus: "Eylem bazında UÇEP kaynağı gösterilir; senaryo geneli için tek düzey atanmaz.",
    qualificationDimensions: ["Bilgi", "Beceri", "Yetkinlik"],
    assessmentMethods: ["Eğitim", "Değerlendirme", "OSCE"],
    approvalStatus: "UZMAN VE KURUM ONAYI DOĞRULANMADI",
  },
  enc_delayed_transfer: {
    recommendedPeriods: ["d5", "d6"],
    modules: ["Acil tıp", "Kardiyoloji", "Yoğun bakım"],
    ucepScope: "Bozulmuş perfüzyon, ritim bozukluğu, yaşam desteği, sevk ve klinik devir",
    practiceLevelStatus: "Eylem bazında UÇEP kaynağı gösterilir; senaryo geneli için tek düzey atanmaz.",
    qualificationDimensions: ["Bilgi", "Beceri", "Yetkinlik"],
    assessmentMethods: ["Eğitim", "Değerlendirme", "OSCE"],
    approvalStatus: "UZMAN VE KURUM ONAYI DOĞRULANMADI",
  },
};

export function getCurriculumPeriod(id = "d6") {
  return CURRICULUM_PERIODS.find((period) => period.id === id) ?? CURRICULUM_PERIODS[5];
}

export function getInstitutionModel(id = "national-core") {
  return INSTITUTION_MODELS.find((model) => model.id === id) ?? INSTITUTION_MODELS[0];
}

export function getScenarioAlignment(encounterId = "enc_classic_stemi") {
  return SCENARIO_CURRICULUM_ALIGNMENT[encounterId] ?? SCENARIO_CURRICULUM_ALIGNMENT.enc_classic_stemi;
}
