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
  body {
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    padding: 10px 12px;
  }
  h1 { font-size: 1.1em; margin: 0 0 4px; }
  h2 { font-size: 1em; margin: 18px 0 6px; }
  p.hint { opacity: 0.7; margin: 0 0 10px; }
  table { border-collapse: collapse; width: 100%; }
  th, td {
    border-bottom: 1px solid var(--vscode-panel-border);
    padding: 3px 8px;
    text-align: left;
    vertical-align: top;
    white-space: nowrap;
  }
  th { position: sticky; top: 0; background: var(--vscode-sideBar-background); }
  th.col, td.col { text-align: center; width: 1%; }
  .name { white-space: normal; }
  .meta { opacity: 0.6; font-size: 0.9em; display: block; }
  .plus { color: var(--vscode-charts-green, #3fb950); }
  .minus { color: var(--vscode-charts-red, #f85149); }
  .dot { opacity: 0.25; }
  tfoot td { font-weight: 600; border-top: 1px solid var(--vscode-panel-border); }
  .empty { opacity: 0.7; }
  .scope-project .meta { color: var(--vscode-charts-green, #3fb950); }
</style>
</head>
<body>
<h1>Applicability</h1>

<h2>Scope matrix</h2>
<p class="hint">+ defined here, \u2212 shadowed by a higher priority scope, \u00b7 absent.</p>
<table id="scope">
  <thead><tr id="scopeHead"></tr></thead>
  <tbody id="scopeBody"><tr><td class="empty">Loading...</td></tr></tbody>
</table>

<h2>Application matrix</h2>
<p class="hint">Rows are effective entities; columns are the applications that discover them.</p>
<table id="matrix">
  <thead><tr id="head"></tr></thead>
  <tbody id="body"><tr><td class="empty">Loading...</td></tr></tbody>
  <tfoot><tr id="foot"></tr></tfoot>
</table>

<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const scopeHead = document.getElementById("scopeHead");
  const scopeBody = document.getElementById("scopeBody");
  const head = document.getElementById("head");
  const body = document.getElementById("body");
  const foot = document.getElementById("foot");

  function entityCell(name, category, scope) {
    const td = document.createElement("td");
    td.className = "name scope-" + scope;
    td.textContent = name;
    const meta = document.createElement("span");
    meta.className = "meta";
    meta.textContent = category + " \\u00b7 " + scope;
    td.appendChild(meta);
    return td;
  }

  function markCell(symbol) {
    const td = document.createElement("td");
    td.className = "col";
    const span = document.createElement("span");
    if (symbol === "+") {
      span.className = "plus";
    } else if (symbol === "-") {
      span.className = "minus";
    } else {
      span.className = "dot";
    }
    span.textContent = symbol === "+" ? "+" : symbol === "-" ? "\\u2212" : "\\u00b7";
    td.appendChild(span);
    return td;
  }

  function renderScope(state) {
    scopeHead.textContent = "";
    const first = document.createElement("th");
    first.textContent = "Entity";
    scopeHead.appendChild(first);
    for (const column of state.scopeColumns) {
      const th = document.createElement("th");
      th.className = "col";
      th.textContent = column;
      scopeHead.appendChild(th);
    }

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
      tr.appendChild(entityCell(row.name, row.category, row.scope));
      for (const symbol of row.cells) {
        tr.appendChild(markCell(symbol));
      }
      scopeBody.appendChild(tr);
    }
  }

  function renderApps(state) {
    head.textContent = "";
    const first = document.createElement("th");
    first.textContent = "Entity";
    head.appendChild(first);
    for (const column of state.columns) {
      const th = document.createElement("th");
      th.className = "col";
      th.textContent = column;
      head.appendChild(th);
    }

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
      tr.appendChild(entityCell(row.name, row.category, row.scope));
      for (const value of row.cells) {
        const td = document.createElement("td");
        td.className = "col";
        const span = document.createElement("span");
        span.className = value ? "plus" : "dot";
        span.textContent = value ? "\\u2713" : "\\u00b7";
        td.appendChild(span);
        tr.appendChild(td);
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
    if (event.data && event.data.type === "state") {
      renderScope(event.data.state);
      renderApps(event.data.state);
    }
  });
  vscode.postMessage({ type: "ready" });
</script>
</body>
</html>`;
}
