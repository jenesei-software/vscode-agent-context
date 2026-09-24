import { parse as parseYaml } from "yaml";

export interface FrontmatterResult {
  data: Record<string, unknown>;
  body: string;
  hasFrontmatter: boolean;
  error?: string;
}

const FRONTMATTER =
  /^\uFEFF?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n([\s\S]*))?$/;

export function parseFrontmatter(raw: string): FrontmatterResult {
  const match = FRONTMATTER.exec(raw);
  if (!match) {
    return {
      data: {},
      body: raw,
      hasFrontmatter: false,
      error: "No YAML frontmatter delimiters (---) found.",
    };
  }

  const body = match[2] ?? "";
  let parsed: unknown;
  try {
    parsed = parseYaml(match[1]);
  } catch (error) {
    return {
      data: {},
      body,
      hasFrontmatter: true,
      error: `Invalid YAML frontmatter: ${(error as Error).message}`,
    };
  }

  if (parsed === null || parsed === undefined) {
    return { data: {}, body, hasFrontmatter: true };
  }
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      data: {},
      body,
      hasFrontmatter: true,
      error: "Frontmatter must be a YAML mapping.",
    };
  }

  return {
    data: parsed as Record<string, unknown>,
    body,
    hasFrontmatter: true,
  };
}

export function asString(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return undefined;
}

export function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => asString(item))
      .filter((item): item is string => item !== undefined);
  }
  const single = asString(value);
  return single === undefined ? [] : [single];
}

export function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return undefined;
}
