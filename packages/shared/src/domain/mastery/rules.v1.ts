import type { EventMethod } from '../event.ts';

export const MASTERY_RULES_VERSION = 1 as const;

export type MasteryRule = Readonly<{ increment: number; cap: number }>;

export const MASTERY_RULES: Readonly<Record<EventMethod, MasteryRule>> = {
  // APP_SPEC §8.1 行「閲覧」: +1、上限20。
  view: { increment: 1, cap: 20 },
  // APP_SPEC §8.1 行「見るだけ（自己評価×）」: +1、上限20。
  'self-x': { increment: 1, cap: 20 },
  // APP_SPEC §8.1 行「見るだけ（自己評価△）」: +2、上限30。
  'self-tri': { increment: 2, cap: 30 },
  // APP_SPEC §8.1 行「見るだけ（自己評価○）」: +3、上限35。
  'self-o': { increment: 3, cap: 35 },
  // APP_SPEC §8.1 行「選択式正答」: +5、上限65。
  choice: { increment: 5, cap: 65 },
  // APP_SPEC §8.1 行「漢字候補→ひらがな正答」: +7、上限80。
  'kanji-to-kana': { increment: 7, cap: 80 },
  // APP_SPEC §8.1 行「自由入力正答」: +9、上限90。
  'free-input': { increment: 9, cap: 90 },
  // APP_SPEC §8.1 行「紙手書き自己申告○」: +9、上限90。
  'paper-handwriting': { increment: 9, cap: 90 },
};

export const INCORRECT_DECREMENT: Readonly<Record<EventMethod, number>> = {
  view: 0,
  'self-x': 0,
  'self-tri': 0,
  // APP_SPEC §8.1「選択式またはヒント後: −3」。
  'self-o': 3,
  // APP_SPEC §8.1「選択式またはヒント後: −3」。
  choice: 3,
  // APP_SPEC §8.1「漢字候補→ひらがな: −4」。
  'kanji-to-kana': 4,
  // APP_SPEC §8.1「自由入力・紙手書き自己申告: −5」。
  'free-input': 5,
  // APP_SPEC §8.1「自由入力・紙手書き自己申告: −5」。
  'paper-handwriting': 5,
};

/**
 * 90 を超えたあとの増分（依頼者裁定・2026-09-09）。上限手前で一気に増やさない。
 *
 * 90→100 を +9 で駆け上がると**2日で終わる**。かといって「残りの何割か」で漸近させると
 * 100 に永久に届かず、進捗が見えないこと自体が離脱要因になる（語学アプリで繰り返し
 * 報告されている）。目標勾配効果は**残り回数が数えられる**ときに効くので、小さいが
 * 有限の歩数にする。+2 なら 90 から 5 回で 100 に届き、毎回必ず動く。
 */
export const OVER_NINETY_INCREMENT = 2;

/**
 * **段の天井で止まっている段を練習したときの微増**（依頼者裁定・2026-09-15）。
 *
 * > 中くらいまでの段階なら 1 回（10問）で 1〜2%。段階が上がるにつれて圧縮され、
 * > 90% を超えるとかなり上がりにくくなる。
 *
 * **「やさしくする」で下げた回が、まったく報われないのを避けるためである。**
 * 自動は点が入る段を配るので、この微増が効くのは**学習者が自分で下げた回**だけである。
 *
 * **稼ぐ道にはしない。** 通常の伸びは自由入力 +9／問で、ここは一桁どころか二桁小さい。
 * 段1 だけで方式の天井 90 へ届くには約 600 問（60 回）かかる。
 * **上限は方式の天井**（`MASTERY_RULES[method].cap`）で、段の天井は超えるがそこは超えない。
 *
 * 表は「この値**未満**なら この刻み」。表示は切り捨てなので、60 未満の帯だけが
 * **1 回で確実に動く**（+0.2 × 10問 = 2%）。
 */
export const CAPPED_PRACTICE_STEPS: ReadonlyArray<Readonly<{ below: number; step: number }>> = [
  { below: 60, step: 0.2 },
  { below: 80, step: 0.1 },
  { below: 90, step: 0.05 },
];

/**
 * その習熟度のときの微増。**90 以上は 0。**
 *
 * 90 を超えられるのは「日をまたいで完成方式で解き続ける」既存の経路だけ（`OVER_NINETY_INCREMENT`）
 * である。**易しい段の練習でそこを越えさせない**——自由入力の天井 90 そのものを崩すことになる。
 * 表に 90 以上の行を置かないのは、置いても方式の天井に阻まれて**一度も成立しないから**である。
 */
export function cappedPracticeStep(score: number): number {
  return CAPPED_PRACTICE_STEPS.find((row) => score < row.below)?.step ?? 0;
}

/** APP_SPEC §8.1 に明記された一段下げだけを表す。未規定の方式は undefined。 */
export const HINT_METHOD_DOWNGRADE: Readonly<Partial<Record<EventMethod, EventMethod>>> = {
  view: 'view',
  'self-tri': 'view',
  choice: 'self-tri',
  'kanji-to-kana': 'choice',
  'free-input': 'kanji-to-kana',
  // APP_SPEC §7.1.1 D-26: 紙手書き自己申告も自由入力と同じ一段下げ先にする。
  'paper-handwriting': 'kanji-to-kana',
};

export function downgradeForHint(method: EventMethod): EventMethod | undefined {
  return HINT_METHOD_DOWNGRADE[method];
}

export function isRecallMethod(method: EventMethod): boolean {
  return method === 'free-input' || method === 'paper-handwriting';
}

/**
 * 90 を超えて 100 へ進める資格のある方式。
 *
 * **いまは句ごとの自由入力がこれに当たる。** 依頼者の意図は最終的に
 * 「一首まるまる書ける・作者をまるごと書ける」ことを 100 の条件にすることであり
 * （2026-09-09）、難度設定が入ったらこの関数の中身だけを差し替える。
 * 判定を1箇所に集めてあるのは、そのときに探し回らずに済ませるためである。
 */
export function isMasteryCompletionMethod(method: EventMethod): boolean {
  return isRecallMethod(method);
}

/**
 * 想起を伴わない接触。既存 8 方式のうち、学習者が何も思い出そうとしていない唯一の方式が 'view'。
 * 自己評価（self-x / self-tri / self-o）は「思い出せたか」の申告なので想起である。
 */
export function isViewOnly(method: EventMethod): boolean {
  return method === 'view';
}
