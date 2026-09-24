export interface JsoncResult {
  data: unknown;
  error?: string;
}

function preprocess(text: string): string {
  let out = "";
  let index = 0;
  const length = text.length;
  let inString = false;

  while (index < length) {
    const char = text[index];

    if (inString) {
      out += char;
      if (char === "\\") {
        out += text[index + 1] ?? "";
        index += 2;
        continue;
      }
      if (char === '"') {
        inString = false;
      }
      index++;
      continue;
    }

    if (char === '"') {
      inString = true;
      out += char;
      index++;
      continue;
    }

    if (char === "/" && text[index + 1] === "/") {
      while (index < length && text[index] !== "\n") {
        out += " ";
        index++;
      }
      continue;
    }

    if (char === "/" && text[index + 1] === "*") {
      out += "  ";
      index += 2;
      while (
        index < length &&
        !(text[index] === "*" && text[index + 1] === "/")
      ) {
        out += text[index] === "\n" ? "\n" : " ";
        index++;
      }
      if (index < length) {
        out += "  ";
        index += 2;
      }
      continue;
    }

    if (char === ",") {
      let lookahead = index + 1;
      while (lookahead < length && /\s/.test(text[lookahead])) {
        lookahead++;
      }
      if (
        lookahead < length &&
        (text[lookahead] === "}" || text[lookahead] === "]")
      ) {
        out += " ";
        index++;
        continue;
      }
    }

    out += char;
    index++;
  }

  return out;
}

export function parseJsonc(text: string): JsoncResult {
  const preprocessed = preprocess(text);
  try {
    return { data: JSON.parse(preprocessed) };
  } catch (error) {
    const message = (error as Error).message;
    const position = /position (\d+)/.exec(message);
    if (position) {
      const line = preprocessed
        .slice(0, Number(position[1]))
        .split("\n").length;
      return { data: undefined, error: `Invalid JSON at line ${line}` };
    }
    return { data: undefined, error: `Invalid JSON: ${message}` };
  }
}
