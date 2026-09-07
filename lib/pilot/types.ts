export type PilotRole = {
  key: string;
  name: string;
};

export type PilotMembership = {
  organizationId: string;
  databaseSlug: string;
  routeSlug: "dpu" | "gazi";
  organizationName: string;
  shortName: string;
  logoPath: string;
  unitName: string | null;
  memberKind: string;
  decisionScope: Record<string, boolean>;
  roles: PilotRole[];
};

export type PilotContext = {
  authenticated: boolean;
  userId: string;
  profileActive: boolean;
  displayName: string;
  accessState: "active" | "inactive" | "unassigned";
  memberships: PilotMembership[];
};

export type WorkspaceRecord = Record<string, unknown>;

export type PilotWorkspace = {
  workspace: {
    organization_id: string;
    route_slug: "dpu" | "gazi";
    display_name: string;
    short_name: string;
    workspace_version: string;
    logo_path: string;
    theme: Record<string, string>;
    enabled_modules: string[];
  };
  rules: WorkspaceRecord[];
  catalog: WorkspaceRecord[];
  cases: WorkspaceRecord[];
  actions: WorkspaceRecord[];
  credentials: WorkspaceRecord[];
  financeDryRuns: WorkspaceRecord[];
  integrationDryRuns: WorkspaceRecord[];
  adminChecks: WorkspaceRecord[];
};

export type BrokerResult<T> =
  | ({ ok: true } & T)
  | { ok: false; code: string };
