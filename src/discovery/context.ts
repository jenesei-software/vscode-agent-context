import * as path from "node:path";
import type { AppDescriptor } from "../model/apps";
import type { AppId } from "../model/types";
import { resolveToken } from "../util/paths";

export interface ScanContext {
  agentsRoot: string;
  workspaceRoot?: string;
  apps: readonly AppDescriptor[];
  showThirdParty: boolean;
}

export function candidateDirs(
  context: ScanContext,
  category: "skills" | "agents" | "rules" | "commands" | "plugins",
): string[] {
  const result = new Set<string>();
  for (const app of context.apps) {
    for (const raw of app.discovery[category] ?? []) {
      if (!context.showThirdParty && isThirdParty(raw)) {
        continue;
      }
      result.add(resolveToken(raw));
    }
    if (context.workspaceRoot) {
      for (const relative of app.projectDiscovery[category] ?? []) {
        result.add(path.join(context.workspaceRoot, ...relative.split("/")));
      }
    }
  }
  return [...result];
}

export function enabledAppIds(context: ScanContext): AppId[] {
  return context.apps.map((app) => app.id);
}

function isThirdParty(raw: string): boolean {
  const normalized = raw.replace(/\\/g, "/").toLowerCase();
  return normalized.includes("/.copilot/") || normalized.includes("/.claude/");
}
