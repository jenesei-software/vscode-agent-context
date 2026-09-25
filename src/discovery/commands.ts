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
      const disabled = entry.name.endsWith(".disabled");
      const base = disabled
        ? entry.name.slice(0, -".disabled".length)
        : entry.name;
      if (!base.endsWith(".md")) {
        continue;
      }
      const file = disabled
        ? entry.path.slice(0, -".disabled".length)
        : entry.path;
      if (seen.has(file)) {
        continue;
      }
      seen.add(file);

      const raw = await readText(entry.path);
      const fm = raw === undefined ? undefined : parseFrontmatter(raw);
      const name = base.replace(/\.prompt\.md$/, "").replace(/\.md$/, "");
      const description = fm ? asString(fm.data.description) : undefined;

      commands.push({
        id: `commands:${file}`,
        name,
        category: "commands",
        scope: scopeFor(context, file),
        path: file,
        description,
        disabled,
        generatedParts: [],
        apps: computeApps(
          "commands",
          file,
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
      if (entry.directory) {
        continue;
      }
      const disabled = entry.name.endsWith(".disabled");
      const base = disabled
        ? entry.name.slice(0, -".disabled".length)
        : entry.name;
      if (!/\.(ts|js|mjs)$/.test(base)) {
        continue;
      }
      const file = disabled
        ? entry.path.slice(0, -".disabled".length)
        : entry.path;
      const raw = await readText(entry.path);
      plugins.push({
        id: `plugins:${file}`,
        name: base.replace(/\.(ts|js|mjs)$/, ""),
        category: "plugins",
        scope: scopeFor(context, file),
        path: file,
        description: firstComment(raw),
        disabled,
        apps: computeApps("plugins", file, context.apps, context.workspaceRoot),
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
        disabled: false,
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
