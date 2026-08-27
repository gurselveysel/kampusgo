export type CurriculumPeriodId = "d1" | "d2" | "d3" | "d4" | "d5" | "d6";
export type InstitutionModelId = "national-core" | "integrated" | "systems" | "hybrid" | "discipline";

export const CURRICULUM_REGISTRY_VERSION: string;
export const OFFICIAL_SOURCE_REGISTRY: Array<{ id: string; title: string; publisher: string; version: string; url: string; scope: string; location: string; verificationStatus: string; accessedAt: string; expertApprovalStatus: string }>;
export const CURRICULUM_PERIODS: Array<{ id: CurriculumPeriodId; label: string; stage: string; modules: string[]; simulationRole: string }>;
export const INSTITUTION_MODELS: Array<{ id: InstitutionModelId; label: string; description: string }>;
export const SCENARIO_CURRICULUM_ALIGNMENT: Record<string, { recommendedPeriods: CurriculumPeriodId[]; modules: string[]; ucepScope: string; practiceLevelStatus: string; qualificationDimensions: string[]; assessmentMethods: string[]; approvalStatus: string }>;
export function getCurriculumPeriod(id?: string): (typeof CURRICULUM_PERIODS)[number];
export function getInstitutionModel(id?: string): (typeof INSTITUTION_MODELS)[number];
export function getScenarioAlignment(encounterId?: string): (typeof SCENARIO_CURRICULUM_ALIGNMENT)[string];
