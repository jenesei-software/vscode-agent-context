import * as vscode from "vscode";
import { registerCommands } from "./commands";
import {
  agentsRootSetting,
  enabledApps,
  showThirdPartySkills,
  workspaceRoot,
} from "./config";
import type { ContextSnapshot } from "./model/types";
import { ContextService } from "./services/contextService";
import { SyncService } from "./services/syncService";
import { WatcherService } from "./services/watcherService";
import { StatusBar } from "./statusBar";
import { ApplicabilityViewProvider } from "./views/applicabilityViewProvider";
import {
  buildAgents,
  buildCommands,
  buildHealth,
  buildMcp,
  buildPlugins,
  buildRules,
  buildSkills,
  buildSummary,
} from "./views/listBuilders";
import type { ListState } from "./views/listTypes";
import { type ListViewDeps, ListViewProvider } from "./views/listViewProvider";

const LIST_VIEWS: Array<{
  id: string;
  build: (snapshot: ContextSnapshot | undefined) => ListState;
}> = [
  { id: "agentContext.summary", build: buildSummary },
  { id: "agentContext.skills", build: buildSkills },
  { id: "agentContext.rules", build: buildRules },
  { id: "agentContext.agents", build: buildAgents },
  { id: "agentContext.mcp", build: buildMcp },
  { id: "agentContext.commands", build: buildCommands },
  { id: "agentContext.plugins", build: buildPlugins },
  { id: "agentContext.health", build: buildHealth },
];

export async function activate(
  context: vscode.ExtensionContext,
): Promise<void> {
  const output = vscode.window.createOutputChannel("Agent Context");
  context.subscriptions.push(output);

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

  const deps: ListViewDeps = {
    service,
    agentsRoot: () => agentsRootSetting(),
    refresh,
    sync,
  };

  for (const { id, build } of LIST_VIEWS) {
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        id,
        new ListViewProvider(id, build, deps),
      ),
    );
  }

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ApplicabilityViewProvider.viewType,
      new ApplicabilityViewProvider(service),
    ),
  );

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

  registerCommands(context, { service, output, sync, refresh });

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
