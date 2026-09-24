import * as path from "node:path";
import type * as vscode from "vscode";
import { run } from "../util/exec";

export type SyncId = "all" | "agents" | "skills" | "mcp";

export interface SyncResult {
  ok: boolean;
  scriptPath: string;
  message: string;
}

export class SyncService {
  constructor(
    private readonly output: vscode.OutputChannel,
    private readonly agentsRoot: () => string,
  ) {}

  scriptPath(id: SyncId): string {
    return path.join(this.agentsRoot(), "scripts", `sync-${id}.ps1`);
  }

  async run(id: SyncId): Promise<SyncResult> {
    const scriptPath = this.scriptPath(id);
    const args = [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      scriptPath,
    ];

    this.output.appendLine(`> pwsh ${args.join(" ")}`);
    let result = await run("pwsh", args);
    if (!result.ok && /ENOENT|not recognized|not found/i.test(result.stderr)) {
      this.output.appendLine("pwsh not found, retrying with powershell.exe");
      result = await run("powershell", args);
    }

    if (result.stdout.trim() !== "") {
      this.output.appendLine(result.stdout.trimEnd());
    }
    if (result.stderr.trim() !== "") {
      this.output.appendLine(result.stderr.trimEnd());
    }

    const message = result.ok ? `sync-${id} completed` : `sync-${id} failed`;
    this.output.appendLine(message);
    return { ok: result.ok, scriptPath, message };
  }
}
