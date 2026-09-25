import * as path from "node:path";
import { computeApps } from "../model/apps";
import { precedenceRank } from "../model/priority";
import type {
  HealthIssue,
  Scope,
  SkillEntity,
  SkillLockEntry,
} from "../model/types";
import {
  asString,
  asStringArray,
  parseFrontmatter,
} from "../parse/frontmatter";
import { listEntries, readText } from "../util/fsutil";
import { isInside } from "../util/paths";
import { candidateDirs, type ScanContext } from "./context";

interface LockFile {
  skills?: Record<string, Record<string, unknown>>;
  lastSelectedAgents?: string[];
}

export async function scanSkills(
  context: ScanContext,
): Promise<{ skills: SkillEntity[]; issues: HealthIssue[] }> {
  const lock = await readSkillLock(context.agentsRoot);
  const directorySet = new Set<string>([
    path.join(context.agentsRoot, "skills"),
    ...candidateDirs(context, "skills"),
  ]);

  const collected: SkillEntity[] = [];
  const issues: HealthIssue[] = [];

  for (const directory of directorySet) {
    const entries = await listEntries(directory);
    for (const entry of entries) {
      if (!entry.directory || entry.name.startsWith(".")) {
        continue;
      }
      const activeFile = path.join(entry.path, "SKILL.md");
      const disabledFile = path.join(entry.path, "SKILL.md.disabled");
      let disabled = false;
      let raw = await readText(activeFile);
      if (raw === undefined) {
        raw = await readText(disabledFile);
        if (raw !== undefined) {
          disabled = true;
        }
      }
      if (raw === undefined) {
        issues.push({
          severity: "warning",
          message: `Skill folder "${entry.name}" has no SKILL.md.`,
          path: entry.path,
          category: "skills",
          entity: entry.name,
        });
        continue;
      }

      const entity = buildSkill(
        context,
        entry.name,
        entry.path,
        activeFile,
        raw,
        disabled,
        lock,
      );
      collected.push(entity);
      issues.push(...entity.issues);
    }
  }

  applyShadowing(collected);
  collected.sort((left, right) => left.name.localeCompare(right.name));
  return { skills: collected, issues };
}

function buildSkill(
  context: ScanContext,
  folder: string,
  directory: string,
  file: string,
  raw: string,
  disabled: boolean,
  lock: LockFile,
): SkillEntity {
  const fm = parseFrontmatter(raw);
  const declared = asString(fm.data.name);
  const description = asString(fm.data.description);
  const name = declared ?? folder;
  const issues: HealthIssue[] = [];

  if (fm.error) {
    issues.push({
      severity: "error",
      message: `Skill "${folder}": ${fm.error}`,
      path: file,
      category: "skills",
      entity: folder,
    });
  } else {
    if (declared === undefined) {
      issues.push({
        severity: "error",
        message: `Skill "${folder}" frontmatter has no "name".`,
        path: file,
        category: "skills",
        entity: folder,
      });
    } else if (declared !== folder) {
      issues.push({
        severity: "error",
        message: `Skill name "${declared}" does not match folder "${folder}".`,
        path: file,
        category: "skills",
        entity: folder,
      });
    }
    if (description === undefined || description.trim() === "") {
      issues.push({
        severity: "error",
        message: `Skill "${folder}" frontmatter has no "description" (invisible during discovery).`,
        path: file,
        category: "skills",
        entity: folder,
      });
    }
    if (declared !== undefined && !/^[a-z0-9-]{1,64}$/.test(declared)) {
      issues.push({
        severity: "warning",
        message: `Skill name "${declared}" should be lowercase letters, digits and hyphens (max 64).`,
        path: file,
        category: "skills",
        entity: folder,
      });
    }
  }

  return {
    id: `skills:${name}`,
    name,
    category: "skills",
    scope: scopeFor(context, directory),
    path: file,
    directory,
    description,
    valid: issues.every((issue) => issue.severity !== "error"),
    disabled,
    apps: computeApps("skills", file, context.apps, context.workspaceRoot),
    issues,
    lock: lockFor(lock, name),
    duplicates: [],
  };
}

function applyShadowing(skills: SkillEntity[]): void {
  const byName = new Map<string, SkillEntity[]>();
  for (const skill of skills) {
    const bucket = byName.get(skill.name) ?? [];
    bucket.push(skill);
    byName.set(skill.name, bucket);
  }

  for (const bucket of byName.values()) {
    if (bucket.length < 2) {
      continue;
    }
    const ranked = [...bucket].sort(
      (left, right) =>
        precedenceRank(left.scope, left.path) -
        precedenceRank(right.scope, right.path),
    );
    const winner = ranked[0];
    for (const skill of bucket) {
      skill.duplicates = bucket
        .filter((other) => other.path !== skill.path)
        .map((other) => other.path)
        .sort((left, right) => left.localeCompare(right));
      if (skill.path !== winner.path) {
        skill.shadowedBy = winner.path;
      }
    }
  }
}

function scopeFor(context: ScanContext, directory: string): Scope {
  if (isInside(path.join(context.agentsRoot, "skills"), directory)) {
    return "global";
  }
  if (context.workspaceRoot && isInside(context.workspaceRoot, directory)) {
    return "project";
  }
  return "third-party";
}

async function readSkillLock(agentsRoot: string): Promise<LockFile> {
  const raw = await readText(path.join(agentsRoot, ".skill-lock.json"));
  if (raw === undefined) {
    return {};
  }
  try {
    return JSON.parse(raw) as LockFile;
  } catch {
    return {};
  }
}

function lockFor(lock: LockFile, name: string): SkillLockEntry | undefined {
  const entry = lock.skills?.[name];
  if (!entry) {
    return undefined;
  }
  return {
    source: asString(entry.source),
    sourceUrl: asString(entry.sourceUrl),
    installedAt: asString(entry.installedAt),
    updatedAt: asString(entry.updatedAt),
    selectedAgents: Array.isArray(lock.lastSelectedAgents)
      ? asStringArray(lock.lastSelectedAgents)
      : undefined,
  };
}
