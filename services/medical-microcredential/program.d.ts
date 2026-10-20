import type { ClinicalSession } from "../medical-simulation-v2/engine.js";

export const MICRO_CREDENTIAL_VERSION: string;
export const MICRO_CREDENTIAL_STORAGE_KEY: string;
export const MICRO_CREDENTIAL_PROGRAM: {
  id: string; title: string; shortTitle: string; country: string; issuer: string; awardingBodyStatus: string;
  credentialStatus: string; targetGroup: string; participationForm: string; notionalWorkloadHours: number;
  proposedCredit: number; creditStatus: string; tycLevel: null; eqfLevel: null; levelStatus: string;
  assessmentType: string; assessmentSupervision: string; qualityAssurance: string; stackability: string;
  prerequisites: string; learningOutcomes: string[];
};
export const MICRO_CREDENTIAL_SOURCES: Array<{ id: string; label: string; publisher: string; url: string; status: string }>;
export const STANDARD_ELEMENTS: string[];
export function evaluatePractice(session: ClinicalSession): { passed: boolean; gates: Array<{ id: string; label: string; passed: boolean }> };
export function evaluateAssessment(session: ClinicalSession, context?: { learnerName?: string; orientationAccepted?: boolean; practiceCompleted?: boolean }): {
  debrief: ReturnType<typeof import("../medical-simulation-v2/engine.js").buildDebrief>;
  achievementGates: Array<{ id: string; label: string; passed: boolean }>;
  issuanceGates: Array<{ id: string; label: string; passed: boolean; status: string }>;
  learningAchievementMet: boolean;
  officialIssuanceReady: boolean;
};
export function buildEvidencePackage(args: { learnerName: string; assessmentSession: ClinicalSession; orientationAccepted: boolean; practiceCompleted: boolean; generatedAt?: string }): Record<string, unknown>;
