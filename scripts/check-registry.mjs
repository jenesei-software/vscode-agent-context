import { readFileSync } from "node:fs";

const ALLOWED_HOSTS = new Set(["registry.npmjs.org"]);

const lockUrl = new URL("../package-lock.json", import.meta.url);
const lock = JSON.parse(readFileSync(lockUrl, "utf8"));

const offenders = new Map();
for (const entry of Object.values(lock.packages ?? {})) {
  if (!entry.resolved) {
    continue;
  }
  let host;
  try {
    host = new URL(entry.resolved).host;
  } catch {
    host = entry.resolved;
  }
  if (!ALLOWED_HOSTS.has(host)) {
    offenders.set(host, (offenders.get(host) ?? 0) + 1);
  }
}

if (offenders.size > 0) {
  console.error("package-lock.json references a non-public registry:");
  for (const [host, count] of offenders) {
    console.error(`  ${host} (${count})`);
  }
  console.error(
    "Regenerate it with the project .npmrc: remove package-lock.json, then run npm install.",
  );
  process.exit(1);
}

console.log(
  `package-lock.json registry check passed (${Object.keys(lock.packages ?? {}).length} entries).`,
);
