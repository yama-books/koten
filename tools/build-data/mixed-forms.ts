/**
 * 本文の「中間形」——漢字とかなを途中まで混ぜて書いた形——を作る。
 *
 * 裁定 D-8（2026-09-13）: **歴史的仮名遣いで統一されていれば ○。漢字とかなの混ぜ方は自由。**
 * 判定は列挙した文字列との完全一致なので、「漢字にしてよい」は規則としては存在しない。
 * **あらかじめ書き出した本数としてしか存在しない。** ここがその書き出しである。
 */

/** 漢字（CJK 統合漢字）と踊り字。かな・記号はかたまりを切る。 */
const KANJI = /[一-鿿々]/;

export type Chunk = { text: string; kanji: boolean };

/** 表記を「漢字のかたまり」と「かなのかたまり」へ交互に切る。 */
export function chunks(text: string): Chunk[] {
  const result: Chunk[] = [];
  for (const character of [...text]) {
    const kanji = KANJI.test(character);
    const last = result[result.length - 1];
    if (last !== undefined && last.kanji === kanji) last.text += character;
    else result.push({ text: character, kanji });
  }
  return result;
}

/**
 * 読みを漢字のかたまりへ割り付ける。**成り立つ割り付けをすべて返す。**
 *
 * **前から貪欲に取ってはいけない。** `いく野の道の`（`野`＝`の` の直後にかなの `の` が続く）や
 * `ふるき軒端の`（`軒端`＝`のきば` が `の` で始まる）で、かなの位置を先に食って割り付け不能になる。
 * **後戻りが要る。**
 *
 * 一意に決まらないことがある——`吉野の里に`／`よしののさとに` は
 * 「よしの＋さと」とも「よし＋のさと」とも読める。**機械には区別がつかない。**
 * ここでは決めず、**すべて返して呼び手に判断させる**（台帳の裁定を当てるため）。
 */
export function alignments(text: string, reading: string): string[][] {
  const parts = chunks(text);
  const found: string[][] = [];

  const walk = (partIndex: number, at: number, picked: string[]): void => {
    if (partIndex === parts.length) {
      if (at === reading.length) found.push([...picked]);
      return;
    }
    const part = parts[partIndex]!;
    if (!part.kanji) {
      if (reading.startsWith(part.text, at)) walk(partIndex + 1, at + part.text.length, picked);
      return;
    }
    // **空の読みを割り当てない。** 許すと「漢字を 0 文字で読む」形が通り、割り付けが無数に増える。
    for (let length = 1; at + length <= reading.length; length += 1) {
      picked.push(reading.slice(at, at + length));
      walk(partIndex + 1, at + length, picked);
      picked.pop();
    }
  };

  walk(0, 0, []);
  return found;
}

/**
 * かたまりごとに「漢字のまま」か「読みに開く」かを選んだ全組み合わせ。
 * 両端（全部漢字・全部かな）も含めて返す——呼び手が既存の受理集合と突き合わせて重複を落とす。
 */
export function mixedForms(text: string, readings: readonly string[]): string[] {
  const parts = chunks(text);
  const kanjiCount = parts.filter((part) => part.kanji).length;
  if (kanjiCount !== readings.length) throw new Error(`割り付けの数が合わない: ${text}（かたまり ${kanjiCount} / 読み ${readings.length}）`);

  let forms = [''];
  let readingIndex = 0;
  for (const part of parts) {
    if (!part.kanji) {
      forms = forms.map((form) => form + part.text);
      continue;
    }
    const reading = readings[readingIndex]!;
    readingIndex += 1;
    forms = forms.flatMap((form) => [form + part.text, form + reading]);
  }
  return forms;
}
