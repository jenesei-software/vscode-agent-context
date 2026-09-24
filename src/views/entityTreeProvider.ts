import * as vscode from "vscode";
import type { ContextService } from "../services/contextService";
import type { FilterState } from "./filter";
import { buildRoot, type Node, type ViewKind } from "./nodes";

export class EntityTreeProvider implements vscode.TreeDataProvider<Node> {
  private readonly changeEmitter = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.changeEmitter.event;

  constructor(
    private readonly kind: ViewKind,
    private readonly service: ContextService,
    private readonly filter: FilterState,
  ) {
    this.service.onDidChange(() => this.changeEmitter.fire());
  }

  getTreeItem(element: Node): vscode.TreeItem {
    if (element.kind === "group") {
      const item = new vscode.TreeItem(element.label, this.groupState());
      item.description = element.description;
      item.iconPath = new vscode.ThemeIcon(element.icon);
      item.contextValue = "agentContext.group";
      return item;
    }

    if (element.kind === "info") {
      const item = new vscode.TreeItem(
        element.label,
        vscode.TreeItemCollapsibleState.None,
      );
      item.description = element.description;
      item.iconPath = new vscode.ThemeIcon(element.icon ?? "info");
      if (element.tooltip) {
        item.tooltip = element.tooltip;
      }
      if (element.path) {
        item.command = {
          command: "agentContext.openFile",
          title: "Open File",
          arguments: [element],
        };
      }
      return item;
    }

    const item = new vscode.TreeItem(
      element.name,
      vscode.TreeItemCollapsibleState.None,
    );
    item.description = element.description;
    item.contextValue = element.contextValue;
    item.iconPath = new vscode.ThemeIcon(element.icon);
    const tooltip = new vscode.MarkdownString(element.tooltip);
    tooltip.supportThemeIcons = true;
    item.tooltip = tooltip;
    item.command = {
      command: "agentContext.openFile",
      title: "Open File",
      arguments: [element],
    };
    return item;
  }

  getChildren(element?: Node): Node[] {
    if (element === undefined) {
      const nodes = this.filter.apply(
        buildRoot(this.kind, this.service.current),
      );
      if (this.filter.active && nodes.length === 0) {
        return [
          {
            kind: "info",
            label: `No matches for "${this.filter.get()}"`,
            icon: "search",
          },
        ];
      }
      return nodes;
    }
    if (element.kind === "group") {
      return this.filter.apply(element.children);
    }
    return [];
  }

  dispose(): void {
    this.changeEmitter.dispose();
  }

  private groupState(): vscode.TreeItemCollapsibleState {
    if (this.kind === "effective" || this.kind === "health") {
      return vscode.TreeItemCollapsibleState.Expanded;
    }
    return vscode.TreeItemCollapsibleState.Collapsed;
  }
}
