export interface TomlResult {
  data: Record<string, unknown>;
  error?: string;
}

type Table = Record<string, unknown>;

function stripComment(line: string): string {
  let quote: string | null = null;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (quote) {
      if (char === "\\" && quote === '"') {
        index++;
      } else if (char === quote) {
        quote = null;
      }
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === "#") {
      return line.slice(0, index);
    }
  }
  return line;
}

function findTopLevelEquals(line: string): number {
  let quote: string | null = null;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (quote) {
      if (char === "\\" && quote === '"') {
        index++;
      } else if (char === quote) {
        quote = null;
      }
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === "=") {
      return index;
    }
  }
  return -1;
}

function isBalanced(text: string): boolean {
  let quote: string | null = null;
  const stack: string[] = [];
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quote) {
      if (char === "\\" && quote === '"') {
        index++;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
    } else if (char === "[" || char === "{") {
      stack.push(char);
    } else if (char === "]" || char === "}") {
      stack.pop();
    }
  }
  return quote === null && stack.length === 0;
}

function splitTopLevel(text: string, separator: string): string[] {
  const parts: string[] = [];
  let quote: string | null = null;
  let depth = 0;
  let current = "";
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quote) {
      current += char;
      if (char === "\\" && quote === '"') {
        current += text[++index] ?? "";
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      current += char;
    } else if (char === "[" || char === "{") {
      depth++;
      current += char;
    } else if (char === "]" || char === "}") {
      depth--;
      current += char;
    } else if (char === separator && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim() !== "") {
    parts.push(current);
  }
  return parts;
}

function unescapeBasic(text: string): string {
  return text.replace(/\\(u[0-9a-fA-F]{4}|.)/g, (_match, group: string) => {
    switch (group[0]) {
      case "n":
        return "\n";
      case "t":
        return "\t";
      case "r":
        return "\r";
      case '"':
        return '"';
      case "\\":
        return "\\";
      case "u":
        return String.fromCharCode(Number.parseInt(group.slice(1), 16));
      default:
        return group;
    }
  });
}

export function parseTomlValue(raw: string): unknown {
  const text = raw.trim();
  if (text.startsWith("'''") && text.endsWith("'''") && text.length >= 6) {
    return text.slice(3, -3);
  }
  if (text.startsWith('"""') && text.endsWith('"""') && text.length >= 6) {
    return unescapeBasic(text.slice(3, -3));
  }
  if (text.startsWith('"') && text.endsWith('"') && text.length >= 2) {
    return unescapeBasic(text.slice(1, -1));
  }
  if (text.startsWith("'") && text.endsWith("'") && text.length >= 2) {
    return text.slice(1, -1);
  }
  if (text.startsWith("[")) {
    const inner = text.slice(1, text.lastIndexOf("]"));
    return splitTopLevel(inner, ",")
      .map((part) => part.trim())
      .filter((part) => part !== "")
      .map((part) => parseTomlValue(part));
  }
  if (text.startsWith("{")) {
    const inner = text.slice(1, text.lastIndexOf("}"));
    const result: Table = {};
    for (const pair of splitTopLevel(inner, ",")) {
      const eq = pair.indexOf("=");
      if (eq < 0) {
        continue;
      }
      const key = stripQuotes(pair.slice(0, eq).trim());
      result[key] = parseTomlValue(pair.slice(eq + 1));
    }
    return result;
  }
  if (text === "true") {
    return true;
  }
  if (text === "false") {
    return false;
  }
  if (/^[+-]?\d+$/.test(text)) {
    return Number.parseInt(text, 10);
  }
  if (/^[+-]?\d*\.\d+$/.test(text)) {
    return Number.parseFloat(text);
  }
  return text;
}

function stripQuotes(key: string): string {
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    return key.slice(1, -1);
  }
  return key;
}

function ensureTable(root: Table, dotted: string): Table {
  let current = root;
  for (const segment of splitTopLevel(dotted, ".")) {
    const key = stripQuotes(segment.trim());
    const existing = current[key];
    if (existing && typeof existing === "object" && !Array.isArray(existing)) {
      current = existing as Table;
    } else {
      const created: Table = {};
      current[key] = created;
      current = created;
    }
  }
  return current;
}

function pushArrayTable(root: Table, dotted: string): Table {
  const segments = splitTopLevel(dotted, ".").map((part) =>
    stripQuotes(part.trim()),
  );
  const lastKey = segments.pop() ?? "";
  const parent =
    segments.length > 0 ? ensureTable(root, segments.join(".")) : root;
  const existing = parent[lastKey];
  if (!Array.isArray(existing)) {
    parent[lastKey] = [];
  }
  const table: Table = {};
  (parent[lastKey] as Table[]).push(table);
  return table;
}

export function parseToml(text: string): TomlResult {
  const data: Table = {};
  const lines = text.split(/\r?\n/);
  let current = data;
  let index = 0;

  try {
    while (index < lines.length) {
      const line = stripComment(lines[index]).trim();
      if (line === "") {
        index++;
        continue;
      }
      if (line.startsWith("[[")) {
        const name = line.slice(2, line.indexOf("]]")).trim();
        current = pushArrayTable(data, name);
        index++;
        continue;
      }
      if (line.startsWith("[")) {
        const name = line.slice(1, line.lastIndexOf("]")).trim();
        current = ensureTable(data, name);
        index++;
        continue;
      }

      const eq = findTopLevelEquals(line);
      if (eq < 0) {
        index++;
        continue;
      }
      const key = stripQuotes(line.slice(0, eq).trim());
      let valueText = line.slice(eq + 1).trim();

      const triple = valueText.startsWith("'''")
        ? "'''"
        : valueText.startsWith('"""')
          ? '"""'
          : null;

      if (triple) {
        let combined = valueText;
        while (
          !isTripleComplete(combined, triple) &&
          index + 1 < lines.length
        ) {
          index++;
          combined += `\n${lines[index]}`;
        }
        valueText = combined;
      } else if (valueText.startsWith("[") || valueText.startsWith("{")) {
        while (!isBalanced(valueText) && index + 1 < lines.length) {
          index++;
          valueText += `\n${stripComment(lines[index]).trim()}`;
        }
      }

      current[key] = parseTomlValue(valueText);
      index++;
    }
  } catch (error) {
    return { data, error: (error as Error).message };
  }

  return { data };
}

function isTripleComplete(text: string, delimiter: string): boolean {
  const first = text.indexOf(delimiter);
  return first >= 0 && text.indexOf(delimiter, first + 3) >= 0;
}
