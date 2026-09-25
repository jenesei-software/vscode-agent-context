import * as vscode from "vscode";
import type { ContextSnapshot } from "./model/types";

export class StatusBar implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100,
    );
    this.item.command = "agentContext.showApplicability";
  }

  update(snapshot: ContextSnapshot | undefined): void {
    if (!snapshot) {
      this.item.text = "$(symbol-namespace) Agent Context Manager";
      this.item.tooltip = "Agent Context Manager: scanning...";
      this.item.show();
      return;
    }

    const errors = snapshot.issues.filter(
      (issue) => issue.severity === "error",
    ).length;
    const warnings = snapshot.issues.filter(
      (issue) => issue.severity === "warning",
    ).length;
    const health = errors > 0 ? `$(error) ${errors}` : `$(pass) 0`;

    this.item.text = `$(symbol-namespace) ${snapshot.skills.length} skills · ${snapshot.mcp.length} MCP · ${health}`;
    this.item.tooltip = [
      "Agent Context Manager",
      `Skills: ${snapshot.skills.length}`,
      `Rules: ${snapshot.rules.length}`,
      `Agents: ${snapshot.agents.length}`,
      `MCP: ${snapshot.mcp.length}`,
      `Commands: ${snapshot.commands.length}`,
      `Plugins: ${snapshot.plugins.length}`,
      `Errors: ${errors}, warnings: ${warnings}`,
    ].join("\n");
    this.item.show();
  }

  dispose(): void {
    this.item.dispose();
  }
}
