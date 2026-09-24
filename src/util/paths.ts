import { homedir } from "node:os";
import * as path from "node:path";

export function homeDir(): string {
  return process.env.USERPROFILE ?? process.env.HOME ?? homedir();
}

export function appDataDir(): string {
  if (process.env.APPDATA) {
    return process.env.APPDATA;
  }
  return path.join(homeDir(), "AppData", "Roaming");
}

const TOKENS: ReadonlyArray<[RegExp, () => string]> = [
  [/^~(?=$|[\\/])/, () => homeDir()],
  [/^%APPDATA%/i, () => appDataDir()],
  [/^%USERPROFILE%/i, () => homeDir()],
];

export function resolveToken(raw: string): string {
  for (const [pattern, replace] of TOKENS) {
    if (pattern.test(raw)) {
      return path.normalize(raw.replace(pattern, replace()));
    }
  }
  return path.normalize(raw);
}

export function normalizePath(target: string): string {
  return path.normalize(target);
}

export function samePath(left: string, right: string): boolean {
  const a = path.resolve(left);
  const b = path.resolve(right);
  return process.platform === "win32"
    ? a.toLowerCase() === b.toLowerCase()
    : a === b;
}

export function isInside(parent: string, child: string): boolean {
  const base = path.resolve(parent);
  const target = path.resolve(child);
  const compared =
    process.platform === "win32"
      ? [base.toLowerCase(), target.toLowerCase()]
      : [base, target];
  if (compared[0] === compared[1]) {
    return true;
  }
  return compared[1].startsWith(compared[0] + path.sep);
}

export function joinToken(base: string, ...segments: string[]): string {
  return path.join(resolveToken(base), ...segments);
}
