import * as path from "node:path";
import { computeApps } from "../model/apps";
import type { HealthIssue, RuleEntity, Scope } from "../model/types";
import { listEntries, pathExists } from "../util/fsutil";
import { isInside } from "../util/paths";
import type { ScanContext } from "./context";

export const PROJECT_RULE_CANDIDATES = [
  ".agents/rules/git-commits.md",
  ".agents/rules/commit-rules.md",
  ".agents/git-commits.md",
  ".agents/commit-rules.md",
  "commit-rules.md",
  "COMMIT_RULES.md",
  ".github/instructions/git-commits.md",
  ".github/instructions/commit-rules.md",
  ".github/git-commits.md",
  ".github/commit-rules.md",
  "docs/commit-rules.md",
];

export const GLOBAL_RULE_CANDIDATES = [
  ".agents/rules/git-commits.md",
  ".agents/rules/commit-rules.md",
];

export async function scanRules(
  context: ScanContext,
): Promise<{ rules: RuleEntity[]; issues: HealthIssue[]; winner?: string }> {
  const issues: HealthIssue[] = [];
  const ordered: Array<{ path: string; scope: Scope; order: number }> = [];

  const root = context.workspaceRoot;
  for (const relative of PROJECT_RULE_CANDIDATES) {
    if (!root) {
      break;
    }
    const full = path.join(root, ...relative.split("/"));
    if (await pathExists(full)) {
      ordered.push({ path: full, scope: "project", order: ordered.length });
    }
  }

  for (const relative of GLOBAL_RULE_CANDIDATES) {
    const full = path.join(context.agentsRoot, ...relative.split("/"));
    if (await pathExists(full)) {
      ordered.push({ path: full, scope: "global", order: ordered.length });
    }
  }

  const known = new Set(ordered.map((item) => path.resolve(item.path)));
  for (const extra of await extraRuleFiles(context)) {
    if (!known.has(path.resolve(extra.path))) {
      ordered.push({ ...extra, order: ordered.length });
    }
  }

  const winner =
    ordered.find((item) => item.scope === "project")?.path ?? ordered[0]?.path;

  const rules: RuleEntity[] = ordered.map((item) => ({
    id: `rules:${item.order}:${item.path}`,
    name: path.basename(item.path),
    category: "rules",
    scope: item.scope,
    path: item.path,
    winner: item.path === winner,
    order: item.order,
    duplicates: [],
    apps: computeApps("rules", item.path, context.apps, context.workspaceRoot),
    issues,
  }));

  return { rules, issues, winner };
}

async function extraRuleFiles(
  context: ScanContext,
): Promise<Array<{ path: string; scope: Scope }>> {
  const result: Array<{ path: string; scope: Scope }> = [];
  const directories: Array<{ dir: string; scope: Scope }> = [
    { dir: path.join(context.agentsRoot, "rules"), scope: "global" },
  ];
  if (context.workspaceRoot) {
    directories.push({
      dir: path.join(context.workspaceRoot, ".agents", "rules"),
      scope: "project",
    });
  }

  for (const { dir, scope } of directories) {
    for (const entry of await listEntries(dir)) {
      if (!entry.directory && entry.name.toLowerCase().endsWith(".md")) {
        result.push({
          path: entry.path,
          scope:
            scope === "global" && isInside(context.agentsRoot, entry.path)
              ? "global"
              : scope,
        });
      }
    }
  }
  return result;
}
