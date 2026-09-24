import type { Node } from "./nodes";

export class FilterState {
  private value: string | undefined;

  set(value: string | undefined): void {
    const trimmed = value?.trim().toLowerCase();
    this.value = trimmed && trimmed.length > 0 ? trimmed : undefined;
  }

  get(): string | undefined {
    return this.value;
  }

  get active(): boolean {
    return this.value !== undefined;
  }

  matches(name: string): boolean {
    return this.value === undefined || name.toLowerCase().includes(this.value);
  }

  apply(nodes: Node[]): Node[] {
    if (this.value === undefined) {
      return nodes;
    }
    const result: Node[] = [];
    for (const node of nodes) {
      if (node.kind === "group") {
        const children = this.apply(node.children);
        if (children.length > 0) {
          result.push({ ...node, children });
        }
      } else if (node.kind === "entity") {
        if (this.matches(node.name)) {
          result.push(node);
        }
      }
    }
    return result;
  }
}
