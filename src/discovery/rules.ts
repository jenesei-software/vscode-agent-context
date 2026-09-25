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

interface RuleCandidate {
  file: string;
  scope: Scope;
  disabled: boolean;
}

export async function scanRules(
  context: ScanContext,
): Promise<{ rules: RuleEntity[]; issues: HealthIssue[]; winner?: string }> {
  const issues: HealthIssue[] = [];
  const ordered: RuleCandidate[] = [];

  const root = context.workspaceRoot;
  for (const relative of PROJECT_RULE_CANDIDATES) {
    if (!root) {
      break;
    }
    const candidate = await resolveCandidate(
      path.join(root, ...relative.split("/")),
      "project",
    );
    if (candidate) {
      ordered.push(candidate);
    }
  }

  for (const relative of GLOBAL_RULE_CANDIDATES) {
    const candidate = await resolveCandidate(
      path.join(context.agentsRoot, ...relative.split("/")),
      "global",
    );
    if (candidate) {
      ordered.push(candidate);
    }
  }

  const known = new Set(ordered.map((item) => path.resolve(item.file)));
  for (const extra of await extraRuleFiles(context)) {
    if (!known.has(path.resolve(extra.file))) {
      ordered.push(extra);
    }
  }

  const winner = ordered.find((item) => !item.disabled)?.file;

  const rules: RuleEntity[] = ordered.map((item, order) => ({
    id: `rules:${order}:${item.file}`,
    name: path.basename(item.file),
    category: "rules",
    scope: item.scope,
    path: item.file,
    winner: item.file === winner,
    order,
    disabled: item.disabled,
    duplicates: [],
    apps: computeApps("rules", item.file, context.apps, context.workspaceRoot),
    issues,
  }));

  return { rules, issues, winner };
}

async function resolveCandidate(
  file: string,
  scope: Scope,
): Promise<RuleCandidate | undefined> {
  if (await pathExists(file)) {
    return { file, scope, disabled: false };
  }
  if (await pathExists(`${file}.disabled`)) {
    return { file, scope, disabled: true };
  }
  return undefined;
}

async function extraRuleFiles(context: ScanContext): Promise<RuleCandidate[]> {
  const result: RuleCandidate[] = [];
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
      if (entry.directory) {
        continue;
      }
      const disabled = entry.name.toLowerCase().endsWith(".md.disabled");
      const enabled = entry.name.toLowerCase().endsWith(".md");
      if (!disabled && !enabled) {
        continue;
      }
      result.push({
        file: disabled ? entry.path.slice(0, -".disabled".length) : entry.path,
        scope:
          scope === "global" && isInside(context.agentsRoot, entry.path)
            ? "global"
            : scope,
        disabled,
      });
    }
  }
  return result;
}
