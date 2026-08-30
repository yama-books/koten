import { readFileSync } from 'node:fs';
import { paths } from './paths.ts';
import { parsePipeTable } from './parse-table.ts';
const URL = /https?:\/\/[^\s/]+(?:\/[^\s/]*)*/g;
function fields(item: string) {
  const fields: string[] = [];
  if (item.includes('作者')) fields.push('author');
  for (const [word, field] of [['初句', 'ku1'], ['二句', 'ku2'], ['三句', 'ku3'], ['四句', 'ku4'], ['五句', 'ku5']] as const) if (item.includes(word)) fields.push(field);
  return fields.length ? fields : [item];
}
export function parseVariants(file = paths.sources.variants) {
  const table = parsePipeTable(readFileSync(file, 'utf8'), 6);
  return table.rows.flatMap(([cardNo, item, adopted, alternatives, decision, evidence]) => fields(item).map((field) => ({
    cardNo: Number(cardNo), field, adopted, alternatives: [alternatives],
    kind: item.includes('読み') ? '読み方式' : field.startsWith('ku') ? '異本文' : '異表記',
    decision, evidenceUrls: evidence.match(URL) ?? [],
  })));
}
export function readingReviewCardNumbers(variants: ReturnType<typeof parseVariants>) {
  return new Set(variants.filter((variant) => variant.kind === '読み方式').map((variant) => variant.cardNo));
}
