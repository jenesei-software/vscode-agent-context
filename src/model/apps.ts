import { isInside, resolveToken, samePath } from "../util/paths";
import type { AppId, Category } from "./types";

export const APP_MAPPING_VERSION = "1.0.0";

export interface AppDescriptor {
  id: AppId;
  label: string;
  /** Absolute (user-level) discovery locations per category. */
  discovery: Partial<Record<Category, string[]>>;
  /** Workspace-relative discovery locations per category. */
  projectDiscovery: Partial<Record<Category, string[]>>;
  /** Files written by the canonical sync scripts per category. */
  generated: Partial<Record<Category, string[]>>;
}

export const APPS: readonly AppDescriptor[] = [
  {
    id: "vscode",
    label: "VS Code",
    discovery: {
      skills: ["~/.agents/skills", "~/.copilot/skills", "~/.claude/skills"],
      agents: ["~/.agents/agents"],
      mcp: ["%APPDATA%/Code/User/mcp.json"],
    },
    projectDiscovery: {
      skills: [".github/skills", ".claude/skills", ".agents/skills"],
      agents: [".github/agents"],
      commands: [".github/prompts"],
    },
    generated: { mcp: ["%APPDATA%/Code/User/mcp.json"] },
  },
  {
    id: "antigravity-ide",
    label: "Antigravity IDE",
    discovery: {
      skills: ["~/.agents/skills"],
      agents: ["~/.agents/agents"],
      mcp: ["%APPDATA%/Antigravity IDE/User/mcp.json"],
    },
    projectDiscovery: {
      skills: [".agents/skills"],
      agents: [".agents/agents"],
    },
    generated: { mcp: ["%APPDATA%/Antigravity IDE/User/mcp.json"] },
  },
  {
    id: "antigravity",
    label: "Antigravity / Gemini",
    discovery: {
      skills: ["~/.agents/skills"],
      mcp: ["~/.gemini/config/mcp_config.json"],
    },
    projectDiscovery: {},
    generated: {
      skills: ["~/.gemini/config/skills.json"],
      mcp: ["~/.gemini/config/mcp_config.json"],
    },
  },
  {
    id: "codex",
    label: "Codex",
    discovery: {
      skills: ["~/.codex/skills"],
      agents: ["~/.codex/agents"],
      rules: ["~/.codex/rules"],
      mcp: ["~/.codex/config.toml"],
    },
    projectDiscovery: {},
    generated: {
      agents: ["~/.codex/agents"],
      mcp: ["~/.codex/config.toml"],
    },
  },
  {
    id: "opencode",
    label: "opencode",
    discovery: {
      skills: ["~/.agents/skills"],
      mcp: ["~/.config/opencode/opencode.jsonc"],
      commands: ["~/.config/opencode/commands"],
      plugins: ["~/.config/opencode/plugins"],
    },
    projectDiscovery: {
      skills: [".agents/skills", ".opencode/skill"],
      commands: [".opencode/command"],
      plugins: [".opencode/plugin"],
    },
    generated: {
      mcp: ["~/.config/opencode/opencode.jsonc"],
      commands: ["~/.config/opencode/opencode.jsonc"],
    },
  },
  {
    id: "claude",
    label: "Claude",
    discovery: {
      skills: ["~/.claude/skills"],
      agents: ["~/.claude/agents"],
    },
    projectDiscovery: {
      skills: [".claude/skills"],
      agents: [".claude/agents"],
    },
    generated: {},
  },
  {
    id: "copilot",
    label: "GitHub Copilot",
    discovery: {
      skills: ["~/.copilot/skills"],
    },
    projectDiscovery: {
      skills: [".github/skills"],
    },
    generated: {},
  },
];

const FILE_LIKE = /\.[a-z0-9]+$/i;

export function appById(id: AppId): AppDescriptor | undefined {
  return APPS.find((app) => app.id === id);
}

export function appsByIds(ids: readonly AppId[]): AppDescriptor[] {
  const set = new Set(ids);
  return APPS.filter((app) => set.has(app.id));
}

export function noApps(): AppId[] {
  return [];
}

/**
 * Which applications discover an entity at `filePath`, given the enabled app
 * descriptors and an optional workspace root for project-relative locations.
 */
export function computeApps(
  category: Category,
  filePath: string,
  apps: readonly AppDescriptor[],
  workspaceRoot?: string,
): AppId[] {
  const result: AppId[] = [];
  for (const app of apps) {
    if (
      matchesLocations(app.discovery[category], filePath) ||
      (workspaceRoot !== undefined &&
        matchesLocations(
          app.projectDiscovery[category]?.map((relative) =>
            joinRoot(workspaceRoot, relative),
          ),
          filePath,
        ))
    ) {
      result.push(app.id);
    }
  }
  return result;
}

function joinRoot(root: string, relative: string): string {
  return `${root.replace(/[\\/]+$/, "")}/${relative.replace(/^[\\/]+/, "")}`;
}

function matchesLocations(
  locations: string[] | undefined,
  filePath: string,
): boolean {
  if (!locations) {
    return false;
  }
  for (const raw of locations) {
    const resolved = resolveToken(raw);
    if (FILE_LIKE.test(raw)) {
      if (samePath(resolved, filePath)) {
        return true;
      }
    } else if (isInside(resolved, filePath)) {
      return true;
    }
  }
  return false;
}

/** Resolved generated config file paths for an app, keyed by category. */
export function generatedPaths(
  app: AppDescriptor,
  category: Category,
): string[] {
  return (app.generated[category] ?? []).map((raw) => resolveToken(raw));
}

/** Resolved discovery locations for an app, keyed by category. */
export function discoveryPaths(
  app: AppDescriptor,
  category: Category,
  workspaceRoot?: string,
): string[] {
  const global = (app.discovery[category] ?? []).map((raw) =>
    resolveToken(raw),
  );
  const project = (app.projectDiscovery[category] ?? []).map((relative) =>
    workspaceRoot === undefined ? relative : joinRoot(workspaceRoot, relative),
  );
  return [...global, ...project];
}
