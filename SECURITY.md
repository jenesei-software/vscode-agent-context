# Security policy

## Scope

Agent Context Manager is a local VS Code extension. It reads agent configuration from
`~/.agents` and a small set of project locations, and it never sends data to a
server and never collects telemetry.

The extension only reads environment variable *names* to report whether a secret
is present. It never reads or displays secret values.

## Reporting a vulnerability

Report a vulnerability privately through the repository's **Security** tab
("Report a vulnerability"). Please include:

- a description of the issue and its impact;
- steps to reproduce;
- the extension and VS Code versions;
- any suggested fix, if you have one.

## What to expect

This is a hobby project, so fixes are handled on a best-effort basis. You will
receive an acknowledgement when the report is reviewed.
