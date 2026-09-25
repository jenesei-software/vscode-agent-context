import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { readText, writeAtomic } from "../util/fsutil";

export interface McpEditResult {
  ok: boolean;
  error?: string;
}

export async function setMcpEnabled(
  serversPath: string,
  name: string,
  enabled: boolean,
): Promise<McpEditResult> {
  const raw = await readText(serversPath);
  if (raw === undefined) {
    return { ok: false, error: `Canonical file not found: ${serversPath}` };
  }

  let document: unknown;
  try {
    document = parseYaml(raw);
  } catch (error) {
    return { ok: false, error: `Invalid YAML: ${(error as Error).message}` };
  }

  if (!document || typeof document !== "object" || Array.isArray(document)) {
    return { ok: false, error: "servers.yaml is not a mapping." };
  }

  const servers = (document as { servers?: unknown }).servers;
  if (!servers || typeof servers !== "object" || Array.isArray(servers)) {
    return { ok: false, error: "servers.yaml has no `servers` mapping." };
  }

  const server = (servers as Record<string, unknown>)[name];
  if (!server || typeof server !== "object" || Array.isArray(server)) {
    return { ok: false, error: `MCP server "${name}" not found.` };
  }

  (server as Record<string, unknown>).enabled = enabled;

  try {
    const text = stringifyYaml(document, { lineWidth: 0 });
    await writeAtomic(serversPath, text);
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }

  return { ok: true };
}
