import type * as vscode from "vscode";

export interface ListStrings {
  scanning: string;
  nothing: string;
  noDescription: string;
  details: string;
  open: string;
  reveal: string;
  codex: string;
  env: string;
  enable: string;
  disable: string;
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

export function getListHtml(
  _webview: vscode.Webview,
  strings: ListStrings,
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
    font-size: var(--vscode-font-size);
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
  .summary { opacity: 0.7; font-size: 11px; margin: 0 0 8px; }
  .group-title {
    margin: 8px 0 5px;
    padding: 0 2px;
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
    min-height: 32px;
  }
  .row:hover { background: var(--vscode-list-hoverBackground); }
  .row:focus-within { outline: 1px solid var(--vscode-focusBorder); outline-offset: -1px; }
  .divider { height: 1px; background: var(--vscode-widget-border, var(--vscode-panel-border)); }
  .row-main { display: flex; align-items: baseline; gap: 6px; min-width: 0; }
  .name {
    padding: 3px 0;
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
  .row-actions { display: flex; align-items: center; gap: 6px; flex: none; }
  .link {
    padding: 4px 5px;
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
  .link.info { font-size: 13px; line-height: 1; }
  .link:hover { color: var(--vscode-textLink-activeForeground); text-decoration: underline; }
  .name:focus-visible,
  .link:focus-visible { outline: 2px solid var(--vscode-focusBorder); outline-offset: 1px; }
  .switch { position: relative; display: inline-block; width: 30px; height: 16px; flex: none; margin: 0 2px; }
  .switch::after { content: ""; position: absolute; inset: -4px; }
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
    pointer-events: none;
  }
  .hint.above { top: auto; bottom: calc(100% - 2px); }
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
<main>
  <div class="summary" id="summary" role="status" aria-live="polite"></div>
  <div id="content"></div>
</main>
<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const strings = ${JSON.stringify(strings)};
  const summary = document.getElementById("summary");
  const content = document.getElementById("content");
  let rowId = 0;

  function send(message) {
    vscode.postMessage(message);
  }

  function renderLoading() {
    content.textContent = "";
    const wrap = document.createElement("div");
    wrap.className = "loading";
    wrap.setAttribute("role", "status");
    wrap.setAttribute("aria-live", "polite");
    const spinner = document.createElement("span");
    spinner.className = "spinner";
    spinner.setAttribute("aria-hidden", "true");
    const text = document.createElement("span");
    text.textContent = strings.scanning;
    wrap.appendChild(spinner);
    wrap.appendChild(text);
    content.appendChild(wrap);
  }

  function switchEl(row) {
    const label = document.createElement("label");
    label.className = "switch";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = row.toggle.enabled;
    input.setAttribute(
      "aria-label",
      (row.toggle.enabled ? strings.disable : strings.enable) + " " + row.name,
    );
    input.addEventListener("change", () => {
      send({ type: "toggle", toggle: row.toggle });
    });
    label.appendChild(input);
    const slider = document.createElement("span");
    slider.className = "slider";
    slider.setAttribute("aria-hidden", "true");
    label.appendChild(slider);
    return label;
  }

  function linkButton(text, ariaLabel, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "link";
    button.textContent = text;
    button.setAttribute("aria-label", ariaLabel);
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
    name.setAttribute("aria-label", strings.open + " " + row.name);
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
      actions.appendChild(
        linkButton(strings.open, strings.open + " " + row.name, () =>
          send({ type: "open", path: row.path }),
        ),
      );
      actions.appendChild(
        linkButton(strings.reveal, strings.reveal + " " + row.name, () =>
          send({ type: "reveal", path: row.path }),
        ),
      );
    }
    if (row.generatedPath) {
      actions.appendChild(
        linkButton(strings.codex, strings.codex + " " + row.name, () =>
          send({ type: "open", path: row.generatedPath }),
        ),
      );
    }
    if (row.envVars && row.envVars.length > 0) {
      actions.appendChild(
        linkButton(strings.env, strings.env + " " + row.name, () =>
          send({ type: "copyEnv", values: row.envVars }),
        ),
      );
    }
    if (row.toggle) {
      actions.appendChild(switchEl(row));
    }
    element.appendChild(actions);

    const description = row.description || strings.noDescription;
    const metaLines = [];
    if (row.meta) {
      for (const line of row.meta) {
        if (line) {
          metaLines.push(line);
        }
      }
    }

    const id = "desc-" + ++rowId;
    const describedBy = document.createElement("span");
    describedBy.className = "visually-hidden";
    describedBy.id = id;
    describedBy.textContent =
      description + (metaLines.length > 0 ? ". " + metaLines.join(". ") : "");
    element.appendChild(describedBy);

    const info = document.createElement("button");
    info.type = "button";
    info.className = "link info";
    info.textContent = "\\u24d8";
    info.setAttribute("aria-label", strings.details + " " + row.name);
    info.setAttribute("aria-describedby", id);
    const hint = document.createElement("div");
    hint.className = "hint";
    hint.setAttribute("aria-hidden", "true");
    const text = document.createElement("div");
    text.textContent = description;
    hint.appendChild(text);
    if (metaLines.length > 0) {
      const meta = document.createElement("div");
      meta.className = "hint-meta";
      meta.textContent = metaLines.join("\\n");
      hint.appendChild(meta);
    }
    element.appendChild(hint);
    const showHint = () => {
      hint.style.display = "block";
      const rowRect = element.getBoundingClientRect();
      const hintRect = hint.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rowRect.bottom;
      hint.classList.toggle("above", spaceBelow < hintRect.height + 16);
    };
    const hideHint = () => {
      hint.style.display = "none";
    };
    info.addEventListener("mouseenter", showHint);
    info.addEventListener("mouseleave", hideHint);
    info.addEventListener("focus", showHint);
    info.addEventListener("blur", hideHint);
    actions.insertBefore(info, actions.firstChild);

    return element;
  }

  function renderGroup(group) {
    const section = document.createElement("section");
    const title = document.createElement("h2");
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
        divider.setAttribute("role", "presentation");
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
      empty.textContent = strings.nothing;
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
