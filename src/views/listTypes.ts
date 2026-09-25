import type { Scope } from "../model/types";

export type RowState =
  | "active"
  | "disabled"
  | "shadowed"
  | "winner"
  | "overridden"
  | "warning"
  | "error"
  | "info";

export interface ListToggle {
  category: string;
  name: string;
  /** Canonical file (without `.disabled`) or the canonical config file for MCP. */
  file: string;
  /** Whether the entity is currently enabled. */
  enabled: boolean;
}

export interface ListRow {
  name: string;
  description?: string;
  /** Actual file to open (the parked file when disabled). */
  path: string;
  state: RowState;
  stateText: string;
  toggle?: ListToggle;
  meta?: string[];
  generatedPath?: string;
  canonicalPath?: string;
  envVars?: string[];
  scope?: Scope;
  stateType?: string;
}

export interface ListGroup {
  label: string;
  count: number;
  rows: ListRow[];
}

export interface ListState {
  loading?: boolean;
  summary?: string;
  groups: ListGroup[];
}

export function loadingState(summary?: string): ListState {
  return { loading: true, summary, groups: [] };
}
