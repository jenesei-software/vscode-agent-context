import * as path from "node:path";
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
import { WatcherService } from "./services/watcherService";
import { StatusBar } from "./statusBar";
import { isDirectory } from "./util/fsutil";
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
  const output = vscode.window.createOutputChannel("Agent Context Manager");
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

  const refresh = async (): Promise<void> => {
    try {
      await service.refresh();
    } catch (error) {
      output.appendLine((error as Error).message);
      vscode.window.showErrorMessage(
        `Agent Context Manager: ${(error as Error).message}`,
      );
    }
  };

  const deps: ListViewDeps = {
    service,
    agentsRoot: () => agentsRootSetting(),
    refresh,
  };

  for (const { id, build } of LIST_VIEWS) {
    const provider = new ListViewProvider(id, build, deps);
    context.subscriptions.push(
      provider,
      vscode.window.registerWebviewViewProvider(id, provider),
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
  const syncWatchers = async (): Promise<void> => {
    const candidates = [agentsRootSetting()];
    const root = workspaceRoot();
    if (root) {
      for (const relative of [
        ".agents",
        ".github/agents",
        ".github/skills",
        ".github/prompts",
        ".claude",
        ".opencode",
        ".cursor",
        ".vscode",
      ]) {
        candidates.push(path.join(root, ...relative.split("/")));
      }
    }
    const existing: string[] = [];
    for (const candidate of candidates) {
      if (await isDirectory(candidate)) {
        existing.push(candidate);
      }
    }
    if (existing.join("|") === watchedRoots.join("|")) {
      return;
    }
    watchedRoots = existing;
    watcher.watch(existing);
  };

  registerCommands(context, { refresh });

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (!event.affectsConfiguration("agentContext")) {
        return;
      }
      void syncWatchers();
      void refresh();
    }),
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      void syncWatchers();
      void refresh();
    }),
  );

  await syncWatchers();
  await refresh();
}

export function deactivate(): void {
  // Disposables are released through the extension context.
}
