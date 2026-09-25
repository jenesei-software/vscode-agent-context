import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import { readText, writeAtomic } from "../util/fsutil";

test("writeAtomic creates and overwrites a file", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "agent-context-atomic-"));
  const target = path.join(directory, "servers.yaml");

  await writeAtomic(target, "version: 1\n");
  assert.equal(await readFile(target, "utf8"), "version: 1\n");

  await writeAtomic(target, "version: 1\nservers: {}\n");
  assert.equal(await readFile(target, "utf8"), "version: 1\nservers: {}\n");
});

test("readText refuses files above the size limit", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "agent-context-read-"));
  const target = path.join(directory, "big.txt");
  await writeFile(target, "x".repeat(64), "utf8");

  assert.equal((await readText(target, 1024))?.length, 64);
  assert.equal(await readText(target, 16), undefined);
});
