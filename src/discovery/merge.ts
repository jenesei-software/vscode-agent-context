import { scopeRank } from "../model/priority";
import type { ContextSnapshot, EffectiveEntry, Scope } from "../model/types";

function scopesForPaths(
  paths: string[],
  all: Array<{ path: string; scope: Scope }>,
): Scope[] {
  const result = new Set<Scope>();
  for (const target of paths) {
    const match = all.find((entry) => entry.path === target);
    if (match) {
      result.add(match.scope);
    }
  }
  return [...result].sort((left, right) => scopeRank(left) - scopeRank(right));
}

export function buildEffective(snapshot: ContextSnapshot): EffectiveEntry[] {
  const entries: EffectiveEntry[] = [];

  for (const skill of snapshot.skills) {
    if (skill.shadowedBy || skill.disabled) {
      continue;
    }
    entries.push({
      category: "skills",
      name: skill.name,
      scope: skill.scope,
      path: skill.path,
      detail: skill.description,
      winner: true,
      apps: skill.apps,
      duplicateScopes: scopesForPaths(skill.duplicates, snapshot.skills),
    });
  }

  for (const rule of snapshot.rules) {
    if (!rule.winner || rule.disabled) {
      continue;
    }
    entries.push({
      category: "rules",
      name: rule.name,
      scope: rule.scope,
      path: rule.path,
      detail: "commit message rules",
      winner: true,
      apps: rule.apps,
      duplicateScopes: scopesForPaths(rule.duplicates, snapshot.rules),
    });
  }

  for (const agent of snapshot.agents) {
    if (agent.shadowedBy || agent.disabled) {
      continue;
    }
    entries.push({
      category: "agents",
      name: agent.name,
      scope: agent.scope,
      path: agent.path,
      detail: agent.description,
      winner: true,
      apps: agent.apps,
      duplicateScopes: scopesForPaths(agent.duplicates, snapshot.agents),
    });
  }

  for (const server of snapshot.mcp) {
    if (server.overriddenBy || server.enabled === false) {
      continue;
    }
    entries.push({
      category: "mcp",
      name: server.name,
      scope: server.scope,
      path: server.path,
      detail: server.type,
      winner: true,
      apps: server.apps,
    });
  }

  const seenCommands = new Set<string>();
  for (const command of rankByName(snapshot.commands)) {
    if (command.disabled || seenCommands.has(command.name)) {
      continue;
    }
    seenCommands.add(command.name);
    entries.push({
      category: "commands",
      name: command.name,
      scope: command.scope,
      path: command.path,
      detail: command.description,
      winner: true,
      apps: command.apps,
    });
  }

  for (const plugin of snapshot.plugins) {
    if (plugin.disabled) {
      continue;
    }
    entries.push({
      category: "plugins",
      name: plugin.name,
      scope: plugin.scope,
      path: plugin.path,
      detail: plugin.description,
      winner: true,
      apps: plugin.apps,
    });
  }

  return entries;
}

function rankByName<T extends { name: string; scope: Scope }>(items: T[]): T[] {
  return [...items].sort((left, right) => {
    const byName = left.name.localeCompare(right.name);
    return byName !== 0
      ? byName
      : scopeRank(left.scope) - scopeRank(right.scope);
  });
}
