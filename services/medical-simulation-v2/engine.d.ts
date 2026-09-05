export type SimulationMode = "training" | "assessment" | "osce";
export type DifficultyId = "guided" | "standard" | "advanced";
export type ToolName = "interview" | "exam" | "test" | "medication" | "intervention" | "team" | "reasoning";

export type ClinicalEvent =
  | { type: "ASK_PATIENT"; question?: string; topic?: string }
  | { type: "PERFORM_EXAM"; actionId: string }
  | { type: "ORDER_TEST"; actionId: string }
  | { type: "ADMINISTER_MEDICATION"; actionId: string }
  | { type: "PERFORM_INTERVENTION"; actionId: string }
  | { type: "TEAM_ACTION"; actionId: string }
  | { type: "DOCUMENT_REASONING"; problemRepresentation: string; differentials: string[]; workingDiagnosis: string; reassessmentPlan: string }
  | { type: "ADVANCE_TIME"; seconds: number }
  | { type: "REQUEST_VISUALIZATION"; recordId: string }
  | { type: "VISUALIZATION_RESULT"; visualizationId: string; status: "ready" | "blocked" | "failed"; videoUrl?: string | null; reason?: string | null };

export interface ToolAction {
  id: string;
  label: string;
  timeCostSeconds: number;
  evidenceId: string;
  region?: string;
  technique?: string;
  resultDelaySeconds?: number;
  cost?: number;
  protocolDose?: string;
  route?: string;
}

export interface VitalState {
  heartRate: number;
  systolic: number;
  diastolic: number;
  spo2: number;
  respiratoryRate: number;
  temperature: number;
  etco2: number | null;
  rhythm: "sinus" | "stemi" | "vf" | "rosc";
}

export interface ClinicalState {
  version: string;
  scenarioId: string;
  scenarioVersion: string;
  encounterId: string;
  encounterTitle: string;
  environment: string;
  difficulty: DifficultyId;
  objectives: string[];
  seed: number;
  mode: SimulationMode;
  status: "active" | "critical" | "completed";
  phase: "assessment" | "stemi" | "treatment" | "vf" | "rosc" | "handoff";
  teamState: string;
  elapsedSeconds: number;
  financialCost: number;
  stateHash: string;
  patient: { id: string; synthetic: boolean; age: number; sex: string; chiefComplaint: string };
  vitals: VitalState;
  physiology: {
    validationStatus: string;
    rhythm: string;
    latent: Record<string, number | boolean | string>;
    treatment: Record<string, boolean>;
    vitals: VitalState;
  };
  knowledge: string[];
  interview: Array<{ question: string; response: string; intents: string[]; confidence: number; repeated: boolean }>;
  examinations: Array<{ id: string; region: string; technique: string; finding: string; repeated: boolean }>;
  orders: Array<{ id: string; label: string; orderedAtSeconds: number; readyAtSeconds: number; cost: number; status: "pending" | "ready"; result: string | null }>;
  medications: Array<{ id: string; atSeconds: number; protocolDose: string; route: string; contraindicated: boolean }>;
  interventions: string[];
  teamActions: string[];
  reasoning: Array<{
    id: string;
    atSeconds: number;
    problemRepresentation: string;
    differentials: string[];
    workingDiagnosis: string;
    reassessmentPlan: string;
    evidenceAvailable: number;
    expectedDiagnosisIncluded: boolean;
    workingDiagnosisAligned: boolean;
  }>;
  safetyEvents: Array<{ severity: string; code: string; message: string }>;
  visualizations: Array<{ id: string; recordId: string; status: string; videoUrl: string | null; reason: string | null }>;
  score: Record<string, number>;
  osce: { stationDurationSeconds: number; remainingSeconds: number; checklistVisible: boolean };
  flags: Record<string, boolean>;
  lastMessage: string;
  lastMechanism: string;
  validation: Record<string, string>;
}

export interface AuditRecord {
  id: string;
  index: number;
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
  mechanism: string;
  mechanismVisible: boolean;
  publicFeedback: string;
  patientStateBefore: Record<string, unknown>;
  patientStateAfter: Record<string, unknown>;
}

export interface ClinicalSession {
  initial: ClinicalState;
  state: ClinicalState;
  records: AuditRecord[];
  stateHash: string;
}

export const ENGINE_VERSION: string;
export const SCENARIO_ID: string;
export const SCENARIO_VERSION: string;
export const SIMULATION_MODES: SimulationMode[];
export const DIFFERENTIAL_OPTIONS: Array<{ id: string; label: string }>;
export const ENCOUNTER_CATALOG: Array<{
  id: string;
  title: string;
  briefing: string;
  environment: string;
  tags: string[];
  patient: ClinicalState["patient"];
  runtimeStatus: "RUNTIME_READY";
  expertApprovalStatus: "DOĞRULANMADI";
}>;
export const DIFFICULTY_PROFILES: Record<DifficultyId, { id: DifficultyId; label: string; description: string; progressionRate: number; deteriorationAtSeconds: number; osceSeconds: number }>;
export const TOOL_CATALOG: Record<ToolName, ToolAction[]>;
export const UCEP_EVIDENCE: Record<string, {
  task: string;
  practiceLevel: number | null;
  source: string;
  status: string;
  ucepVersion: string;
  symptomOrCondition: string;
  basicMedicalPractice: string;
  learningOutcome: string;
  assessmentMethod: string;
  observableEvidence: string;
  expertApprovalStatus: string;
  expertApprovalDate: string | null;
}>;
export const TYC_EVIDENCE: { knowledge: string; skill: string; competence: string; proposedLevel: null; officialPlacementStatus: string };

export function parsePatientQuestion(question: string, phase?: string): { intents: string[]; responseKind: string; confidence: number };
export function createInitialState(options?: { mode?: SimulationMode; seed?: number; encounterId?: string; difficulty?: DifficultyId }): ClinicalState;
export function createSession(options?: { mode?: SimulationMode; seed?: number; encounterId?: string; difficulty?: DifficultyId }): ClinicalSession;
export function dispatchEvent(session: ClinicalSession, event: ClinicalEvent): ClinicalSession;
export function getActionAvailability(state: ClinicalState, tool: ToolName, actionId: string): { available: boolean; reason: string };
export function getAvailableActions(state: ClinicalState, tool: ToolName): Array<ToolAction & { available: boolean; reason: string }>;
export function replaySession(initial: ClinicalState, records: AuditRecord[]): { session: ClinicalSession; matches: boolean; finalHash: string };
export function restoreSession(serialized: string | ClinicalSession): ClinicalSession;
export function buildDebrief(session: ClinicalSession): {
  completed: boolean;
  competencyMet: boolean;
  checklist: Array<{ label: string; passed: boolean }>;
  dimensions: Record<string, number>;
  criticalSafety: Array<{ severity: string; code: string; message: string }>;
  criticalDelays: string[];
  unnecessaryActions: string[];
  reasoningTrajectory: ClinicalState["reasoning"];
  vitalTrend: Array<{ eventId: string; second: number; heartRate: number; systolic: number; spo2: number; rhythm: string }>;
  finalHash: string;
  replayableEvents: number;
  note: string;
};
export function buildVisualizationRequest(record: AuditRecord, state: ClinicalState): Record<string, unknown>;
