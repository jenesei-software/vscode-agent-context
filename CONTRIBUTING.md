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
npm run build          # bundle once
npm run build:watch    # bundle on change
npm run lint           # biome check
npm run lint:fix       # biome check --write
npm run typecheck      # tsc --noEmit
npm run check:registry # fail if the lockfile uses a non-public registry
npm test               # node:test unit tests
npm run check          # lint + typecheck + registry
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
| `src/commands.ts` | Command registration and handlers. |
| `src/config.ts` | Typed access to settings and the workspace root. |
| `src/model/` | Domain types and the versioned application registry. |
| `src/parse/` | Pure parsers for YAML frontmatter, JSONC and TOML. |
| `src/discovery/` | Scanners and the merge/precedence engine. |
| `src/services/` | Context service, watcher, sync runner, MCP editor. |
| `src/views/` | Tree providers, applicability webview and filtering. |
| `src/util/` | Filesystem, path and exec helpers. |
| `src/test/` | Unit tests for the pure layers. |

## Code guidelines

- English comments and user-facing strings.
- Follow Conventional Commits; the rules live in `.agents/rules/git-commits.md`.
- Keep the pure layers (`parse`, `model`, `discovery`, `util`) free of the VS
  Code API so they stay unit-testable.
- Make sure `npm run check` and `npm test` pass, and keep pull requests focused.

## Releasing

The `Release` workflow is triggered manually. It bumps the version, tags the
commit, builds the `.vsix`, publishes it to the Visual Studio Marketplace when
the `VSCE_PAT` secret is set, and attaches it to a GitHub release.

One-time setup: create the `jenesei-software` publisher, generate a Personal
Access Token with the Marketplace scope, and store it as the `VSCE_PAT` secret.
