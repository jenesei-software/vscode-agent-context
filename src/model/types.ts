export const APP_IDS = [
  "vscode",
  "antigravity-ide",
  "antigravity",
  "codex",
  "opencode",
  "claude",
  "copilot",
] as const;

export type AppId = (typeof APP_IDS)[number];

export type Scope = "global" | "project" | "third-party";

export type Category =
  | "skills"
  | "rules"
  | "agents"
  | "mcp"
  | "commands"
  | "plugins";

export type Severity = "error" | "warning" | "info";

export interface HealthIssue {
  severity: Severity;
  message: string;
  path?: string;
  category?: Category;
  entity?: string;
}

export interface SkillLockEntry {
  source?: string;
  sourceUrl?: string;
  installedAt?: string;
  updatedAt?: string;
  selectedAgents?: string[];
}

export interface EntityBase {
  /** Stable id: `${category}:${name}`. */
  id: string;
  name: string;
  category: Category;
  scope: Scope;
  /** Absolute path to the primary file or directory. */
  path: string;
  /** Applications that discover this entity. */
  apps: AppId[];
  issues: HealthIssue[];
}

export interface SkillEntity extends EntityBase {
  category: "skills";
  directory: string;
  description?: string;
  valid: boolean;
  lock?: SkillLockEntry;
  /** Absolute path of the higher-priority entity that shadows this one. */
  shadowedBy?: string;
  /** Other paths that define a skill with the same name. */
  duplicates: string[];
}

export interface RuleEntity extends EntityBase {
  category: "rules";
  winner: boolean;
  order: number;
  duplicates: string[];
}

export interface AgentCodexBlock {
  model?: string;
  reasoning?: string;
  sandbox?: string;
  skills: string[];
}

export interface AgentEntity extends EntityBase {
  category: "agents";
  description?: string;
  tools: string[];
  userInvocable?: boolean;
  codex?: AgentCodexBlock;
  /** Generated Codex TOML path, when present. */
  generatedPath?: string;
  generated?: {
    model?: string;
    reasoning?: string;
    sandbox?: string;
  };
  shadowedBy?: string;
  duplicates: string[];
}

export interface EnvStatus {
  name: string;
  set: boolean;
}

export interface GeneratedMcp {
  app: AppId;
  path: string;
  present: boolean;
  enabled?: boolean;
}

export interface McpEntity extends EntityBase {
  category: "mcp";
  type: "stdio" | "http";
  enabled?: boolean;
  command?: string;
  args: string[];
  url?: string;
  env: Record<string, string>;
  envVars: string[];
  envStatus: EnvStatus[];
  generated: GeneratedMcp[];
  /** Absolute path of a project entity overriding this global one. */
  overriddenBy?: string;
}

export interface CommandEntity extends EntityBase {
  category: "commands";
  description?: string;
  generatedParts: string[];
}

export interface PluginEntity extends EntityBase {
  category: "plugins";
  description?: string;
}

export type AnyEntity =
  | SkillEntity
  | RuleEntity
  | AgentEntity
  | McpEntity
  | CommandEntity
  | PluginEntity;

export interface ContextSnapshot {
  skills: SkillEntity[];
  rules: RuleEntity[];
  agents: AgentEntity[];
  mcp: McpEntity[];
  commands: CommandEntity[];
  plugins: PluginEntity[];
  issues: HealthIssue[];
  agentsRoot: string;
  workspaceRoot?: string;
  effectiveRulesPath?: string;
}

export interface EffectiveEntry {
  category: Category;
  name: string;
  scope: Scope;
  path: string;
  detail?: string;
  winner: boolean;
  apps: AppId[];
  /** Scopes where the same name is also defined but shadowed. */
  duplicateScopes?: Scope[];
}
