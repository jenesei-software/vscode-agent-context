import type * as vscode from "vscode";

export interface ApplicabilityStrings {
  scopeMatrix: string;
  applicationMatrix: string;
  entity: string;
  total: string;
  defined: string;
  shadowed: string;
  absent: string;
  nothing: string;
  rows: string;
  applications: string;
}

function createNonce(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let text = "";
  for (let index = 0; index < 32; index++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

export function getApplicabilityHtml(
  _webview: vscode.Webview,
  strings: ApplicabilityStrings,
): string {
  const nonce = createNonce();
  const csp = [
    "default-src 'none'",
    "style-src 'unsafe-inline'",
    `script-src 'nonce-${nonce}'`,
  ].join("; ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="${csp}" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 12px;
    font-family: var(--vscode-font-family);
    font-size: 11px;
    color: var(--vscode-foreground);
    background: transparent;
  }
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
    border: 0;
  }
  .summary { opacity: 0.7; margin: 0 0 10px; }
  .group-title {
    margin: 10px 0 5px;
    padding: 0 2px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    opacity: 0.7;
  }
  .hint { opacity: 0.6; padding: 0 2px 6px; font-weight: 400; text-transform: none; letter-spacing: 0; }
  .card {
    border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    border-radius: 8px;
    background: var(--vscode-sideBar-background);
    overflow: auto;
    max-height: 45vh;
  }
  .card:focus-visible { outline: 2px solid var(--vscode-focusBorder); outline-offset: -1px; }
  table { border-collapse: collapse; width: 100%; }
  th, td {
    padding: 3px 8px;
    text-align: left;
    vertical-align: middle;
    white-space: nowrap;
    border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
  }
  th {
    position: sticky;
    top: 0;
    z-index: 1;
    background: var(--vscode-sideBar-background);
    font-weight: 600;
    opacity: 0.85;
  }
  th.col, td.col { text-align: center; width: 1%; }
  td.name {
    max-width: 190px;
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: 500;
  }
  td.name .meta { opacity: 0.55; font-weight: 400; margin-left: 6px; }
  tbody tr:last-child td { border-bottom: none; }
  .plus { color: var(--vscode-charts-green, #3fb950); }
  .minus { color: var(--vscode-charts-red, #f85149); }
  .dot { opacity: 0.3; }
  .empty { opacity: 0.7; padding: 8px; }
</style>
</head>
<body>
<main>
  <div class="summary" id="summary" role="status" aria-live="polite"></div>

  <h2 class="group-title">${strings.scopeMatrix} <span class="hint">${strings.defined} &middot; \u2212 ${strings.shadowed} &middot; \u00b7 ${strings.absent}</span></h2>
  <div class="card" role="region" tabindex="0" aria-label="${strings.scopeMatrix}">
    <table id="scope">
      <caption class="visually-hidden">${strings.scopeMatrix}</caption>
      <thead><tr id="scopeHead"></tr></thead>
      <tbody id="scopeBody"><tr><td class="empty">${strings.nothing}</td></tr></tbody>
    </table>
  </div>

  <h2 class="group-title">${strings.applicationMatrix}</h2>
  <div class="card" role="region" tabindex="0" aria-label="${strings.applicationMatrix}">
    <table id="matrix">
      <caption class="visually-hidden">${strings.applicationMatrix}</caption>
      <thead><tr id="head"></tr></thead>
      <tbody id="body"><tr><td class="empty">${strings.nothing}</td></tr></tbody>
      <tfoot><tr id="foot"></tr></tfoot>
    </table>
  </div>
</main>

<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const strings = ${JSON.stringify(strings)};
  const summary = document.getElementById("summary");
  const scopeHead = document.getElementById("scopeHead");
  const scopeBody = document.getElementById("scopeBody");
  const head = document.getElementById("head");
  const body = document.getElementById("body");
  const foot = document.getElementById("foot");

  function entityCell(row) {
    const td = document.createElement("td");
    td.className = "name";
    td.textContent = row.name;
    td.title = row.path || row.name;
    const meta = document.createElement("span");
    meta.className = "meta";
    meta.textContent = row.category;
    td.appendChild(meta);
    return td;
  }

  function markCell(symbol) {
    const td = document.createElement("td");
    td.className = "col";
    const span = document.createElement("span");
    let label;
    if (symbol === "+") {
      span.className = "plus";
      span.textContent = "+";
      label = strings.defined;
    } else if (symbol === "-") {
      span.className = "minus";
      span.textContent = "\\u2212";
      label = strings.shadowed;
    } else {
      span.className = "dot";
      span.textContent = "\\u00b7";
      label = strings.absent;
    }
    span.setAttribute("role", "img");
    span.setAttribute("aria-label", label);
    td.appendChild(span);
    return td;
  }

  function headerRow(target, columns) {
    target.textContent = "";
    const first = document.createElement("th");
    first.scope = "col";
    first.textContent = strings.entity;
    target.appendChild(first);
    for (const column of columns) {
      const th = document.createElement("th");
      th.className = "col";
      th.scope = "col";
      th.textContent = column;
      target.appendChild(th);
    }
  }

  function renderScope(state) {
    headerRow(scopeHead, state.scopeColumns);
    scopeBody.textContent = "";
    if (state.scopeRows.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = state.scopeColumns.length + 1;
      td.className = "empty";
      td.textContent = strings.nothing;
      tr.appendChild(td);
      scopeBody.appendChild(tr);
      return;
    }
    for (const row of state.scopeRows) {
      const tr = document.createElement("tr");
      tr.appendChild(entityCell(row));
      for (const symbol of row.cells) {
        tr.appendChild(markCell(symbol));
      }
      scopeBody.appendChild(tr);
    }
  }

  function renderApps(state) {
    headerRow(head, state.columns);
    body.textContent = "";
    if (state.rows.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = state.columns.length + 1;
      td.className = "empty";
      td.textContent = strings.nothing;
      tr.appendChild(td);
      body.appendChild(tr);
    }
    for (const row of state.rows) {
      const tr = document.createElement("tr");
      tr.appendChild(entityCell(row));
      for (const value of row.cells) {
        tr.appendChild(markCell(value ? "+" : "\u00b7"));
      }
      body.appendChild(tr);
    }

    foot.textContent = "";
    const label = document.createElement("td");
    label.textContent = strings.total;
    foot.appendChild(label);
    for (const total of state.totals) {
      const td = document.createElement("td");
      td.className = "col";
      td.textContent = String(total);
      foot.appendChild(td);
    }
  }

  window.addEventListener("message", (event) => {
    if (!event.data || event.data.type !== "state") {
      return;
    }
    const state = event.data.state;
    summary.textContent =
      state.rows.length +
      " " +
      strings.rows +
      " \\u00b7 " +
      state.columns.length +
      " " +
      strings.applications;
    renderScope(state);
    renderApps(state);
  });
  vscode.postMessage({ type: "ready" });
</script>
</body>
</html>`;
}
