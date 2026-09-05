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
/**
 * 判定欄が決着を書いていない語。異同確認表は判定欄を空にできない（`parsePipeTable` が空セルを弾く）ため、
 * 「空かどうか」ではなく「保留と書いてあるか」で見る。
 */
const UNSETTLED = /(保留|未確定|未決|要確認|要検討|判断できない|結論を出していない)/;

/**
 * 読みが未確定の歌番号。
 *
 * 以前は「項目欄に『読み』の字がある行があるか」だけで決めており、判定欄が「確定」と書いてある
 * 13番・32番まで未確定として扱っていた（2026-09-05 の実機確認で発覚。依頼者裁定で確定済みへ）。
 * 異同を調べたことと、調べた結果が未決着であることは別である。
 */
export function readingReviewCardNumbers(variants: ReturnType<typeof parseVariants>) {
  return new Set(variants.filter((variant) => variant.kind === '読み方式' && UNSETTLED.test(variant.decision)).map((variant) => variant.cardNo));
}
