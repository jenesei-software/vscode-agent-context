import * as vscode from "vscode";
import { enabledApps } from "../config";
import { buildEffective } from "../discovery/merge";
import { APPS } from "../model/apps";
import type { ContextSnapshot, Scope } from "../model/types";
import type { ContextService } from "../services/contextService";
import {
  type ApplicabilityStrings,
  getApplicabilityHtml,
} from "./webview/applicabilityHtml";

function applicabilityStrings(): ApplicabilityStrings {
  return {
    scopeMatrix: vscode.l10n.t("Scope matrix"),
    applicationMatrix: vscode.l10n.t("Application matrix"),
    entity: vscode.l10n.t("Entity"),
    total: vscode.l10n.t("Total"),
    defined: vscode.l10n.t("defined"),
    shadowed: vscode.l10n.t("shadowed"),
    absent: vscode.l10n.t("absent"),
    nothing: vscode.l10n.t("Nothing to show."),
    rows: vscode.l10n.t("rows"),
    applications: vscode.l10n.t("applications"),
  };
}

interface ApplicabilityRow {
  category: string;
  name: string;
  scope: string;
  path: string;
  cells: boolean[];
}

type ScopeCell = "+" | "-" | "\u00b7";

interface ScopeRow {
  category: string;
  name: string;
  scope: string;
  cells: ScopeCell[];
}

interface ApplicabilityState {
  columns: string[];
  rows: ApplicabilityRow[];
  totals: number[];
  scopeColumns: string[];
  scopeRows: ScopeRow[];
}

const SCOPE_ORDER: Scope[] = ["project", "global", "third-party"];
const SCOPE_COLUMNS = ["Project", "User", "Third-party"];
const CATEGORY_ORDER = [
  "skills",
  "rules",
  "agents",
  "mcp",
  "commands",
  "plugins",
] as const;

export class ApplicabilityViewProvider implements vscode.WebviewViewProvider {
  static readonly viewType = "agentContext.applicability";

  private view?: vscode.WebviewView;

  constructor(private readonly service: ContextService) {
    this.service.onDidChange(() => this.postState());
  }

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = { enableScripts: true, localResourceRoots: [] };
    view.webview.html = getApplicabilityHtml(
      view.webview,
      applicabilityStrings(),
    );
    view.webview.onDidReceiveMessage((message: { type?: string }) => {
      if (message?.type === "ready") {
        this.postState();
      }
    });
    view.onDidDispose(() => {
      this.view = undefined;
    });
    this.postState();
  }

  private postState(): void {
    if (!this.view) {
      return;
    }
    void this.view.webview.postMessage({
      type: "state",
      state: buildState(this.service.current),
    });
  }
}

function buildState(snapshot: ContextSnapshot | undefined): ApplicabilityState {
  const selected = new Set(enabledApps());
  const apps = APPS.filter((app) => selected.has(app.id));
  const columns = apps.map((app) => app.label);
  const entries = snapshot ? buildEffective(snapshot) : [];

  const rows: ApplicabilityRow[] = entries.map((entry) => ({
    category: entry.category,
    name: entry.name,
    scope: entry.scope,
    path: entry.path,
    cells: apps.map((app) => entry.apps.includes(app.id)),
  }));

  const totals = apps.map(
    (app) => rows.filter((row) => row.cells[apps.indexOf(app)]).length,
  );

  return {
    columns,
    rows,
    totals,
    scopeColumns: SCOPE_COLUMNS,
    scopeRows: snapshot ? buildScopeRows(snapshot) : [],
  };
}

function buildScopeRows(snapshot: ContextSnapshot): ScopeRow[] {
  const groups = new Map<
    string,
    { category: string; name: string; scopes: Map<Scope, boolean> }
  >();

  const add = (
    category: string,
    name: string,
    scope: Scope,
    shadowed: boolean,
  ): void => {
    const key = `${category}:${name}`;
    let group = groups.get(key);
    if (!group) {
      group = { category, name, scopes: new Map() };
      groups.set(key, group);
    }
    group.scopes.set(scope, shadowed);
  };

  for (const skill of snapshot.skills) {
    add("skills", skill.name, skill.scope, skill.shadowedBy !== undefined);
  }
  for (const rule of snapshot.rules) {
    add("rules", rule.name, rule.scope, false);
  }
  for (const agent of snapshot.agents) {
    add("agents", agent.name, agent.scope, agent.shadowedBy !== undefined);
  }
  for (const server of snapshot.mcp) {
    add("mcp", server.name, server.scope, server.overriddenBy !== undefined);
  }
  for (const command of snapshot.commands) {
    add("commands", command.name, command.scope, false);
  }
  for (const plugin of snapshot.plugins) {
    add("plugins", plugin.name, plugin.scope, false);
  }

  const rows: ScopeRow[] = [];
  for (const category of CATEGORY_ORDER) {
    const items = [...groups.values()]
      .filter((group) => group.category === category)
      .sort((left, right) => left.name.localeCompare(right.name));
    for (const item of items) {
      rows.push({
        category: item.category,
        name: item.name,
        scope:
          SCOPE_ORDER.find((scope) => item.scopes.get(scope) === false) ??
          SCOPE_ORDER.find((scope) => item.scopes.has(scope)) ??
          "global",
        cells: SCOPE_ORDER.map((scope) => {
          if (!item.scopes.has(scope)) {
            return "\u00b7";
          }
          return item.scopes.get(scope) ? "-" : "+";
        }),
      });
    }
  }
  return rows;
}
