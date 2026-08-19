export const roles = [
  { id: "learner", label: "Öğrenen / Öğrenci", name: "Derya Örnek", title: "Mühendislik Fakültesi • 2026-DEMO-001" },
  { id: "instructor", label: "Üniversite içi eğitici", name: "Dr. Öğr. Üyesi Ekin Demir", title: "İç eğitici • Pilot kullanıcı" },
  { id: "externalInstructor", label: "Kurum dışı eğitici", name: "Uzman Eğitici Selin Ada", title: "Dış eğitici • Belge teyidi simülasyonu" },
  { id: "coordinator", label: "Koordinatörlük / SEM", name: "Murat Akın", title: "SEM Pilot Koordinatörü" },
  { id: "commission", label: "Komisyon üyesi", name: "Prof. Dr. Deniz Aydın", title: "Mikro Yeterlilik Komisyonu" },
  { id: "studentAffairs", label: "Öğrenci İşleri", name: "Öğrenci İşleri Pilot Kullanıcısı", title: "Kayıt ve AKTS ön kontrolü" },
  { id: "it", label: "Bilgi İşlem", name: "Bilgi İşlem Pilot Kullanıcısı", title: "Entegrasyon ve yetki kapıları" },
  { id: "finance", label: "Finans / Döner Sermaye", name: "Mali İşler Pilot Kullanıcısı", title: "Tahsilat ve hak ediş simülasyonu" },
  { id: "admin", label: "Sistem yöneticisi", name: "MYYS Pilot Yöneticisi", title: "Teknik pilot yöneticisi • Akademik karar yetkisi yok" }
];

export const roleNavigation = {
  learner: ["overview", "scenarios", "catalog", "learning", "applications", "recognition", "assessment", "wallet", "notifications"],
  instructor: ["overview", "scenarios", "proposal", "applications", "programs", "assessment", "notifications"],
  externalInstructor: ["overview", "scenarios", "proposal", "applications", "assessment", "notifications"],
  coordinator: ["overview", "scenarios", "applications", "commission", "programs", "reports", "notifications"],
  commission: ["overview", "scenarios", "commission", "applications", "assessment", "audit", "notifications"],
  studentAffairs: ["overview", "scenarios", "applications", "integrations", "wallet", "audit"],
  it: ["overview", "scenarios", "integrations", "audit", "reports"],
  finance: ["overview", "scenarios", "finance", "reports", "audit"],
  admin: ["overview", "scenarios", "applications", "commission", "programs", "integrations", "finance", "reports", "audit"]
};

export const pageMeta = {
  home: { label: "Pilot Ana Sayfa", icon: "home" },
  overview: { label: "Genel Bakış", icon: "grid" },
  scenarios: { label: "Uçtan Uca Senaryolar", icon: "refresh" },
  catalog: { label: "Mikro Yeterlilik Kataloğu", icon: "book" },
  learning: { label: "Eğitimlerim ve AKTS", icon: "book" },
  proposal: { label: "Yeni Program Önerisi", icon: "plus" },
  applications: { label: "Başvurular", icon: "file" },
  recognition: { label: "Dış Kazanım Başvurusu", icon: "upload" },
  commission: { label: "Akademik Karar Masası", icon: "users" },
  programs: { label: "Programlar", icon: "layers" },
  assessment: { label: "Eğitim ve Değerlendirme", icon: "check" },
  wallet: { label: "Dijital Yeterlilik Cüzdanı", icon: "wallet" },
  integrations: { label: "Entegrasyon Merkezi", icon: "network" },
  finance: { label: "Finansal Yönetim", icon: "coins" },
  reports: { label: "Yönetim ve Raporlama", icon: "chart" },
  audit: { label: "Denetim İzi", icon: "history" },
  notifications: { label: "Bildirimler", icon: "bell" }
};

export const lifecycle = [
  { no: 1, title: "Başvuru", description: "Program önerisi veya dış kazanım tanınma talebi" },
  { no: 2, title: "Ön inceleme", description: "Eksik belge, AKTS ve karşılaştırılabilirlik kontrolleri" },
  { no: 3, title: "Eğitim ve değerlendirme", description: "Kanıt, rubrik ve insan incelemesi" },
  { no: 4, title: "Dijital yeterlilik", description: "Yapılandırılmış pilot belge ve doğrulama" },
  { no: 5, title: "Akademik entegrasyon", description: "Onay kapıları ve yalnızca aktarım simülasyonu" },
  { no: 6, title: "Finansal yönetim", description: "Tahsilat, hak ediş ve mutabakat taslakları" }
];

export const initialState = {
  version: 4,
  roleId: "learner",
  activePage: "home",
  mobileNavOpen: false,
  dataMode: "Yerel pilot veri katmanı",
  remoteSnapshot: null,
  selectedApplicationId: null,
  scenarios: {
    internal: { step: 0, completed: false, applicationId: null, log: [] },
    recognition: { step: 0, completed: false, applicationId: null, log: [] }
  },
  enrollments: [
    { id: "ENR-008", programCode: "MY-PRG-2026-008", title: "Proje Temelli Öğrenme Tasarımı", learner: "Derya Örnek", status: "completed", progress: 100, ects: 2, remoteEcts: 0 }
  ],
  assessmentSessions: [
    { id: "ASM-008", enrollmentId: "ENR-008", title: "Proje ve rubrik değerlendirmesi", status: "completed", score: 84, evaluatorDecision: "Başarılı • İnsan değerlendirici", events: 2 }
  ],
  recognizedCredits: [],
  integrationJobs: [],
  programs: [
    {
      id: "program-data-literacy",
      code: "MY-PRG-2026-014",
      title: "Dijital Üretimde Veri Okuryazarlığı",
      unit: "Mühendislik Fakültesi",
      instructor: "Dr. Öğr. Üyesi Ekin Demir",
      ects: 3,
      workload: 75,
      level: 6,
      mode: "Karma",
      remoteRate: 40,
      status: "commission",
      learners: 28,
      price: 0,
      summary: "Veriyi güvenilir biçimde okuma, yorumlama, görselleştirme ve karar süreçlerinde kullanma üzerine proje tabanlı pilot program.",
      outcomes: ["Veri kaynağının güvenilirliğini sorgular", "Temel görselleştirmeleri yorumlar", "Kanıta dayalı kısa analiz üretir"]
    },
    {
      id: "program-project-learning",
      code: "MY-PRG-2026-008",
      title: "Proje Temelli Öğrenme Tasarımı",
      unit: "Eğitim Fakültesi",
      instructor: "Dr. Öğr. Üyesi Aylin Eren",
      ects: 2,
      workload: 50,
      level: 6,
      mode: "Yüz yüze",
      remoteRate: 0,
      status: "active",
      learners: 34,
      price: 1200,
      summary: "Öğrenme çıktısı, gerçek yaşam problemi, rubrik ve kanıt zincirini birlikte tasarlayan uygulamalı pilot program.",
      outcomes: ["Proje problemi tasarlar", "Ölçüt temelli rubrik hazırlar", "Geri bildirim döngüsü kurgular"]
    },
    {
      id: "program-green-skills",
      code: "MY-PRG-2026-011",
      title: "Yeşil Dönüşüm İçin Temel Yetkinlikler",
      unit: "Lisansüstü Eğitim Enstitüsü",
      instructor: "Prof. Dr. Barış Acar",
      ects: 2,
      workload: 50,
      level: 7,
      mode: "Karma",
      remoteRate: 35,
      status: "active",
      learners: 19,
      price: 1750,
      summary: "Kurumsal sürdürülebilirlik problemlerini disiplinler arası kanıtlarla değerlendirmeye yönelik pilot öğrenme deneyimi.",
      outcomes: ["Sürdürülebilirlik göstergelerini yorumlar", "Paydaş analizi yapar", "Uygulanabilir iyileştirme önerir"]
    }
  ],
  applications: [
    {
      id: "APP-014",
      code: "MY-PRG-2026-014",
      kind: "internal",
      title: "Dijital Üretimde Veri Okuryazarlığı",
      applicant: "Dr. Öğr. Üyesi Ekin Demir",
      ownerRole: "instructor",
      status: "commission",
      submittedAt: "2026-08-07T09:30:00Z",
      targetAt: "2026-09-06T09:30:00Z",
      elapsedDays: 12,
      similarity: 36,
      tycMatch: 88,
      ects: 3,
      remoteRate: 40,
      evidence: 8,
      missing: 0,
      comparedCourse: "Veri Analizi Temelleri",
      notes: "Bologna karşılaştırması ve ölçme rubriği komisyon gündemine hazır."
    },
    {
      id: "APP-042",
      code: "MY-BSV-2026-0042",
      kind: "external",
      title: "Veri Görselleştirme Temelleri",
      applicant: "Derya Örnek",
      ownerRole: "learner",
      provider: "Örnek Açık Öğrenme Merkezi",
      status: "review",
      submittedAt: "2026-08-12T12:10:00Z",
      targetAt: "2026-09-11T12:10:00Z",
      elapsedDays: 7,
      similarity: 58,
      tycMatch: 72,
      ects: 2,
      remoteRate: 100,
      portfolioRemoteShare: 45,
      evidence: 4,
      missing: 1,
      comparedCourse: "İstatistiksel Veri Analizi",
      notes: "Sağlayıcı doğrulama kanıtı bekleniyor; benzerlik işareti komisyon incelemesi gerektiriyor."
    },
    {
      id: "APP-031",
      code: "MY-PRG-2026-009",
      kind: "internal",
      title: "Toplumsal Yenilik Atölyesi",
      applicant: "Dr. Öğr. Üyesi Zeynep Ata",
      ownerRole: "instructor",
      status: "revision",
      submittedAt: "2026-08-02T08:00:00Z",
      targetAt: "2026-09-01T08:00:00Z",
      elapsedDays: 17,
      similarity: 44,
      tycMatch: 80,
      ects: 2,
      remoteRate: 20,
      evidence: 5,
      missing: 2,
      comparedCourse: "Sosyal Girişimcilik",
      notes: "Öğrenme çıktıları ile rubrik göstergeleri arasında ek eşleme istenmiştir."
    }
  ],
  credentials: [
    {
      id: "credential-0007",
      code: "MY-BEL-2026-0007",
      title: "Proje Temelli Öğrenme Tasarımı",
      owner: "Derya Örnek",
      issuer: "Kütahya Dumlupınar Üniversitesi • Kontrollü Pilot",
      ects: 2,
      level: 6,
      issuedAt: "2026-08-04",
      status: "valid",
      verifyPath: "#/verify/MY-BEL-2026-0007",
      outcomes: ["Proje problemi tasarlar", "Ölçüt temelli rubrik hazırlar", "Geri bildirim döngüsü kurgular"]
    }
  ],
  integrations: [
    { id: "obis", name: "ÖBİS", owner: "Öğrenci İşleri + Bilgi İşlem", status: "disconnected", stage: 2, lastTest: "Henüz çalıştırılmadı" },
    { id: "yoksis", name: "YÖKSİS", owner: "Bilgi İşlem", status: "disconnected", stage: 4, lastTest: "Servis erişimi yok" },
    { id: "edevlet", name: "e-Devlet", owner: "Bilgi İşlem", status: "disconnected", stage: 4, lastTest: "Servis erişimi yok" },
    { id: "gib", name: "GİB / e-Arşiv", owner: "Mali İşler", status: "disconnected", stage: 5, lastTest: "Mali onay bekleniyor" },
    { id: "mys", name: "MYS / MAYS", owner: "Döner Sermaye", status: "disconnected", stage: 5, lastTest: "Mimari taslak" },
    { id: "identity", name: "Kurumsal Kimlik", owner: "Bilgi İşlem", status: "simulated", stage: 1, lastTest: "Demo rol seçici etkin" },
    { id: "message", name: "E-posta / SMS", owner: "Koordinatörlük", status: "disconnected", stage: 3, lastTest: "Bildirimler yalnız uygulama içi" }
  ],
  finance: {
    parameters: { withholding: 15, vat: 20, stamp: 0.759 },
    transactions: [
      { id: "TX-0821", program: "Proje Temelli Öğrenme Tasarımı", learner: "Pilot Katılımcı 021", gross: 1200, channel: "Havale/EFT simülasyonu", status: "matched" },
      { id: "TX-0822", program: "Yeşil Dönüşüm İçin Temel Yetkinlikler", learner: "Pilot Katılımcı 014", gross: 1750, channel: "Sanal POS simülasyonu", status: "pending" }
    ],
    entitlements: [
      { id: "ENT-009", instructor: "Dr. Öğr. Üyesi Aylin Eren", hours: 12, evidence: "12/12 oturum kanıtı", gross: 9600, status: "draft" }
    ]
  },
  notifications: [
    { id: "N-1", title: "Komisyon gündemi güncellendi", body: "MY-PRG-2026-014 başvurusu 21 Ağustos pilot toplantısına eklendi.", time: "Bugün • 09.20", read: false },
    { id: "N-2", title: "Ek belge gerekiyor", body: "MY-BSV-2026-0042 için sağlayıcı doğrulama kanıtı bekleniyor.", time: "Dün • 16.45", read: false },
    { id: "N-3", title: "Aktarım simülasyonu planlandı", body: "ÖBİS dry-run senaryosu için onay kapısı kontrol listesi hazırlandı.", time: "17.08.2026", read: true }
  ],
  audit: [
    { id: "AUD-1007", entityId: "APP-014", at: "2026-08-19T08:42:00Z", actor: "Murat Akın", actorRole: "coordinator", action: "Ön kontrol tamamlandı", from: "review", to: "commission", reason: "Zorunlu pilot kanıtların tamamı mevcut" },
    { id: "AUD-1006", entityId: "APP-042", at: "2026-08-18T14:15:00Z", actor: "MYYS Pilot Analiz Motoru", actorRole: "system", action: "Karşılaştırma analizi üretildi", from: "review", to: "review", reason: "%58 benzerlik işareti — karar değildir" },
    { id: "AUD-1005", entityId: "APP-031", at: "2026-08-18T09:05:00Z", actor: "Prof. Dr. Deniz Aydın", actorRole: "commission", action: "Revizyon istendi", from: "commission", to: "revision", reason: "Rubrik ve öğrenme çıktısı eşlemesi eksik" }
  ]
};
