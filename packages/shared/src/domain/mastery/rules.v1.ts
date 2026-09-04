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
 * 想起を伴わない接触。既存 8 方式のうち、学習者が何も思い出そうとしていない唯一の方式が 'view'。
 * 自己評価（self-x / self-tri / self-o）は「思い出せたか」の申告なので想起である。
 */
export function isViewOnly(method: EventMethod): boolean {
  return method === 'view';
}
