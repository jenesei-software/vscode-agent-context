import assert from "node:assert/strict";
import { test } from "node:test";
import { parseToml } from "../parse/toml";

test("parseToml reads tables, arrays and inline tables", () => {
  const text = [
    'name = "playwright"',
    'model = "gpt-5.6-terra"',
    "enabled = true",
    "",
    "[mcp_servers.usr-figma]",
    'url = "http://127.0.0.1:3845/mcp"',
    'args = ["-y", "chrome-devtools-mcp"]',
    'env = { JIRA_URL = "https://jira.bpm.lanit/" }',
    "",
    "[[skills.config]]",
    "path = '~/.agents/skills/usr-playwright/SKILL.md'",
    "enabled = true",
  ].join("\n");

  const { data, error } = parseToml(text);
  assert.equal(error, undefined);
  assert.equal(data.name, "playwright");
  assert.equal(data.enabled, true);

  const servers = data.mcp_servers as Record<string, Record<string, unknown>>;
  assert.equal(servers["usr-figma"].url, "http://127.0.0.1:3845/mcp");
  assert.deepEqual(servers["usr-figma"].args, ["-y", "chrome-devtools-mcp"]);
  assert.deepEqual(servers["usr-figma"].env, {
    JIRA_URL: "https://jira.bpm.lanit/",
  });

  const skills = data.skills as { config: Array<Record<string, unknown>> };
  assert.equal(skills.config.length, 1);
  assert.equal(skills.config[0].enabled, true);
});

test("parseToml keeps multiline literal strings intact", () => {
  const text = [
    'name = "agent"',
    "developer_instructions = '''",
    "line one",
    'contains "quotes" and # hash',
    "'''",
    "",
    "[meta]",
    "done = true",
  ].join("\n");

  const { data, error } = parseToml(text);
  assert.equal(error, undefined);
  assert.match(String(data.developer_instructions), /line one/);
  assert.match(String(data.developer_instructions), /# hash/);
  assert.deepEqual(data.meta, { done: true });
});

test("parseToml ignores comments outside strings", () => {
  const { data } = parseToml('key = "value" # trailing comment\n# whole line');
  assert.equal(data.key, "value");
});
