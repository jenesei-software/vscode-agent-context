import * as vscode from "vscode";
import { registerCommands } from "./commands";
import {
  agentsRootSetting,
  enabledApps,
  showThirdPartySkills,
  workspaceRoot,
} from "./config";
import { ContextService } from "./services/contextService";
import { SyncService } from "./services/syncService";
import { WatcherService } from "./services/watcherService";
import { StatusBar } from "./statusBar";
import { ApplicabilityViewProvider } from "./views/applicabilityViewProvider";
import { EntityTreeProvider } from "./views/entityTreeProvider";
import { FilterState } from "./views/filter";
import type { ViewKind } from "./views/nodes";

const VIEWS: Array<{ id: string; kind: ViewKind }> = [
  { id: "agentContext.effective", kind: "effective" },
  { id: "agentContext.skills", kind: "skills" },
  { id: "agentContext.rules", kind: "rules" },
  { id: "agentContext.agents", kind: "agents" },
  { id: "agentContext.mcp", kind: "mcp" },
  { id: "agentContext.commands", kind: "commands" },
  { id: "agentContext.health", kind: "health" },
];

export async function activate(
  context: vscode.ExtensionContext,
): Promise<void> {
  const output = vscode.window.createOutputChannel("Agent Context");
  context.subscriptions.push(output);

  const filter = new FilterState();
  const service = new ContextService(() => ({
    agentsRoot: agentsRootSetting(),
    workspaceRoot: workspaceRoot(),
    enabledApps: enabledApps(),
    showThirdParty: showThirdPartySkills(),
  }));
  context.subscriptions.push(service);

  const statusBar = new StatusBar();
  context.subscriptions.push(statusBar);
  service.onDidChange((snapshot) => statusBar.update(snapshot));

  for (const { id, kind } of VIEWS) {
    const provider = new EntityTreeProvider(kind, service, filter);
    context.subscriptions.push(
      provider,
      vscode.window.registerTreeDataProvider(id, provider),
    );
  }

  const applicability = new ApplicabilityViewProvider(service);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ApplicabilityViewProvider.viewType,
      applicability,
    ),
  );

  const sync = new SyncService(
    output,
    () => service.current?.agentsRoot ?? agentsRootSetting(),
  );

  const refresh = async (): Promise<void> => {
    try {
      await service.refresh();
    } catch (error) {
      output.appendLine((error as Error).message);
      vscode.window.showErrorMessage(
        `Agent Context: ${(error as Error).message}`,
      );
    }
  };

  const watcher = new WatcherService(() => {
    void refresh();
  });
  context.subscriptions.push(watcher);

  let watchedRoots: string[] = [];
  const syncWatchers = (): void => {
    const roots = [agentsRootSetting(), workspaceRoot()].filter(
      (root): root is string => root !== undefined && root !== "",
    );
    if (roots.join("|") === watchedRoots.join("|")) {
      return;
    }
    watchedRoots = roots;
    watcher.watch(roots);
  };

  registerCommands(context, { service, output, sync, filter, refresh });

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (!event.affectsConfiguration("agentContext")) {
        return;
      }
      syncWatchers();
      void refresh();
    }),
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      syncWatchers();
      void refresh();
    }),
  );

  syncWatchers();
  await refresh();
}

export function deactivate(): void {
  // Disposables are released through the extension context.
}
