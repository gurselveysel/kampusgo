import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  MICRO_CREDENTIAL_PROGRAM,
  MICRO_CREDENTIAL_SOURCES,
  MICRO_CREDENTIAL_STORAGE_KEY,
  STANDARD_ELEMENTS,
  buildEvidencePackage,
  evaluateAssessment,
  evaluatePractice,
} from "../services/medical-microcredential/program.js";
import { createSession, dispatchEvent } from "../services/medical-simulation-v2/engine.js";

const appSource = await readFile(new URL("../app/medikal-simulasyon/mikroyeterlilik/MicroCredentialSimulation.tsx", import.meta.url), "utf8");
const pageSource = await readFile(new URL("../app/medikal-simulasyon/mikroyeterlilik/page.tsx", import.meta.url), "utf8");

assert.equal(STANDARD_ELEMENTS.length, 11, "Avrupa mikro-yeterlilik standardının 11 zorunlu alanı korunmalı");
assert.equal(MICRO_CREDENTIAL_PROGRAM.notionalWorkloadHours, 25, "İş yükü açıkça belirtilmeli");
assert.equal(MICRO_CREDENTIAL_PROGRAM.proposedCredit, 1, "Kredi önerisi program kaydında bulunmalı");
assert.equal(MICRO_CREDENTIAL_PROGRAM.levelStatus, "DOĞRULANMADI", "TYÇ/AYÇ seviyesi kurum kararı olmadan doğrulanmış gösterilmemeli");
assert.equal(MICRO_CREDENTIAL_PROGRAM.awardingBodyStatus, "DOĞRULANMADI", "Belge düzenleyen kuruluş doğrulanmış gösterilmemeli");
assert.match(MICRO_CREDENTIAL_STORAGE_KEY, /microcredential/, "Yeni sürüm ayrı bir saklama alanı kullanmalı");
assert.notEqual(MICRO_CREDENTIAL_STORAGE_KEY, "teys-stemi-bedside-v5-session", "V2 oturumu üzerine yazılmamalı");
assert.ok(MICRO_CREDENTIAL_SOURCES.some((source) => source.url.includes("tyc.gov.tr") && source.id.includes("microcredential")), "Resmî TYÇ mikro-yeterlilik kaynağı bulunmalı");
assert.ok(MICRO_CREDENTIAL_SOURCES.some((source) => source.url.includes("eur-lex.europa.eu")), "Avrupa Birliği mikro-yeterlilik kaynağı bulunmalı");
assert.ok(MICRO_CREDENTIAL_SOURCES.some((source) => source.url.includes("yok.gov.tr") && source.id.includes("ucep")), "Resmî UÇEP kaynağı bulunmalı");
assert.match(pageSource, /robots:\s*\{\s*index:\s*false/, "Pilot rota arama motorlarına kapalı kalmalı");
assert.match(appSource, /Resmî belge düzenlemez/, "Öğrenen arayüzünde resmî belge sınırı açık olmalı");
assert.match(appSource, /Kanıt paketini indir/, "Taşınabilir kanıt indirme eylemi sunulmalı");

let practice = createSession({ mode: "training", seed: 27082026, encounterId: "enc_classic_stemi", difficulty: "guided" });
for (const event of [
  { type: "ASK_PATIENT", topic: "onset" },
  { type: "ASK_PATIENT", topic: "associated" },
  { type: "PERFORM_EXAM", actionId: "cardiac-auscultation" },
  { type: "PERFORM_EXAM", actionId: "lung-auscultation" },
  { type: "ORDER_TEST", actionId: "ecg" },
  { type: "PERFORM_INTERVENTION", actionId: "monitor_iv" },
  { type: "DOCUMENT_REASONING", problemRepresentation: "Baskı tarzı göğüs ağrısı ve otonom bulgular.", differentials: ["stemi", "aortic_dissection"], workingDiagnosis: "stemi", reassessmentPlan: "EKG ve perfüzyonu yeniden değerlendir." },
]) practice = dispatchEvent(practice, event);
assert.equal(evaluatePractice(practice).passed, true, "Rehberli öğrenme kapıları gerçek klinik olaylarla açılmalı");

let assessment = createSession({ mode: "assessment", seed: 28082026, encounterId: "enc_classic_stemi", difficulty: "standard" });
for (const event of [
  { type: "ASK_PATIENT", topic: "onset" },
  { type: "ASK_PATIENT", topic: "associated" },
  { type: "ASK_PATIENT", topic: "medications" },
  { type: "DOCUMENT_REASONING", problemRepresentation: "Baskı tarzı göğüs ağrısı ve otonom bulguları olan yüksek riskli hasta.", differentials: ["stemi", "aortic_dissection", "pulmonary_embolism"], workingDiagnosis: "stemi", reassessmentPlan: "EKG, ritim ve perfüzyonu yeniden değerlendir." },
  { type: "PERFORM_EXAM", actionId: "cardiac-auscultation" },
  { type: "PERFORM_EXAM", actionId: "lung-auscultation" },
  { type: "ORDER_TEST", actionId: "ecg" },
  { type: "ADVANCE_TIME", seconds: 180 },
  { type: "ADMINISTER_MEDICATION", actionId: "aspirin" },
  { type: "TEAM_ACTION", actionId: "assign_roles" },
  { type: "TEAM_ACTION", actionId: "closed_loop" },
  { type: "PERFORM_INTERVENTION", actionId: "monitor_iv" },
  { type: "PERFORM_INTERVENTION", actionId: "activate_cath" },
  { type: "ADVANCE_TIME", seconds: 300 },
  { type: "PERFORM_INTERVENTION", actionId: "call_code" },
  { type: "PERFORM_INTERVENTION", actionId: "start_cpr" },
  { type: "PERFORM_INTERVENTION", actionId: "defibrillate" },
  { type: "PERFORM_INTERVENTION", actionId: "resume_cpr" },
  { type: "PERFORM_INTERVENTION", actionId: "post_rosc" },
  { type: "PERFORM_INTERVENTION", actionId: "handoff_sbar" },
]) assessment = dispatchEvent(assessment, event);

const result = evaluateAssessment(assessment, { learnerName: "Pilot Öğrenen", orientationAccepted: true, practiceCompleted: true });
assert.equal(result.learningAchievementMet, true, "Tam ve güvenli performans öğrenme başarısını üretmeli");
assert.equal(result.officialIssuanceReady, false, "Pilot arayüz resmî belge düzenleme yetkisi üretmemeli");
assert.ok(result.issuanceGates.every((gate) => gate.passed === false && gate.status === "DOĞRULANMADI"), "Haricî kurum kapıları kapalı ve açık durumlu kalmalı");

const evidence = buildEvidencePackage({ learnerName: "Pilot Öğrenen", assessmentSession: assessment, orientationAccepted: true, practiceCompleted: true, generatedAt: "2026-08-28T00:00:00.000Z" });
assert.equal(evidence.status, "ÖĞRENME BAŞARISI KANITLANDI — RESMÎ BELGE DEĞİL");
assert.equal(evidence.officialIssuanceReady, false);
assert.equal(evidence.learner.identityVerification, "DOĞRULANMADI");
assert.equal(evidence.microCredential.issuingDate, null);
assert.equal(evidence.assessment.finalStateIntegrityRecord, assessment.stateHash);
assert.equal(evidence.assessment.replayableEventCount, assessment.records.length);

console.log(`Medical micro-credential contract passed: ${assessment.records.length} events, ${assessment.stateHash}`);
