import type { Scope } from "./types";

/**
 * Priority of a discovery location. Lower wins. `.agents` is canonical, so it
 * always outranks the third-party and tool-specific locations inside the same
 * scope.
 */
export function locationRank(filePath: string): number {
  const normalized = filePath.replace(/\\/g, "/").toLowerCase();
  if (normalized.includes("/.agents/")) {
    return 0;
  }
  if (normalized.includes("/.claude/")) {
    return 1;
  }
  if (normalized.includes("/.github/")) {
    return 2;
  }
  if (normalized.includes("/.opencode/")) {
    return 3;
  }
  if (normalized.includes("/.codex/")) {
    return 4;
  }
  if (normalized.includes("/.copilot/")) {
    return 5;
  }
  return 6;
}

export function scopeRank(scope: Scope): number {
  if (scope === "project") {
    return 0;
  }
  if (scope === "global") {
    return 1;
  }
  return 2;
}

/**
 * Combined precedence for shadowing: a project entity beats a global one, and
 * inside the same scope `.agents` beats `.claude`, `.github`, and so on.
 */
export function precedenceRank(scope: Scope, filePath: string): number {
  return scopeRank(scope) * 10 + locationRank(filePath);
}
