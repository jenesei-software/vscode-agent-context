import assert from "node:assert/strict";
import { test } from "node:test";
import { locationRank, precedenceRank } from "../model/priority";

test("locationRank puts canonical .agents first", () => {
  const agents = locationRank("C:\\repo\\.agents\\skills\\a\\SKILL.md");
  const claude = locationRank("C:\\repo\\.claude\\skills\\a\\SKILL.md");
  const github = locationRank("C:\\repo\\.github\\skills\\a\\SKILL.md");
  assert.ok(agents < claude);
  assert.ok(claude < github);
});

test("a project skill beats a global one, and .agents beats .github", () => {
  const projectAgents = precedenceRank(
    "project",
    "/repo/.agents/skills/a/SKILL.md",
  );
  const projectGithub = precedenceRank(
    "project",
    "/repo/.github/skills/a/SKILL.md",
  );
  const globalAgents = precedenceRank(
    "global",
    "/home/.agents/skills/a/SKILL.md",
  );
  const thirdParty = precedenceRank(
    "third-party",
    "/home/.claude/skills/a/SKILL.md",
  );

  assert.ok(projectAgents < projectGithub);
  assert.ok(projectGithub < globalAgents);
  assert.ok(globalAgents < thirdParty);
});
