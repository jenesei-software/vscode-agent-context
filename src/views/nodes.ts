import { buildEffective } from "../discovery/merge";
import { appById } from "../model/apps";
import { scopeRank } from "../model/priority";
import type {
  AppId,
  Category,
  ContextSnapshot,
  EffectiveEntry,
  HealthIssue,
  Scope,
} from "../model/types";

export type ViewKind =
  | "effective"
  | "skills"
  | "rules"
  | "agents"
  | "mcp"
  | "commands"
  | "health";

export interface GroupNode {
  kind: "group";
  label: string;
  description?: string;
  icon: string;
  children: Node[];
}

export interface EntityNode {
  kind: "entity";
  category: Category;
  name: string;
  scope: Scope;
  path: string;
  description?: string;
  tooltip: string;
  contextValue: string;
  icon: string;
  apps: AppId[];
  shadowed: boolean;
  generatedPath?: string;
  canonicalPath?: string;
  mcp?: {
    name: string;
    enabled?: boolean;
    envVars: string[];
  };
  ruleOrder?: number;
}

export interface InfoNode {
  kind: "info";
  label: string;
  description?: string;
  tooltip?: string;
  icon?: string;
  path?: string;
}

export type Node = GroupNode | EntityNode | InfoNode;

const CATEGORY_ICON: Record<Category, string> = {
  skills: "symbol-method",
  rules: "law",
  agents: "robot",
  mcp: "server-process",
  commands: "terminal",
  plugins: "plug",
};

const CATEGORY_LABEL: Record<Category, string> = {
  skills: "Skills",
  rules: "Rules",
  agents: "Agents",
  mcp: "MCP Servers",
  commands: "Commands",
  plugins: "Plugins",
};

const SCOPE_LABEL: Record<Scope, string> = {
  project: "project",
  global: "user",
  "third-party": "third-party",
};

export function buildRoot(
  kind: ViewKind,
  snapshot: ContextSnapshot | undefined,
): Node[] {
  if (!snapshot) {
    return [{ kind: "info", label: "Scanning...", icon: "loading~spin" }];
  }
  if (kind === "health") {
    return buildHealth(snapshot.issues);
  }
  if (kind === "effective") {
    return buildEffectiveNodes(snapshot);
  }
  return buildCategory(kind, snapshot);
}

function buildCategory(
  kind: Exclude<ViewKind, "effective" | "health">,
  snapshot: ContextSnapshot,
): Node[] {
  if (kind === "skills") {
    return groupByScope(snapshot.skills.map(skillNode));
  }
  if (kind === "agents") {
    return groupByScope(snapshot.agents.map(agentNode));
  }
  if (kind === "rules") {
    if (snapshot.rules.length === 0) {
      return [{ kind: "info", label: "No rules found", icon: "info" }];
    }
    return groupByScope(snapshot.rules.map(ruleNode), false);
  }
  if (kind === "mcp") {
    if (snapshot.mcp.length === 0) {
      return [{ kind: "info", label: "No MCP servers found", icon: "info" }];
    }
    return snapshot.mcp.map(mcpNode);
  }
  return commandsNodes(snapshot);
}

function groupByScope(nodes: EntityNode[], sortByName = true): Node[] {
  if (nodes.length === 0) {
    return [{ kind: "info", label: "Nothing found", icon: "info" }];
  }
  const order: Scope[] = ["project", "global", "third-party"];
  const groups: GroupNode[] = [];
  for (const scope of order) {
    const children = nodes.filter((node) => node.scope === scope);
    if (children.length === 0) {
      continue;
    }
    if (sortByName) {
      children.sort((left, right) => left.name.localeCompare(right.name));
    }
    const shadowed = children.filter((node) => node.shadowed).length;
    groups.push({
      kind: "group",
      label: scopeLabel(scope),
      description:
        shadowed > 0
          ? `${children.length} · ${shadowed} shadowed`
          : `${children.length}`,
      icon:
        scope === "project"
          ? "root-folder"
          : scope === "global"
            ? "home"
            : "package",
      children,
    });
  }
  return groups;
}

function scopeLabel(scope: Scope): string {
  if (scope === "project") {
    return "Project";
  }
  if (scope === "global") {
    return "Global (user)";
  }
  return "Third-party";
}

function skillNode(skill: ContextSnapshot["skills"][number]): EntityNode {
  const shadowed = skill.shadowedBy !== undefined;
  const apps = appLabels(skill.apps);
  return {
    kind: "entity",
    category: "skills",
    name: skill.name,
    scope: skill.scope,
    path: skill.path,
    description: shadowed ? "shadowed" : scopeText(skill.scope),
    tooltip: [
      `**${skill.name}**`,
      skill.description ? `\n${skill.description}` : "",
      `\nScope: ${SCOPE_LABEL[skill.scope]}`,
      `Path: ${skill.path}`,
      apps ? `Apps: ${apps}` : "",
      shadowed ? `Shadowed by: ${skill.shadowedBy}` : "",
      skill.lock?.source ? `Source: ${skill.lock.source}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    contextValue: [
      "agentContext.openable",
      "agentContext.named",
      "agentContext.provenance",
      shadowed ? "agentContext.shadowed" : "",
    ]
      .filter(Boolean)
      .join(" "),
    icon: shadowed ? "circle-slash" : skill.valid ? "symbol-method" : "warning",
    apps: skill.apps,
    shadowed,
  };
}

function ruleNode(rule: ContextSnapshot["rules"][number]): EntityNode {
  return {
    kind: "entity",
    category: "rules",
    name: rule.name,
    scope: rule.scope,
    path: rule.path,
    description: rule.winner ? "winner" : `#${rule.order}`,
    tooltip: [
      `**${rule.name}**`,
      `\nScope: ${SCOPE_LABEL[rule.scope]}`,
      `Path: ${rule.path}`,
      rule.winner ? "This file wins for commit-message generation." : "",
    ]
      .filter(Boolean)
      .join("\n"),
    contextValue:
      "agentContext.openable agentContext.named agentContext.provenance",
    icon: rule.winner ? "star-full" : "law",
    apps: rule.apps,
    shadowed: false,
    ruleOrder: rule.order,
  };
}

function agentNode(agent: ContextSnapshot["agents"][number]): EntityNode {
  const shadowed = agent.shadowedBy !== undefined;
  const generated = agent.generatedPath !== undefined;
  return {
    kind: "entity",
    category: "agents",
    name: agent.name,
    scope: agent.scope,
    path: agent.path,
    description: shadowed
      ? "shadowed"
      : generated
        ? "codex: synced"
        : "codex: not generated",
    tooltip: [
      `**${agent.name}**`,
      agent.description ? `\n${agent.description}` : "",
      `\nScope: ${SCOPE_LABEL[agent.scope]}`,
      `Path: ${agent.path}`,
      agent.codex
        ? `Codex: model=${agent.codex.model ?? "-"}, reasoning=${agent.codex.reasoning ?? "-"}, sandbox=${agent.codex.sandbox ?? "-"}`
        : "No codex block",
      agent.generatedPath ? `Generated: ${agent.generatedPath}` : "",
      agent.shadowedBy ? `Shadowed by: ${agent.shadowedBy}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    contextValue: [
      "agentContext.openable",
      "agentContext.named",
      "agentContext.provenance",
      generated ? "agentContext.generated" : "",
      shadowed ? "agentContext.shadowed" : "",
    ]
      .filter(Boolean)
      .join(" "),
    icon: shadowed ? "circle-slash" : "robot",
    apps: agent.apps,
    shadowed,
    generatedPath: agent.generatedPath,
    canonicalPath: agent.path,
  };
}

function mcpNode(server: ContextSnapshot["mcp"][number]): EntityNode {
  const missing = server.envStatus.filter((status) => !status.set);
  const disabled = server.enabled === false;
  return {
    kind: "entity",
    category: "mcp",
    name: server.name,
    scope: server.scope,
    path: server.path,
    description: [
      server.type,
      disabled ? "disabled" : undefined,
      server.overriddenBy ? "overridden" : undefined,
    ]
      .filter(Boolean)
      .join(" · "),
    tooltip: [
      `**${server.name}**`,
      `\nType: ${server.type}`,
      server.command
        ? `Command: ${server.command} ${server.args.join(" ")}`
        : "",
      server.url ? `URL: ${server.url}` : "",
      server.enabled === undefined ? "" : `Enabled: ${server.enabled}`,
      server.envStatus.length > 0
        ? `Env:\n${server.envStatus
            .map(
              (status) =>
                `  - ${status.name}: ${status.set ? "set" : "MISSING"}`,
            )
            .join("\n")}`
        : "",
      server.generated.length > 0
        ? `Generated:\n${server.generated
            .map(
              (entry) =>
                `  - ${entry.app}: ${entry.present ? "present" : "missing"}`,
            )
            .join("\n")}`
        : "",
      missing.length > 0
        ? `Missing ${missing.length} environment variable(s).`
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
    contextValue:
      "agentContext.mcp agentContext.named agentContext.openable agentContext.provenance",
    icon: disabled
      ? "circle-slash"
      : server.type === "http"
        ? "globe"
        : missing.length > 0
          ? "warning"
          : "server-process",
    apps: server.apps,
    shadowed: false,
    mcp: {
      name: server.name,
      enabled: server.enabled,
      envVars: server.envStatus.map((status) => status.name),
    },
  };
}

function commandsNodes(snapshot: ContextSnapshot): Node[] {
  const commandNodes: EntityNode[] = snapshot.commands.map((command) => ({
    kind: "entity",
    category: "commands",
    name: command.name,
    scope: command.scope,
    path: command.path,
    description: scopeText(command.scope),
    tooltip: [
      `**${command.name}**`,
      command.description ? `\n${command.description}` : "",
      `\nPath: ${command.path}`,
    ].join("\n"),
    contextValue:
      "agentContext.openable agentContext.named agentContext.provenance",
    icon: "terminal",
    apps: command.apps,
    shadowed: false,
  }));

  const pluginNodes: EntityNode[] = snapshot.plugins.map((plugin) => ({
    kind: "entity",
    category: "plugins",
    name: plugin.name,
    scope: plugin.scope,
    path: plugin.path,
    description: scopeText(plugin.scope),
    tooltip: [
      `**${plugin.name}**`,
      plugin.description ? `\n${plugin.description}` : "",
      `\nPath: ${plugin.path}`,
    ].join("\n"),
    contextValue:
      "agentContext.openable agentContext.named agentContext.provenance",
    icon: "plug",
    apps: plugin.apps,
    shadowed: false,
  }));

  const byScopeThenName = (left: EntityNode, right: EntityNode): number =>
    scopeRank(left.scope) - scopeRank(right.scope) ||
    left.name.localeCompare(right.name);
  commandNodes.sort(byScopeThenName);
  pluginNodes.sort(byScopeThenName);

  return [
    {
      kind: "group",
      label: "Commands",
      description: `${commandNodes.length}`,
      icon: "terminal",
      children: commandNodes,
    },
    {
      kind: "group",
      label: "Plugins",
      description: `${pluginNodes.length}`,
      icon: "plug",
      children: pluginNodes,
    },
  ];
}

function buildEffectiveNodes(snapshot: ContextSnapshot): Node[] {
  const entries = buildEffective(snapshot);
  const groups: GroupNode[] = [];
  const order: Category[] = [
    "skills",
    "rules",
    "agents",
    "mcp",
    "commands",
    "plugins",
  ];
  for (const category of order) {
    const items = entries
      .filter((entry) => entry.category === category)
      .sort(
        (left, right) =>
          scopeRank(left.scope) - scopeRank(right.scope) ||
          left.name.localeCompare(right.name),
      );
    if (items.length === 0) {
      continue;
    }
    groups.push({
      kind: "group",
      label: CATEGORY_LABEL[category],
      description: `${items.length}`,
      icon: CATEGORY_ICON[category],
      children: items.map(effectiveNode),
    });
  }
  return groups.length > 0
    ? groups
    : [{ kind: "info", label: "Nothing to show", icon: "info" }];
}

function effectiveNode(entry: EffectiveEntry): EntityNode {
  const extra = entry.duplicateScopes ?? [];
  const marker =
    extra.length > 0 ? ` + ${extra.map(scopeLabel).join(", ")}` : "";
  return {
    kind: "entity",
    category: entry.category,
    name: entry.name,
    scope: entry.scope,
    path: entry.path,
    description: `${scopeText(entry.scope)}${marker}`,
    tooltip: [
      `**${entry.name}**`,
      entry.detail ? `\n${entry.detail}` : "",
      `\nCategory: ${CATEGORY_LABEL[entry.category]}`,
      `Scope: ${SCOPE_LABEL[entry.scope]}`,
      extra.length > 0
        ? `Also defined in: ${extra.map(scopeLabel).join(", ")} (shadowed)`
        : "",
      `Path: ${entry.path}`,
      appLabels(entry.apps) ? `Apps: ${appLabels(entry.apps)}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    contextValue:
      "agentContext.openable agentContext.named agentContext.provenance",
    icon: CATEGORY_ICON[entry.category],
    apps: entry.apps,
    shadowed: false,
  };
}

function buildHealth(issues: HealthIssue[]): Node[] {
  if (issues.length === 0) {
    return [{ kind: "info", label: "No problems detected", icon: "pass" }];
  }
  const order: Array<HealthIssue["severity"]> = ["error", "warning", "info"];
  const groups: GroupNode[] = [];
  for (const severity of order) {
    const items = issues.filter((issue) => issue.severity === severity);
    if (items.length === 0) {
      continue;
    }
    groups.push({
      kind: "group",
      label: title(severity),
      description: `${items.length}`,
      icon:
        severity === "error"
          ? "error"
          : severity === "warning"
            ? "warning"
            : "info",
      children: items.map((issue) => ({
        kind: "info" as const,
        label: issue.message,
        description: issue.entity,
        tooltip: [issue.message, issue.path].filter(Boolean).join("\n"),
        icon:
          severity === "error"
            ? "error"
            : severity === "warning"
              ? "warning"
              : "info",
        path: issue.path,
      })),
    });
  }
  return groups;
}

function scopeText(scope: Scope): string {
  return SCOPE_LABEL[scope];
}

function title(value: string): string {
  return value.length === 0 ? value : value[0].toUpperCase() + value.slice(1);
}

function appLabels(apps: AppId[]): string {
  return apps.map((id) => appById(id)?.label ?? id).join(", ");
}
