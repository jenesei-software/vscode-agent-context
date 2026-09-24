import * as vscode from "vscode";

export class WatcherService implements vscode.Disposable {
  private readonly watchers: vscode.FileSystemWatcher[] = [];
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly onChange: () => void,
    private readonly delayMs = 250,
  ) {}

  watch(roots: string[]): void {
    for (const watcher of this.watchers) {
      watcher.dispose();
    }
    this.watchers.length = 0;

    const unique = [...new Set(roots)];
    for (const root of unique) {
      const watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(vscode.Uri.file(root), "**/*"),
      );
      const trigger = (): void => this.schedule();
      watcher.onDidCreate(trigger, undefined, this.watchers);
      watcher.onDidChange(trigger, undefined, this.watchers);
      watcher.onDidDelete(trigger, undefined, this.watchers);
      this.watchers.push(watcher);
    }
  }

  private schedule(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => this.onChange(), this.delayMs);
  }

  dispose(): void {
    for (const watcher of this.watchers) {
      watcher.dispose();
    }
    this.watchers.length = 0;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }
}
