export type SourceUsageRole = "direct-dependency" | "isolated-adapter" | "benchmark" | "architecture-reference" | "license-blocked-reference" | "historical-reference";
export type BaseSourceRecord = {
  order: number;
  repository: string;
  url: string;
  branch: string;
  commit: string;
  license: string;
  licenseClass: string;
  capability: string;
  adoption: string;
  use: string;
  note: string;
};
export type SourceUsageRecord = BaseSourceRecord & {
  usageRole: SourceUsageRole;
  technology: string;
  codeImported: false;
  assetLicense: string;
  licenseEvidenceFile: string;
  securityRisk: string;
  maintenanceRisk: string;
  integrationStatus: string;
  testEvidence: string;
};
export const SOURCE_USAGE_ROLES: SourceUsageRole[];
export function usageRoleFor(source: BaseSourceRecord): SourceUsageRole;
export function buildSourceUsageRecord(source: BaseSourceRecord): SourceUsageRecord;
