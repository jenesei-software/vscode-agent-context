import assert from "node:assert/strict";
import { test } from "node:test";
import { buildEffective } from "../discovery/merge";
import type { ContextSnapshot, McpEntity, SkillEntity } from "../model/types";

function skill(partial: Partial<SkillEntity>): SkillEntity {
  return {
    id: `skills:${partial.name}`,
    name: partial.name ?? "s",
    category: "skills",
    scope: "global",
    path: partial.path ?? "/global/SKILL.md",
    directory: "/global",
    valid: true,
    disabled: false,
    apps: [],
    issues: [],
    duplicates: [],
    ...partial,
  };
}

function server(partial: Partial<McpEntity>): McpEntity {
  return {
    id: `mcp:${partial.name}`,
    name: partial.name ?? "m",
    category: "mcp",
    scope: "global",
    path: "/home/.agents/mcp/servers.yaml",
    type: "stdio",
    args: [],
    env: {},
    envVars: [],
    envStatus: [],
    generated: [],
    apps: [],
    issues: [],
    ...partial,
  };
}

function snapshot(partial: Partial<ContextSnapshot>): ContextSnapshot {
  return {
    skills: [],
    rules: [],
    agents: [],
    mcp: [],
    commands: [],
    plugins: [],
    issues: [],
    agentsRoot: "/home/.agents",
    ...partial,
  };
}

test("buildEffective drops shadowed skills and keeps the winner", () => {
  const result = buildEffective(
    snapshot({
      skills: [
        skill({ name: "a", path: "/project/SKILL.md", scope: "project" }),
        skill({
          name: "a",
          path: "/global/SKILL.md",
          shadowedBy: "/project/SKILL.md",
        }),
        skill({ name: "b", path: "/global/b/SKILL.md" }),
      ],
    }),
  );

  const names = result
    .filter((entry) => entry.category === "skills")
    .map((entry) => entry.name);
  assert.deepEqual(names, ["a", "b"]);
  assert.equal(
    result.find((entry) => entry.name === "a")?.path,
    "/project/SKILL.md",
  );
});

test("buildEffective hides overridden MCP servers", () => {
  const result = buildEffective(
    snapshot({
      mcp: [
        server({ name: "usr-figma" }),
        server({ name: "usr-lanit", overriddenBy: "project mcp.json" }),
      ],
    }),
  );
  const names = result
    .filter((entry) => entry.category === "mcp")
    .map((entry) => entry.name);
  assert.deepEqual(names, ["usr-figma"]);
});
