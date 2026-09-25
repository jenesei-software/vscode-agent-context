import assert from "node:assert/strict";
import { test } from "node:test";
import type {
  CommandEntity,
  ContextSnapshot,
  SkillEntity,
} from "../model/types";
import { buildCommands, buildSkills } from "../views/listBuilders";

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

function skill(partial: Partial<SkillEntity>): SkillEntity {
  return {
    id: `skills:${partial.name}`,
    name: partial.name ?? "demo",
    category: "skills",
    scope: "global",
    path: "/home/.agents/skills/demo/SKILL.md",
    directory: "/home/.agents/skills/demo",
    valid: true,
    disabled: false,
    apps: [],
    issues: [],
    duplicates: [],
    ...partial,
  };
}

test("buildSkills exposes a toggle and a disabled row", () => {
  const state = buildSkills(
    snapshot({ skills: [skill({ name: "demo", disabled: true })] }),
  );

  assert.match(state.summary ?? "", /1 skills/);
  assert.match(state.summary ?? "", /1 disabled/);
  const row = state.groups[0].rows[0];
  assert.equal(row.state, "disabled");
  assert.equal(row.toggle?.category, "skills");
  assert.equal(row.toggle?.enabled, false);
  assert.equal(row.path, "/home/.agents/skills/demo/SKILL.md.disabled");
});

test("buildCommands hides the toggle for managed command entries", () => {
  const managed: CommandEntity = {
    id: "commands:opencode",
    name: "opencode managed commands",
    category: "commands",
    scope: "global",
    path: "~/.config/opencode/opencode.jsonc",
    disabled: false,
    generatedParts: ["~/.config/opencode/opencode.jsonc"],
    apps: [],
    issues: [],
  };

  const state = buildCommands(snapshot({ commands: [managed] }));
  const row = state.groups[0].rows[0];
  assert.equal(row.state, "info");
  assert.equal(row.toggle, undefined);
  assert.equal(row.path, "");
});
