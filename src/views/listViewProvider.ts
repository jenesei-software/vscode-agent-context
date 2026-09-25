import * as path from "node:path";
import * as vscode from "vscode";
import type { ContextSnapshot } from "../model/types";
import type { ContextService } from "../services/contextService";
import { findSkillReferences, setFileEnabled } from "../services/fileEditor";
import {
  isKnownToggleTarget,
  isWithinRoots,
  managedRoots,
} from "../services/guard";
import { setMcpEnabled } from "../services/mcpEditor";
import type { ListState, ListToggle } from "./listTypes";
import { getListHtml, type ListStrings } from "./webview/listHtml";

function listStrings(): ListStrings {
  return {
    scanning: vscode.l10n.t("Scanning…"),
    nothing: vscode.l10n.t("Nothing found."),
    noDescription: vscode.l10n.t("No description."),
    details: vscode.l10n.t("Details"),
    open: vscode.l10n.t("Open"),
    reveal: vscode.l10n.t("Reveal"),
    codex: vscode.l10n.t("Codex"),
    env: vscode.l10n.t("Env"),
    enable: vscode.l10n.t("Enable"),
    disable: vscode.l10n.t("Disable"),
  };
}

export interface ListViewDeps {
  service: ContextService;
  agentsRoot: () => string;
  refresh: () => Promise<void>;
}

interface IncomingMessage {
  type?: string;
  path?: string;
  value?: string;
  values?: string[];
  toggle?: ListToggle;
}

export class ListViewProvider
  implements vscode.WebviewViewProvider, vscode.Disposable
{
  private view?: vscode.WebviewView;
  private readonly disposables: vscode.Disposable[] = [];

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
    view.webview.options = { enableScripts: true, localResourceRoots: [] };
    view.webview.html = getListHtml(view.webview, listStrings());
    this.disposables.push(
      view.webview.onDidReceiveMessage((message: IncomingMessage) => {
        void this.handleMessage(message);
      }),
      view.onDidDispose(() => {
        this.view = undefined;
      }),
    );
    this.postState();
  }

  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables.length = 0;
  }

  private async handleMessage(message: IncomingMessage): Promise<void> {
    try {
      await this.dispatch(message);
    } catch (error) {
      const messageText = (error as Error).message;
      console.error("Agent Context webview message failed:", error);
      void vscode.window.showErrorMessage(`Agent Context: ${messageText}`);
    }
  }

  private async dispatch(message: IncomingMessage): Promise<void> {
    if (message?.type === "ready") {
      this.postState();
      return;
    }
    if (
      (message?.type === "open" || message?.type === "reveal") &&
      typeof message.path === "string"
    ) {
      await this.openPath(message.path, message.type === "reveal");
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

  private async openPath(target: string, reveal: boolean): Promise<void> {
    const snapshot = this.deps.service.current;
    if (!snapshot || !(await isWithinRoots(target, managedRoots(snapshot)))) {
      void vscode.window.showWarningMessage(
        vscode.l10n.t(
          "Agent Context: refusing to open a file outside the managed directories.",
        ),
      );
      return;
    }
    const uri = vscode.Uri.file(target);
    if (reveal) {
      await vscode.commands.executeCommand("revealFileInOS", uri);
      return;
    }
    await vscode.window.showTextDocument(uri, { preview: true });
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
    const snapshot = this.deps.service.current;
    if (!snapshot) {
      return;
    }
    if (!vscode.workspace.isTrusted) {
      void vscode.window.showWarningMessage(
        vscode.l10n.t(
          "Agent Context: enabling and disabling is unavailable in an untrusted workspace.",
        ),
      );
      this.postState();
      return;
    }
    if (
      !isKnownToggleTarget(snapshot, toggle) ||
      !(await isWithinRoots(toggle.file, managedRoots(snapshot)))
    ) {
      void vscode.window.showErrorMessage(
        vscode.l10n.t(
          "Agent Context: refusing to modify an unknown or out-of-scope file.",
        ),
      );
      this.postState();
      return;
    }

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

    await this.deps.refresh();
  }

  private async confirm(toggle: ListToggle, target: boolean): Promise<boolean> {
    const action = target ? vscode.l10n.t("Enable") : vscode.l10n.t("Disable");
    let warning = "";
    if (!target && toggle.category === "skills") {
      const references = await findSkillReferences(
        this.deps.agentsRoot(),
        toggle.name,
      );
      if (references.length > 0) {
        warning =
          "\n\n" +
          vscode.l10n.t(
            "Referenced by: {0}. sync-agents.ps1 will fail until those agents are updated.",
            references.map((reference) => path.basename(reference)).join(", "),
          );
      }
    }
    const suffix =
      toggle.category === "mcp"
        ? vscode.l10n.t(" This rewrites the canonical servers.yaml.")
        : vscode.l10n.t(
            " The file is renamed to .disabled and hidden from every application.",
          );
    const answer = await vscode.window.showWarningMessage(
      vscode.l10n.t('{0} "{1}"?', action, toggle.name) + suffix + warning,
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
