import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import { setMcpEnabled } from "../services/mcpEditor";

async function writeServers(content: string): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "agent-context-mcp-"));
  const file = path.join(directory, "servers.yaml");
  await writeFile(file, content, "utf8");
  return file;
}

test("setMcpEnabled toggles a server and preserves other keys", async () => {
  const file = await writeServers(
    [
      "version: 1",
      "servers:",
      "  usr-a:",
      "    type: stdio",
      "    command: npx",
      "    enabled: true",
      "  usr-b:",
      "    type: http",
      "    url: http://127.0.0.1:3845/mcp",
      "",
    ].join("\n"),
  );

  assert.equal((await setMcpEnabled(file, "usr-a", false)).ok, true);
  const text = await readFile(file, "utf8");
  assert.match(text, /version: 1/);
  assert.match(text, /usr-a/);
  assert.match(text, /enabled: false/);
  assert.match(text, /usr-b/);
  assert.match(text, /url: http:\/\/127\.0\.0\.1:3845\/mcp/);
});

test("setMcpEnabled reports missing servers and invalid YAML", async () => {
  const file = await writeServers(
    "version: 1\nservers:\n  usr-a:\n    type: stdio\n",
  );
  const missing = await setMcpEnabled(file, "nope", false);
  assert.equal(missing.ok, false);
  assert.match(missing.error ?? "", /not found/);

  const broken = await writeServers("version: [unclosed\n");
  const invalid = await setMcpEnabled(broken, "usr-a", false);
  assert.equal(invalid.ok, false);
  assert.match(invalid.error ?? "", /Invalid YAML/);
});
