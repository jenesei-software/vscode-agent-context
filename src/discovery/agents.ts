import * as path from "node:path";
import { computeApps } from "../model/apps";
import { precedenceRank } from "../model/priority";
import type {
  AgentCodexBlock,
  AgentEntity,
  HealthIssue,
  Scope,
} from "../model/types";
import {
  asBoolean,
  asString,
  asStringArray,
  parseFrontmatter,
} from "../parse/frontmatter";
import { parseToml } from "../parse/toml";
import { listEntries, pathExists, readText } from "../util/fsutil";
import { isInside, resolveToken } from "../util/paths";
import { candidateDirs, type ScanContext } from "./context";

export async function scanAgents(
  context: ScanContext,
): Promise<{ agents: AgentEntity[]; issues: HealthIssue[] }> {
  const issues: HealthIssue[] = [];
  const agents: AgentEntity[] = [];

  const directories = new Set<string>([
    path.join(context.agentsRoot, "agents"),
    ...candidateDirs(context, "agents"),
  ]);

  for (const directory of directories) {
    for (const entry of await listEntries(directory)) {
      if (entry.directory || !entry.name.endsWith(".agent.md")) {
        continue;
      }
      const raw = await readText(entry.path);
      if (raw === undefined) {
        continue;
      }
      const entity = await buildAgent(
        context,
        entry.name,
        entry.path,
        raw,
        issues,
      );
      agents.push(entity);
      issues.push(...entity.issues);
    }
  }

  await attachGenerated(agents, issues);
  applyShadowing(agents);
  agents.sort((left, right) => left.name.localeCompare(right.name));
  return { agents, issues };
}

async function buildAgent(
  context: ScanContext,
  fileName: string,
  filePath: string,
  raw: string,
  issues: HealthIssue[],
): Promise<AgentEntity> {
  const fm = parseFrontmatter(raw);
  const fallbackName = fileName.replace(/\.agent\.md$/, "");
  const name = asString(fm.data.name) ?? fallbackName;
  const description = asString(fm.data.description);
  const tools = asStringArray(fm.data.tools);
  const userInvocable = asBoolean(fm.data["user-invocable"]);
  const codex = parseCodex(fm.data.codex);
  const localIssues: HealthIssue[] = [];

  if (fm.error) {
    localIssues.push({
      severity: "error",
      message: `Agent "${fallbackName}": ${fm.error}`,
      path: filePath,
      category: "agents",
      entity: fallbackName,
    });
  }
  if (description === undefined || description.trim() === "") {
    localIssues.push({
      severity: "warning",
      message: `Agent "${name}" has no description.`,
      path: filePath,
      category: "agents",
      entity: name,
    });
  }
  if (!codex) {
    localIssues.push({
      severity: "warning",
      message: `Agent "${name}" has no "codex" block, so no Codex TOML will be generated.`,
      path: filePath,
      category: "agents",
      entity: name,
    });
  } else {
    for (const skillPath of codex.skills) {
      const resolved = resolveToken(skillPath);
      if (!(await pathExists(resolved))) {
        localIssues.push({
          severity: "error",
          message: `Agent "${name}" references a missing skill: ${skillPath}`,
          path: filePath,
          category: "agents",
          entity: name,
        });
      }
    }
  }

  issues.push(...localIssues);

  return {
    id: `agents:${filePath}`,
    name,
    category: "agents",
    scope: scopeFor(context, filePath),
    path: filePath,
    description,
    tools,
    userInvocable,
    codex,
    duplicates: [],
    apps: computeApps("agents", filePath, context.apps, context.workspaceRoot),
    issues: localIssues,
  };
}

function parseCodex(value: unknown): AgentCodexBlock | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const block = value as Record<string, unknown>;
  const skills: string[] = [];
  for (const item of toArray(block.skills)) {
    if (typeof item === "string") {
      skills.push(item);
    } else if (item && typeof item === "object") {
      const skillPath = asString((item as Record<string, unknown>).path);
      if (skillPath) {
        skills.push(skillPath);
      }
    }
  }
  return {
    model: asString(block.model),
    reasoning: asString(block.reasoning),
    sandbox: asString(block.sandbox),
    skills,
  };
}

function toArray(value: unknown): unknown[] {
  if (value === undefined || value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

async function attachGenerated(
  agents: AgentEntity[],
  issues: HealthIssue[],
): Promise<void> {
  const generatedDir = resolveToken("~/.codex/agents");
  const generated = await listEntries(generatedDir);
  const consumed = new Set<string>();

  for (const agent of agents) {
    const match = generated.find(
      (entry) => entry.name === `${agent.name}.toml`,
    );
    if (!match) {
      continue;
    }
    consumed.add(match.path);
    agent.generatedPath = match.path;
    const raw = await readText(match.path);
    if (raw !== undefined) {
      const { data } = parseToml(raw);
      agent.generated = {
        model: asString(data.model),
        reasoning: asString(data.model_reasoning_effort),
        sandbox: asString(data.sandbox_mode),
      };
    }
  }

  for (const entry of generated) {
    if (
      !entry.directory &&
      entry.name.endsWith(".toml") &&
      !consumed.has(entry.path)
    ) {
      issues.push({
        severity: "warning",
        message: `Generated Codex agent "${entry.name}" has no canonical .agent.md source.`,
        path: entry.path,
        category: "agents",
        entity: entry.name.replace(/\.toml$/, ""),
      });
    }
  }
}

function applyShadowing(agents: AgentEntity[]): void {
  const byName = new Map<string, AgentEntity[]>();
  for (const agent of agents) {
    const bucket = byName.get(agent.name) ?? [];
    bucket.push(agent);
    byName.set(agent.name, bucket);
  }
  for (const bucket of byName.values()) {
    if (bucket.length < 2) {
      continue;
    }
    const winner = [...bucket].sort(
      (left, right) =>
        precedenceRank(left.scope, left.path) -
        precedenceRank(right.scope, right.path),
    )[0];
    for (const agent of bucket) {
      agent.duplicates = bucket
        .filter((other) => other.path !== agent.path)
        .map((other) => other.path)
        .sort((left, right) => left.localeCompare(right));
      if (agent.path !== winner.path) {
        agent.shadowedBy = winner.path;
      }
    }
  }
}

function scopeFor(context: ScanContext, filePath: string): Scope {
  if (isInside(path.join(context.agentsRoot, "agents"), filePath)) {
    return "global";
  }
  if (context.workspaceRoot && isInside(context.workspaceRoot, filePath)) {
    return "project";
  }
  return "third-party";
}
