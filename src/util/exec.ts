import { execFile } from "node:child_process";

export interface ExecResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  code: number | null;
}

export interface ExecOptions {
  cwd?: string;
  timeoutMs?: number;
}

export function run(
  command: string,
  args: string[],
  options: ExecOptions = {},
): Promise<ExecResult> {
  return new Promise((resolveRun) => {
    execFile(
      command,
      args,
      {
        cwd: options.cwd,
        timeout: options.timeoutMs ?? 120_000,
        maxBuffer: 16 * 1024 * 1024,
        windowsHide: true,
        encoding: "utf8",
      },
      (error, stdout, stderr) => {
        const code =
          error && typeof (error as { code?: number }).code === "number"
            ? ((error as { code?: number }).code ?? null)
            : error
              ? 1
              : 0;
        resolveRun({
          ok: !error,
          stdout: stdout ?? "",
          stderr: stderr ?? (error ? String(error) : ""),
          code,
        });
      },
    );
  });
}
