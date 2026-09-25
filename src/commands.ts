import * as vscode from "vscode";

export interface CommandDependencies {
  refresh: () => Promise<void>;
}

export function registerCommands(
  context: vscode.ExtensionContext,
  dependencies: CommandDependencies,
): void {
  const { refresh } = dependencies;

  const register = (
    id: string,
    handler: (...args: unknown[]) => unknown,
  ): void => {
    context.subscriptions.push(vscode.commands.registerCommand(id, handler));
  };

  register("agentContext.refresh", () => refresh());

  register("agentContext.showApplicability", () =>
    vscode.commands.executeCommand("agentContext.applicability.focus"),
  );
  register("agentContext.openSettings", () =>
    vscode.commands.executeCommand(
      "workbench.action.openSettings",
      "@ext:jenesei-software.agent-context-manager",
    ),
  );
}
