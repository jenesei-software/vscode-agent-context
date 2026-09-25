import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import { scanAgents } from "../discovery/agents";
import { scanRules } from "../discovery/rules";
import { scanSkills } from "../discovery/skills";

function context(agentsRoot: string) {
  return { agentsRoot, apps: [], showThirdParty: false };
}

test("scanSkills reports a parked SKILL.md as disabled", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "agent-context-skills-"));
  const skillDirectory = path.join(root, "skills", "demo");
  await mkdir(skillDirectory, { recursive: true });
  await writeFile(
    path.join(skillDirectory, "SKILL.md.disabled"),
    "---\nname: demo\ndescription: demo skill\n---\n",
    "utf8",
  );

  const { skills } = await scanSkills(context(root));
  assert.equal(skills.length, 1);
  assert.equal(skills[0].disabled, true);
  assert.equal(skills[0].name, "demo");
  assert.equal(skills[0].path, path.join(skillDirectory, "SKILL.md"));
});

test("scanAgents reports a parked *.agent.md as disabled", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "agent-context-agents-"));
  const agentsDirectory = path.join(root, "agents");
  await mkdir(agentsDirectory, { recursive: true });
  await writeFile(
    path.join(agentsDirectory, "demo.agent.md.disabled"),
    "---\nname: demo\ndescription: demo\ncodex:\n  skills: []\n---\nBody\n",
    "utf8",
  );

  const { agents } = await scanAgents(context(root));
  const demo = agents.find((agent) => agent.name === "demo");
  assert.ok(demo);
  assert.equal(demo.disabled, true);
  assert.equal(demo.path, path.join(agentsDirectory, "demo.agent.md"));
});

test("scanRules skips a disabled rule and picks the next candidate", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "agent-context-rules-"));
  const rulesDirectory = path.join(root, "rules");
  await mkdir(rulesDirectory, { recursive: true });
  await writeFile(
    path.join(rulesDirectory, "git-commits.md.disabled"),
    "# disabled\n",
    "utf8",
  );

  const disabled = await scanRules(context(root));
  assert.equal(disabled.winner, undefined);
  assert.equal(disabled.rules[0].disabled, true);

  await writeFile(
    path.join(rulesDirectory, "commit-rules.md"),
    "# enabled\n",
    "utf8",
  );
  const fallback = await scanRules(context(root));
  assert.ok(fallback.winner?.endsWith("commit-rules.md"));
  assert.equal(
    fallback.rules.find((rule) => rule.path.endsWith("git-commits.md"))
      ?.disabled,
    true,
  );
});
