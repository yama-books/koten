import { readFileSync } from 'node:fs';
import { paths } from './paths.ts';
import { assertCardNumbers, parsePipeTable } from './parse-table.ts';
export function parseReadings(file: string, label: string) {
  const table = parsePipeTable(readFileSync(file, 'utf8'), 7); assertCardNumbers(table.rows, label);
  return table.rows.map(([cardNo, author, ...ku]) => ({ cardNo: Number(cardNo), author, ku }));
}
export function parseAllReadings() {
  return { historical: parseReadings(paths.sources.historical, 'historical'), modern: parseReadings(paths.sources.modern, 'modern') };
}
