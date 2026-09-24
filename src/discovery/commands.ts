import { computeApps } from "../model/apps";
import type {
  CommandEntity,
  HealthIssue,
  PluginEntity,
  Scope,
} from "../model/types";
import { asString, parseFrontmatter } from "../parse/frontmatter";
import { listEntries, readText } from "../util/fsutil";
import { isInside } from "../util/paths";
import { candidateDirs, type ScanContext } from "./context";

export async function scanCommands(
  context: ScanContext,
): Promise<{ commands: CommandEntity[]; issues: HealthIssue[] }> {
  const issues: HealthIssue[] = [];
  const commands: CommandEntity[] = [];
  const seen = new Set<string>();

  for (const directory of candidateDirs(context, "commands")) {
    for (const entry of await listEntries(directory)) {
      if (entry.directory) {
        continue;
      }
      if (!entry.name.endsWith(".md")) {
        continue;
      }
      if (seen.has(entry.path)) {
        continue;
      }
      seen.add(entry.path);

      const raw = await readText(entry.path);
      const fm = raw === undefined ? undefined : parseFrontmatter(raw);
      const name = entry.name.replace(/\.prompt\.md$/, "").replace(/\.md$/, "");
      const description = fm ? asString(fm.data.description) : undefined;

      commands.push({
        id: `commands:${entry.path}`,
        name,
        category: "commands",
        scope: scopeFor(context, entry.path),
        path: entry.path,
        description,
        generatedParts: [],
        apps: computeApps(
          "commands",
          entry.path,
          context.apps,
          context.workspaceRoot,
        ),
        issues,
      });
    }
  }

  await attachGenerated(context, commands);
  commands.sort((left, right) => left.name.localeCompare(right.name));
  return { commands, issues };
}

export async function scanPlugins(
  context: ScanContext,
): Promise<{ plugins: PluginEntity[]; issues: HealthIssue[] }> {
  const issues: HealthIssue[] = [];
  const plugins: PluginEntity[] = [];

  for (const directory of candidateDirs(context, "plugins")) {
    for (const entry of await listEntries(directory)) {
      if (entry.directory || !/\.(ts|js|mjs)$/.test(entry.name)) {
        continue;
      }
      const raw = await readText(entry.path);
      plugins.push({
        id: `plugins:${entry.path}`,
        name: entry.name.replace(/\.(ts|js|mjs)$/, ""),
        category: "plugins",
        scope: scopeFor(context, entry.path),
        path: entry.path,
        description: firstComment(raw),
        apps: computeApps(
          "plugins",
          entry.path,
          context.apps,
          context.workspaceRoot,
        ),
        issues,
      });
    }
  }

  plugins.sort((left, right) => left.name.localeCompare(right.name));
  return { plugins, issues };
}

async function attachGenerated(
  context: ScanContext,
  commands: CommandEntity[],
): Promise<void> {
  for (const app of context.apps) {
    for (const raw of app.generated.commands ?? []) {
      commands.push({
        id: `commands:${app.id}:${raw}`,
        name: `${app.label} managed commands`,
        category: "commands",
        scope: "global",
        path: raw,
        description: `Command entries managed by the ${app.label} sync script.`,
        generatedParts: [raw],
        apps: [app.id],
        issues: [],
      });
    }
  }
}

function firstComment(raw: string | undefined): string | undefined {
  if (raw === undefined) {
    return undefined;
  }
  for (const line of raw.split(/\r?\n/).slice(0, 12)) {
    const trimmed = line.trim();
    if (trimmed.startsWith("//")) {
      return trimmed.replace(/^\/\/\s?/, "");
    }
    if (trimmed.startsWith("*") && trimmed.length > 1) {
      return trimmed.replace(/^\*\s?/, "");
    }
  }
  return undefined;
}

function scopeFor(context: ScanContext, filePath: string): Scope {
  if (context.workspaceRoot && isInside(context.workspaceRoot, filePath)) {
    return "project";
  }
  return "global";
}
