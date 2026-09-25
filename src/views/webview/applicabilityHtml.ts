import type * as vscode from "vscode";

function createNonce(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let text = "";
  for (let index = 0; index < 32; index++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

export function getApplicabilityHtml(_webview: vscode.Webview): string {
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
  .summary { opacity: 0.7; margin: 0 0 10px; }
  .group-title {
    padding: 10px 2px 5px;
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
<div class="summary" id="summary"></div>

<div class="group-title">Scope matrix <span class="hint">+ defined &middot; \u2212 shadowed &middot; \u00b7 absent</span></div>
<div class="card"><table id="scope">
  <thead><tr id="scopeHead"></tr></thead>
  <tbody id="scopeBody"><tr><td class="empty">Loading...</td></tr></tbody>
</table></div>

<div class="group-title">Application matrix</div>
<div class="card"><table id="matrix">
  <thead><tr id="head"></tr></thead>
  <tbody id="body"><tr><td class="empty">Loading...</td></tr></tbody>
  <tfoot><tr id="foot"></tr></tfoot>
</table></div>

<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
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
    if (symbol === "+") {
      span.className = "plus";
      span.textContent = "+";
    } else if (symbol === "-") {
      span.className = "minus";
      span.textContent = "\\u2212";
    } else {
      span.className = "dot";
      span.textContent = "\\u00b7";
    }
    td.appendChild(span);
    return td;
  }

  function headerRow(target, columns, firstLabel) {
    target.textContent = "";
    const first = document.createElement("th");
    first.textContent = firstLabel;
    target.appendChild(first);
    for (const column of columns) {
      const th = document.createElement("th");
      th.className = "col";
      th.textContent = column;
      target.appendChild(th);
    }
  }

  function renderScope(state) {
    headerRow(scopeHead, state.scopeColumns, "Entity");
    scopeBody.textContent = "";
    if (state.scopeRows.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = state.scopeColumns.length + 1;
      td.className = "empty";
      td.textContent = "Nothing to show.";
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
    headerRow(head, state.columns, "Entity");
    body.textContent = "";
    if (state.rows.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = state.columns.length + 1;
      td.className = "empty";
      td.textContent = "Nothing to show.";
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
    label.textContent = "Total";
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
      " rows \\u00b7 " +
      state.columns.length +
      " applications";
    renderScope(state);
    renderApps(state);
  });
  vscode.postMessage({ type: "ready" });
</script>
</body>
</html>`;
}
