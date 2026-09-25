import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import {
  findSkillReferences,
  parkedPath,
  setFileEnabled,
} from "../services/fileEditor";

test("setFileEnabled parks and restores a managed file", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "agent-context-file-"));
  const file = path.join(directory, "SKILL.md");
  await writeFile(file, "---\nname: demo\ndescription: demo\n---\n", "utf8");

  assert.equal(parkedPath(file), `${file}.disabled`);

  const disabled = await setFileEnabled(file, false);
  assert.equal(disabled.ok, true);
  await assert.rejects(readFile(file, "utf8"));
  assert.match(await readFile(`${file}.disabled`, "utf8"), /demo/);

  const enabled = await setFileEnabled(file, true);
  assert.equal(enabled.ok, true);
  assert.match(await readFile(file, "utf8"), /demo/);
});

test("setFileEnabled works for an agent file", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "agent-context-agent-"));
  const file = path.join(directory, "demo.agent.md");
  await writeFile(file, "---\nname: demo\n---\n", "utf8");

  assert.equal((await setFileEnabled(file, false)).ok, true);
  await assert.rejects(readFile(file, "utf8"));
  assert.equal((await setFileEnabled(file, true)).ok, true);
  assert.match(await readFile(file, "utf8"), /demo/);
});

test("findSkillReferences finds agents that reference a skill", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "agent-context-agents-"));
  const agents = path.join(root, "agents");
  await mkdir(agents);
  await writeFile(
    path.join(agents, "demo.agent.md"),
    "codex:\n  skills:\n    - path: ~/.agents/skills/demo/SKILL.md\n",
    "utf8",
  );
  await writeFile(path.join(agents, "other.agent.md"), "nothing here", "utf8");

  const references = await findSkillReferences(root, "demo");
  assert.equal(references.length, 1);
  assert.match(references[0], /demo\.agent\.md$/);
});
