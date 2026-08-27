export type DifficultyId = "guided" | "standard" | "advanced";

export interface DifficultyProfile {
  id: DifficultyId;
  label: string;
  description: string;
  progressionRate: number;
  deteriorationAtSeconds: number;
  osceSeconds: number;
}

export interface EncounterDefinition {
  id: string;
  title: string;
  briefing: string;
  environment: string;
  tags: string[];
  patient: { id: string; synthetic: true; age: number; sex: string; chiefComplaint: string };
  safety: { pde5Exposure: boolean };
  physiology: Record<string, number>;
  interviewFacts: Record<string, string>;
  examFindings: Record<string, string>;
  testResults: Record<string, string>;
  expectedDiagnosis: string;
  objectives: string[];
  runtimeStatus: "RUNTIME_READY";
  expertApprovalStatus: "DOĞRULANMADI";
}

export const SCENARIO_ID: string;
export const SCENARIO_VERSION: string;
export const DIFFICULTY_PROFILES: Record<DifficultyId, DifficultyProfile>;
export const ENCOUNTER_CATALOG: EncounterDefinition[];
export function getEncounter(id?: string): EncounterDefinition;
export function getDifficulty(id?: string): DifficultyProfile;
export function validateScenarioCatalog(): { valid: boolean; errors: string[]; encounters: number; difficulties: number };
