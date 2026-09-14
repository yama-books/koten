/**
 * 資料（許容表記）の1句を、句未満のかたまりへ切る。
 *
 * **区切りを作るのは `/` だけ。** `[ ]` はその内側に乗る印であって、区切りを増やさない
 * ——`[吉野]の` はひと続きのかたまり（`吉野の`）で、`[ ]` は「このかたまりは候補である」
 * を示すだけ。実測でも裏付けが取れる：`/` だけで割ると割れない句が183、
 * `]` の直後を区切りに数えると116——資料は100首ぶん揃っており、
 * 「割れない句 183」（§3・実測）に合うのは前者だけ。
 */
export type DocChunk = { text: string; candidate: boolean };

export function tokenizeKu(raw: string): DocChunk[] {
  return raw.split('/').map((segment) => ({
    text: segment.replace(/[[\]]/g, ''),
    candidate: segment.includes('['),
  }));
}
