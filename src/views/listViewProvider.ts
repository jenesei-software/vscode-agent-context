import * as path from "node:path";
import * as vscode from "vscode";
import { mcpAutoSync } from "../config";
import type { ContextSnapshot } from "../model/types";
import type { ContextService } from "../services/contextService";
import { findSkillReferences, setFileEnabled } from "../services/fileEditor";
import { setMcpEnabled } from "../services/mcpEditor";
import type { SyncService } from "../services/syncService";
import type { ListState, ListToggle } from "./listTypes";
import { getListHtml } from "./webview/listHtml";

export interface ListViewDeps {
  service: ContextService;
  agentsRoot: () => string;
  refresh: () => Promise<void>;
  sync: SyncService;
}

interface IncomingMessage {
  type?: string;
  path?: string;
  value?: string;
  values?: string[];
  toggle?: ListToggle;
}

export class ListViewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;

  constructor(
    readonly viewType: string,
    private readonly build: (
      snapshot: ContextSnapshot | undefined,
    ) => ListState,
    private readonly deps: ListViewDeps,
  ) {
    this.deps.service.onDidChange(() => this.postState());
  }

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = { enableScripts: true };
    view.webview.html = getListHtml(view.webview);
    view.webview.onDidReceiveMessage((message: IncomingMessage) => {
      void this.handleMessage(message);
    });
    view.onDidDispose(() => {
      this.view = undefined;
    });
    this.postState();
  }

  private async handleMessage(message: IncomingMessage): Promise<void> {
    if (message?.type === "ready") {
      this.postState();
      return;
    }
    if (message?.type === "open" && typeof message.path === "string") {
      await vscode.window.showTextDocument(vscode.Uri.file(message.path), {
        preview: true,
      });
      return;
    }
    if (message?.type === "reveal" && typeof message.path === "string") {
      await vscode.commands.executeCommand(
        "revealFileInOS",
        vscode.Uri.file(message.path),
      );
      return;
    }
    if (message?.type === "copy" && typeof message.value === "string") {
      await vscode.env.clipboard.writeText(message.value);
      vscode.window.setStatusBarMessage(`Copied: ${message.value}`, 2000);
      return;
    }
    if (message?.type === "copyEnv" && Array.isArray(message.values)) {
      await this.copyEnvName(message.values);
      return;
    }
    if (message?.type === "toggle" && message.toggle) {
      await this.toggle(message.toggle);
    }
  }

  private async copyEnvName(values: string[]): Promise<void> {
    if (values.length === 0) {
      return;
    }
    let value = values[0];
    if (values.length > 1) {
      const picked = await vscode.window.showQuickPick(values, {
        title: "Copy environment variable name",
      });
      if (!picked) {
        return;
      }
      value = picked;
    }
    await vscode.env.clipboard.writeText(value);
    vscode.window.setStatusBarMessage(`Copied: ${value}`, 2000);
  }

  private async toggle(toggle: ListToggle): Promise<void> {
    const target = !toggle.enabled;
    const confirmed = await this.confirm(toggle, target);
    if (!confirmed) {
      this.postState();
      return;
    }

    const result =
      toggle.category === "mcp"
        ? await setMcpEnabled(toggle.file, toggle.name, target)
        : await setFileEnabled(toggle.file, target);

    if (!result.ok) {
      void vscode.window.showErrorMessage(`Agent Context: ${result.error}`);
      this.postState();
      return;
    }

    if (toggle.category === "mcp" && mcpAutoSync()) {
      await this.deps.sync.run("mcp");
    }
    await this.deps.refresh();
  }

  private async confirm(toggle: ListToggle, target: boolean): Promise<boolean> {
    const action = target ? "Enable" : "Disable";
    let warning = "";
    if (!target && toggle.category === "skills") {
      const references = await findSkillReferences(
        this.deps.agentsRoot(),
        toggle.name,
      );
      if (references.length > 0) {
        warning = `\n\nReferenced by: ${references
          .map((reference) => path.basename(reference))
          .join(
            ", ",
          )}. sync-agents.ps1 will fail until those agents are updated.`;
      }
    }
    const answer = await vscode.window.showWarningMessage(
      `${action} "${toggle.name}"?${
        toggle.category === "mcp"
          ? " This rewrites the canonical servers.yaml."
          : " The file is renamed to .disabled and hidden from every application."
      }${warning}`,
      { modal: true },
      action,
    );
    return answer === action;
  }

  private postState(): void {
    if (!this.view) {
      return;
    }
    void this.view.webview.postMessage({
      type: "state",
      state: this.build(this.deps.service.current),
    });
  }
}
