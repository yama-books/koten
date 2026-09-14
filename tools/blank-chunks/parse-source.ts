/** `百人一首_句未満ランダム空欄候補_v3.md` の表を読む。表の行だけを見る（見出し・脚注は無視）。 */
export type DocPoem = { cardNo: number; author: string; kuRaw: string[] };

const ROW = /^\|\s*(\d+)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|$/;

export function parseSource(markdown: string): DocPoem[] {
  const result: DocPoem[] = [];
  for (const line of markdown.split(/\r?\n/)) {
    const match = ROW.exec(line);
    if (!match) continue;
    const [, cardNoText, author, candidates] = match;
    if (cardNoText === '#') continue; // 見出し行
    const cardNo = Number(cardNoText);
    const kuRaw = candidates.split('｜');
    if (kuRaw.length !== 5) throw new Error(`${cardNo}番: 句が5つに割れない（｜ が ${kuRaw.length - 1} 個）: ${candidates}`);
    result.push({ cardNo, author, kuRaw });
  }
  if (result.length !== 100) throw new Error(`資料の行が100首ぶん揃わない（実測 ${result.length}）`);
  return result;
}
