/**
 * 歌の並びを「そのまま出す行」と「空欄」に分ける。
 *
 * **続いた句はまとめて 1 つの空欄にする**（依頼者指示・2026-09-15）——
 * 段4〜7 は複数の句を隠すので、行ごとに枠を並べると枠だらけになって読めない。
 *
 * **隠す句は `question.blankedKu` が持つ。** ID の文字列から推測しない（発注084）。
 * まとめる規則は**隣どうしだけ**である。離れた指定が来ても割れない。
 *
 * 純粋関数として切り出してあるのは、**画面を起こさずに並びを試験する**ためである。
 */
export type PromptGroup =
  | { kind: 'line'; line: string; from: number }
  | { kind: 'blank'; span: number; lines: string[]; from: number };

export function promptGroups(lines: readonly string[], blankedKu: readonly number[]): PromptGroup[] {
  const blanked = new Set(blankedKu);
  const groups: PromptGroup[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const ku = index + 1;
    if (!blanked.has(ku)) {
      groups.push({ kind: 'line', line: lines[index]!, from: ku });
      continue;
    }
    // 隣り合って隠れている限り、1 つの空欄へ吸い込む。
    const run: string[] = [];
    let end = index;
    while (end < lines.length && blanked.has(end + 1)) {
      run.push(lines[end]!);
      end += 1;
    }
    groups.push({ kind: 'blank', span: run.length, lines: run, from: ku });
    index = end - 1;
  }
  return groups;
}
