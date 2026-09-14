/**
 * 読みの割り付けが一意に決まらない句の裁定（依頼者・2026-09-15、D-14）。
 * `tools/build-data/questions.ts` の `READING_ALLOCATIONS` が同じ役目の先例である。
 *
 * ここに置くのは「各かたまりの読み」だけ。**正本表記の `chunks` は置かない**——
 * 資料の表記（許容表記）は正本と食い違うことがある（16番第5句の `今` は正本では `いま`）。
 * `chunks` はどの句でも同じ経路（読みの区切りを正本表記へ当てはめる）で求める。
 * ここで表記まで固定すると、その経路を迂回してしまう。
 */
export type BlankChunkAllocation = { cardNo: number; ku: number; readings: readonly string[] };

export const BLANK_CHUNK_READING_ALLOCATIONS: readonly BlankChunkAllocation[] = [
  { cardNo: 2, ku: 2, readings: ['なつ', 'きにけらし'] },
  { cardNo: 16, ku: 5, readings: ['いま', 'かへりこむ'] },
  { cardNo: 21, ku: 1, readings: ['いま', 'こむと'] },
  { cardNo: 23, ku: 1, readings: ['つき', 'みれば'] },
  { cardNo: 31, ku: 4, readings: ['よしのの', 'さとに'] },
  { cardNo: 38, ku: 4, readings: ['ひとの', 'いのちの'] },
  { cardNo: 39, ku: 2, readings: ['をのの', 'しのはら'] },
  { cardNo: 61, ku: 4, readings: ['けふ', 'ここのへに'] },
  { cardNo: 78, ku: 4, readings: ['いくよ', 'ねざめぬ'] },
  { cardNo: 85, ku: 2, readings: ['もの', 'おもふ', 'ころは'] },
  { cardNo: 87, ku: 4, readings: ['きり', 'たちのぼる'] },
];
