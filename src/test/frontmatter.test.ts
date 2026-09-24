import assert from "node:assert/strict";
import { test } from "node:test";
import {
  asBoolean,
  asString,
  asStringArray,
  parseFrontmatter,
} from "../parse/frontmatter";

test("parseFrontmatter reads YAML data and body", () => {
  const raw = [
    "---",
    "name: usr-playwright",
    "description: Browser checks via Docker",
    "tools:",
    "  - read",
    "  - execute",
    "user-invocable: true",
    "---",
    "",
    "Body text.",
  ].join("\n");

  const result = parseFrontmatter(raw);
  assert.equal(result.hasFrontmatter, true);
  assert.equal(result.error, undefined);
  assert.equal(result.data.name, "usr-playwright");
  assert.deepEqual(result.data.tools, ["read", "execute"]);
  assert.equal(result.body.trim(), "Body text.");
});

test("parseFrontmatter flags missing delimiters", () => {
  const result = parseFrontmatter("# just a heading\n");
  assert.equal(result.hasFrontmatter, false);
  assert.match(result.error ?? "", /frontmatter/i);
});

test("parseFrontmatter reports invalid YAML", () => {
  const result = parseFrontmatter("---\nname: [unclosed\n---\nbody");
  assert.equal(result.hasFrontmatter, true);
  assert.match(result.error ?? "", /Invalid YAML/);
});

test("parseFrontmatter tolerates a BOM", () => {
  const result = parseFrontmatter("\uFEFF---\nname: x\n---\nbody");
  assert.equal(result.hasFrontmatter, true);
  assert.equal(result.data.name, "x");
});

test("frontmatter coercion helpers", () => {
  assert.equal(asString(5), "5");
  assert.equal(asString({}), undefined);
  assert.deepEqual(asStringArray("single"), ["single"]);
  assert.deepEqual(asStringArray(["a", 1, {}]), ["a", "1"]);
  assert.equal(asBoolean("true"), true);
  assert.equal(asBoolean("false"), false);
  assert.equal(asBoolean("yes"), undefined);
});
