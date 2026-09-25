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

export function getListHtml(_webview: vscode.Webview): string {
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
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    background: transparent;
  }
  .summary { opacity: 0.7; font-size: 11px; margin: 0 0 8px; }
  .group-title {
    padding: 8px 2px 5px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    opacity: 0.7;
  }
  .group-title .count { font-weight: 400; opacity: 0.8; margin-left: 4px; }
  .card {
    border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    border-radius: 8px;
    background: var(--vscode-sideBar-background);
  }
  .row {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 5px 10px;
    min-height: 30px;
  }
  .row:hover { background: var(--vscode-list-hoverBackground); }
  .divider { height: 1px; background: var(--vscode-widget-border, var(--vscode-panel-border)); }
  .row-main { display: flex; align-items: baseline; gap: 6px; min-width: 0; }
  .name {
    padding: 0;
    border: none;
    background: none;
    color: var(--vscode-foreground);
    font: inherit;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .name:hover { color: var(--vscode-textLink-foreground); text-decoration: underline; }
  .state { font-size: 10px; white-space: nowrap; }
  .state.active { color: var(--vscode-charts-green, #3fb950); }
  .state.winner { color: var(--vscode-charts-green, #3fb950); }
  .state.disabled { color: var(--vscode-charts-red, #f85149); }
  .state.shadowed { color: var(--vscode-charts-orange, #d29922); }
  .state.overridden { color: var(--vscode-charts-orange, #d29922); }
  .state.warning { color: var(--vscode-charts-orange, #d29922); }
  .state.error { color: var(--vscode-charts-red, #f85149); }
  .state.info { opacity: 0.7; }
  .row-actions { display: flex; align-items: center; gap: 8px; flex: none; }
  .link {
    padding: 0;
    border: none;
    background: none;
    color: var(--vscode-textLink-foreground);
    font: inherit;
    font-size: 11px;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.1s ease;
  }
  .row:hover .link,
  .link:focus-visible { opacity: 1; }
  .link:hover { color: var(--vscode-textLink-activeForeground); text-decoration: underline; }
  .switch { position: relative; display: inline-block; width: 30px; height: 16px; flex: none; }
  .switch input { position: absolute; opacity: 0; width: 0; height: 0; }
  .slider {
    position: absolute;
    inset: 0;
    border-radius: 999px;
    background: var(--vscode-checkbox-background, var(--vscode-input-background));
    border: 1px solid var(--vscode-checkbox-border, var(--vscode-input-border));
    transition: background 0.12s ease;
  }
  .slider::before {
    content: "";
    position: absolute;
    width: 10px;
    height: 10px;
    left: 2px;
    top: 2px;
    border-radius: 50%;
    background: var(--vscode-foreground);
    transition: transform 0.12s ease;
  }
  .switch input:checked + .slider {
    background: var(--vscode-button-background);
    border-color: var(--vscode-button-background);
  }
  .switch input:checked + .slider::before {
    transform: translateX(14px);
    background: var(--vscode-button-foreground);
  }
  .switch input:focus-visible + .slider { outline: 2px solid var(--vscode-focusBorder); outline-offset: 1px; }
  .hint {
    display: none;
    position: absolute;
    left: 10px;
    top: calc(100% - 2px);
    z-index: 20;
    max-width: 340px;
    padding: 6px 8px;
    border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
    border-radius: 6px;
    background: var(--vscode-editorHoverWidget-background, var(--vscode-editorWidget-background, var(--vscode-sideBar-background)));
    color: var(--vscode-editorHoverWidget-foreground, var(--vscode-foreground));
    font-size: 11px;
    line-height: 1.4;
    white-space: normal;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  }
  .row:hover .hint { display: block; }
  .hint-meta { opacity: 0.7; margin-top: 4px; white-space: pre-line; }
  .empty { opacity: 0.7; padding: 8px 2px; }
  .loading { display: flex; align-items: center; gap: 8px; padding: 10px 2px; opacity: 0.8; }
  .spinner {
    width: 12px;
    height: 12px;
    border: 2px solid var(--vscode-panel-border);
    border-top-color: var(--vscode-textLink-foreground, var(--vscode-foreground));
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) {
    .slider, .slider::before, .link { transition: none; }
    .spinner { animation-duration: 2s; }
  }
</style>
</head>
<body>
<div class="summary" id="summary"></div>
<div id="content"></div>
<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const summary = document.getElementById("summary");
  const content = document.getElementById("content");

  function send(message) {
    vscode.postMessage(message);
  }

  function renderLoading() {
    content.textContent = "";
    const wrap = document.createElement("div");
    wrap.className = "loading";
    const spinner = document.createElement("span");
    spinner.className = "spinner";
    const text = document.createElement("span");
    text.textContent = "Scanning...";
    wrap.appendChild(spinner);
    wrap.appendChild(text);
    content.appendChild(wrap);
  }

  function switchEl(row) {
    const label = document.createElement("label");
    label.className = "switch";
    label.title = row.toggle.enabled ? "Disable" : "Enable";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = row.toggle.enabled;
    input.addEventListener("change", () => {
      send({ type: "toggle", toggle: row.toggle });
    });
    label.appendChild(input);
    const slider = document.createElement("span");
    slider.className = "slider";
    label.appendChild(slider);
    return label;
  }

  function linkButton(text, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "link";
    button.textContent = text;
    button.addEventListener("click", onClick);
    return button;
  }

  function renderRow(row) {
    const element = document.createElement("div");
    element.className = "row";

    const main = document.createElement("span");
    main.className = "row-main";
    const name = document.createElement("button");
    name.type = "button";
    name.className = "name";
    name.textContent = row.name;
    if (row.path) {
      name.addEventListener("click", () => send({ type: "open", path: row.path }));
    }
    main.appendChild(name);
    const state = document.createElement("span");
    state.className = "state " + row.state;
    state.textContent = row.stateText || "";
    main.appendChild(state);
    element.appendChild(main);

    const actions = document.createElement("span");
    actions.className = "row-actions";
    if (row.path) {
      actions.appendChild(linkButton("Open", () => send({ type: "open", path: row.path })));
      actions.appendChild(linkButton("Reveal", () => send({ type: "reveal", path: row.path })));
    }
    if (row.generatedPath) {
      actions.appendChild(
        linkButton("Codex", () => send({ type: "open", path: row.generatedPath })),
      );
    }
    if (row.envVars && row.envVars.length > 0) {
      actions.appendChild(
        linkButton("Env", () => send({ type: "copyEnv", values: row.envVars })),
      );
    }
    if (row.toggle) {
      actions.appendChild(switchEl(row));
    }
    element.appendChild(actions);

    const hint = document.createElement("div");
    hint.className = "hint";
    const text = document.createElement("div");
    text.textContent = row.description || "No description.";
    hint.appendChild(text);
    const metaLines = [];
    if (row.meta) {
      for (const line of row.meta) {
        if (line) {
          metaLines.push(line);
        }
      }
    }
    if (metaLines.length > 0) {
      const meta = document.createElement("div");
      meta.className = "hint-meta";
      meta.textContent = metaLines.join("\\n");
      hint.appendChild(meta);
    }
    element.appendChild(hint);

    return element;
  }

  function renderGroup(group) {
    const section = document.createElement("section");
    const title = document.createElement("div");
    title.className = "group-title";
    title.textContent = group.label;
    const count = document.createElement("span");
    count.className = "count";
    count.textContent = String(group.count);
    title.appendChild(count);
    section.appendChild(title);

    const card = document.createElement("div");
    card.className = "card";
    group.rows.forEach((row, index) => {
      if (index > 0) {
        const divider = document.createElement("div");
        divider.className = "divider";
        card.appendChild(divider);
      }
      card.appendChild(renderRow(row));
    });
    section.appendChild(card);
    return section;
  }

  window.addEventListener("message", (event) => {
    if (!event.data || event.data.type !== "state") {
      return;
    }
    const state = event.data.state;
    if (state.loading) {
      summary.textContent = state.summary || "";
      renderLoading();
      return;
    }
    summary.textContent = state.summary || "";
    content.textContent = "";
    if (state.groups.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "Nothing found.";
      content.appendChild(empty);
      return;
    }
    for (const group of state.groups) {
      content.appendChild(renderGroup(group));
    }
  });

  renderLoading();
  vscode.postMessage({ type: "ready" });
</script>
</body>
</html>`;
}
