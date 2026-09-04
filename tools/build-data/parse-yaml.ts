function fail(lineNo: number, line: string): never {
  throw new Error(`YAML parse error at line ${lineNo}: ${line}`);
}

function scalar(value: string, lineNo: number, line: string): unknown {
  if (value === 'null') return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+$/.test(value)) return Number(value);
  if (value === '[]') return [];
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) return value.slice(1, -1);
  if (/[\[\]{}&*!>|]/.test(value) || value.startsWith('- ')) fail(lineNo, line);
  return value;
}

type Line = { indent: number; text: string; lineNo: number; raw: string };

export function parseYaml(input: string): Record<string, unknown> {
  const lines: Line[] = [];
  input.split(/\r?\n/).forEach((raw, index) => {
    if (raw.includes('\t')) fail(index + 1, raw);
    if (raw.trimStart().startsWith('#')) return;
    const withoutComment = raw.replace(/\s+#.*$/, '').trimEnd();
    if (!withoutComment.trim()) return;
    const indent = withoutComment.length - withoutComment.trimStart().length;
    if (indent % 2 !== 0) fail(index + 1, raw);
    lines.push({ indent, text: withoutComment.trimStart(), lineNo: index + 1, raw });
  });
  let cursor = 0;
  const parseMap = (indent: number): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    while (cursor < lines.length && lines[cursor].indent === indent && !lines[cursor].text.startsWith('- ')) {
      const current = lines[cursor++];
      const match = /^([^:#][^:]*):(?:\s+(.*))?$/.exec(current.text);
      if (!match) fail(current.lineNo, current.raw);
      const [, key, rawValue] = match;
      if (rawValue === undefined) {
        if (cursor >= lines.length || lines[cursor].indent <= indent) fail(current.lineNo, current.raw);
        result[key] = lines[cursor].text.startsWith('- ') ? parseList(indent + 2) : parseMap(indent + 2);
      } else result[key] = scalar(rawValue, current.lineNo, current.raw);
    }
    return result;
  };
  const parseList = (indent: number): Record<string, unknown>[] => {
    const result: Record<string, unknown>[] = [];
    while (cursor < lines.length && lines[cursor].indent === indent && lines[cursor].text.startsWith('- ')) {
      const current = lines[cursor++];
      const match = /^-\s+([^:#][^:]*):(?:\s+(.*))?$/.exec(current.text);
      if (!match) fail(current.lineNo, current.raw);
      const item: Record<string, unknown> = {};
      const [, key, rawValue] = match;
      if (rawValue === undefined) fail(current.lineNo, current.raw);
      item[key] = scalar(rawValue, current.lineNo, current.raw);
      while (cursor < lines.length && lines[cursor].indent === indent + 2 && !lines[cursor].text.startsWith('- ')) {
        const field = lines[cursor++];
        const fieldMatch = /^([^:#][^:]*):(?:\s+(.*))?$/.exec(field.text);
        if (!fieldMatch || fieldMatch[2] === undefined) fail(field.lineNo, field.raw);
        item[fieldMatch[1]] = scalar(fieldMatch[2], field.lineNo, field.raw);
      }
      result.push(item);
    }
    return result;
  };
  const result = parseMap(0);
  if (cursor !== lines.length) fail(lines[cursor].lineNo, lines[cursor].raw);
  return result;
}
