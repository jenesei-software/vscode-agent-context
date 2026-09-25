import { createHash, randomUUID } from "node:crypto";
import {
  readdir,
  readFile,
  realpath,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import * as path from "node:path";

/** Files larger than this are treated as unreadable to avoid unbounded reads. */
export const MAX_TEXT_BYTES = 4 * 1024 * 1024;

export async function pathExists(target: string): Promise<boolean> {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

export async function isDirectory(target: string): Promise<boolean> {
  try {
    return (await stat(target)).isDirectory();
  } catch {
    return false;
  }
}

export async function isFile(target: string): Promise<boolean> {
  try {
    return (await stat(target)).isFile();
  } catch {
    return false;
  }
}

export async function readText(
  target: string,
  maxBytes = MAX_TEXT_BYTES,
): Promise<string | undefined> {
  try {
    const info = await stat(target);
    if (!info.isFile() || info.size > maxBytes) {
      return undefined;
    }
    return await readFile(target, "utf8");
  } catch {
    return undefined;
  }
}

export async function realPath(target: string): Promise<string | undefined> {
  try {
    return await realpath(target);
  } catch {
    return undefined;
  }
}

/** Writes via a temporary file and an atomic rename, preserving the target. */
export async function writeAtomic(
  target: string,
  content: string,
): Promise<void> {
  const directory = path.dirname(target);
  const temporary = path.join(
    directory,
    `.${path.basename(target)}.tmp-${randomUUID()}`,
  );
  try {
    await writeFile(temporary, content, "utf8");
    await rename(temporary, target);
  } catch (error) {
    try {
      await rm(temporary, { force: true });
    } catch {
      // Ignore cleanup failures; the original error is more relevant.
    }
    throw error;
  }
}

export async function renameFile(
  source: string,
  destination: string,
): Promise<void> {
  await rename(source, destination);
}

export async function listDir(target: string): Promise<string[]> {
  try {
    return await readdir(target);
  } catch {
    return [];
  }
}

export interface DirEntry {
  name: string;
  path: string;
  directory: boolean;
}

export async function listEntries(target: string): Promise<DirEntry[]> {
  try {
    const entries = await readdir(target, { withFileTypes: true });
    return entries.map((entry) => ({
      name: entry.name,
      path: path.join(target, entry.name),
      directory: entry.isDirectory(),
    }));
  } catch {
    return [];
  }
}

export async function fileHash(target: string): Promise<string | undefined> {
  const content = await readText(target);
  if (content === undefined) {
    return undefined;
  }
  return createHash("sha256").update(content).digest("hex");
}

export async function mtimeMs(target: string): Promise<number | undefined> {
  try {
    return (await stat(target)).mtimeMs;
  } catch {
    return undefined;
  }
}

export function baseName(target: string): string {
  return path.basename(target);
}

export function dirName(target: string): string {
  return path.dirname(target);
}
