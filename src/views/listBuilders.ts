import { buildEffective } from "../discovery/merge";
import { appById } from "../model/apps";
import type {
  AgentEntity,
  AppId,
  CommandEntity,
  ContextSnapshot,
  McpEntity,
  PluginEntity,
  RuleEntity,
  Scope,
  SkillEntity,
} from "../model/types";
import {
  type ListGroup,
  type ListRow,
  type ListState,
  loadingState,
  type RowState,
} from "./listTypes";

const SCOPE_ORDER: Scope[] = ["project", "global", "third-party"];
const SCOPE_LABELS: Record<Scope, string> = {
  project: "Project",
  global: "Global (user)",
  "third-party": "Third-party",
};

const CATEGORY_LABELS: Record<string, string> = {
  skills: "Skills",
  rules: "Rules",
  agents: "Agents",
  mcp: "MCP Servers",
  commands: "Commands",
  plugins: "Plugins",
};

function appLabels(apps: AppId[]): string {
  return apps.map((id) => appById(id)?.label ?? id).join(", ");
}

function parked(file: string, disabled: boolean): string {
  return disabled ? `${file}.disabled` : file;
}

function groupByScope(
  rows: ListRow[],
  scopes: Scope[] = SCOPE_ORDER,
): ListGroup[] {
  const groups: ListGroup[] = [];
  for (const scope of scopes) {
    const matching = rows.filter((row) => row.scope === scope);
    if (matching.length > 0) {
      groups.push({
        label: SCOPE_LABELS[scope],
        count: matching.length,
        rows: matching,
      });
    }
  }
  return groups;
}

export function buildSummary(snapshot: ContextSnapshot | undefined): ListState {
  if (!snapshot) {
    return loadingState();
  }
  const entries = buildEffective(snapshot);
  const groups: ListGroup[] = [];
  for (const category of [
    "skills",
    "rules",
    "agents",
    "mcp",
    "commands",
    "plugins",
  ]) {
    const rows = entries
      .filter((entry) => entry.category === category)
      .sort((left, right) => left.name.localeCompare(right.name))
      .map<ListRow>((entry) => ({
        name: entry.name,
        description: entry.detail,
        path: entry.path,
        state: "active",
        stateText: SCOPE_LABELS[entry.scope],
        scope: entry.scope,
        meta: [
          `category: ${CATEGORY_LABELS[entry.category]}`,
          `scope: ${SCOPE_LABELS[entry.scope]}`,
          entry.apps.length > 0 ? `apps: ${appLabels(entry.apps)}` : "",
          `path: ${entry.path}`,
        ].filter(Boolean),
      }));
    if (rows.length > 0) {
      groups.push({
        label: CATEGORY_LABELS[category],
        count: rows.length,
        rows,
      });
    }
  }
  return {
    loading: false,
    summary: `${entries.length} effective entities`,
    groups,
  };
}

export function buildSkills(snapshot: ContextSnapshot | undefined): ListState {
  if (!snapshot) {
    return loadingState();
  }
  const rows = snapshot.skills.map<ListRow>((skill) => skillRow(skill));
  const groups = groupByScope(rows, SCOPE_ORDER);
  const disabled = snapshot.skills.filter((skill) => skill.disabled).length;
  const shadowed = snapshot.skills.filter(
    (skill) => skill.shadowedBy !== undefined,
  ).length;
  return {
    loading: false,
    summary: `${snapshot.skills.length} skills · ${disabled} disabled · ${shadowed} shadowed`,
    groups,
  };
}

function skillRow(skill: SkillEntity): ListRow {
  const state: RowState = skill.disabled
    ? "disabled"
    : skill.shadowedBy
      ? "shadowed"
      : "active";
  return {
    name: skill.name,
    description: skill.description,
    path: parked(skill.path, skill.disabled),
    state,
    stateText: skill.disabled
      ? "disabled"
      : skill.shadowedBy
        ? `shadowed by ${skill.shadowedBy.split(/[\\/]/).slice(-2, -1)[0] ?? ""}`
        : "active",
    scope: skill.scope,
    toggle: {
      category: "skills",
      name: skill.name,
      file: skill.path,
      enabled: !skill.disabled,
    },
    meta: [
      skill.lock?.source ? `source: ${skill.lock.source}` : "",
      skill.lock?.updatedAt
        ? `updated: ${skill.lock.updatedAt.slice(0, 10)}`
        : "",
      skill.shadowedBy ? `shadowed by: ${skill.shadowedBy}` : "",
      `path: ${skill.path}`,
    ].filter(Boolean),
  };
}

export function buildRules(snapshot: ContextSnapshot | undefined): ListState {
  if (!snapshot) {
    return loadingState();
  }
  const rules: ListRow[] = [...snapshot.rules]
    .sort((left, right) => left.order - right.order)
    .map((rule) => ruleRow(rule));
  return {
    loading: false,
    summary: `${snapshot.rules.length} rules${
      snapshot.effectiveRulesPath ? " · winner shown in Summary" : ""
    }`,
    groups: groupByScope(rules, SCOPE_ORDER),
  };
}

function ruleRow(rule: RuleEntity): ListRow {
  const state: RowState = rule.disabled
    ? "disabled"
    : rule.winner
      ? "winner"
      : "active";
  return {
    name: rule.name,
    path: parked(rule.path, rule.disabled),
    state,
    stateText: rule.disabled
      ? "disabled"
      : rule.winner
        ? "winner"
        : "candidate",
    scope: rule.scope,
    toggle: {
      category: "rules",
      name: rule.name,
      file: rule.path,
      enabled: !rule.disabled,
    },
    meta: [`path: ${rule.path}`],
  };
}

export function buildAgents(snapshot: ContextSnapshot | undefined): ListState {
  if (!snapshot) {
    return loadingState();
  }
  const rows = snapshot.agents.map<ListRow>((agent) => agentRow(agent));
  const groups = groupByScope(rows, SCOPE_ORDER);
  const synced = snapshot.agents.filter(
    (agent) => agent.generatedPath !== undefined,
  ).length;
  return {
    loading: false,
    summary: `${snapshot.agents.length} agents · ${synced} synced to Codex`,
    groups,
  };
}

function agentRow(agent: AgentEntity): ListRow {
  const state: RowState = agent.disabled
    ? "disabled"
    : agent.shadowedBy
      ? "shadowed"
      : "active";
  const codex = agent.codex
    ? `codex: ${agent.generatedPath ? "synced" : "not generated"}`
    : "no codex block";
  return {
    name: agent.name,
    description: agent.description,
    path: parked(agent.path, agent.disabled),
    state,
    stateText: agent.disabled
      ? "disabled"
      : agent.shadowedBy
        ? "shadowed"
        : agent.generatedPath
          ? "synced"
          : "active",
    scope: agent.scope,
    toggle: {
      category: "agents",
      name: agent.name,
      file: agent.path,
      enabled: !agent.disabled,
    },
    generatedPath: agent.generatedPath,
    meta: [
      codex,
      agent.codex?.model ? `model: ${agent.codex.model}` : "",
      agent.codex?.reasoning ? `reasoning: ${agent.codex.reasoning}` : "",
      agent.codex?.sandbox ? `sandbox: ${agent.codex.sandbox}` : "",
      agent.shadowedBy ? `shadowed by: ${agent.shadowedBy}` : "",
      agent.generatedPath ? `generated: ${agent.generatedPath}` : "",
    ].filter(Boolean),
  };
}

export function buildMcp(snapshot: ContextSnapshot | undefined): ListState {
  if (!snapshot) {
    return loadingState();
  }
  const rows = snapshot.mcp.map<ListRow>((server) => mcpRow(server));
  const groups: ListGroup[] = [];
  for (const type of ["stdio", "http"] as const) {
    const matching = rows.filter((row) => row.stateType === type);
    if (matching.length > 0) {
      groups.push({ label: type, count: matching.length, rows: matching });
    }
  }
  const disabled = snapshot.mcp.filter(
    (server) => server.enabled === false,
  ).length;
  return {
    loading: false,
    summary: `${snapshot.mcp.length} MCP servers · ${disabled} disabled`,
    groups,
  };
}

function mcpRow(server: McpEntity): ListRow {
  const missing = server.envStatus.filter((status) => !status.set);
  const state: RowState =
    server.enabled === false
      ? "disabled"
      : server.overriddenBy
        ? "overridden"
        : missing.length > 0
          ? "warning"
          : "active";
  const generated = server.generated
    .map((entry) => `${entry.app}: ${entry.present ? "on" : "off"}`)
    .join(", ");
  const row: ListRow = {
    name: server.name,
    description:
      server.type === "http"
        ? server.url
        : `${server.command ?? ""} ${server.args.join(" ")}`.trim(),
    path: server.path,
    state,
    stateText: [
      server.type,
      server.enabled === false ? "disabled" : "",
      server.overriddenBy ? "overridden" : "",
      missing.length > 0 ? `${missing.length} env missing` : "",
    ]
      .filter(Boolean)
      .join(" · "),
    scope: server.scope,
    envVars: server.envStatus.map((status) => status.name),
    stateType: server.type,
    toggle: {
      category: "mcp",
      name: server.name,
      file: server.path,
      enabled: server.enabled !== false,
    },
    meta: [
      server.url ? `url: ${server.url}` : "",
      server.command
        ? `command: ${server.command} ${server.args.join(" ")}`
        : "",
      server.envStatus.length > 0
        ? `env: ${server.envStatus
            .map((status) => `${status.name}=${status.set ? "set" : "MISSING"}`)
            .join(", ")}`
        : "",
      generated ? `generated: ${generated}` : "",
    ].filter(Boolean),
  };
  return row;
}

export function buildCommands(
  snapshot: ContextSnapshot | undefined,
): ListState {
  if (!snapshot) {
    return loadingState();
  }
  const rows = snapshot.commands.map<ListRow>((command) => commandRow(command));
  return {
    loading: false,
    summary: `${snapshot.commands.length} commands`,
    groups: groupByScope(rows, SCOPE_ORDER),
  };
}

function commandRow(command: CommandEntity): ListRow {
  const managed = command.generatedParts.length > 0;
  return {
    name: command.name,
    description: command.description,
    path: managed ? "" : parked(command.path, command.disabled),
    state: managed ? "info" : command.disabled ? "disabled" : "active",
    stateText: managed ? "managed" : command.disabled ? "disabled" : "active",
    scope: command.scope,
    toggle: managed
      ? undefined
      : {
          category: "commands",
          name: command.name,
          file: command.path,
          enabled: !command.disabled,
        },
    meta: [command.path ? `path: ${command.path}` : ""].filter(Boolean),
  };
}

export function buildPlugins(snapshot: ContextSnapshot | undefined): ListState {
  if (!snapshot) {
    return loadingState();
  }
  const rows = snapshot.plugins.map<ListRow>((plugin) => pluginRow(plugin));
  return {
    loading: false,
    summary: `${snapshot.plugins.length} plugins`,
    groups: groupByScope(rows, SCOPE_ORDER),
  };
}

function pluginRow(plugin: PluginEntity): ListRow {
  return {
    name: plugin.name,
    description: plugin.description,
    path: parked(plugin.path, plugin.disabled),
    state: plugin.disabled ? "disabled" : "active",
    stateText: plugin.disabled ? "disabled" : "active",
    scope: plugin.scope,
    toggle: {
      category: "plugins",
      name: plugin.name,
      file: plugin.path,
      enabled: !plugin.disabled,
    },
    meta: [`path: ${plugin.path}`],
  };
}

export function buildHealth(snapshot: ContextSnapshot | undefined): ListState {
  if (!snapshot) {
    return loadingState();
  }
  const groups: ListGroup[] = [];
  const order = ["error", "warning", "info"] as const;
  for (const severity of order) {
    const matching = snapshot.issues
      .filter((issue) => issue.severity === severity)
      .map<ListRow>((issue) => ({
        name: issue.message,
        path: issue.path ?? "",
        state: severity,
        stateText: issue.entity ?? severity,
        meta: [issue.path ? `path: ${issue.path}` : "", severity].filter(
          Boolean,
        ),
      }));
    if (matching.length > 0) {
      groups.push({
        label: severity[0].toUpperCase() + severity.slice(1),
        count: matching.length,
        rows: matching,
      });
    }
  }
  const errors = snapshot.issues.filter(
    (issue) => issue.severity === "error",
  ).length;
  const warnings = snapshot.issues.filter(
    (issue) => issue.severity === "warning",
  ).length;
  return {
    loading: false,
    summary: `${errors} errors · ${warnings} warnings`,
    groups,
  };
}
