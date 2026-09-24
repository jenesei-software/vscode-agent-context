import { APPS } from "../model/apps";
import type { AppId, ContextSnapshot, HealthIssue } from "../model/types";
import { scanAgents } from "./agents";
import { scanCommands, scanPlugins } from "./commands";
import type { ScanContext } from "./context";
import { scanMcp } from "./mcp";
import { scanRules } from "./rules";
import { scanSkills } from "./skills";

export interface ScanOptions {
  agentsRoot: string;
  workspaceRoot?: string;
  enabledApps: readonly AppId[];
  showThirdParty: boolean;
}

export async function buildSnapshot(
  options: ScanOptions,
): Promise<ContextSnapshot> {
  const enabled = new Set(options.enabledApps);
  const apps = APPS.filter((app) => enabled.has(app.id));
  const context: ScanContext = {
    agentsRoot: options.agentsRoot,
    workspaceRoot: options.workspaceRoot,
    apps,
    showThirdParty: options.showThirdParty,
  };

  const [
    skillsResult,
    rulesResult,
    agentsResult,
    mcpResult,
    commandsResult,
    pluginsResult,
  ] = await Promise.all([
    scanSkills(context),
    scanRules(context),
    scanAgents(context),
    scanMcp(context),
    scanCommands(context),
    scanPlugins(context),
  ]);

  const issues: HealthIssue[] = dedupeIssues([
    ...skillsResult.issues,
    ...rulesResult.issues,
    ...agentsResult.issues,
    ...mcpResult.issues,
    ...commandsResult.issues,
    ...pluginsResult.issues,
  ]);

  return {
    skills: skillsResult.skills,
    rules: rulesResult.rules,
    agents: agentsResult.agents,
    mcp: mcpResult.servers,
    commands: commandsResult.commands,
    plugins: pluginsResult.plugins,
    issues,
    agentsRoot: options.agentsRoot,
    workspaceRoot: options.workspaceRoot,
    effectiveRulesPath: rulesResult.winner,
  };
}

function dedupeIssues(issues: HealthIssue[]): HealthIssue[] {
  const seen = new Set<string>();
  const result: HealthIssue[] = [];
  for (const issue of issues) {
    const key = `${issue.severity}|${issue.message}|${issue.path ?? ""}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(issue);
  }
  return result;
}
