import { readFileSync } from 'node:fs';
import { paths } from './paths.ts';
import { assertCardNumbers, parsePipeTable } from './parse-table.ts';
export function parsePoems(file = paths.sources.poems) {
  const table = parsePipeTable(readFileSync(file, 'utf8'), 7); assertCardNumbers(table.rows, 'poems');
  return table.rows.map(([cardNo, author, ...ku]) => ({ cardNo: Number(cardNo), author, ku }));
}
