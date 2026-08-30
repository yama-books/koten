import { normalizeRow } from './normalize.ts';

export type MarkdownTable = { headers: string[]; rows: string[][] };
const cells = (line: string) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());

/**
 * Collects every numeric pipe-table row in the whole document. This deliberately
 * crosses blank lines so a header-less continuation block remains part of a table.
 */
export function parsePipeTable(markdown: string, expectedColumns: number): MarkdownTable {
  const allRows = markdown.split(/\r?\n/).filter((line) => line.trim().startsWith('|')).map(cells);
  const headers = allRows.find((row) => row[0] === '#') ?? [];
  const rows = allRows.filter((row) => /^\d+$/.test(row[0] ?? '')).map(normalizeRow);
  for (const row of rows) {
    if (row.length !== expectedColumns) throw new Error(`V-02: expected ${expectedColumns} columns, got ${row.length}`);
    if (row.some((cell) => cell === '')) throw new Error('V-02: empty table cell');
  }
  if (!rows.length) throw new Error('No numeric pipe-table rows found');
  return { headers: normalizeRow(headers), rows };
}

export function assertCardNumbers(rows: string[][], label: string) {
  const numbers = rows.map((row) => Number(row[0]));
  if (numbers.length !== 100) throw new Error(`V-01: ${label} has ${numbers.length}, not 100 rows`);
  const expected = new Set(Array.from({ length: 100 }, (_, index) => index + 1));
  for (const number of numbers) expected.delete(number);
  if (expected.size || new Set(numbers).size !== 100) throw new Error(`V-01: ${label} must contain each number 1..100 exactly once`);
}
