/**
 * Controlled-pilot domain contract derived from the attached institutional
 * evaluation draft. None of the records in this module is an enacted rule,
 * Senate decision, legal opinion, live integration result or personal record.
 */

export const DIRECTIVE_PILOT_NOTICE = "KURUMSAL DEĞERLENDİRME TASLAĞI — Senato onayı ve kurumsal doğrulama yoktur.";

const canonicalOrganizationScopeRows = [
  ["MEM-LEARNER", "UNIT-DPU", "Kütahya Dumlupınar Üniversitesi — SENTETİK", "university", "student_affairs", "SENTETIK-ROL-LEARNER", "learner", "Öğrenen / Öğrenci", "observer", ["own_simulation"], false, false, false],
  ["MEM-INSTRUCTOR", "UNIT-MYKOORD", "Mikro Yeterlilik Koordinatörlüğü — SENTETİK", "coordinator_office", "coordinator_office", "SENTETIK-ROL-INSTRUCTOR", "instructor", "Üniversite içi eğitici", "reviewer", ["draft_program"], false, false, false],
  ["MEM-EXTERNAL", "UNIT-MYKOORD", "Mikro Yeterlilik Koordinatörlüğü — SENTETİK", "coordinator_office", "coordinator_office", "SENTETIK-ROL-EXTERNAL", "externalInstructor", "Kurum dışı eğitici", "reviewer", ["draft_external_program"], false, false, false],
  ["MEM-COORD", "UNIT-MYKOORD", "Mikro Yeterlilik Koordinatörlüğü — SENTETİK", "coordinator_office", "coordinator_office", "SENTETIK-ROL-COORDINATOR", "coordinator", "Koordinatörlük / SEM", "chair", ["pre_review", "agenda"], false, false, false],
  ["MEM-COMM-CHAIR", "UNIT-MYKOM", "Mikro Yeterlilik Komisyonu — SENTETİK", "board", "unit_commission", "SENTETIK-ROL-COMMISSION-CHAIR", "commission", "Komisyon üyesi", "chair", ["academic_human_decision"], true, true, false],
  ["MEM-STUDENT-AFFAIRS", "UNIT-OIDB", "Öğrenci İşleri — SENTETİK", "administrative_unit", "student_affairs", "SENTETIK-ROL-STUDENT-AFFAIRS", "studentAffairs", "Öğrenci İşleri", "operator", ["record_dry_run"], false, false, false],
  ["MEM-IT", "UNIT-BIDB", "Bilgi İşlem — SENTETİK", "administrative_unit", "information_technology", "SENTETIK-ROL-IT", "it", "Bilgi İşlem", "operator", ["technical_dry_run"], false, false, false],
  ["MEM-FINANCE", "UNIT-MALI", "Mali İşler — SENTETİK", "administrative_unit", "finance", "SENTETIK-ROL-FINANCE", "finance", "Finans / Döner Sermaye", "operator", ["financial_human_decision"], false, false, true],
  ["MEM-ADMIN", "UNIT-BIDB", "Bilgi İşlem — SENTETİK", "administrative_unit", "system_administration", "SENTETIK-ROL-ADMIN", "admin", "Sistem yöneticisi", "operator", ["configuration_only"], false, false, false]
].map(([id, unitId, unitName, unitType, bodyType, syntheticActorRef, roleKey,
  roleLabel, membershipRole, decisionScope, mayVote,
  mayMakeAcademicDecision, mayMakeFinancialDecision]) => Object.freeze({
  id,
  unitId,
  unitName,
  unitType,
  bodyType,
  syntheticActorRef,
  roleKey,
  roleLabel,
  membershipRole,
  mandateFrom: "2026-08-20",
  mandateTo: "2027-08-19",
  decisionScope: Object.freeze(decisionScope),
  mayVote,
  mayMakeAcademicDecision,
  mayMakeFinancialDecision,
  systemAdminRestriction: true,
  institutionalValidationRequired: true
}));

/**
 * Exact camelCase DTO contract of the security-invoker
 * `pilot_directive_role_scope_catalog` view. Both the UI and the local
 * fail-closed Supabase fallback consume these same immutable rows.
 */
export const directiveRoleScopeRows = Object.freeze(canonicalOrganizationScopeRows);

const organizationDecisionScopeNotes = Object.freeze({
  learner: "Yalnız kendi pilot simülasyon kaydını izler; akademik veya mali karar veremez.",
  instructor: "Kendi program taslağını hazırlar; nihai akademik karar veremez.",
  externalInstructor: "Kurum dışı pilot önerisi hazırlar; kurumsal karar veremez.",
  coordinator: "Ön inceleme ve gündem işlerini yürütür; nihai akademik veya mali karar veremez.",
  commission: "Yalnız geçerli toplantı ve çekilme kaydıyla gerekçeli insan akademik kararı verebilir.",
  studentAffairs: "Kayıt/transkript dry-run işlemi yürütür; üç tanıma kararını birleştiremez.",
  it: "Yalnız teknik dry-run işlemi yürütür; akademik veya mali karar veremez.",
  finance: "Mali insan kararı kapsamı pilottur; gerçek ödeme veya mali belge üretemez.",
  admin: "Yalnız teknik yapılandırma yapabilir; akademik, tanıma, mali veya personel kararı veremez."
});

export const organizationScopes = Object.freeze(Object.fromEntries(
  directiveRoleScopeRows.map((row) => [row.roleKey, Object.freeze({
    membership_id: row.id,
    unit_id: row.unitId,
    unit_name: row.unitName,
    unit_type: row.unitType,
    body_type: row.bodyType,
    synthetic_actor_ref: row.syntheticActorRef,
    role_key: row.roleKey,
    role_label: row.roleLabel,
    body_membership: Object.freeze([row.id]),
    membership_role: row.membershipRole,
    mandate_from: row.mandateFrom,
    mandate_to: row.mandateTo,
    mandate: `${row.mandateFrom} – ${row.mandateTo} tarihli SENTETİK görev dönemi`,
    decision_scope: row.decisionScope,
    decision_scope_note: organizationDecisionScopeNotes[row.roleKey],
    may_vote: row.mayVote,
    may_make_academic_decision: row.mayMakeAcademicDecision,
    may_make_financial_decision: row.mayMakeFinancialDecision,
    system_admin_restriction: row.systemAdminRestriction,
    institutional_validation_required: row.institutionalValidationRequired
  })])
));

export const policyVersionRegistry = Object.freeze([
  {
    id: "POL-DRAFT-2026-08",
    documentType: "institutional_evaluation_draft",
    title: "DPÜ Mikro Yeterlilik Programları Yönergesi — Kurumsal Değerlendirme Taslağı",
    version: "2026.08-pilot",
    status: "draft_validation_required",
    effectiveFrom: null,
    senateApproval: false,
    legalReview: false,
    sourceVersion: "versiyon3_07.08.26",
    productionEligible: false
  },
  {
    id: "POL-NAT-2025-02",
    documentType: "official_public_reference",
    title: "TYÇ Kapsamında Mikro Yeterliliklere İlişkin Usul ve Esaslar",
    version: "2025/02",
    status: "reference_only",
    effectiveFrom: "2025-05-26",
    senateApproval: null,
    legalReview: null,
    productionEligible: false
  }
]);

export const versionedPilotRules = Object.freeze([
  { id: "RULE-CAP-TOTAL-10", label: "Toplam program AKTS'sinin %10'u", source_clause: "Taslak m.7", effective_from: null, effective_to: null, program_type: "formal_elective", calculation_basis: "program_total_ects", numerator: 10, denominator: 100, rounding_rule: "UNRESOLVED", exception_rule: "UNRESOLVED", interpretation_note: "Payda, birikim ve mezuniyet aşaması kurumsal karara bağlıdır.", institutional_validation_required: true },
  { id: "RULE-REMOTE-50", label: "Uzaktan kaynaklı tanımada %50", source_clause: "Taslak m.7 ve m.11", effective_from: null, effective_to: null, program_type: "external_recognition", calculation_basis: "recognized_remote_ects_portfolio", numerator: 50, denominator: 100, rounding_rule: "UNRESOLVED", exception_rule: "UNRESOLVED", interpretation_note: "Tek programın sunum oranıyla karıştırılamaz.", institutional_validation_required: true },
  { id: "RULE-TERM-5", label: "Dönem başına 5 AKTS", source_clause: "Taslak m.7", effective_from: null, effective_to: null, program_type: "formal_elective", calculation_basis: "recognized_ects_per_term", numerator: 5, denominator: 1, rounding_rule: "UNRESOLVED", exception_rule: "UNRESOLVED", interpretation_note: "6 AKTS program ve kısmi tanıma senaryosu karara bağlanmamıştır.", institutional_validation_required: true },
  { id: "RULE-ACTIVITY-HALF", label: "Faaliyetlerde izinli yükün yarısı", source_clause: "Taslak m.7", effective_from: null, effective_to: null, program_type: "social_cultural_sport", calculation_basis: "permitted_activity_load", numerator: 1, denominator: 2, rounding_rule: "UNRESOLVED", exception_rule: "UNRESOLVED", interpretation_note: "İzinli yük, dönem ve program türü tanımlanmalıdır.", institutional_validation_required: true },
  { id: "RULE-SEMESTER-3-8", label: "3–8'inci dönem", source_clause: "Taslak m.7", effective_from: null, effective_to: null, program_type: "formal_elective", calculation_basis: "student_semester", numerator: 3, denominator: 8, rounding_rule: "NOT_APPLICABLE", exception_rule: "associate_and_graduate_UNRESOLVED", interpretation_note: "Önlisans ve lisansüstü uygulanabilirliği açık değildir.", institutional_validation_required: true },
  { id: "RULE-REVIEW-30", label: "30 günlük değerlendirme göstergesi", source_clause: "Taslak m.9", effective_from: null, effective_to: null, program_type: "all", calculation_basis: "review_elapsed_calendar_days", numerator: 30, denominator: 1, rounding_rule: "calendar_day", exception_rule: "pause_and_additional_evidence_UNRESOLVED", interpretation_note: "Başlangıç, durma, tebliğ ve eskalasyon anı doğrulanmalıdır.", institutional_validation_required: true }
]);

export const workloadComponents = Object.freeze([
  ["synchronous", "Senkron / yüz yüze öğretim"],
  ["asynchronous", "Asenkron öğrenme"],
  ["preparation", "Hazırlık ve okuma"],
  ["practice", "Uygulama / laboratuvar"],
  ["project", "Proje / ödev / portfolyo"],
  ["independent", "Bağımsız çalışma"],
  ["assessment", "Ölçme ve değerlendirme"],
  ["feedback", "Geri bildirim ve düzeltme"]
]);

export const ectsWorkloadBands = Object.freeze(Array.from({ length: 6 }, (_, index) => {
  const ects = index + 1;
  return { ects, minHours: 25 * ects, maxHours: 30 * ects };
}));

function finiteNumber(value) {
  if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function validateEctsWorkload({ ects, totalWorkload, components = null, requireComponents = false }) {
  const credit = finiteNumber(ects);
  const total = finiteNumber(totalWorkload);
  const errors = [];
  const warnings = [];
  if (!Number.isInteger(credit) || credit < 1 || credit > 6) errors.push("AKTS değeri 1–6 arasında tam sayı olmalıdır.");
  if (total === null || total < 0) errors.push("Toplam öğrenen iş yükü sıfır veya daha büyük sayısal bir değer olmalıdır.");
  const minimum = Number.isInteger(credit) ? credit * 25 : null;
  const maximum = Number.isInteger(credit) ? credit * 30 : null;
  if (minimum !== null && total !== null && (total < minimum || total > maximum)) errors.push(`Toplam iş yükü ${minimum}–${maximum} saat bandında olmalıdır.`);
  let componentTotal = null;
  if (components && typeof components === "object" && !Array.isArray(components)) {
    componentTotal = 0;
    for (const [key, label] of workloadComponents) {
      const value = finiteNumber(components[key]);
      if (value === null || value < 0) errors.push(`${label} alanı zorunludur ve sıfır veya daha büyük olmalıdır.`);
      else componentTotal += value;
    }
    componentTotal = Number(componentTotal.toFixed(2));
    if (total !== null && Math.abs(componentTotal - total) > 0.01) errors.push(`Bileşen toplamı (${componentTotal}) ile toplam iş yükü (${total}) eşleşmiyor.`);
  } else if (requireComponents) {
    errors.push("Sekiz öğrenen iş yükü bileşeni tamamlanmadan işlem sürdürülemez.");
  } else {
    warnings.push("İş yükü bileşenleri girilmedi; ayrıntılı tasarım kontrolü tamamlanmadı.");
  }
  if (total !== null && !Number.isInteger(total)) warnings.push("Kesirli saat için kullanılan yuvarlama kuralı gerekçelendirilmelidir.");
  return { valid: errors.length === 0, ects: credit, totalWorkload: total, minimum, maximum, componentTotal, errors, warnings, equation: minimum === null ? "—" : `${minimum} ≤ ${total} ≤ ${maximum}` };
}

export function evaluatePilotRule(ruleId, context = {}) {
  const rule = versionedPilotRules.find((item) => item.id === ruleId);
  if (!rule) throw new Error("Sürümlü pilot kuralı bulunamadı.");
  const warnings = [rule.interpretation_note];
  if (rule.institutional_validation_required) warnings.unshift("Kurumsal doğrulama olmadan nihai işlem yapılamaz.");
  if (ruleId === "RULE-TERM-5" && Number(context.requestedEcts) > 5) warnings.push("6 AKTS program dönemlik 5 AKTS göstergesiyle çakışıyor; kısmi tanıma veya istisna kararı gerekir.");
  if (ruleId === "RULE-SEMESTER-3-8" && ["associate", "graduate"].includes(context.programCycle)) warnings.push("Program döngüsü için 3–8'inci dönem hükmü tanımlı değildir.");
  if (ruleId === "RULE-REMOTE-50" && context.singleProgram === true) warnings.push("Tek program sunum oranı, tanınan uzaktan kredi portföyü payı değildir.");
  return { rule, outcome: "warning_only", completionBlocked: true, warnings, autonomousDecision: false };
}

export function generateMydCode(state, { actorRole, unitCode = "GEN", year = 2026, sequence = null, version = 1 } = {}) {
  if (actorRole !== "coordinator") throw new Error("MYD kod taslağını yalnız Koordinatörlük / SEM rolü üretebilir.");
  const normalizedUnit = String(unitCode).trim().toUpperCase();
  if (!/^[A-Z0-9]{2,12}$/.test(normalizedUnit)) throw new Error("Birim kodu 2–12 ASCII büyük harf/rakam olmalıdır.");
  if (!Number.isInteger(Number(year)) || Number(year) < 2020 || Number(year) > 2100) throw new Error("Kod yılı geçersiz.");
  const records = state?.codes || [];
  const next = sequence === null ? records.length + 1 : Number(sequence);
  const versionNo = Number(version);
  if (!Number.isInteger(next) || next < 1 || next > 999) throw new Error("MYD sıra numarası 1–999 arasında olmalıdır.");
  if (!Number.isInteger(versionNo) || versionNo < 1 || versionNo > 999) throw new Error("Program sürümü 1–999 arasında olmalıdır.");
  const code = `MYD-${year}-${normalizedUnit}-${String(next).padStart(3, "0")}`;
  if (records.some((item) => item.code === code)) return records.find((item) => item.code === code);
  const record = { id: `MYDREC-${year}-${normalizedUnit}-${String(next).padStart(3, "0")}`, code, versionNo, unitCode: normalizedUnit, status: "pilot_reserved", policyVersionId: "POL-DRAFT-2026-08", productionEligible: false, createdAt: new Date().toISOString() };
  records.push(record);
  return record;
}

export const recognitionDecisionKinds = Object.freeze(["credential", "ects", "course_substitution"]);

export function createRecognitionDecisionSet(applicationId) {
  if (!applicationId) throw new Error("Tanıma başvuru kimliği gereklidir.");
  return recognitionDecisionKinds.map((kind) => ({
    id: `REC-${applicationId}-${kind}`,
    applicationId,
    kind,
    status: "pending_human_review",
    rationale: "",
    decisionBody: null,
    ruleVersion: "POL-DRAFT-2026-08",
    appealRoute: "independent_appeal_body_required",
    decidedAt: null
  }));
}

export function recordRecognitionDecision(state, { applicationId, kind, status, rationale, actorRole, decisionBody = "MY-KOM" }) {
  if (actorRole !== "commission") throw new Error("Tanıma sonuçlarını yalnız Komisyon demo rolü ayrı ayrı karara bağlayabilir.");
  if (!recognitionDecisionKinds.includes(kind)) throw new Error("Tanıma karar türü geçersiz.");
  if (!["recognized", "partially_recognized", "rejected", "additional_evidence_required"].includes(status)) throw new Error("Tanıma karar durumu geçersiz.");
  if (state?.commission?.lastValidation?.valid !== true) throw new Error("Geçerli toplantı, nisap, çekilme ve oy kontrolü kaydı olmadan tanıma kararı oluşturulamaz.");
  if (["recognized", "partially_recognized"].includes(status) && versionedPilotRules.some((rule) => rule.institutional_validation_required)) {
    throw new Error("Kurumsal doğrulaması tamamlanmamış sürümlü kurallar olumlu nihai tanıma sonucunu bloke eder.");
  }
  if (String(rationale || "").trim().length < 12) throw new Error("Gerekçeli insan kararı en az 12 karakter olmalıdır.");
  const record = state.recognitionDecisions.find((item) => item.applicationId === applicationId && item.kind === kind);
  if (!record) throw new Error("Ayrı tanıma karar kaydı bulunamadı.");
  Object.assign(record, { status, rationale: String(rationale).trim(), decisionBody, decidedAt: new Date().toISOString(), autonomousDecision: false });
  return record;
}

export function submitIndependentAppeal(state, { applicationId, decisionKind, actorRole, reason, initialDecisionBody = "MY-KOM", appealBody = "EGITIM-OGRETIM-KOM" }) {
  if (actorRole !== "learner") throw new Error("İtirazı yalnız başvuru sahibi öğrenen demo rolü gönderebilir.");
  if (!recognitionDecisionKinds.includes(decisionKind)) throw new Error("İtiraz edilen karar türü geçersiz.");
  if (String(reason || "").trim().length < 12) throw new Error("İtiraz gerekçesi en az 12 karakter olmalıdır.");
  if (!appealBody || appealBody === initialDecisionBody) throw new Error("İlk karar ve itiraz incelemesi farklı mercilerde yürütülmelidir.");
  const appeal = { id: `APL-${applicationId}-${decisionKind}-${state.appeals.length + 1}`, applicationId, decisionKind, status: "submitted", reason: String(reason).trim(), initialDecisionBody, appealBody, submittedAt: new Date().toISOString(), productionEligible: false };
  state.appeals.push(appeal);
  return appeal;
}

export function splitCredentialOutcomes({ applicationId, badgeStatus = "earned", creditStatus = "not_decided", substitutionStatus = "not_decided" }) {
  if (!applicationId) throw new Error("Başvuru kimliği gereklidir.");
  return {
    applicationId,
    credential: { status: badgeStatus, decisionType: "credential_award" },
    ects: { status: creditStatus, decisionType: "ects_recognition" },
    courseSubstitution: { status: substitutionStatus, decisionType: "course_substitution" },
    independentStates: true
  };
}

export const euMicroCredentialMandatoryFields = Object.freeze([
  "learner_identification", "title", "issuer_country_region", "awarding_body", "issue_date",
  "learning_outcomes", "notional_workload", "level", "participation_form", "assessment_type", "quality_assurance"
]);

export const PUBLIC_MASKED_LEARNER_LABEL = "Maskeli pilot katılımcı";

export function validateEk1Credential(record, { publicView = false } = {}) {
  const missing = euMicroCredentialMandatoryFields.filter((field) => {
    const value = record?.[field];
    return value === null || value === undefined || String(Array.isArray(value) ? value.join("") : value).trim() === "";
  });
  const serialized = JSON.stringify(record || {});
  const personalNumberLeak = /(?:^|\D)\d{11}(?:\D|$)/.test(serialized);
  const forbiddenKeys = publicView ? ["tckn", "ykn", "personal_id", "internal_learner_id"] : [];
  const forbiddenKeyLeak = forbiddenKeys.some((key) => Object.hasOwn(record || {}, key));
  const publicIdentityLeak = publicView && record?.learner_identification !== PUBLIC_MASKED_LEARNER_LABEL;
  return {
    valid: missing.length === 0 && !personalNumberLeak && !forbiddenKeyLeak && !publicIdentityLeak,
    missing,
    personalNumberLeak,
    forbiddenKeyLeak,
    publicIdentityLeak,
    publicView,
    publicFields: publicView ? ["document_id", "title", "awarding_body", "issue_date", "learning_outcomes", "notional_workload", "level", "status", "revocation_status"] : []
  };
}

export function createPublicCredentialView(record) {
  const documentId = String(record?.document_id || "");
  if (!/^[A-Z][A-Z0-9-]{7,40}$/.test(documentId)) throw new Error("Kamu doğrulaması için rastgele/maskeli belge kimliği gerekir.");
  const view = {
    document_id: documentId,
    learner_identification: PUBLIC_MASKED_LEARNER_LABEL,
    title: record.title,
    issuer_country_region: record.issuer_country_region,
    awarding_body: record.awarding_body,
    issue_date: record.issue_date,
    learning_outcomes: record.learning_outcomes,
    notional_workload: record.notional_workload,
    level: record.level,
    participation_form: record.participation_form,
    assessment_type: record.assessment_type,
    quality_assurance: record.quality_assurance,
    status: record.status || "pilot_valid",
    revocation_status: record.revocation_status || "not_revoked"
  };
  const validation = validateEk1Credential(view, { publicView: true });
  if (!validation.valid) throw new Error("Kamu doğrulama görünümü EK-1/gizlilik kontrolünü geçmedi.");
  return view;
}

export function validateCommissionMeeting({ actorRole, members, quorumRequired, votes = [] }) {
  if (actorRole === "admin") throw new Error("Sistem yöneticisi akademik toplantı veya karar kaydedemez.");
  if (actorRole !== "commission") throw new Error("Komisyon toplantı kaydını yalnız Komisyon demo rolü oluşturabilir.");
  if (!Array.isArray(members) || !members.length) throw new Error("Komisyon üye listesi gereklidir.");
  if (!Number.isInteger(Number(quorumRequired)) || Number(quorumRequired) < 1) throw new Error("Nisap pozitif tam sayı olmalıdır.");
  if (!Array.isArray(votes)) throw new Error("Komisyon oy listesi dizi olmalıdır.");
  const memberById = new Map(members.map((member) => [member.id, member]));
  const eligible = members.filter((member) => member.present === true && member.recused !== true && member.activeMandate === true);
  const eligibleIds = new Set(eligible.map((member) => member.id));
  const unknownVotes = votes.filter((vote) => !vote || !memberById.has(vote.memberId));
  const ineligibleVotes = votes.filter((vote) => vote && memberById.has(vote.memberId) && !eligibleIds.has(vote.memberId));
  const invalidVotes = votes.filter((vote) => !vote || !["approve", "reject", "abstain"].includes(vote.vote));
  const conflictViolations = ineligibleVotes.filter((vote) => memberById.get(vote.memberId)?.recused === true);
  const duplicateVotes = votes.length !== new Set(votes.map((vote) => vote?.memberId)).size;
  const quorumMet = eligible.length >= Number(quorumRequired);
  const validEligibleVoteCount = new Set(votes.filter((vote) => vote && eligibleIds.has(vote.memberId) && ["approve", "reject", "abstain"].includes(vote.vote)).map((vote) => vote.memberId)).size;
  const voteQuorumMet = validEligibleVoteCount >= Number(quorumRequired);
  return {
    valid: quorumMet && voteQuorumMet && unknownVotes.length === 0 && ineligibleVotes.length === 0 && invalidVotes.length === 0 && !duplicateVotes,
    quorumMet,
    voteQuorumMet,
    eligibleCount: eligible.length,
    validEligibleVoteCount,
    unknownVotes,
    ineligibleVotes,
    invalidVotes,
    conflictViolations,
    duplicateVotes,
    autonomousDecision: false
  };
}

export function requestOfferingSeat(state, { offeringId, learnerId, actorRole, requestedAt, idempotencyKey }) {
  if (actorRole !== "learner") throw new Error("Kontenjan talebini yalnız öğrenen demo rolü oluşturabilir.");
  if (!/^[A-Za-z][A-Za-z0-9._:-]{0,127}$/.test(String(learnerId || ""))) throw new Error("Kontenjan talebi için güvenli sentetik öğrenen kimliği zorunludur.");
  if (!String(idempotencyKey || "").trim()) throw new Error("Kontenjan talebi için idempotency anahtarı zorunludur.");
  const offering = state.offerings.find((item) => item.id === offeringId);
  if (!offering) throw new Error("Pilot dönem/program sunumu bulunamadı.");
  if (!Number.isInteger(offering.capacity) || offering.capacity < 0) throw new Error("Pilot kontenjanı sıfır veya daha büyük tam sayı olmalıdır.");
  const effectiveRequestedAt = requestedAt || new Date().toISOString();
  if (!Number.isFinite(Date.parse(effectiveRequestedAt))) throw new Error("Kontenjan talep zamanı geçersiz.");
  const existing = offering.requests.find((item) => item.idempotencyKey === idempotencyKey || item.learnerId === learnerId);
  if (existing) return existing;
  const request = { id: `SEAT-${offeringId}-${offering.requests.length + 1}`, learnerId, requestedAt: effectiveRequestedAt, idempotencyKey: String(idempotencyKey), status: "pending" };
  offering.requests.push(request);
  offering.requests.sort((left, right) => Date.parse(left.requestedAt) - Date.parse(right.requestedAt) || left.id.localeCompare(right.id));
  offering.requests.forEach((item, index) => { item.status = index < offering.capacity ? "enrolled" : "waitlisted"; item.waitlistPosition = index < offering.capacity ? null : index - offering.capacity + 1; });
  return offering.requests.find((item) => item.id === request.id);
}

export function createFinancePersonnelDryRun(state, { actorRole, kind = "entitlement", amount = 0 }) {
  if (actorRole !== "finance") throw new Error("Mali/Personel dry-run kaydını yalnız Finans / Döner Sermaye rolü oluşturabilir.");
  if (!Number.isFinite(Number(amount)) || Number(amount) < 0) throw new Error("Dry-run tutarı geçersiz.");
  const record = {
    id: `FPR-${state.financePersonnelDryRuns.length + 1}`,
    kind,
    amount: Number(amount),
    status: "approval_required",
    realPayment: false,
    realDocument: false,
    externalRequestSent: false,
    personnelApprovalRequired: true,
    financialApprovalRequired: true,
    createdAt: new Date().toISOString()
  };
  state.financePersonnelDryRuns.push(record);
  return record;
}

export const directivePilotInitialState = Object.freeze({
  policyVersionId: "POL-DRAFT-2026-08",
  codes: [],
  recognitionDecisions: createRecognitionDecisionSet("APP-042"),
  appeals: [],
  credentialOutcome: splitCredentialOutcomes({ applicationId: "APP-042", badgeStatus: "earned", creditStatus: "not_decided", substitutionStatus: "not_decided" }),
  commission: {
    bodyId: "MY-KOM",
    mandate: "SENTETIK-2026",
    quorumRequired: 2,
    lastValidation: null,
    members: [
      { id: "MEM-1", name: "Prof. Dr. Deniz Aydın", unit_id: "SENTETIK-KOM", unit_type: "academic_unit", body_membership: "MY-KOM", mandate: "SENTETIK-2026", decision_scope: "academic", activeMandate: true, present: true, recused: false },
      { id: "MEM-2", name: "Doç. Dr. Emre Işık", unit_id: "SENTETIK-EGT", unit_type: "academic_unit", body_membership: "MY-KOM", mandate: "SENTETIK-2026", decision_scope: "academic", activeMandate: true, present: true, recused: false },
      { id: "MEM-3", name: "Dr. Öğr. Üyesi Ece Arı", unit_id: "SENTETIK-MUH", unit_type: "academic_unit", body_membership: "MY-KOM", mandate: "SENTETIK-2026", decision_scope: "academic", activeMandate: true, present: false, recused: true }
    ]
  },
  offerings: [{ id: "OFF-2026-GUZ-001", term: "2026 Güz • SİMÜLASYON", capacity: 2, requests: [
    { id: "SEAT-SEED-1", learnerId: "SENTETIK-L-001", requestedAt: "2026-08-20T08:00:00Z", idempotencyKey: "seed-1", status: "enrolled", waitlistPosition: null }
  ] }],
  financePersonnelDryRuns: []
});

export function cloneDirectivePilotState() {
  return structuredClone(directivePilotInitialState);
}
