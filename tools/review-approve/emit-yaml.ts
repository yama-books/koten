export type LedgerEntry = Record<string, unknown>;

const unsafe = /[\[\]{}&*!>|#:]|^\s|\s$|^\-\s/;

/** Emit the deliberately small YAML subset accepted by build-data/parse-yaml. */
export function emitScalar(value: unknown): string {
  if (value === null) return 'null';
  if (value === true) return 'true';
  if (value === false) return 'false';
  if (Number.isInteger(value)) return String(value);
  if (Array.isArray(value) && value.length === 0) return '[]';
  if (typeof value !== 'string') throw new Error(`cannot emit YAML scalar of type ${typeof value}`);
  if (!unsafe.test(value)) return value;
  if (value.includes('"') || value.includes("'") || /\s#/.test(value)) throw new Error('cannot safely quote YAML scalar for the limited parser');
  return `"${value}"`;
}

export function emitLedger(name: string, entries: LedgerEntry[]): string {
  const lines = [
    `# ${name} の確認台帳（人が書き込む唯一の場所）`,
    '# 状態: pending | approved | rejected | hold',
    'version: 1',
  ];
  if (entries.length === 0) return `${[...lines, 'entries: []'].join('\n')}\n`;
  lines.push('entries:');
  for (const entry of entries) {
    const fields = Object.entries(entry);
    if (fields.length === 0) throw new Error('ledger entry must not be empty');
    const [first, ...rest] = fields;
    lines.push(`  - ${first[0]}: ${emitScalar(first[1])}`);
    for (const [key, value] of rest) lines.push(`    ${key}: ${emitScalar(value)}`);
  }
  return `${lines.join('\n')}\n`;
}
