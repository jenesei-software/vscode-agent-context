import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import * as path from "node:path";

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

export async function readText(target: string): Promise<string | undefined> {
  try {
    return await readFile(target, "utf8");
  } catch {
    return undefined;
  }
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
