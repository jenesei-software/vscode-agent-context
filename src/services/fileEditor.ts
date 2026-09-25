import { isFile, listEntries, readText, renameFile } from "../util/fsutil";

export interface FileEditResult {
  ok: boolean;
  error?: string;
}

/**
 * The parked name of a file. Any managed file is disabled by appending
 * `.disabled`, which every application ignores, and enabling is the reverse
 * rename. This works uniformly for `SKILL.md`, `*.agent.md`, rules, commands
 * and plugins.
 */
export function parkedPath(file: string): string {
  return `${file}.disabled`;
}

/**
 * Enable or disable a file by renaming between `file` and `file.disabled`.
 * Renaming is the only change that actually hides the entity from every
 * application, and it is fully reversible.
 */
export async function setFileEnabled(
  file: string,
  enable: boolean,
): Promise<FileEditResult> {
  const parked = parkedPath(file);

  try {
    if (enable) {
      if (await isFile(file)) {
        return { ok: true };
      }
      if (!(await isFile(parked))) {
        return { ok: false, error: `${parked} was not found.` };
      }
      await renameFile(parked, file);
    } else {
      if (await isFile(parked)) {
        return { ok: true };
      }
      if (!(await isFile(file))) {
        return { ok: false, error: `${file} was not found.` };
      }
      await renameFile(file, parked);
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

/**
 * Absolute paths of `*.agent.md` files that reference a skill by its canonical
 * `SKILL.md` path. Disabling such a skill breaks `sync-agents.ps1`, so the
 * caller should warn before proceeding.
 */
export async function findSkillReferences(
  agentsRoot: string,
  name: string,
): Promise<string[]> {
  const needle = `skills/${name}/SKILL.md`.toLowerCase();
  const references: string[] = [];

  for (const entry of await listEntries(`${agentsRoot}/agents`)) {
    if (entry.directory || !entry.name.endsWith(".agent.md")) {
      continue;
    }
    const raw = await readText(entry.path);
    if (raw?.replace(/\\/g, "/").toLowerCase().includes(needle)) {
      references.push(entry.path);
    }
  }
  return references;
}
