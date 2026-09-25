# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

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
