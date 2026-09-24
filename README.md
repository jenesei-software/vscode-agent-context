# Agent Context

[![Marketplace](https://img.shields.io/badge/Marketplace-Agent%20Context-007ACC?logo=visualstudiocode&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=jenesei-software.agent-context)
[![Version](https://img.shields.io/badge/version-0.0.1-2ea44f)](CHANGELOG.md)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](package.json)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

One panel that collects everything shaping your AI agents in the current project:
skills, agents, rules, MCP servers and plugins. It marks the source of every
entity, its scope (global or project), overrides and — most importantly — which
applications pick it up (VS Code, Antigravity IDE, Antigravity/Gemini, Codex,
opencode, Claude, Copilot).

<p><img src="docs/screenshot.png" alt="Agent Context" width="400"></p>

## Features

- **Effective view** — the winning entity per category after applying shadowing
  and precedence rules.
- **Provenance** — for every entity: source path, scope badge, whether it wins
  or is shadowed, and every file that defines the same name ("Why is this
  visible?").
- **Applicability matrix** — a webview table of entities (rows) against the
  applications that discover them (columns).
- **Health / Diagnostics** — broken frontmatter, duplicate names, missing
  referenced skills, invalid YAML/JSONC/TOML, missing secret environment
  variables, generated Codex agents without a canonical source.
- **Actions** — run `sync-all` / `sync-agents` / `sync-skills` / `sync-mcp`,
  open canonical and generated files, copy names and environment variable names,
  and toggle an MCP server's `enabled` flag.
- **Live refresh** — file watchers on `~/.agents/**` and the workspace root.
- **Secret safety** — only environment variable *names* are read and shown,
  never values; the panel reports whether each variable is set in the process.

## How it works

`~/.agents` is treated as the canonical source of truth. The extension reads it
(and a set of project locations) without ever writing to generated files unless
you explicitly run a sync or toggle an MCP server.

### Scopes and overrides

| Category | Global (user) | Project |
| --- | --- | --- |
| Skills | `~/.agents/skills/<name>/SKILL.md`; third-party `~/.copilot/skills`, `~/.claude/skills` | `.github/skills`, `.claude/skills`, `.agents/skills` |
| Agents | `~/.agents/agents/*.agent.md` | `.github/agents`, `.agents/agents` |
| Rules | `~/.agents/rules/*.md` | `.agents/rules/git-commits.md`, `.agents/*.md`, `commit-rules.md`, `.github/**`, `docs/commit-rules.md` |
| MCP | `~/.agents/mcp/servers.yaml` | `.vscode/mcp.json`, `.cursor/mcp.json` |
| Commands | opencode `~/.config/opencode/commands/*.md` | `.github/prompts/*.prompt.md`, `.opencode/command` |
| Plugins | `~/.config/opencode/plugins/*.ts` | `.opencode/plugin` |

- A **project** entity with the same `name` shadows the global one.
- **Rules** follow the `usr-commit` precedence: the first existing file wins
  (`<repo>/.agents/rules/git-commits.md` → other repo locations →
  `~/.agents/rules/git-commits.md`).
- **MCP** servers merge by key; a project key overrides the global one.

### Application mapping

| Application | Agents | Skills | MCP config |
| --- | --- | --- | --- |
| VS Code | `chat.agentFilesLocations` → `~/.agents/agents`, `.github/agents` | `~/.agents/skills`, `~/.copilot/skills`, `~/.claude/skills`, `.github/skills` | `%APPDATA%\Code\User\mcp.json` |
| Antigravity IDE | `~/.agents/agents` | `~/.agents/skills` | `%APPDATA%\Antigravity IDE\User\mcp.json` |
| Antigravity / Gemini | — | `~/.gemini/config/skills.json` → `~/.agents/skills` | `~/.gemini/config/mcp_config.json` |
| Codex | `~/.codex/agents/*.toml` (generated) | `~/.codex/skills` | `~/.codex/config.toml` (managed section) |
| opencode | `~/.config/opencode/opencode.jsonc` | `~/.agents/skills` | `~/.config/opencode/opencode.jsonc` (`mcp`) |
| Claude | `~/.claude/agents` | `~/.claude/skills` | `.mcp.json` |
| Copilot | — | `~/.copilot/skills`, `.github/skills` | — |

The paths-per-application mapping is versioned in `src/model/apps.ts`
(`APP_MAPPING_VERSION`) because discovery rules change between releases.

## Requirements

- VS Code `1.85.0` or newer.
- A canonical `~/.agents` directory (or a custom `agentContext.agentsRoot`).
- PowerShell 7 (`pwsh`) for the sync actions; `powershell.exe` is used as a
  fallback on Windows.

## Installation

Install **Agent Context** from the Visual Studio Marketplace, or run
`npm run vsix` and install the generated `.vsix`.

## Getting started

1. Open the **Agent Context** view in the Activity Bar.
2. Expand **Effective** to see what actually applies in this workspace.
3. Click any entity to open its source file.
4. Use **Applicability** to see which applications pick up each entity.
5. Check **Health** before trusting a skill or agent.

## Settings

| Setting | Default | Scope | Description |
| --- | --- | --- | --- |
| `agentContext.agentsRoot` | `""` | machine-overridable | Canonical directory. Empty uses `~/.agents`. |
| `agentContext.allowScripts` | `true` | window | Run the canonical `sync-*.ps1` scripts from the panel. |
| `agentContext.showThirdPartySkills` | `true` | window | Include `~/.copilot/skills` and `~/.claude/skills`. |
| `agentContext.enabledApps` | all | window | Applications to model in the matrix and badges. |
| `agentContext.mcpAutoSync` | `true` | window | Run `sync-mcp.ps1` after toggling a server's `enabled`. |

## Commands

| Command | Description |
| --- | --- |
| `Agent Context: Refresh` | Re-scan canonical and project sources. |
| `Agent Context: Filter...` | Filter entities by name. |
| `Agent Context: Clear Filter` | Remove the active filter. |
| `Agent Context: Why Is This Visible?` | Show the provenance of an entity. |
| `Agent Context: Open Canonical Source` | Open the canonical source of a generated entity. |
| `Agent Context: Copy Environment Variable Name` | Copy a secret variable name (never its value). |
| `Agent Context: Toggle Enabled` | Toggle an MCP server in `servers.yaml`. |
| `Agent Context: Synchronize Everything` | Run `sync-all.ps1`. |
| `Agent Context: Synchronize Agents / Skills / MCP Servers` | Run the matching script. |
| `Agent Context: Show Applicability Matrix` | Focus the applicability webview. |
| `Agent Context: Open Settings` | Open the extension settings. |

## Architecture

```text
src/
├─ extension.ts            composition root
├─ commands.ts             command registration
├─ config.ts               settings helpers
├─ statusBar.ts            status bar item
├─ model/                  types + versioned application registry
├─ parse/                  YAML frontmatter, JSONC and TOML parsers
├─ discovery/              scanners (skills, rules, agents, mcp, commands, plugins) + merge
├─ services/               context service, watcher, sync runner, MCP editor
├─ views/                  tree providers, applicability webview, filter
└─ test/                   node:test unit tests for the pure layers
```

## Roadmap

The plan below is fixed here on purpose, so the scope stays explicit.

### v1 — inspection and actions (shipped in this repository)

- Skills, Rules, Agents, MCP, Commands and Plugins across global and project
  scopes, with provenance, shadowing and an **Effective** view.
- Seven-application model and the applicability webview.
- Health diagnostics, status bar, live refresh, search/filter.
- Actions: run sync scripts, open/reveal, copy names and environment variable
  names, toggle an MCP server's `enabled` in `servers.yaml`.

### v2 — generated vs canonical

- Diff canonical entities against each application's generated config, with a
  `stale` marker based on mtime/hash.
- Settings-driven VS Code hint (`chat.agentFilesLocations`).
- Scaffolds for creating a new skill or agent.
- Richer dashboard in the webview.

### v3 — workspace and remote

- Multi-root workspace context per folder.
- Remote / WSL path resolution.

## Support the project

- Star the repository on [GitHub](https://github.com/jenesei-software/vscode-agent-context).
- [Donate](https://www.donationalerts.com/r/jenesei).

## License

[MIT](LICENSE)
