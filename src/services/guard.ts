import * as path from "node:path";
import type { ContextSnapshot } from "../model/types";
import { realPath } from "../util/fsutil";
import { homeDir, isInside, samePath } from "../util/paths";

export interface ToggleTarget {
  category: string;
  name: string;
  file: string;
  enabled: boolean;
}

/** Directories the extension is allowed to modify. */
export function managedRoots(snapshot: ContextSnapshot): string[] {
  const roots = new Set<string>();
  roots.add(snapshot.agentsRoot);
  if (snapshot.workspaceRoot) {
    roots.add(snapshot.workspaceRoot);
  }
  const home = homeDir();
  for (const relative of [
    ".claude",
    ".copilot",
    ".codex",
    ".gemini",
    ".config/opencode",
  ]) {
    roots.add(path.join(home, ...relative.split("/")));
  }
  return [...roots];
}

/**
 * Whether `target` resolves inside one of `roots`. Symlinks are resolved via
 * the real path of the target (or its parent when the file itself is parked),
 * so a link pointing outside the roots is rejected.
 */
export async function isWithinRoots(
  target: string,
  roots: string[],
): Promise<boolean> {
  const resolvedTarget = await resolveExisting(target);
  if (!resolvedTarget) {
    return false;
  }
  for (const root of roots) {
    const resolvedRoot = await realPath(root);
    if (resolvedRoot && isInside(resolvedRoot, resolvedTarget)) {
      return true;
    }
  }
  return false;
}

async function resolveExisting(target: string): Promise<string | undefined> {
  const direct = await realPath(target);
  if (direct) {
    return direct;
  }
  const segments: string[] = [];
  let current = target;
  while (true) {
    const parent = path.dirname(current);
    if (parent === current) {
      return undefined;
    }
    segments.unshift(path.basename(current));
    current = parent;
    const resolvedParent = await realPath(current);
    if (resolvedParent) {
      return path.join(resolvedParent, ...segments);
    }
  }
}

/** Whether a toggle target matches an entity from the current snapshot. */
export function isKnownToggleTarget(
  snapshot: ContextSnapshot,
  toggle: ToggleTarget,
): boolean {
  switch (toggle.category) {
    case "skills":
      return snapshot.skills.some(
        (skill) =>
          skill.name === toggle.name && samePath(skill.path, toggle.file),
      );
    case "rules":
      return snapshot.rules.some((rule) => samePath(rule.path, toggle.file));
    case "agents":
      return snapshot.agents.some(
        (agent) =>
          agent.name === toggle.name && samePath(agent.path, toggle.file),
      );
    case "mcp":
      return snapshot.mcp.some(
        (server) =>
          server.name === toggle.name && samePath(server.path, toggle.file),
      );
    case "commands":
      return snapshot.commands.some(
        (command) =>
          command.generatedParts.length === 0 &&
          command.name === toggle.name &&
          samePath(command.path, toggle.file),
      );
    case "plugins":
      return snapshot.plugins.some(
        (plugin) =>
          plugin.name === toggle.name && samePath(plugin.path, toggle.file),
      );
    default:
      return false;
  }
}
