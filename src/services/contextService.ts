import * as vscode from "vscode";
import { buildSnapshot, type ScanOptions } from "../discovery/snapshot";
import type { ContextSnapshot } from "../model/types";

export class ContextService implements vscode.Disposable {
  private readonly changeEmitter = new vscode.EventEmitter<ContextSnapshot>();
  readonly onDidChange = this.changeEmitter.event;

  private snapshot: ContextSnapshot | undefined;
  private inFlight: Promise<ContextSnapshot> | undefined;

  constructor(private readonly options: () => ScanOptions) {}

  get current(): ContextSnapshot | undefined {
    return this.snapshot;
  }

  refresh(): Promise<ContextSnapshot> {
    if (!this.inFlight) {
      this.inFlight = buildSnapshot(this.options())
        .then((snapshot) => {
          this.snapshot = snapshot;
          this.inFlight = undefined;
          this.changeEmitter.fire(snapshot);
          return snapshot;
        })
        .catch((error) => {
          this.inFlight = undefined;
          throw error;
        });
    }
    return this.inFlight;
  }

  dispose(): void {
    this.changeEmitter.dispose();
  }
}
