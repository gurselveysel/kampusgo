export const allowedTransitions = {
  draft: ["review"],
  review: ["commission", "revision", "rejected"],
  commission: ["approved", "deferred", "revision", "rejected", "commission"],
  revision: ["review"],
  approved: ["credentialed"],
  deferred: [],
  credentialed: [],
  rejected: []
};

export const transitionPermissions = {
  review: ["instructor", "externalInstructor", "learner"],
  commission: ["coordinator", "commission"],
  revision: ["coordinator", "commission"],
  approved: ["commission"],
  deferred: ["commission"],
  rejected: ["commission"],
  credentialed: ["system"]
};

const applicationOwnerRoles = new Set(["learner", "instructor", "externalInstructor"]);
const assessmentDecisionRoles = new Set(["instructor", "externalInstructor", "commission"]);
const paymentChannels = new Set(["Sanal POS simülasyonu", "Havale/EFT simülasyonu"]);
const paymentStatuses = new Set(["draft", "pending_finance", "approved", "revision", "reconciled"]);
const workloadComponentKeys = ["synchronous", "asynchronous", "preparation", "practice", "project", "independent", "assessment", "feedback"];

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
    if (nextStatus === "approved" && application.institutionalValidationConfirmed !== true) return false;
    if (nextStatus === "credentialed" && (application.institutionalValidationConfirmed !== true || application.productionEligible !== true)) return false;
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

/**
 * Integration operations are data-driven: every catalog record declares the
 * pilot roles that may create a dry-run. This never authorizes a live call.
 */
export function canRunIntegrationDryRun(integration, actorRole) {
  return Boolean(
    integration &&
    integration.realDataEnabled === false &&
    integration.consultationOnly === false &&
    Array.isArray(integration.operatorRoles) &&
    integration.operatorRoles.includes(actorRole)
  );
}

/**
 * Runs a deterministic failure/retry simulation and writes both job and audit
 * records. No fetch, credential, endpoint or external mutation exists here.
 */
export function runIntegrationDryRun(state, integrationId, actorRole, actorName) {
  const integration = state?.integrations?.find((item) => item.id === integrationId);
  if (!integration) throw new Error("Entegrasyon kataloğu kaydı bulunamadı");
  if (!canRunIntegrationDryRun(integration, actorRole)) {
    throw new Error("Bu rol bu entegrasyon için dry-run kaydı oluşturamaz");
  }

  integration.attempts = Number(integration.attempts || 0) + 1;
  const previous = integration.status;
  const shouldFail = integration.attempts === 1;
  const now = new Date().toISOString();
  integration.status = shouldFail ? "failed" : "simulated";
  integration.lastTest = shouldFail
    ? `${integration.errorScenario} • simüle hata`
    : "Kontrollü yeniden deneme başarılı • simülasyon";

  state.integrationJobs ||= [];
  state.audit ||= [];
  const job = {
    id: `JOB-${integration.id}-${Date.now()}`,
    target: integration.id,
    targetLabel: integration.name,
    targetId: integration.id,
    category: integration.category,
    status: shouldFail ? "simulation_failed" : "simulation_succeeded",
    approvalGate: integration.approvalGate,
    errorCode: shouldFail ? integration.errorScenario : "NONE",
    retryAvailable: shouldFail,
    realDataSent: false,
    at: now
  };
  state.integrationJobs.unshift(job);
  state.audit.unshift({
    id: `AUD-${Date.now()}-INT-${integration.id}`,
    entityId: `INT-${integration.id}`,
    at: now,
    actor: actorName || actorNameForRole(actorRole),
    actorRole,
    action: shouldFail ? "Entegrasyon hata senaryosu üretildi" : "Entegrasyon yeniden denemesi tamamlandı",
    from: previous,
    to: integration.status,
    reason: `${integration.approvalGate}; ${shouldFail ? integration.errorScenario : "simüle başarı"}; realDataSent=false`
  });
  return { integration, job };
}

/** IT and technical admin can produce a synthetic success log for all gates. */
export function runIntegrationBulkDryRun(state, actorRole, actorName) {
  if (!["it", "admin"].includes(actorRole)) {
    throw new Error("Toplu entegrasyon dry-run yalnız Bilgi İşlem veya sistem yöneticisi rolüne açıktır");
  }
  const now = new Date().toISOString();
  state.integrationJobs ||= [];
  state.audit ||= [];
  return (state.integrations || []).filter((integration) => integration.consultationOnly === false).map((integration, index) => {
    if (integration.realDataEnabled !== false) throw new Error("Canlı veri etkin entegrasyon pilot toplu işlemine alınamaz");
    const previous = integration.status;
    integration.attempts = Number(integration.attempts || 0) + 1;
    integration.status = "simulated";
    integration.lastTest = "Toplu kontrollü dry-run başarılı • simülasyon";
    const job = {
      id: `JOB-BULK-${integration.id}-${Date.now()}-${index}`,
      target: integration.id,
      targetLabel: integration.name,
      targetId: integration.id,
      category: integration.category,
      status: "simulation_succeeded",
      approvalGate: integration.approvalGate,
      errorCode: "NONE",
      retryAvailable: false,
      realDataSent: false,
      at: now
    };
    state.integrationJobs.unshift(job);
    state.audit.unshift({
      id: `AUD-BULK-${Date.now()}-${index}`,
      entityId: `INT-${integration.id}`,
      at: now,
      actor: actorName || actorNameForRole(actorRole),
      actorRole,
      action: "Toplu entegrasyon dry-run tamamlandı",
      from: previous,
      to: "simulated",
      reason: `${integration.approvalGate}; yalnız redakte örnek paket; realDataSent=false`
    });
    return job;
  });
}

/**
 * Returns payment-demo records through a strict role and identity boundary.
 * Learners see only their own synthetic requests; the finance role sees the
 * operational queue. Admin has read-only technical oversight in the UI.
 */
export function visiblePaymentRequestsForRole(state, actorRole, actorName) {
  const requests = state?.finance?.paymentRequests || [];
  if (actorRole === "learner") {
    const effectiveName = actorName || actorNameForRole("learner");
    return requests.filter((request) => request.learner === effectiveName);
  }
  if (["finance", "admin"].includes(actorRole)) return [...requests];
  return [];
}

/** Starts, but does not submit, a synthetic payment request for an active paid program. */
export function startPaymentRequest(state, programId, actorRole, actorName) {
  if (actorRole !== "learner") throw new Error("Ödeme demo adımını yalnız öğrenen başlatabilir");
  const learner = actorName || actorNameForRole("learner");
  const program = state.programs.find((item) => item.id === programId);
  if (!program || program.status !== "active") throw new Error("Aktif pilot program bulunamadı");
  if (!Number.isFinite(Number(program.price)) || Number(program.price) <= 0) {
    throw new Error("Bu program için mali işler ödeme demosu gerekmez");
  }
  state.finance ||= {};
  state.finance.paymentRequests ||= [];
  const existing = state.finance.paymentRequests.find((request) =>
    request.programId === program.id && request.learner === learner && request.status !== "reconciled"
  );
  if (existing) return existing;
  const now = new Date().toISOString();
  const request = {
    id: `PAY-${String(Date.now()).slice(-6)}`,
    programId: program.id,
    programCode: program.code,
    program: program.title,
    learner,
    amount: Number(program.price),
    channel: "Seçilmedi • simülasyon",
    status: "draft",
    createdAt: now,
    updatedAt: now,
    realPayment: false,
    enrollmentCreated: false
  };
  state.finance.paymentRequests.unshift(request);
  state.audit.unshift({
    id: `AUD-${Date.now()}-PAY-DRAFT`, entityId: request.id, at: now,
    actor: learner, actorRole: "learner", action: "Ödeme demo taslağı oluşturuldu",
    from: "none", to: "draft", reason: "Gerçek ödeme veya kart verisi alınmadı"
  });
  return request;
}

/** Sends the learner's request to the Finance / Döner Sermaye pilot queue. */
export function submitPaymentRequest(state, requestId, channel, actorRole, actorName) {
  if (actorRole !== "learner") throw new Error("Mali işler kuyruğuna yalnız öğrenen başvurusu gönderilebilir");
  if (!paymentChannels.has(channel)) throw new Error("Geçerli bir pilot ödeme kanalı seçin");
  const learner = actorName || actorNameForRole("learner");
  const request = state.finance?.paymentRequests?.find((item) => item.id === requestId);
  if (!request || request.learner !== learner) throw new Error("Ödeme demo kaydı bulunamadı veya bu öğrenene ait değil");
  if (!["draft", "revision"].includes(request.status)) throw new Error("Bu ödeme demo kaydı mali işlere tekrar gönderilemez");
  const previous = request.status;
  const now = new Date().toISOString();
  request.channel = channel;
  request.status = "pending_finance";
  request.updatedAt = now;
  request.realPayment = false;
  state.audit.unshift({
    id: `AUD-${Date.now()}-PAY-SUBMIT`, entityId: request.id, at: now,
    actor: learner, actorRole: "learner", action: "Ödeme demosu mali işlere yönlendirildi",
    from: previous, to: request.status, reason: `${channel}; gerçek para veya ödeme aracı verisi işlenmedi`
  });
  pushPaymentNotification(state, ["finance"], "Yeni ödeme demo incelemesi", `${request.id} • ${request.program} için mali ön kontrol bekliyor.`);
  pushPaymentNotification(state, ["learner"], "Mali işlere yönlendirildi", `${request.id} numaralı ödeme demonuz Finans / Döner Sermaye kuyruğuna iletildi.`);
  return request;
}

/** Finance-only approval, revision and reconciliation state machine. */
export function reviewPaymentRequest(state, requestId, nextStatus, actorRole, reason, actorName) {
  if (actorRole !== "finance") throw new Error("Ödeme demo incelemesini yalnız Finans / Döner Sermaye rolü yapabilir");
  if (!paymentStatuses.has(nextStatus)) throw new Error("Geçersiz ödeme demo durumu");
  const request = state.finance?.paymentRequests?.find((item) => item.id === requestId);
  if (!request) throw new Error("Ödeme demo kaydı bulunamadı");
  const allowed = {
    pending_finance: ["approved", "revision"],
    approved: ["reconciled", "revision"]
  }[request.status] || [];
  if (!allowed.includes(nextStatus)) throw new Error(`${request.status} durumundan ${nextStatus} durumuna geçilemez`);
  if (!String(reason || "").trim()) throw new Error("Mali demo durum değişikliği için gerekçe zorunludur");
  const previous = request.status;
  const now = new Date().toISOString();
  request.status = nextStatus;
  request.updatedAt = now;
  request.reviewReason = String(reason).trim();
  request.realPayment = false;

  if (nextStatus === "reconciled") {
    state.finance.transactions ||= [];
    if (!state.finance.transactions.some((item) => item.paymentRequestId === request.id)) {
      state.finance.transactions.unshift({
        id: `TX-${request.id}`,
        paymentRequestId: request.id,
        program: request.program,
        learner: request.learner,
        gross: request.amount,
        channel: request.channel,
        status: "matched"
      });
    }
    const enrollmentId = `ENR-${request.programCode}`;
    if (!state.enrollments.some((item) => item.id === enrollmentId)) {
      const program = state.programs.find((item) => item.id === request.programId);
      state.enrollments.unshift({
        id: enrollmentId,
        programCode: request.programCode,
        title: request.program,
        learner: request.learner,
        status: "active",
        progress: 0,
        ects: Number(program?.ects || 1),
        remoteEcts: Number(((program?.ects || 1) * (program?.remoteRate || 0) / 100).toFixed(1))
      });
    }
    request.enrollmentCreated = true;
  }

  const action = nextStatus === "approved"
    ? "Mali ön onay verildi • simülasyon"
    : nextStatus === "revision"
      ? "Ödeme demosu için düzeltme istendi"
      : "Ödeme demosu mutabakatı tamamlandı";
  state.audit.unshift({
    id: `AUD-${Date.now()}-PAY-REVIEW`, entityId: request.id, at: now,
    actor: actorName || actorNameForRole("finance"), actorRole: "finance", action,
    from: previous, to: nextStatus, reason: request.reviewReason
  });
  const notificationTitle = nextStatus === "approved"
    ? "Mali ön onay verildi"
    : nextStatus === "revision"
      ? "Ödeme demosunda düzeltme gerekiyor"
      : "Mutabakat tamamlandı • pilot kayıt açıldı";
  pushPaymentNotification(state, ["learner"], notificationTitle, `${request.id} • ${request.reviewReason}`);
  return request;
}

function pushPaymentNotification(state, recipientRoles, title, body) {
  state.notifications ||= [];
  state.notifications.unshift({
    id: `N-PAY-${Date.now()}-${state.notifications.length}`,
    title,
    body,
    time: "Şimdi • uygulama içi",
    recipientRoles,
    readBy: []
  });
}

export const scenarioDefinitions = {
  internal: [
    ["instructor", "Program taslağı oluşturulur"],
    ["instructor", "Öğrenme çıktıları ve AKTS iş yükü tamamlanır"],
    ["instructor", "Taslak koordinatörlüğe gönderilir"],
    ["system", "Karar vermeyen pilot ön kontrol üretilir"],
    ["coordinator", "Eksik belge kontrolü tamamlanır"],
    ["commission", "Komisyon karşılaştırma raporunu inceler"],
    ["commission", "Kurumsal doğrulamaya kadar erteleme kaydı oluşturulur"],
    ["coordinator", "Yayımlanmayan program taslak kaydı korunur"],
    ["learner", "Kayıt işleminin bloke edildiği doğrulanır"],
    ["instructor", "Değerlendirme işleminin bloke edildiği doğrulanır"],
    ["system", "Belge üretim güvenlik kapısı doğrulanır"],
    ["learner", "Ertelenmiş pilot kayıt Preview'da görüntülenir"]
  ],
  recognition: [
    ["learner", "Dış sertifika taslağı oluşturulur"],
    ["learner", "Sentetik belge üst verisi ve doğrulama bağlantısı eklenir"],
    ["system", "Karar vermeyen müfredat örtüşme analizi üretilir"],
    ["system", "AKTS ve uzaktan kredi portföyü pilot kontrolü yapılır"],
    ["commission", "Komisyon kanıtları insan gözüyle inceler"],
    ["commission", "Tanıma sonucu kurumsal doğrulamaya ertelenir"],
    ["studentAffairs", "Kredi kaydının bloke edildiği doğrulanır"],
    ["it", "ÖBİS ve YÖKSİS için bloke dry-run logu üretilir"]
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
  if (nextStatus === "approved" && application.institutionalValidationConfirmed !== true) {
    throw new Error("Kurumsal doğrulama tamamlanmadan başvuru nihai onaya geçirilemez; deferred kullanılmalıdır");
  }
  if (nextStatus === "credentialed" && (application.institutionalValidationConfirmed !== true || application.productionEligible !== true)) {
    throw new Error("Kurumsal doğrulama ve production uygunluğu olmadan belge durumu oluşturulamaz");
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
  if (sourceApplication.institutionalValidationConfirmed !== true || sourceApplication.productionEligible !== true) {
    throw new Error("Kurumsal doğrulama ve production uygunluğu olmadan pilot yeterlilik oluşturulamaz");
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
  if (!["internal", "external"].includes(payload.kind)) throw new Error("Başvuru türü internal veya external olmalıdır");
  if (!String(payload.title || "").trim() || !String(payload.applicant || "").trim()) {
    throw new Error("Başvuru başlığı ve sentetik başvuran kimliği zorunludur");
  }
  const ects = Number(payload.ects);
  const remoteRate = Number(payload.remoteRate);
  const evidence = Number(payload.evidence ?? 1);
  if (!Number.isInteger(ects) || ects < 1 || ects > 6) throw new Error("Pilot mikro yeterlilik AKTS değeri 1–6 arasında tam sayı olmalıdır");
  if (!Number.isFinite(remoteRate) || remoteRate < 0 || remoteRate > 100) throw new Error("Uzaktan sunum oranı 0 ile 100 arasında olmalıdır");
  if (!Number.isFinite(evidence) || evidence < 0) throw new Error("Pilot kanıt sayısı negatif olamaz");
  const normalizedWorkload = normalizeApplicationWorkload(payload.workloadComponents, payload.totalWorkload, ects);
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
    institutionalValidationConfirmed: false,
    productionEligible: false,
    submittedAt: new Date().toISOString(),
    targetAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    elapsedDays: 0,
    similarity: payload.kind === "external" ? 58 : 34,
    tycMatch: 76,
    ects,
    totalWorkload: normalizedWorkload.total,
    workloadComponents: normalizedWorkload.components,
    remoteRate,
    portfolioRemoteShare: payload.kind === "external" ? 45 : undefined,
    evidence,
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
    if (index === 6) transitionApplication(state, application.id, "deferred", "commission", "Senato, hukuk ve ilgili kurumsal doğrulamalar tamamlanmadığı için pilot kayıt ertelendi");
    if (index === 7) {
      if (!state.programs.some((item) => item.code === application.code)) state.programs.unshift({ id: `program-${application.id}`, code: application.code, title: application.title, unit: "Eğitim Fakültesi", instructor: application.applicant, ects: application.ects, workload: application.totalWorkload, workloadComponents: structuredClone(application.workloadComponents), level: 6, mode: "Karma", remoteRate: 40, status: "deferred", learners: 0, price: 0, productionEligible: false, summary: "Kurumsal doğrulama bekleyen, yayımlanmayan sentetik pilot program taslağı.", outcomes: ["Dijital kanıtı yapılandırır", "Rubrik ölçütlerini eşler", "Denetim izini yorumlar"] });
      log(application.id, label, "deferred", "deferred", "Katalog yayını yapılmadı; productionEligible=false");
    }
    if (index === 8) log(application.id, label, "deferred", "enrollment_blocked", "Kurumsal doğrulama yok; kayıt veya ödeme oluşturulmadı");
    if (index === 9) log(application.id, label, "enrollment_blocked", "assessment_blocked", "Kayıt yok; değerlendirme oturumu oluşturulmadı");
    if (index === 10) log(application.id, label, "assessment_blocked", "credential_blocked", "institutionalValidationConfirmed=false; productionEligible=false");
    if (index === 11) log(application.id, label, "deferred", "preview_only", "Yalnız ertelenmiş kayıt; belge doğrulama iddiası yok");
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
    if (index === 5) transitionApplication(state, application.id, "deferred", "commission", "Kurumsal doğrulama ve bağımsız üç tanıma kararı tamamlanmadığı için ertelendi");
    if (index === 6) log(application.id, label, "deferred", "credit_blocked", "AKTS veya ders ikamesi kaydı oluşturulmadı");
    if (index === 7) {
      for (const target of [{ id: "obis", label: "ÖBİS" }, { id: "yoksis", label: "YÖKSİS" }]) {
        state.integrationJobs.unshift({
          id: `JOB-${target.id}-${Date.now()}`,
          target: target.id,
          targetId: target.id,
          targetLabel: target.label,
          category: "Akademik kayıt aktarımı",
          applicationId: application.id,
          status: "simulation_blocked",
          errorCode: "INSTITUTIONAL_VALIDATION_REQUIRED",
          retryAvailable: false,
          realDataSent: false,
          at: now
        });
      }
      log(application.id, label, "credit_blocked", "simulation_blocked", "Kurumsal doğrulama yok; realDataSent=false; canlı servis çağrısı yapılmadı");
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

function normalizeApplicationWorkload(source, requestedTotal, ects) {
  const defaults = {
    synchronous: 5 * ects,
    asynchronous: 4 * ects,
    preparation: 3 * ects,
    practice: 3 * ects,
    project: 3 * ects,
    independent: 3 * ects,
    assessment: 2 * ects,
    feedback: 2 * ects
  };
  const input = source === undefined ? defaults : source;
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).length !== workloadComponentKeys.length || workloadComponentKeys.some((key) => !Object.hasOwn(input, key))) {
    throw new Error("Öğrenen iş yükü sekiz kanonik bileşeni eksiksiz içermelidir");
  }
  const components = Object.fromEntries(workloadComponentKeys.map((key) => [key, Number(input[key])]));
  if (Object.values(components).some((value) => !Number.isFinite(value) || value < 0)) throw new Error("Öğrenen iş yükü bileşenleri negatif veya geçersiz olamaz");
  const sum = Object.values(components).reduce((total, value) => total + value, 0);
  const total = requestedTotal === undefined ? sum : Number(requestedTotal);
  if (!Number.isFinite(total) || Math.abs(total - sum) > 0.001) throw new Error("Toplam öğrenen iş yükü sekiz bileşenin toplamına eşit olmalıdır");
  if (total < 25 * ects || total > 30 * ects) throw new Error("Toplam öğrenen iş yükü 25 × AKTS ile 30 × AKTS bandında olmalıdır");
  return { total, components };
}

function statusAction(status) {
  return {
    review: "Ön incelemeye gönderildi",
    commission: "Komisyon gündemine alındı",
    approved: "Gerekçeli pilot onayı kaydedildi",
    deferred: "Kurumsal doğrulamaya ertelendi",
    revision: "Revizyon istendi",
    rejected: "Gerekçeli pilot ret kaydı oluşturuldu",
    credentialed: "Pilot dijital yeterlilik oluşturuldu"
  }[status] || "Durum güncellendi";
}
