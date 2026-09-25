# Releasing Agent Context Manager

Maintainer notes. The version lives in `package.json` and follows
[Semantic Versioning](https://semver.org/); every release is tagged `vX.Y.Z` and
listed in [CHANGELOG.md](../CHANGELOG.md).

## Changelog

[CHANGELOG.md](../CHANGELOG.md) follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Changes are collected
under `## [Unreleased]` (one of Added / Changed / Fixed / Removed / Deprecated /
Security). Before releasing, move the `Unreleased` entries under a new
`## [X.Y.Z] - YYYY-MM-DD` heading and update the compare links at the bottom of
the file.

## Automated release

Releases go through the
[release workflow](../.github/workflows/release.yml): Actions → **Release** →
*Run workflow*, pick `patch` / `minor` / `major`. It verifies the build, bumps
the version, commits, tags, builds the `.vsix`, publishes to the
[Visual Studio Marketplace](https://marketplace.visualstudio.com/) and creates a
GitHub release.

The workflow bumps `package.json`, `package-lock.json` and the version badge in
`README.md`; it does **not** touch the changelog, so prepare the `## [X.Y.Z]`
section in the same PR that ships the changes.

## One-time setup

1. **Publisher** — create it at
   <https://marketplace.visualstudio.com/manage>. The id must match `publisher`
   in `package.json` (`jenesei-software`).
2. **PAT** — in Azure DevOps create a Personal Access Token with the
   **Marketplace → Manage** scope (organization *All accessible organizations*).
3. **Secret** — add it to the repository as the `VSCE_PAT` secret
   (Settings → Secrets and variables → Actions). Without it the workflow still
   tags and builds the `.vsix`, but skips the Marketplace publish.

## Local publish

Set `VSCE_PAT` in the environment and run:

```powershell
npm run vsix:publish
```
