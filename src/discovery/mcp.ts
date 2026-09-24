import * as path from "node:path";
import { parse as parseYaml } from "yaml";
import { type AppDescriptor, computeApps } from "../model/apps";
import type {
  AppId,
  EnvStatus,
  GeneratedMcp,
  HealthIssue,
  McpEntity,
} from "../model/types";
import { asString, asStringArray } from "../parse/frontmatter";
import { parseJsonc } from "../parse/jsonc";
import { parseToml } from "../parse/toml";
import { pathExists, readText } from "../util/fsutil";
import { resolveToken } from "../util/paths";
import type { ScanContext } from "./context";

const ALLOWED_KEYS = new Set([
  "type",
  "url",
  "auth",
  "command",
  "args",
  "env",
  "env_vars",
  "enabled",
  "startup_timeout_sec",
  "tool_timeout_sec",
]);

export async function scanMcp(
  context: ScanContext,
): Promise<{ servers: McpEntity[]; issues: HealthIssue[] }> {
  const issues: HealthIssue[] = [];
  const canonicalPath = path.join(context.agentsRoot, "mcp", "servers.yaml");
  const raw = await readText(canonicalPath);
  if (raw === undefined) {
    return { servers: [], issues };
  }

  let document: unknown;
  try {
    document = parseYaml(raw);
  } catch (error) {
    issues.push({
      severity: "error",
      message: `servers.yaml is not valid YAML: ${(error as Error).message}`,
      path: canonicalPath,
      category: "mcp",
    });
    return { servers: [], issues };
  }

  const serversNode = (document as { servers?: unknown } | null)?.servers;
  if (!serversNode || typeof serversNode !== "object") {
    issues.push({
      severity: "error",
      message: "servers.yaml has no top-level `servers` mapping.",
      path: canonicalPath,
      category: "mcp",
    });
    return { servers: [], issues };
  }

  const projectServers = await readProjectServers(context.workspaceRoot);
  const servers: McpEntity[] = [];

  for (const [name, value] of Object.entries(
    serversNode as Record<string, unknown>,
  )) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      issues.push({
        severity: "error",
        message: `MCP server "${name}" is not a mapping.`,
        path: canonicalPath,
        category: "mcp",
        entity: name,
      });
      continue;
    }
    const entity = await buildServer(
      context,
      canonicalPath,
      name,
      value as Record<string, unknown>,
      projectServers,
    );
    servers.push(entity);
    issues.push(...entity.issues);
  }

  servers.sort((left, right) => left.name.localeCompare(right.name));
  return { servers, issues };
}

async function buildServer(
  context: ScanContext,
  canonicalPath: string,
  name: string,
  node: Record<string, unknown>,
  projectServers: Set<string>,
): Promise<McpEntity> {
  const issues: HealthIssue[] = [];
  const type = asString(node.type) ?? "stdio";
  if (type !== "stdio" && type !== "http") {
    issues.push({
      severity: "error",
      message: `MCP server "${name}" has unsupported type "${type}".`,
      path: canonicalPath,
      category: "mcp",
      entity: name,
    });
  }
  for (const key of Object.keys(node)) {
    if (!ALLOWED_KEYS.has(key)) {
      issues.push({
        severity: "warning",
        message: `MCP server "${name}" has unsupported key "${key}" (ignored by sync-mcp).`,
        path: canonicalPath,
        category: "mcp",
        entity: name,
      });
    }
  }

  const enabled =
    node.enabled === undefined ? undefined : node.enabled === true;
  const url = asString(node.url);
  const command = asString(node.command);
  const args = asStringArray(node.args);
  const env: Record<string, string> = {};
  if (node.env && typeof node.env === "object" && !Array.isArray(node.env)) {
    for (const [key, value] of Object.entries(
      node.env as Record<string, unknown>,
    )) {
      env[key] = asString(value) ?? "";
    }
  }

  const forwarded = asStringArray(node.env_vars);
  const authEnv = readAuthEnv(node.auth);
  const secretNames = [...new Set([...forwarded, ...authEnv])];

  if (type === "http" && !url) {
    issues.push({
      severity: "error",
      message: `HTTP MCP server "${name}" has no url.`,
      path: canonicalPath,
      category: "mcp",
      entity: name,
    });
  }
  if (type === "stdio" && !command) {
    issues.push({
      severity: "error",
      message: `stdio MCP server "${name}" has no command.`,
      path: canonicalPath,
      category: "mcp",
      entity: name,
    });
  }

  const envStatus: EnvStatus[] = secretNames.map((envName) => ({
    name: envName,
    set: Boolean(process.env[envName]),
  }));
  for (const status of envStatus) {
    if (!status.set) {
      issues.push({
        severity: "warning",
        message: `MCP server "${name}" needs environment variable ${status.name}, which is not set in this process.`,
        path: canonicalPath,
        category: "mcp",
        entity: name,
      });
    }
  }

  const generated = await readGenerated(context.apps, name);

  return {
    id: `mcp:${name}`,
    name,
    category: "mcp",
    scope: "global",
    path: canonicalPath,
    type: type === "http" ? "http" : "stdio",
    enabled,
    command,
    args,
    url,
    env,
    envVars: forwarded,
    envStatus,
    generated,
    overriddenBy: projectServers.has(name) ? "project mcp.json" : undefined,
    apps: computeApps(
      "mcp",
      canonicalPath,
      context.apps,
      context.workspaceRoot,
    ),
    issues,
  };
}

function readAuthEnv(auth: unknown): string[] {
  if (!auth || typeof auth !== "object" || Array.isArray(auth)) {
    return [];
  }
  const envName = asString((auth as Record<string, unknown>).env);
  return envName ? [envName] : [];
}

async function readGenerated(
  apps: readonly AppDescriptor[],
  name: string,
): Promise<GeneratedMcp[]> {
  const result: GeneratedMcp[] = [];
  for (const app of apps) {
    for (const raw of app.generated.mcp ?? []) {
      const filePath = resolveToken(raw);
      const present = await serverPresent(app.id, filePath, name);
      if (present === undefined) {
        continue;
      }
      result.push({
        app: app.id,
        path: filePath,
        present: present.present,
        enabled: present.enabled,
      });
    }
  }
  return result;
}

async function serverPresent(
  app: AppId,
  filePath: string,
  name: string,
): Promise<{ present: boolean; enabled?: boolean } | undefined> {
  const raw = await readText(filePath);
  if (raw === undefined) {
    return { present: false };
  }

  if (app === "codex") {
    const { data } = parseToml(raw);
    const servers = data.mcp_servers as
      | Record<string, Record<string, unknown>>
      | undefined;
    const node = servers?.[name];
    return node
      ? { present: true, enabled: node.enabled === true }
      : { present: false };
  }

  if (app === "opencode") {
    const { data } = parseJsonc(raw);
    const mcp = (
      data as { mcp?: Record<string, Record<string, unknown>> } | null
    )?.mcp;
    const node = mcp?.[name];
    return node
      ? { present: true, enabled: node.enabled !== false }
      : { present: false };
  }

  const { data } = parseJsonc(raw);
  const container =
    app === "antigravity"
      ? (data as { mcpServers?: Record<string, unknown> } | null)?.mcpServers
      : (data as { servers?: Record<string, unknown> } | null)?.servers;
  return container && name in container
    ? { present: true }
    : { present: false };
}

async function readProjectServers(
  workspaceRoot?: string,
): Promise<Set<string>> {
  const result = new Set<string>();
  if (!workspaceRoot) {
    return result;
  }
  const files = [
    path.join(workspaceRoot, ".vscode", "mcp.json"),
    path.join(workspaceRoot, ".cursor", "mcp.json"),
  ];
  for (const file of files) {
    if (!(await pathExists(file))) {
      continue;
    }
    const raw = await readText(file);
    if (raw === undefined) {
      continue;
    }
    const { data } = parseJsonc(raw);
    const servers = (data as { servers?: Record<string, unknown> } | null)
      ?.servers;
    for (const key of Object.keys(servers ?? {})) {
      result.add(key);
    }
  }
  return result;
}
