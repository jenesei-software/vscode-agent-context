import * as vscode from "vscode";
import { allowScripts, mcpAutoSync } from "./config";
import type { ContextService } from "./services/contextService";
import { setMcpEnabled } from "./services/mcpEditor";
import type { SyncId, SyncService } from "./services/syncService";
import type { FilterState } from "./views/filter";
import type { EntityNode, InfoNode } from "./views/nodes";

export interface CommandDependencies {
  service: ContextService;
  output: vscode.OutputChannel;
  sync: SyncService;
  filter: FilterState;
  refresh: () => Promise<void>;
}

export function registerCommands(
  context: vscode.ExtensionContext,
  dependencies: CommandDependencies,
): void {
  const { service, output, sync, filter, refresh } = dependencies;

  const register = (
    id: string,
    handler: (...args: unknown[]) => unknown,
  ): void => {
    context.subscriptions.push(vscode.commands.registerCommand(id, handler));
  };

  register("agentContext.refresh", () => refresh());

  register("agentContext.filter", async () => {
    const value = await vscode.window.showInputBox({
      title: "Filter Agent Context",
      value: filter.get() ?? "",
      prompt: "Filter by name",
    });
    if (value === undefined) {
      return;
    }
    filter.set(value);
    await refresh();
  });

  register("agentContext.clearFilter", async () => {
    filter.set(undefined);
    await refresh();
  });

  register("agentContext.openFile", (node) => openNode(asNode(node)));
  register("agentContext.revealFile", (node) => revealNode(asNode(node)));
  register("agentContext.openCanonical", (node) => {
    const entity = asEntity(node);
    return openPath(entity?.canonicalPath ?? entity?.path);
  });
  register("agentContext.whyVisible", (node) => whyVisible(asNode(node)));
  register("agentContext.copyName", async (node) => {
    const entity = asEntity(node);
    await copy(entity?.name);
  });
  register("agentContext.copyEnvName", async (node) => {
    await copyEnvName(asEntity(node));
  });
  register("agentContext.toggleMcpEnabled", async (node) => {
    await toggleMcp(service, sync, asEntity(node), refresh);
  });

  register("agentContext.runSyncAll", () => runSync(dependencies, "all"));
  register("agentContext.runSyncAgents", () => runSync(dependencies, "agents"));
  register("agentContext.runSyncSkills", () => runSync(dependencies, "skills"));
  register("agentContext.runSyncMcp", () => runSync(dependencies, "mcp"));

  register("agentContext.showApplicability", () =>
    vscode.commands.executeCommand("agentContext.applicability.focus"),
  );
  register("agentContext.openSettings", () =>
    vscode.commands.executeCommand(
      "workbench.action.openSettings",
      "@ext:jenesei-software.agent-context",
    ),
  );

  void output;
}

function asNode(value: unknown): EntityNode | InfoNode | undefined {
  if (value && typeof value === "object" && "kind" in value) {
    const node = value as EntityNode | InfoNode;
    if (node.kind === "entity" || node.kind === "info") {
      return node;
    }
  }
  return undefined;
}

function asEntity(value: unknown): EntityNode | undefined {
  const node = asNode(value);
  return node?.kind === "entity" ? node : undefined;
}

async function openNode(
  node: EntityNode | InfoNode | undefined,
): Promise<void> {
  if (!node) {
    return;
  }
  await openPath(node.path);
}

async function revealNode(
  node: EntityNode | InfoNode | undefined,
): Promise<void> {
  if (!node?.path) {
    return;
  }
  await vscode.commands.executeCommand(
    "revealFileInOS",
    vscode.Uri.file(node.path),
  );
}

async function openPath(target: string | undefined): Promise<void> {
  if (!target) {
    void vscode.window.showWarningMessage("Agent Context: nothing to open.");
    return;
  }
  const uri = vscode.Uri.file(target);
  try {
    await vscode.window.showTextDocument(uri, { preview: true });
  } catch {
    await vscode.commands.executeCommand("revealFileInOS", uri);
  }
}

async function whyVisible(
  node: EntityNode | InfoNode | undefined,
): Promise<void> {
  if (!node) {
    return;
  }
  const tooltip =
    node.kind === "entity" ? node.tooltip : (node.tooltip ?? node.label);
  const lines = tooltip
    .split("\n")
    .map((line) => line.replace(/\*\*/g, "").trim())
    .filter((line) => line.length > 0);
  const picked = await vscode.window.showQuickPick(lines, {
    title: "Why is this visible?",
    placeHolder: node.kind === "entity" ? node.name : node.label,
  });
  if (
    picked &&
    (picked.includes(":") || picked.includes("\\") || picked.includes("/"))
  ) {
    const candidate = picked.slice(picked.indexOf(":") + 1).trim();
    if (candidate.length > 0) {
      await openPath(candidate);
    }
  }
}

async function copy(value: string | undefined): Promise<void> {
  if (!value) {
    return;
  }
  await vscode.env.clipboard.writeText(value);
  vscode.window.setStatusBarMessage(`Copied: ${value}`, 2000);
}

async function copyEnvName(node: EntityNode | undefined): Promise<void> {
  const names = node?.mcp?.envVars ?? [];
  if (names.length === 0) {
    void vscode.window.showInformationMessage(
      "Agent Context: this server needs no environment variables.",
    );
    return;
  }
  if (names.length === 1) {
    await copy(names[0]);
    return;
  }
  const picked = await vscode.window.showQuickPick(names, {
    title: "Copy environment variable name",
  });
  await copy(picked);
}

async function toggleMcp(
  service: ContextService,
  sync: SyncService,
  node: EntityNode | undefined,
  refresh: () => Promise<void>,
): Promise<void> {
  if (!node?.mcp) {
    return;
  }
  const serverPath = service.current?.mcp.find(
    (server) => server.name === node.mcp?.name,
  )?.path;
  if (!serverPath) {
    return;
  }
  const target = !(node.mcp.enabled ?? true);
  const label = target ? "Enable" : "Disable";
  const answer = await vscode.window.showWarningMessage(
    `${label} MCP server "${node.mcp.name}"? This rewrites the canonical servers.yaml.`,
    { modal: true },
    label,
  );
  if (answer !== label) {
    return;
  }
  const result = await setMcpEnabled(serverPath, node.mcp.name, target);
  if (!result.ok) {
    void vscode.window.showErrorMessage(`Agent Context: ${result.error}`);
    return;
  }
  if (mcpAutoSync()) {
    await sync.run("mcp");
  }
  await refresh();
}

async function runSync(
  dependencies: CommandDependencies,
  id: SyncId,
): Promise<void> {
  const { sync, refresh, output } = dependencies;
  const scriptPath = sync.scriptPath(id);
  output.show(true);

  if (!allowScripts()) {
    await openPath(scriptPath);
    void vscode.window.showInformationMessage(
      "Agent Context: running scripts is disabled (agentContext.allowScripts). Opened the script instead.",
    );
    return;
  }

  const answer = await vscode.window.showWarningMessage(
    `Run sync-${id}.ps1? It writes to generated agent configuration files.`,
    { modal: true },
    "Run",
  );
  if (answer !== "Run") {
    return;
  }

  const result = await sync.run(id);
  if (!result.ok) {
    void vscode.window.showErrorMessage(
      `Agent Context: sync-${id} failed. See the "Agent Context" output channel.`,
    );
    return;
  }
  await refresh();
  vscode.window.setStatusBarMessage(`Agent Context: sync-${id} done`, 3000);
}
