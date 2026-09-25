import * as vscode from "vscode";
import { allowScripts } from "./config";
import type { ContextService } from "./services/contextService";
import type { SyncId, SyncService } from "./services/syncService";

export interface CommandDependencies {
  service: ContextService;
  output: vscode.OutputChannel;
  sync: SyncService;
  refresh: () => Promise<void>;
}

export function registerCommands(
  context: vscode.ExtensionContext,
  dependencies: CommandDependencies,
): void {
  const { service, output, sync, refresh } = dependencies;

  const register = (
    id: string,
    handler: (...args: unknown[]) => unknown,
  ): void => {
    context.subscriptions.push(vscode.commands.registerCommand(id, handler));
  };

  register("agentContext.refresh", () => refresh());

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

  void service;
  void output;
  void sync;
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

async function openPath(target: string): Promise<void> {
  try {
    await vscode.window.showTextDocument(vscode.Uri.file(target), {
      preview: true,
    });
  } catch {
    await vscode.commands.executeCommand(
      "revealFileInOS",
      vscode.Uri.file(target),
    );
  }
}
