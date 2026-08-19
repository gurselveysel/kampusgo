export const allowedTransitions = {
  draft: ["review"],
  review: ["commission", "revision", "rejected"],
  commission: ["approved", "revision", "rejected", "commission"],
  revision: ["review"],
  approved: ["credentialed"],
  credentialed: [],
  rejected: []
};

export const transitionPermissions = {
  review: ["instructor", "externalInstructor", "learner"],
  commission: ["coordinator", "commission"],
  revision: ["coordinator", "commission"],
  approved: ["commission"],
  rejected: ["commission"],
  credentialed: ["system"]
};

const applicationOwnerRoles = new Set(["learner", "instructor", "externalInstructor"]);
const assessmentDecisionRoles = new Set(["instructor", "externalInstructor", "commission"]);

const actorNames = {
  learner: "Derya Örnek",
  instructor: "Dr. Öğr. Üyesi Ekin Demir",
  externalInstructor: "Uzman Eğitici Selin Ada",
  coordinator: "Murat Akın",
  commission: "Prof. Dr. Deniz Aydın",
  studentAffairs: "Öğrenci İşleri Pilot Kullanıcısı",
  it: "Bilgi İşlem Pilot Kullanıcısı",
  finance: "Mali İşler Pilot Kullanıcısı",
  admin: "MYYS Pilot Yöneticisi",
  system: "MYYS Pilot Analiz / Belge Hizmeti"
};

/** Returns the synthetic pilot identity for a role. */
export function actorNameForRole(role) {
  return actorNames[role] || "Pilot kullanıcı";
}

/**
 * Ownership is stricter than a role-only comparison. This prevents two people
 * with the same instructor role from seeing or mutating each other's records.
 */
export function ownsApplication(application, actorRole, actorName) {
  if (!application || !applicationOwnerRoles.has(actorRole) || application.ownerRole !== actorRole) return false;
  const effectiveActorName = actorName || actorNameForRole(actorRole);
  return Boolean(application.applicant && application.applicant === effectiveActorName);
}

/**
 * Role-scoped application read policy.
 * Applicants see only their own records. Coordinator and commission can see
 * submitted records, but never private drafts. Admin has technical oversight
 * visibility without receiving academic decision authority.
 */
export function canViewApplication(application, actorRole, actorName) {
  if (!application) return false;
  if (applicationOwnerRoles.has(actorRole)) return ownsApplication(application, actorRole, actorName);
  if (["coordinator", "commission"].includes(actorRole)) return application.status !== "draft";
  if (actorRole === "studentAffairs") return application.kind === "external" && application.status !== "draft";
  if (actorRole === "admin") return true;
  return false;
}

export function filterApplicationsForRole(applications, actorRole, actorName) {
  return (applications || []).filter((application) => canViewApplication(application, actorRole, actorName));
}

// Semantically named alias for callers that render a role-scoped collection.
export function visibleApplicationsForRole(stateOrApplications, actorRole, actorName) {
  const applications = Array.isArray(stateOrApplications)
    ? stateOrApplications
    : stateOrApplications?.applications || [];
  return filterApplicationsForRole(applications, actorRole, actorName);
}

/**
 * Returns the program collection visible to the active pilot persona.
 * Accepts either the whole state object or a program array for testability.
 */
export function visibleProgramsForRole(stateOrPrograms, actorRole, actorName) {
  const programs = Array.isArray(stateOrPrograms) ? stateOrPrograms : stateOrPrograms?.programs || [];
  const effectiveActorName = actorName || actorNameForRole(actorRole);
  if (["instructor", "externalInstructor"].includes(actorRole)) {
    return programs.filter((program) => program.instructor === effectiveActorName);
  }
  if (["coordinator", "commission", "admin"].includes(actorRole)) return [...programs];
  if (["learner", "studentAffairs"].includes(actorRole)) return programs.filter((program) => program.status === "active");
  if (actorRole === "finance") return programs.filter((program) => program.status === "active" && Number(program.price) > 0);
  return [];
}

/** Pure transition-policy helper for UI affordances and mutation guards. */
export function getAllowedApplicationTransitions(application, actorRole, actorName) {
  if (!application) return [];
  return (allowedTransitions[application.status] || []).filter((nextStatus) => {
    if (!(transitionPermissions[nextStatus] || []).includes(actorRole)) return false;
    if (nextStatus === "review") return ownsApplication(application, actorRole, actorName);
    // A same-state commission transition represents an abstention/opinion and
    // belongs to a commission member, not to the coordinator.
    if (application.status === "commission" && nextStatus === "commission") return actorRole === "commission";
    if (actorRole === "system") return nextStatus === "credentialed";
    return canViewApplication(application, actorRole, actorName);
  });
}

export function canRecordAssessmentDecision(actorRole) {
  return assessmentDecisionRoles.has(actorRole);
}

export const scenarioDefinitions = {
  internal: [
    ["instructor", "Program taslağı oluşturulur"],
    ["instructor", "Öğrenme çıktıları ve AKTS iş yükü tamamlanır"],
    ["instructor", "Taslak koordinatörlüğe gönderilir"],
    ["system", "Karar vermeyen pilot ön kontrol üretilir"],
    ["coordinator", "Eksik belge kontrolü tamamlanır"],
    ["commission", "Komisyon karşılaştırma raporunu inceler"],
    ["commission", "Gerekçeli pilot onayı kaydedilir"],
    ["coordinator", "Onaylanan program kataloğa eklenir"],
    ["learner", "Öğrenen programa kaydolur"],
    ["instructor", "Eğitim ve insan değerlendirmesi tamamlanır"],
    ["system", "Pilot dijital yeterlilik oluşturulur"],
    ["learner", "Belge Preview doğrulama sayfasında görüntülenir"]
  ],
  recognition: [
    ["learner", "Dış sertifika taslağı oluşturulur"],
    ["learner", "Sentetik belge üst verisi ve doğrulama bağlantısı eklenir"],
    ["system", "Karar vermeyen müfredat örtüşme analizi üretilir"],
    ["system", "AKTS ve uzaktan kredi portföyü pilot kontrolü yapılır"],
    ["commission", "Komisyon kanıtları insan gözüyle inceler"],
    ["commission", "Gerekçeli tanıma onayı kaydedilir"],
    ["studentAffairs", "Tanınan kredi öğrenen kaydına eklenir"],
    ["it", "ÖBİS ve YÖKSİS için yalnız simülasyon logu üretilir"]
  ]
};

export function cloneState(value) {
  return structuredClone(value);
}

export function transitionApplication(state, applicationId, nextStatus, actorRole, reason, actorName) {
  const application = state.applications.find((item) => item.id === applicationId);
  if (!application) throw new Error("Başvuru bulunamadı");
  const current = application.status;
  if (!(allowedTransitions[current] || []).includes(nextStatus)) {
    throw new Error(`${current} durumundan ${nextStatus} durumuna geçilemez`);
  }
  if (!(transitionPermissions[nextStatus] || []).includes(actorRole)) {
    throw new Error(`${actorRole} rolü ${nextStatus} durumuna geçiş yapamaz`);
  }
  if (!getAllowedApplicationTransitions(application, actorRole, actorName).includes(nextStatus)) {
    if (nextStatus === "review") throw new Error("Başvuruyu yalnızca kayıt sahibi ön incelemeye gönderebilir");
    throw new Error(`${actorRole} rolü bu başvuru üzerinde ${nextStatus} geçişi yapamaz`);
  }
  if (!String(reason || "").trim()) {
    throw new Error("Akademik durum geçişi için gerekçe zorunludur");
  }
  application.status = nextStatus;
  application.notes = reason || application.notes;
  const actor = actorName || actorNameForRole(actorRole);
  state.audit.unshift({
    id: `AUD-${Date.now()}`,
    entityId: application.id,
    at: new Date().toISOString(),
    actor,
    actorRole,
    action: current === "commission" && nextStatus === "commission"
      ? "Çekimser komisyon görüşü eklendi"
      : statusAction(nextStatus),
    from: current,
    to: nextStatus,
    reason: reason || "Pilot durum geçişi"
  });
  return application;
}

export function issueCredential(state, payload, actorRole = "system") {
  if (actorRole !== "system") throw new Error("Pilot dijital yeterliliği yalnız sistem belge hizmeti oluşturabilir");
  const sourceApplication = state.applications.find((item) => item.id === payload.sourceApplicationId);
  if (!sourceApplication || sourceApplication.status !== "approved") {
    throw new Error("Pilot yeterlilik için gerekçeli onaylı kaynak başvuru gerekir");
  }
  if (state.credentials.some((item) => item.code === payload.code)) throw new Error("Bu kodla pilot yeterlilik zaten var");
  const credential = {
    id: `credential-${Date.now()}`,
    code: payload.code,
    title: payload.title,
    owner: payload.owner,
    issuer: "Kütahya Dumlupınar Üniversitesi • Kontrollü Pilot",
    ects: Number(payload.ects),
    level: Number(payload.level),
    issuedAt: new Date().toISOString().slice(0, 10),
    status: "valid",
    sourceApplicationId: sourceApplication.id,
    verifyPath: `#/verify/${payload.code}`,
    outcomes: payload.outcomes || ["Pilot öğrenme çıktıları kurumsal doğrulamaya açıktır"]
  };
  state.credentials.unshift(credential);
  state.audit.unshift({
    id: `AUD-${Date.now()}`,
    entityId: credential.id,
    at: new Date().toISOString(),
    actor: "Pilot Belge Hizmeti",
    actorRole: "system",
    action: "Pilot dijital yeterlilik oluşturuldu",
    from: "approved",
    to: "credentialed",
    reason: "Yalnız pilot doğrulama sayfasında geçerlidir"
  });
  return credential;
}

export function createApplication(state, payload) {
  const requestedStatus = payload.status || "review";
  if (!["draft", "review"].includes(requestedStatus)) {
    throw new Error("Yeni başvuru yalnız taslak veya ön inceleme durumunda oluşturulabilir");
  }
  const ownerRole = resolveApplicationOwnerRole(payload);
  const id = `APP-${String(state.applications.length + 50).padStart(3, "0")}`;
  const codePrefix = payload.kind === "external" ? "MY-BSV" : "MY-PRG";
  const application = {
    id,
    code: `${codePrefix}-2026-${String(state.applications.length + 50).padStart(4, "0")}`,
    kind: payload.kind,
    title: payload.title,
    applicant: payload.applicant,
    ownerRole,
    provider: payload.provider || undefined,
    status: requestedStatus,
    submittedAt: new Date().toISOString(),
    targetAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    elapsedDays: 0,
    similarity: payload.kind === "external" ? 58 : 34,
    tycMatch: 76,
    ects: Number(payload.ects),
    remoteRate: Number(payload.remoteRate),
    portfolioRemoteShare: payload.kind === "external" ? 45 : undefined,
    evidence: Number(payload.evidence || 1),
    missing: 0,
    comparedCourse: payload.comparedCourse || "Kurumsal ders kataloğu",
    notes: "Pilot veri katmanına kaydedildi; koordinatörlük ön incelemesi bekleniyor."
  };
  state.applications.unshift(application);
  state.audit.unshift({
    id: `AUD-${Date.now()}`,
    entityId: application.id,
    at: new Date().toISOString(),
    actor: payload.applicant,
    actorRole: application.ownerRole,
    action: application.status === "draft" ? "Başvuru taslağı oluşturuldu" : "Başvuru pilot veri katmanına gönderildi",
    from: "draft",
    to: application.status,
    reason: application.status === "draft" ? "Tarayıcıdaki izole pilot çalışma alanına kaydedildi" : "Form doğrulaması tamamlandı"
  });
  return application;
}

/**
 * Finalizes a simulated assessment through an explicit authorization boundary.
 * The nine-role pilot has no separate evaluator persona. Academic educators
 * may record a human evaluation, while the commission can record the result
 * when it is acting as the designated review body. Learners and operational
 * roles are always denied.
 */
export function recordAssessmentDecision(state, sessionId, actorRole, decision = {}, actorName) {
  if (!canRecordAssessmentDecision(actorRole)) {
    throw new Error(`${actorRole} rolü insan değerlendirici kararı kaydedemez`);
  }
  const session = state.assessmentSessions.find((item) => item.id === sessionId);
  if (!session) throw new Error("Değerlendirme oturumu bulunamadı");
  if (!["active", "under_review"].includes(session.status)) {
    throw new Error("Yalnız etkin veya insan incelemesindeki oturum sonuçlandırılabilir");
  }

  const details = typeof decision === "string" ? { evaluatorDecision: decision } : decision || {};
  const score = details.score === undefined || details.score === null || details.score === ""
    ? session.score
    : Number(details.score);
  if (score !== null && score !== undefined && (!Number.isFinite(score) || score < 0 || score > 100)) {
    throw new Error("Değerlendirme puanı 0 ile 100 arasında olmalıdır");
  }

  const previousStatus = session.status;
  session.status = "completed";
  session.score = score ?? null;
  session.evaluatorDecision = details.evaluatorDecision || details.decision || "İnsan değerlendirici incelemesi tamamlandı";
  const now = new Date().toISOString();
  state.audit.unshift({
    id: `AUD-${Date.now()}`,
    entityId: session.id,
    at: now,
    actor: actorName || actorNameForRole(actorRole),
    actorRole,
    action: "İnsan değerlendirici kararı kaydedildi",
    from: previousStatus,
    to: "completed",
    reason: details.reason || "Simüle olaylar tek başına karar olarak kullanılmadı"
  });
  return session;
}

export function runScenarioStep(state, kind) {
  const definition = scenarioDefinitions[kind];
  const scenario = state.scenarios?.[kind];
  if (!definition || !scenario) throw new Error("Pilot senaryo bulunamadı");
  if (scenario.completed) throw new Error("Bu pilot senaryo zaten tamamlandı");

  const index = scenario.step;
  const [role, label] = definition[index];
  const now = new Date().toISOString();
  const log = (entityId, action = label, from = "scenario", to = "scenario", reason = "Kontrollü pilot senaryo adımı") => {
    state.audit.unshift({ id: `AUD-${Date.now()}-${index}`, entityId, at: now, actor: scenarioActor(role), actorRole: role, action, from, to, reason });
  };

  if (kind === "internal") {
    if (index === 0) {
      const application = createApplication(state, { kind: "internal", status: "draft", title: "Dijital Kanıt Tasarımı — Senaryo", applicant: "Dr. Öğr. Üyesi Ekin Demir", ects: 3, remoteRate: 40, evidence: 0, comparedCourse: "Kurumsal Bologna kataloğu" });
      scenario.applicationId = application.id;
    }
    const application = state.applications.find((item) => item.id === scenario.applicationId);
    if (!application) throw new Error("Senaryo başvurusu bulunamadı");
    if (index === 1) { application.evidence = 4; application.notes = "3 ölçülebilir çıktı, 3 AKTS / 75 saat ve rubrik taslağı tamamlandı."; log(application.id); }
    if (index === 2) transitionApplication(state, application.id, "review", "instructor", "Program önerisi koordinatörlük ön incelemesine gönderildi");
    if (index === 3) { application.similarity = 34; application.tycMatch = 86; log(application.id, label, "review", "review", "Deterministik bulgular; karar değildir"); }
    if (index === 4) transitionApplication(state, application.id, "commission", "coordinator", "Zorunlu sentetik kanıt metadata alanları tamamlandı");
    if (index === 5) log(application.id, label, "commission", "commission", "Müfredat, TYÇ, AKTS ve rubrik kanıtları karşılaştırıldı");
    if (index === 6) transitionApplication(state, application.id, "approved", "commission", "Pilot kanıtları yeterli bulundu; nihai kurumsal doğrulama saklıdır");
    if (index === 7) {
      if (!state.programs.some((item) => item.code === application.code)) state.programs.unshift({ id: `program-${application.id}`, code: application.code, title: application.title, unit: "Eğitim Fakültesi", instructor: application.applicant, ects: 3, workload: 75, level: 6, mode: "Karma", remoteRate: 40, status: "active", learners: 0, price: 0, summary: "Senaryo kapsamında onaylanan sentetik pilot program.", outcomes: ["Dijital kanıtı yapılandırır", "Rubrik ölçütlerini eşler", "Denetim izini yorumlar"] });
      log(application.id, label, "approved", "published", "Yalnız pilot katalog görünümü");
    }
    if (index === 8) {
      const enrollmentId = `ENR-${application.id}`;
      if (!state.enrollments.some((item) => item.id === enrollmentId)) state.enrollments.unshift({ id: enrollmentId, programCode: application.code, title: application.title, learner: "Derya Örnek", status: "active", progress: 20, ects: application.ects, remoteEcts: 1.2 });
      log(enrollmentId, label, "applied", "active", "Gerçek kayıt veya ödeme yok");
    }
    if (index === 9) {
      const enrollment = state.enrollments.find((item) => item.id === `ENR-${application.id}`);
      enrollment.status = "completed"; enrollment.progress = 100;
      state.assessmentSessions.unshift({ id: `ASM-${application.id}`, enrollmentId: enrollment.id, title: "Proje + rubrik değerlendirmesi", status: "completed", score: 88, evaluatorDecision: "Başarılı • İnsan değerlendirici", events: 1 });
      log(enrollment.id, label, "active", "completed", "Simüle olaylar insan değerlendirici tarafından incelendi");
    }
    if (index === 10) {
      const code = `MY-BEL-SCN-${String(Date.now()).slice(-6)}`;
      const credential = issueCredential(state, { sourceApplicationId: application.id, code, title: application.title, owner: "Derya Örnek", ects: application.ects, level: 6, outcomes: ["Dijital kanıtı yapılandırır", "Rubrik ölçütlerini eşler", "Denetim izini yorumlar"] }, "system");
      application.status = "credentialed";
      scenario.credentialCode = credential.code;
    }
    if (index === 11) log(`credential-${scenario.credentialCode}`, label, "issued", "verified", "Yalnız Preview içi doğrulama");
  } else {
    if (index === 0) {
      const application = createApplication(state, { kind: "external", status: "draft", title: "Açık Platform Veri Görselleştirme Sertifikası — Senaryo", applicant: "Derya Örnek", provider: "Örnek Açık Öğrenme Merkezi", ects: 2, remoteRate: 100, evidence: 0, comparedCourse: "İstatistiksel Veri Analizi" });
      scenario.applicationId = application.id;
    }
    const application = state.applications.find((item) => item.id === scenario.applicationId);
    if (!application) throw new Error("Senaryo başvurusu bulunamadı");
    if (index === 1) { application.evidence = 2; application.notes = "Sentetik sertifika metadata ve example.invalid doğrulama bağlantısı eklendi."; transitionApplication(state, application.id, "review", "learner", "Dış kazanım kanıtları ön incelemeye gönderildi"); }
    if (index === 2) { application.similarity = 58; log(application.id, label, "review", "review", "%58 karşılaştırılabilirlik işareti; karar değildir"); }
    if (index === 3) { application.portfolioRemoteShare = 45; log(application.id, label, "review", "review", "2 AKTS ve %45 uzaktan kaynaklı transfer portföyü pilot ön kontrolü"); }
    if (index === 4) transitionApplication(state, application.id, "commission", "commission", "Kanıtlar Komisyon insan incelemesine alındı");
    if (index === 5) transitionApplication(state, application.id, "approved", "commission", "Dış kazanım sentetik pilot kanıtlarıyla gerekçeli olarak tanındı");
    if (index === 6) {
      if (!state.recognizedCredits.some((item) => item.applicationId === application.id)) state.recognizedCredits.unshift({ id: `CR-${application.id}`, applicationId: application.id, title: application.title, ects: application.ects, remoteEcts: 1, status: "recognized" });
      log(application.id, label, "approved", "ledgered", "Öğrenci kaydı yalnız yerel pilot çalışma alanında güncellendi");
    }
    if (index === 7) {
      for (const target of ["ÖBİS", "YÖKSİS"]) state.integrationJobs.unshift({ id: `JOB-${target}-${Date.now()}`, target, applicationId: application.id, status: "simulation_succeeded", realDataSent: false, at: now });
      log(application.id, label, "ledgered", "simulation_logged", "realDataSent=false; canlı servis çağrısı yapılmadı");
    }
  }

  scenario.log.push({ index, role, label, at: now });
  scenario.step += 1;
  scenario.completed = scenario.step >= definition.length;
  return { role, label, completed: scenario.completed, credentialCode: scenario.credentialCode };
}

function scenarioActor(role) {
  return actorNameForRole(role);
}

function resolveApplicationOwnerRole(payload) {
  const explicitRole = payload.ownerRole || payload.actorRole;
  const inferredRole = payload.applicant === actorNameForRole("externalInstructor")
    ? "externalInstructor"
    : payload.kind === "external"
      ? "learner"
      : "instructor";
  const ownerRole = explicitRole || inferredRole;

  if (!applicationOwnerRoles.has(ownerRole)) throw new Error(`${ownerRole} rolü başvuru sahibi olamaz`);
  if (payload.kind === "external" && ownerRole !== "learner") {
    throw new Error("Dış kazanım tanıma başvurusu yalnız öğrenen adına oluşturulabilir");
  }
  if (payload.kind !== "external" && !["instructor", "externalInstructor"].includes(ownerRole)) {
    throw new Error("Program önerisi yalnız iç veya kurum dışı eğitici adına oluşturulabilir");
  }
  return ownerRole;
}

function statusAction(status) {
  return {
    review: "Ön incelemeye gönderildi",
    commission: "Komisyon gündemine alındı",
    approved: "Gerekçeli pilot onayı kaydedildi",
    revision: "Revizyon istendi",
    rejected: "Gerekçeli pilot ret kaydı oluşturuldu",
    credentialed: "Pilot dijital yeterlilik oluşturuldu"
  }[status] || "Durum güncellendi";
}
