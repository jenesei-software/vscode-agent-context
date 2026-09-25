# Contributing

Thanks for taking the time to contribute.

## Ways to contribute

- Report bugs and request features through the issue templates.
- Improve documentation.
- Open a focused pull request.

## Development setup

Requirements: Node.js 22+ and npm.

```powershell
npm install
npm run build:watch
```

Useful scripts:

```powershell
npm run build             # bundle once
npm run build:watch       # bundle on change
npm run build:prod        # minified production bundle
npm run lint              # biome check
npm run lint:fix          # biome check --write
npm run typecheck         # tsc --noEmit
npm run check:registry    # fail if the lockfile uses a non-public registry
npm run l10n:extract      # regenerate l10n/bundle.l10n.json from source
npm test                  # node:test unit tests
npm run test:integration  # VS Code integration tests (downloads a host)
npm run check             # lint + typecheck + registry
```

## Run the extension locally

1. Open the repository in VS Code.
2. Press `F5` to launch the Extension Development Host.
3. Find **Agent Context** in the Activity Bar.

You can also install a build with:

```powershell
npm run vsix
code --install-extension agent-context-0.0.1.vsix
```

## Project layout

| Path | Purpose |
| --- | --- |
| `src/extension.ts` | Composition root and activation. |
| `src/commands.ts` | Command registration. |
| `src/config.ts` | Typed access to settings and the workspace root. |
| `src/model/` | Domain types and the versioned application registry. |
| `src/parse/` | Pure parsers for YAML frontmatter, JSONC and TOML. |
| `src/discovery/` | Scanners and the merge/precedence engine. |
| `src/services/` | Context service, watcher, file/MCP editors and path guard. |
| `src/views/` | Generic list webview, builders and the applicability webview. |
| `src/util/` | Filesystem and path helpers. |
| `src/test/` | Unit tests (`*.test.ts`) and the integration harness. |

## Code guidelines

- English comments and source strings; user-facing strings go through
  `vscode.l10n.t(...)` (runtime) or `package.nls.json` keys (manifest).
- Follow Conventional Commits; the rules live in `.agents/rules/git-commits.md`.
- Keep the pure layers (`parse`, `model`, `discovery`, `util`, `views/listBuilders`)
  free of the VS Code API so they stay unit-testable.
- Add a bullet under `## [Unreleased]` in `CHANGELOG.md`.
- Make sure `npm run check` and `npm test` pass, and keep pull requests focused.

## Releasing

Maintainer steps live in [docs/RELEASING.md](docs/RELEASING.md).
