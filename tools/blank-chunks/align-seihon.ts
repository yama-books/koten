/** 漢字（CJK統合漢字）と踊り字。`tools/build-data/mixed-forms.ts` の KANJI と同じ規則。 */
const KANJI = /[一-鿿々]/;
/** 踊り字。表記と読みが字として食い違うので、そこだけ文字どおりの一致を求めない（`align-reading.ts` と同じ例外）。 */
const ODORIJI = /[ゝゞヽヾ]/;

/**
 * 読みの区切り位置（`breakpoints`、句頭・句末を含まない内側の点）を、正本表記の
 * 文字位置へ写す。1文字ずつ歩き、かなは文字どおり、漢字は1文字以上で読みを消費する
 * ——ただし**指定された区切りをまたいで消費してはならない**。区切りは必ずどこかの
 * 文字の境目に落ちる（漢字の1文字の内側には落ちない）。
 *
 * 見つからなければ `null`。**呼び手が停止条件として扱う**——ここでは投げない。
 */
export function splitSeihonAtBreakpoints(text: string, reading: string, breakpoints: readonly number[]): string[] | null {
  const characters = [...text];
  let solution: number[] | null = null;

  const walk = (charIndex: number, at: number, bpIndex: number, textBoundaries: readonly number[]): boolean => {
    let nextBpIndex = bpIndex;
    let boundaries = textBoundaries;
    if (nextBpIndex < breakpoints.length && at === breakpoints[nextBpIndex]) {
      boundaries = [...boundaries, charIndex];
      nextBpIndex += 1;
    }
    if (charIndex === characters.length) {
      if (at !== reading.length || nextBpIndex !== breakpoints.length) return false;
      solution = [...boundaries];
      return true;
    }
    const character = characters[charIndex]!;
    if (!KANJI.test(character)) {
      if (!ODORIJI.test(character) && reading[at] !== character) return false;
      return walk(charIndex + 1, at + 1, nextBpIndex, boundaries);
    }
    for (let length = 1; at + length <= reading.length; length += 1) {
      const upcoming = breakpoints[nextBpIndex];
      if (upcoming !== undefined && at < upcoming && upcoming < at + length) continue; // 区切りをまたぐ
      if (walk(charIndex + 1, at + length, nextBpIndex, boundaries)) return true;
    }
    return false;
  };

  if (!walk(0, 0, 0, []) || !solution) return null;
  const result: string[] = [];
  let start = 0;
  for (const boundary of solution) { result.push(characters.slice(start, boundary).join('')); start = boundary; }
  result.push(characters.slice(start).join(''));
  return result;
}
