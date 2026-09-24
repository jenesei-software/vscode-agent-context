import assert from "node:assert/strict";
import { test } from "node:test";
import { parseJsonc } from "../parse/jsonc";

test("parseJsonc reads objects with comments and trailing commas", () => {
  const text = [
    "{",
    "  // managed block",
    '  "mcp": {',
    '    "usr-figma": { "type": "remote", "url": "http://127.0.0.1:3845/mcp" },',
    "  },",
    "}",
  ].join("\n");

  const result = parseJsonc(text);
  assert.equal(result.error, undefined);
  const data = result.data as { mcp: Record<string, { type: string }> };
  assert.equal(data.mcp["usr-figma"].type, "remote");
});

test("parseJsonc reports invalid JSON", () => {
  const result = parseJsonc('{\n  "a": ,\n}');
  assert.equal(result.data, undefined);
  assert.match(result.error ?? "", /Invalid JSON/);
});
