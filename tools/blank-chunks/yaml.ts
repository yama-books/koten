/**
 * `review/blank-chunks.yaml` 専用の書き出し・読み込み。
 * `tools/build-data/parse-yaml.ts` は値に配列（`[a, b]`）を持てないので、
 * このファイルの形（`chunks: [a, b]` を持つ）には使えない。ここだけの専用の対にする。
 */
export type BlankChunkEntry = {
  cardNo: number;
  ku: number;
  text: string;
  chunks: string[];
  readings: string[];
  candidate: boolean[];
};

const HEADER = `# 句未満の区切り（発注085）。資料 百人一首_句未満ランダム空欄候補_v3.md の区切りを
# 正本表記の上へ移したもの。読みを介して運んだ。手で編集しないこと。
`;

function inlineArray(values: readonly (string | boolean)[]): string {
  return `[${values.join(', ')}]`;
}

export function stringifyBlankChunks(entries: readonly BlankChunkEntry[]): string {
  const lines = ['version: 1', 'entries:'];
  for (const entry of entries) {
    lines.push(`  - cardNo: ${entry.cardNo}`);
    lines.push(`    ku: ${entry.ku}`);
    lines.push(`    text: ${entry.text}`);
    lines.push(`    chunks: ${inlineArray(entry.chunks)}`);
    lines.push(`    readings: ${inlineArray(entry.readings)}`);
    lines.push(`    candidate: ${inlineArray(entry.candidate)}`);
  }
  return HEADER + lines.join('\n') + '\n';
}

function parseInlineArray(raw: string, lineNo: number): string[] {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) throw new Error(`blank-chunks.yaml 行 ${lineNo}: 配列でない: ${raw}`);
  const inner = trimmed.slice(1, -1).trim();
  if (inner === '') return [];
  return inner.split(',').map((part) => part.trim());
}

export function parseBlankChunksYaml(content: string): { version: number; entries: BlankChunkEntry[] } {
  const lines = content.split(/\r?\n/);
  let version = 0;
  const entries: BlankChunkEntry[] = [];
  let current: Partial<BlankChunkEntry> | null = null;

  const flush = (lineNo: number): void => {
    if (current === null) return;
    const { cardNo, ku, text, chunks, readings, candidate } = current;
    if (cardNo === undefined || ku === undefined || text === undefined || chunks === undefined || readings === undefined || candidate === undefined) {
      throw new Error(`blank-chunks.yaml 行 ${lineNo}: entry が不完全`);
    }
    entries.push({ cardNo, ku, text, chunks, readings, candidate });
    current = null;
  };

  lines.forEach((raw, index) => {
    const lineNo = index + 1;
    const line = raw.replace(/\r$/, '');
    if (line.trim() === '' || line.trimStart().startsWith('#')) return;
    const versionMatch = /^version:\s*(\d+)$/.exec(line);
    if (versionMatch) { version = Number(versionMatch[1]); return; }
    if (line === 'entries:') return;
    const entryStart = /^ {2}- cardNo:\s*(\d+)$/.exec(line);
    if (entryStart) { flush(lineNo); current = { cardNo: Number(entryStart[1]) }; return; }
    if (current === null) throw new Error(`blank-chunks.yaml 行 ${lineNo}: entry の外にある: ${line}`);
    const field = /^ {4}(\w+):\s*(.+)$/.exec(line);
    if (!field) throw new Error(`blank-chunks.yaml 行 ${lineNo}: 読めない: ${line}`);
    const [, key, value] = field;
    if (key === 'ku') current.ku = Number(value);
    else if (key === 'text') current.text = value;
    else if (key === 'chunks') current.chunks = parseInlineArray(value, lineNo);
    else if (key === 'readings') current.readings = parseInlineArray(value, lineNo);
    else if (key === 'candidate') current.candidate = parseInlineArray(value, lineNo).map((item) => item === 'true');
    else throw new Error(`blank-chunks.yaml 行 ${lineNo}: 知らない項目: ${key}`);
  });
  flush(lines.length);
  return { version, entries };
}
