export type SimulationMode = "training" | "assessment" | "osce";
export type ClinicalPhase = "assessment" | "stemi" | "treatment" | "vf" | "rosc" | "handoff";
export type ToolName = "interview" | "exam" | "test" | "medication" | "intervention" | "team";

export type ClinicalEvent =
  | { type: "ASK_PATIENT"; question?: string; topic?: string }
  | { type: "PERFORM_EXAM"; actionId: string }
  | { type: "ORDER_TEST"; actionId: string }
  | { type: "ADMINISTER_MEDICATION"; actionId: string }
  | { type: "PERFORM_INTERVENTION"; actionId: string }
  | { type: "TEAM_ACTION"; actionId: string }
  | { type: "ADVANCE_TIME"; seconds: number };

export type VitalStateV2 = {
  heartRate: number;
  systolic: number;
  diastolic: number;
  spo2: number;
  respiratoryRate: number;
  temperature: number;
  etco2: number | null;
  rhythm: "sinus" | "stemi" | "vf" | "post-ischemic";
};

export type ClinicalState = {
  version: string;
  scenarioId: string;
  seed: number;
  mode: SimulationMode;
  status: "active" | "critical" | "completed";
  phase: ClinicalPhase;
  elapsedSeconds: number;
  financialCost: number;
  patient: { id: string; synthetic: boolean; age: number; sex: string; chiefComplaint: string };
  physiology: {
    coronaryOcclusion: number;
    ischemiaBurden: number;
    electricalInstability: number;
    perfusion: number;
    oxygenReserve: number;
    catecholamine: number;
    vasodilationInjury: number;
    reperfused: boolean;
    arrestSeconds: number;
    cprQuality: number;
    shockCount: number;
  };
  vitals: VitalStateV2;
  knowledge: string[];
  interview: Array<{ topic: string; question: string; response: string; repeated: boolean }>;
  examinations: string[];
  orders: Array<{ id: string; label: string; orderedAtSeconds: number; readyAtSeconds: number; cost: number; status: "pending" | "ready"; result: string | null }>;
  medications: Array<{ id: string; atSeconds: number }>;
  interventions: string[];
  teamActions: string[];
  safetyEvents: Array<{ severity: "minor" | "major" | "critical"; code: string; message: string }>;
  score: Record<"informationGathering" | "clinicalReasoning" | "treatment" | "patientSafety" | "teamwork" | "timeManagement", number>;
  flags: Record<string, boolean | number | null>;
  lastMessage: string;
  lastMechanism: string;
};

export type AuditRecord = {
  id: string;
  index: number;
  engineVersion: string;
  scenarioId: string;
  event: ClinicalEvent;
  accepted: boolean;
  simulationSecond: number;
  previousHash: string;
  nextHash: string;
  tool: string;
  expectedEffect: string;
  actualEffect: string;
  rubricEffect: Record<string, number>;
  safetyAlert: string | null;
  evidenceId: string | null;
  publicFeedback: string;
  mechanism: string;
};

export type ClinicalSession = { initial: ClinicalState; state: ClinicalState; records: AuditRecord[] };
export type ToolCatalogItem = { id: string; label: string; minutes: number; readyMinutes?: number; cost?: number; evidenceId: string };
export const ENGINE_VERSION: string;
export const SCENARIO_ID: string;
export const SIMULATION_MODES: SimulationMode[];
export const TOOL_CATALOG: Record<ToolName, ToolCatalogItem[]>;
export const UCEP_EVIDENCE: Array<{ id: string; task: string; clinicalCondition: string; practice: string; practiceLevel: number | null; learningLevel?: string; source: string; sourcePage: number; status: "DOĞRULANMADI" }>;
export const TYC_EVIDENCE: { knowledge: string; skill: string; competence: string; proposedLevel: null; officialPlacementStatus: "DOĞRULANMADI"; note: string };
export function hashState(state: ClinicalState): string;
export function createInitialState(options?: { seed?: number; mode?: SimulationMode }): ClinicalState;
export function createSession(options?: { seed?: number; mode?: SimulationMode }): ClinicalSession;
export function getActionAvailability(state: ClinicalState, tool: ToolName, actionId: string): { available: boolean; reason: string };
export function reduceSession(session: ClinicalSession, event: ClinicalEvent): ClinicalSession;
export function replaySession(initial: ClinicalState, records: AuditRecord[]): { session: ClinicalSession; matches: boolean; finalHash: string };
export function buildDebrief(session: ClinicalSession): {
  completed: boolean;
  competencyMet: boolean;
  checklist: Array<{ label: string; passed: boolean }>;
  dimensions: ClinicalState["score"];
  criticalSafety: ClinicalState["safetyEvents"];
  criticalDelays: string[];
  unnecessaryActions: string[];
  finalHash: string;
  replayableEvents: number;
  note: string;
};
