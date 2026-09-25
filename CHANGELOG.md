# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Global commit-rule candidates were looked up under `~/.agents/.agents/rules`
  (double prefix); they now resolve to `~/.agents/rules`.
- Removed a leftover `nvmManager.autoSwitch` setting from `.vscode/settings.json`.
- `tsconfig.test.json` now uses `Node16` module resolution (module10 was removed
  in TypeScript 7), and `npm test` clears `out/` first so stale compiled tests
  cannot run.

### Added

- Localization: `package.nls.json` / `package.nls.ru.json` for manifest
  strings, `l10n/bundle.l10n.ru.json` for runtime strings, the `"l10n"` field
  and an `l10n:extract` script. Manifest titles now use `%key%`.
- Integration test harness: `.vscode-test.mjs`, `src/test/integration/` and a
  CI `integration` job.
- `docs/RELEASING.md` with the release process.
- Accessibility: accessible names on every control, visible keyboard focus,
  `role="status"` live regions, larger hit areas, table `scope`/`caption` and
  `aria-label` on matrix marks.
- Unit tests for the MCP editor, `.disabled` scanning (skills/agents/rules) and
  the list builders.
- GitHub Actions are pinned to commit SHAs.

### Security

- Enabling/disabling and open/reveal now only act on entities from the current
  snapshot and only inside managed roots (`~/.agents`, the workspace and the
  known global config directories), with symlinks resolved via `realpath`.
- `servers.yaml` is written atomically (temporary file + rename) so a failed
  write cannot corrupt it.
- The extension is read-only in untrusted workspaces
  (`capabilities.untrustedWorkspaces: limited`).
- File reads are capped at 4 MB to avoid unbounded memory use.
- Removed the unused PowerShell execution helper (`util/exec.ts`).

### Changed

- Renamed the extension id to `vscode-agent-context` because `agent-context`
  was already taken on the Marketplace by another publisher; the display name
  stays **Agent Context**.
- Unified every view into the compact card style: **Rules**, **Agents**,
  **MCP**, **Commands** and **Plugins** are now webviews with a toggle, hover
  tooltip and open/reveal actions, like **Skills**.
- Split **Commands & Plugins** into separate **Commands** and **Plugins** views.
- Removed the tree views and the name filter; the panel is webview-only.
- Enable/disable now works for skills, agents, rules, commands and plugins by
  renaming the managed file to `*.disabled` (reversible). MCP keeps the
  `enabled` flag in `servers.yaml`.
- Restyled **Applicability** into the compact card style (scope matrix and
  application matrix).
- Added a loading indicator to every webview.
- The row details tooltip now opens from an info icon (visible on row hover)
  and flips above the row when there is no room below.
- The activity bar icon is now a 24×24 SVG that inherits the theme color
  (`currentColor`) instead of a fixed brand color.
- Added a screenshot gallery to the README (`resources/screenshots/`).
- File watchers now watch only the relevant subdirectories instead of the whole
  workspace, and the extension activates lazily (on view or command use).
- The VSIX no longer ships `package-lock.json`, `*.vsix` or `*.log`.
- Declared `capabilities.virtualWorkspaces: false` and extended the
  `.gitattributes` binary list; added lockfile `overrides` for the test
  toolchain.

### Removed

- All synchronization commands (`Synchronize Everything / Agents / Skills /
  MCP`) and the `agentContext.allowScripts` / `agentContext.mcpAutoSync`
  settings. The extension only enables/disables entities and never runs
  scripts.

## [0.0.1] - 2026-09-24

### Added

- Summary, Skills, Rules & Instructions, Agents, MCP Servers, Commands &
  Plugins and Health tree views in an Agent Context activity-bar container.
- Global/project scope badges, shadowing and provenance with a "Why is this
  visible?" breakdown.
- Seven-application model (VS Code, Antigravity IDE, Antigravity/Gemini, Codex,
  opencode, Claude, Copilot) and an applicability webview matrix.
- Health diagnostics: broken frontmatter, duplicate names, missing referenced
  skills, invalid YAML/JSONC/TOML, missing secret environment variables and
  generated agents without a canonical source.
- Actions: run the canonical `sync-*.ps1` scripts, open canonical and generated
  files, copy names and environment variable names, and toggle an MCP server's
  `enabled` flag in `servers.yaml`.
- File watchers on `~/.agents/**` and the workspace root for live refresh.
- Status bar summary (`skills · MCP · health`).
