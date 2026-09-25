import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import type { ContextSnapshot } from "../model/types";
import {
  isKnownToggleTarget,
  isWithinRoots,
  managedRoots,
} from "../services/guard";

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

test("isWithinRoots accepts a file inside a root and rejects outside", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "agent-context-root-"));
  const inside = path.join(root, "skills", "demo", "SKILL.md");
  const outside = path.join(tmpdir(), "agent-context-outside.txt");
  await writeFile(outside, "x", "utf8");

  assert.equal(await isWithinRoots(inside, [root]), true);
  assert.equal(await isWithinRoots(outside, [root]), false);
});

test("isWithinRoots accepts a parked file that does not exist yet", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "agent-context-root-"));
  const parked = path.join(root, "agents", "demo.agent.md.disabled");
  assert.equal(await isWithinRoots(parked, [root]), true);
});

test("isKnownToggleTarget matches snapshot entities only", () => {
  const snap = snapshot({
    skills: [
      {
        id: "skills:demo",
        name: "demo",
        category: "skills",
        scope: "global",
        path: "/home/.agents/skills/demo/SKILL.md",
        directory: "/home/.agents/skills/demo",
        valid: true,
        disabled: false,
        apps: [],
        issues: [],
        duplicates: [],
      },
    ],
  });

  assert.equal(
    isKnownToggleTarget(snap, {
      category: "skills",
      name: "demo",
      file: "/home/.agents/skills/demo/SKILL.md",
      enabled: true,
    }),
    true,
  );
  assert.equal(
    isKnownToggleTarget(snap, {
      category: "skills",
      name: "other",
      file: "/home/.agents/skills/other/SKILL.md",
      enabled: true,
    }),
    false,
  );
  assert.equal(
    isKnownToggleTarget(snap, {
      category: "mcp",
      name: "demo",
      file: "/home/.agents/mcp/servers.yaml",
      enabled: true,
    }),
    false,
  );
});

test("managedRoots includes the agents root, workspace and global config dirs", () => {
  const roots = managedRoots(snapshot({ workspaceRoot: "/repo" }));
  assert.ok(roots.includes("/home/.agents"));
  assert.ok(roots.includes("/repo"));
  assert.ok(roots.some((root) => root.endsWith(".claude")));
  assert.ok(roots.some((root) => root.includes(".config")));
});
