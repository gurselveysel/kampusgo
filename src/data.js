import { dpuInstitutionalSystems, pilotIntegrationMappings, pilotIntegrationScenarios } from "./institutional-integration-reference.js";

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

const masterDataDomainLabels = {
  institutional_identity: "Kurumsal kimlik", affiliation: "Kurum ilişkisi", authentication_claim_source: "Kimlik/rol iddiası",
  student_record: "Öğrenci kaydı", earned_ects: "Kazanılmış AKTS", academic_status: "Akademik durum",
  curriculum: "Müfredat", planned_ects: "Planlanan AKTS", course_learning_outcomes: "Ders öğrenme çıktıları",
  learning_delivery: "Eğitim teslimi", attendance_or_participation_evidence: "Devam/katılım kanıtı", assessment_activity: "Değerlendirme etkinliği",
  quality_indicator: "Kalite göstergesi", risk_and_improvement_reference: "Risk/iyileştirme referansı",
  official_decision_document: "Resmî karar belgesi", institutional_approval_record: "Kurumsal onay kaydı",
  finance_record: "Mali kayıt", payment_and_reconciliation: "Tahsilat/mutabakat", invoice_handoff: "Fatura aktarım taslağı",
  sem_program_catalog: "DPÜSEM program kataloğu", dilmer_program_catalog: "DİLMER program kataloğu",
  tomer_program_catalog: "TÖMER program kataloğu", kodsis_program_catalog: "KODSİS program kataloğu",
  tomer_application_record: "TÖMER başvuru kaydı", tomer_certificate_verification_reference: "TÖMER sertifika doğrulama referansı",
  ydyo_assessment_announcement: "YDYO değerlendirme duyurusu", language_assessment_reference: "Dil değerlendirme referansı",
  public_academic_profile: "Kamu akademik profili", staff_profile_reference: "Personel profil referansı",
  alumni_relationship: "Mezun ilişkisi", alumni_contact_preference: "Mezun iletişim tercihi",
  research_project_reference: "Araştırma projesi referansı", bap_evidence_status: "BAP kanıt durumu",
  ethics_approval_reference: "Etik onay referansı", ethics_validity_status: "Etik geçerlilik durumu",
  academic_performance_indicator: "Akademik performans göstergesi", academic_evidence_reference: "Akademik kanıt referansı",
  licensed_resource_remote_access_policy: "Lisanslı kaynağa uzaktan erişim kuralı",
  workplace_learning_record: "İş yeri öğrenmesi kaydı", supervisor_evidence_reference: "Danışman kanıt referansı",
  teaching_workload: "Ders iş yükü", entitlement_reference: "Hak ediş referansı",
  mobile_notification_channel: "Mobil bildirim kanalı", public_deep_link_reference: "Kamu derin bağlantı referansı",
  institutional_form_definition: "Kurumsal form tanımı", form_submission_status: "Form başvuru durumu",
  software_change_request: "Yazılım değişiklik talebi", integration_incident_reference: "Entegrasyon olay referansı",
  fee_parameter: "Ücret parametresi", collection_status: "Tahsilat durumu", invoice_reference: "Fatura referansı", reconciliation_status: "Mutabakat durumu",
  bibliographic_catalog_record: "Bibliyografik katalog kaydı", mobility_program_catalog: "Hareketlilik program kataloğu",
  international_agreement_reference: "Uluslararası anlaşma referansı", laboratory_service_catalog: "Laboratuvar hizmet kataloğu",
  analysis_result_reference: "Analiz sonuç referansı", appointment_slot: "Randevu kontenjanı", unit_schedule: "Birim takvimi",
  public_web_content: "Kamu web içeriği", unit_publication_status: "Birim yayın durumu",
  kamer_public_program_catalog: "KAMER kamu program kataloğu", equity_guidance_reference: "Eşitlik/rehberlik referansı",
  staff_attendance: "Personel devam kaydı", work_time_reference: "Çalışma zamanı referansı"
};

const masterDataOwnerPriority = [
  "dpu-central-identity",
  "dpu-obs",
  "dpu-bologna",
  "dpu-oys",
  "dpu-bkys",
  "dpu-ebys",
  "dpu-doner-sermaye"
];

export const integrationMasterDataOwnership = dpuInstitutionalSystems
  .filter((system) => Array.isArray(system.masterDataDomains) && system.masterDataDomains.length)
  .map((system) => ({
    systemId: system.id,
    domain: system.masterDataDomains.map((domain) => masterDataDomainLabels[domain] || domain.replaceAll("_", " ")).join(" • "),
    system: system.nameTr,
    authority: system.ownerUnit,
    mode: system.masterDataBoundary,
    integrationTier: system.integrationTier,
    myysRelevance: system.myysRelevance
  }))
  .sort((left, right) => {
    const leftPriority = masterDataOwnerPriority.indexOf(left.systemId);
    const rightPriority = masterDataOwnerPriority.indexOf(right.systemId);
    if (leftPriority >= 0 || rightPriority >= 0) {
      return (leftPriority >= 0 ? leftPriority : Number.MAX_SAFE_INTEGER) - (rightPriority >= 0 ? rightPriority : Number.MAX_SAFE_INTEGER);
    }
    return left.system.localeCompare(right.system, "tr");
  });

const legacyConsultationOnlyIntegrationIds = new Set([
  "dpu-sem",
  "dpu-dilmer",
  "dpu-tomer",
  "dpu-tomer-application",
  "dpu-tomer-verification",
  "dpu-software-request"
]);

export const consultationOnlyIntegrationIds = dpuInstitutionalSystems
  .filter((system) => system.consultationOnly === true || legacyConsultationOnlyIntegrationIds.has(system.id))
  .map((system) => system.id);

export const externalPilotIntegrationGates = [
  { id: "gib", name: "GİB / e-Arşiv", category: "Dış mali kamu sistemi", direction: "MYYS → GİB/e-Arşiv taslağı", approvalGate: "Döner Sermaye + Mali İşler + yetkili imza + BİDB", boundary: "Gerçek fatura, vergi kuralı, mükellef bilgisi veya servis adresi yok." },
  { id: "financial-mys", name: "Mali MYS / MAYS", category: "Dış mali kamu sistemi", direction: "MYYS → mali MYS/MAYS taslağı", approvalGate: "Döner Sermaye + Mali İşler + görev ayrılığı + BİDB", boundary: "BKYS içindeki kalite/memnuniyet MYS ile aynı sistem değildir; gerçek mali aktarım yok." },
  { id: "yoksis-tomersis", name: "YÖKSİS / TÖMERSİS", category: "Kurumlar arası istişare", direction: "Yalnızca veri sözlüğü ve raporlama taslağı", approvalGate: "YÖK/ilgili kurum + yetkili DPÜ birimi + mevzuat + BİDB", boundary: "Resmî toplantı istişareyi doğrular; canlı entegrasyon veya API doğrulanmış değildir." },
  { id: "edevlet", name: "e-Devlet", category: "Kamu doğrulama kapısı", direction: "MYYS → kamu doğrulama taslağı", approvalGate: "Hukuk/mevzuat + veri sahibi + BİDB + yetkili kamu kurumu", boundary: "Canlı kimlik veya belge aktarımı yok; servis sözleşmesi doğrulanmadı." },
  { id: "outbound-message", name: "E-posta / SMS", category: "Dış bildirim kapısı", direction: "MYYS → bildirim outbox taslağı", approvalGate: "Kullanıcı tercihi + iletişim sahibi + BİDB", boundary: "Gerçek alıcı, telefon/e-posta veya gönderim isteği yok." }
];

export const roleNavigation = {
  learner: ["overview", "scenarios", "catalog", "payments", "learning", "applications", "recognition", "assessment", "wallet", "notifications"],
  instructor: ["overview", "scenarios", "proposal", "frameworks", "applications", "programs", "assessment", "notifications"],
  externalInstructor: ["overview", "scenarios", "proposal", "frameworks", "applications", "assessment", "notifications"],
  coordinator: ["overview", "scenarios", "applications", "frameworks", "commission", "programs", "integrations", "reports", "notifications"],
  commission: ["overview", "scenarios", "commission", "frameworks", "applications", "assessment", "audit", "notifications"],
  studentAffairs: ["overview", "scenarios", "applications", "integrations", "wallet", "audit"],
  it: ["overview", "scenarios", "integrations", "audit", "reports"],
  finance: ["overview", "scenarios", "finance", "integrations", "reports", "audit", "notifications"],
  admin: ["overview", "scenarios", "applications", "frameworks", "commission", "programs", "integrations", "finance", "reports", "audit"]
};

export const pageMeta = {
  home: { label: "Pilot Ana Sayfa", icon: "home" },
  overview: { label: "Genel Bakış", icon: "grid" },
  scenarios: { label: "Uçtan Uca Senaryolar", icon: "refresh" },
  catalog: { label: "Mikro Yeterlilik Kataloğu", icon: "book" },
  payments: { label: "Başvuru ve Ödeme Demosu", icon: "coins" },
  learning: { label: "Eğitimlerim ve AKTS", icon: "book" },
  proposal: { label: "Yeni Program Önerisi", icon: "plus" },
  frameworks: { label: "TYÇ / AYÇ Matrisleri", icon: "layers" },
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

const categoryLabels = {
  continuing_education: "Sürekli eğitim", learning_delivery: "Öğrenme ortamı", academic_reference: "Akademik referans",
  student_lifecycle: "Akademik ve öğrenci", language_education: "Dil eğitimi", language_assessment: "Dil değerlendirme",
  identity_and_staff: "Kimlik ve personel", alumni: "Mezun ve paydaş", research_management: "Araştırma",
  records_and_approval: "Belge ve karar", ethics_and_compliance: "Etik ve uyum", quality_management: "Kalite ve yönetim",
  staff_operations: "Personel operasyonu", learning_resources: "Kütüphane ve kaynak", workplace_learning: "Uygulamalı eğitim",
  finance_and_staff: "İnsan kaynağı ve mali", identity_and_access: "Kimlik ve erişim", notification_and_access: "Mobil ve bildirim",
  continuing_and_language_education: "Sürekli ve dil eğitimi", credential_verification: "Belge doğrulama",
  forms_and_applications: "Başvuru ve iş akışı", it_service_management: "BT hizmet yönetimi",
  finance: "Finans ve döner sermaye", international_relations: "Uluslararası ilişkiler",
  laboratory_management: "Laboratuvar yönetimi", appointment_management: "Randevu yönetimi",
  web_publishing: "Kurumsal web yayını", equity_and_support: "Eşitlik ve destek"
};

function integrationOperatorRoles(system, scenario) {
  const rolesForSystem = new Set(["it", "admin"]);
  if (scenario?.actorRole) rolesForSystem.add(scenario.actorRole);
  if (["student_lifecycle", "academic_reference"].includes(system.category)) rolesForSystem.add("studentAffairs");
  if (["continuing_education", "learning_delivery", "language_education", "quality_management", "records_and_approval", "forms_and_applications"].includes(system.category)) rolesForSystem.add("coordinator");
  if (["finance", "finance_and_staff"].includes(system.category)) rolesForSystem.add("finance");
  return [...rolesForSystem];
}

function buildInstitutionalIntegrationCatalog() {
  return dpuInstitutionalSystems.map((system) => {
    const mapping = pilotIntegrationMappings.find((item) => item.systemId === system.id);
    const scenario = pilotIntegrationScenarios.find((item) => item.systemId === system.id);
    const direction = mapping?.direction === "inbound" ? "Kaynak → MYYS" : mapping?.direction === "outbound" ? "MYYS → hedef" : mapping?.direction === "bidirectional" ? "MYYS ↔ hedef" : "Yalnızca referans / yönlendirme taslağı";
    return {
      id: system.id,
      name: system.nameTr,
      category: categoryLabels[system.category] || system.category,
      systemClass: system.registryKind.includes("public") || system.registryKind.includes("website") || system.registryKind.includes("reference") ? "Kamuya açık referans / otomasyon adayı" : "Kurumsal otomasyon adayı",
      owner: `${system.ownerUnit} • kurumsal doğrulama gerekir`,
      operatorRoles: integrationOperatorRoles(system, scenario),
      status: "disconnected",
      stage: Number(system.integrationTier.replace("tier", "")),
      integrationTier: system.integrationTier,
      myysRelevance: system.myysRelevance,
      consultationOnly: consultationOnlyIntegrationIds.includes(system.id),
      attempts: 0,
      publicUrl: system.publicUrl || "",
      sourceUrl: system.sourceUrl || system.publicUrl || "",
      sourceStatus: `${system.verificationStatus}; entegrasyon sözleşmesi: ${system.integrationContractStatus}`,
      purposeProposal: system.scopeNote,
      dataDirection: `${direction}${mapping ? ` • ${mapping.integrationNameTr}` : ""}`,
      approvalGate: mapping?.approvalGate || `${system.ownerUnit} + Bilgi İşlem`,
      samplePayload: { mode: "dry-run", reference: `${system.code}-DEMO-001`, operation: mapping?.flowKey || "reference-preview", realData: false },
      errorScenario: "SIMULATED_CONTRACT_NOT_VERIFIED",
      retryPolicy: mapping?.retryStrategy || "Kaynak, veri sahibi ve teknik sözleşme doğrulandıktan sonra manuel yeniden deneme.",
      auditPolicy: "Kaynak sürümü, amaç, aktör, onay kapısı, redakte paket ve sonuç kaydedilir.",
      lastTest: "Kurumsal doğrulama bekleniyor",
      realDataEnabled: false,
      referenceVersion: system.sourceCheckedAt,
      masterDataDomains: [...system.masterDataDomains],
      masterDataBoundary: system.masterDataBoundary
    };
  });
}

export const initialState = {
  version: 9,
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
  qualificationDrafts: [],
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
  integrations: buildInstitutionalIntegrationCatalog(),
  finance: {
    parameters: { withholding: 15, vat: 20, stamp: 0.759 },
    paymentRequests: [
      {
        id: "PAY-2401",
        programId: "program-green-skills",
        programCode: "MY-PRG-2026-011",
        program: "Yeşil Dönüşüm İçin Temel Yetkinlikler",
        learner: "Derya Örnek",
        amount: 1750,
        channel: "Havale/EFT simülasyonu",
        status: "pending_finance",
        createdAt: "2026-08-19T15:20:00Z",
        updatedAt: "2026-08-19T15:20:00Z",
        realPayment: false,
        enrollmentCreated: false
      }
    ],
    transactions: [
      { id: "TX-0821", program: "Proje Temelli Öğrenme Tasarımı", learner: "Pilot Katılımcı 021", gross: 1200, channel: "Havale/EFT simülasyonu", status: "matched" },
      { id: "TX-0822", program: "Yeşil Dönüşüm İçin Temel Yetkinlikler", learner: "Pilot Katılımcı 014", gross: 1750, channel: "Sanal POS simülasyonu", status: "pending" }
    ],
    entitlements: [
      { id: "ENT-009", instructor: "Dr. Öğr. Üyesi Aylin Eren", hours: 12, evidence: "12/12 oturum kanıtı", gross: 9600, status: "draft" }
    ]
  },
  notifications: [
    { id: "N-1", title: "Komisyon gündemi güncellendi", body: "MY-PRG-2026-014 başvurusu 21 Ağustos pilot toplantısına eklendi.", time: "Bugün • 09.20", recipientRoles: ["coordinator", "commission"], readBy: [] },
    { id: "N-2", title: "Ek belge gerekiyor", body: "MY-BSV-2026-0042 için sağlayıcı doğrulama kanıtı bekleniyor.", time: "Dün • 16.45", recipientRoles: ["learner", "coordinator", "commission"], readBy: [] },
    { id: "N-3", title: "Aktarım simülasyonu planlandı", body: "ÖBİS dry-run senaryosu için onay kapısı kontrol listesi hazırlandı.", time: "17.08.2026", recipientRoles: ["coordinator", "commission"], readBy: ["coordinator", "commission"] },
    { id: "N-4", title: "Program kanıt kontrol listesi hazır", body: "Yeni program önerilerinde eğitici yeterliliği ve kalite güvence kanıtı alanlarını tamamlayın.", time: "16.08.2026", recipientRoles: ["instructor", "externalInstructor"], readBy: [] },
    { id: "N-5", title: "Ödeme demo incelemesi bekliyor", body: "PAY-2401, Finans / Döner Sermaye ön kontrol kuyruğuna iletildi. Gerçek ödeme alınmadı.", time: "Bugün • 18.49", recipientRoles: ["finance"], readBy: [] }
  ],
  audit: [
    { id: "AUD-1008", entityId: "PAY-2401", at: "2026-08-19T15:20:00Z", actor: "Derya Örnek", actorRole: "learner", action: "Ödeme demosu mali işlere yönlendirildi", from: "draft", to: "pending_finance", reason: "Havale/EFT simülasyonu; gerçek para veya ödeme aracı verisi işlenmedi" },
    { id: "AUD-1007", entityId: "APP-014", at: "2026-08-19T08:42:00Z", actor: "Murat Akın", actorRole: "coordinator", action: "Ön kontrol tamamlandı", from: "review", to: "commission", reason: "Zorunlu pilot kanıtların tamamı mevcut" },
    { id: "AUD-1006", entityId: "APP-042", at: "2026-08-18T14:15:00Z", actor: "MYYS Pilot Analiz Motoru", actorRole: "system", action: "Karşılaştırma analizi üretildi", from: "review", to: "review", reason: "%58 benzerlik işareti — karar değildir" },
    { id: "AUD-1005", entityId: "APP-031", at: "2026-08-18T09:05:00Z", actor: "Prof. Dr. Deniz Aydın", actorRole: "commission", action: "Revizyon istendi", from: "commission", to: "revision", reason: "Rubrik ve öğrenme çıktısı eşlemesi eksik" }
  ]
};
