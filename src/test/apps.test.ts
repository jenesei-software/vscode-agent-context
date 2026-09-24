import assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";
import { APPS, computeApps } from "../model/apps";
import { homeDir } from "../util/paths";

test("computeApps attributes a canonical skill to VS Code and opencode", () => {
  const skill = path.join(
    homeDir(),
    ".agents",
    "skills",
    "usr-playwright",
    "SKILL.md",
  );
  const apps = computeApps("skills", skill, APPS);
  assert.ok(apps.includes("vscode"));
  assert.ok(apps.includes("opencode"));
  assert.ok(apps.includes("antigravity"));
  assert.ok(!apps.includes("codex"));
});

test("computeApps attributes a project skill only when the workspace is known", () => {
  const skill = path.join(
    "C:\\work\\repo",
    ".github",
    "skills",
    "demo",
    "SKILL.md",
  );
  assert.deepEqual(computeApps("skills", skill, APPS), []);
  const apps = computeApps("skills", skill, APPS, "C:\\work\\repo");
  assert.ok(apps.includes("vscode"));
  assert.ok(apps.includes("copilot"));
});

test("computeApps attributes the canonical MCP file to the generated apps", () => {
  const servers = path.join(homeDir(), ".agents", "mcp", "servers.yaml");
  const apps = computeApps("mcp", servers, APPS);
  assert.equal(apps.length, 0);
});

test("every app descriptor has a label and a known id", () => {
  for (const app of APPS) {
    assert.ok(app.label.length > 0);
    assert.ok(app.id.length > 0);
  }
});
