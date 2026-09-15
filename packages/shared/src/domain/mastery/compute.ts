import type { Event } from '../event.ts';
import {
  cappedPracticeStep,
  INCORRECT_DECREMENT,
  isMasteryCompletionMethod,
  MASTERY_RULES,
  MASTERY_RULES_VERSION,
  OVER_NINETY_INCREMENT,
} from './rules.v1.ts';
import { RUNG_CAPS, capFor } from './rungs.ts';

export type MasteryComputation = Readonly<{
  scores: Readonly<Record<string, number>>;
  unsupportedEvents: readonly Event[];
}>;

type ItemState = { score: number; ninetyReachedOn?: string };

/**
 * 走査中の各イベントを、**適用する前の**項目習熟度と繰り返し判定つきで受け取る。
 *
 * ポイント積算がこれに相乗りする。習熟度の走査を二重に書くと、順序・繰り返し判定・
 * 対応版の絞り込みが片方だけ直されて静かにずれる。判定は一箇所に置く。
 */
export type MasteryObserver = (event: Event, scoreBefore: number, isRepeat: boolean) => void;

/** Recomputes item scores from compatible event history without storage or clock access. */
export function computeMastery(events: readonly Event[], observe?: MasteryObserver): MasteryComputation {
  const unsupportedEvents = events.filter((event) => event.masteryRulesVersion !== MASTERY_RULES_VERSION);
  const supportedEvents = events
    .filter((event) => event.masteryRulesVersion === MASTERY_RULES_VERSION)
    .slice()
    .sort((left, right) => left.localDate.localeCompare(right.localDate) || left.eventId.localeCompare(right.eventId));
  const states = new Map<string, ItemState>();
  const seenQuestions = new Set<string>();

  for (const event of supportedEvents) {
    const state = states.get(event.itemKey) ?? { score: 0 };
    const repeatedByHistory = event.questionId === undefined
      ? false
      : seenQuestions.has(`${event.sessionId}\u0000${event.questionId}`);
    if (event.questionId !== undefined) seenQuestions.add(`${event.sessionId}\u0000${event.questionId}`);
    const isRepeat = event.sameSessionRepeat || repeatedByHistory;
    observe?.(event, state.score, isRepeat);
    applyEvent(state, event, isRepeat);
    states.set(event.itemKey, state);
  }

  return {
    scores: Object.fromEntries([...states.entries()].map(([itemKey, state]) => [itemKey, state.score])),
    unsupportedEvents,
  };
}

function applyEvent(state: ItemState, event: Event, isRepeat: boolean): void {
  const method = event.effectiveMethod;
  if (event.outcome === 'incorrect') {
    state.score = clamp(state.score - INCORRECT_DECREMENT[method]);
    return;
  }
  if (event.outcome === 'skipped') return;

  const rule = MASTERY_RULES[method];
  /*
   * **実効の天井は「方式の天井」と「段の天井」の低いほう**（D-12）。
   *
   * **段が数でないときは、段の天井を掛けない。** 2 つの場合がある。
   * - `null` = 段の梯子に乗らないもの（作者問・歌を眺めただけ）。作者は別の梯子を持つ。
   * - 欄が無い = 2026-09-15 より前に保存されたイベント。
   *
   * **古いイベントを段3 とみなしてはいけない。** 古い保存には作者問の記録も混ざっており、
   * それを段3 の天井（55）に巻き込むと、**作者の習熟度が 100 へ届かなくなる。**
   * 加えて、**過去に積んだ点を遡って下げない**のが正しい既定である——
   * 段の天井は、これから記録されるイベントにだけ効く。
   */
  const hasRung = typeof event.rung === 'number';
  const rungCap = hasRung ? capFor(method, event.rung as number) : rule.cap;
  // 90 の先の上限。**段があればその段の天井まで、無ければ従来どおり 100 まで。**
  const beyondNinety = hasRung ? RUNG_CAPS[event.rung as number] ?? 0 : 100;
  const mayExceedNinety = state.score >= 90
    && state.ninetyReachedOn !== undefined
    && event.localDate !== state.ninetyReachedOn
    && event.outcome === 'correct'
    && isMasteryCompletionMethod(method);
  // 90 の先だけ歩幅を変える。89 以下はこれまでどおりで、既存の記録の意味を動かさない。
  const base = mayExceedNinety ? OVER_NINETY_INCREMENT : rule.increment;
  const increment = isRepeat ? Math.floor(base / 2) : base;
  // 90 の先へ進めるのは、段の天井がそこまで許しているときだけである。
  const cap = mayExceedNinety ? beyondNinety : rungCap;
  const gain = Math.min(increment, Math.max(0, cap - state.score));
  /*
   * **段の天井で止まっている段を練習しても、わずかには伸びる**（依頼者裁定・2026-09-15）。
   *
   * 段の梯子を入れてから、天井を超えている段は何問正解しても 0 だった。自動は点が入る段を
   * 配るようにしたので、ここに来るのは**学習者が自分で「やさしくする」を押した回**である。
   * **まったく報われないと、復習そのものが損になる。**
   *
   * **上限は方式の天井。** 段の天井は超えるが、易しい方式で稼ぐ道は塞いだままにする。
   */
  /*
   * **微増の上限は方式の天井（自由入力なら 90）。** 90 を超えられるのは
   * 「日をまたいで完成方式で解き続ける」既存の経路だけ（`mayExceedNinety`）という設計を崩さない。
   */
  // **段8 には微増も入れない。** 点を動かさない段（天井を持たない段）である。
  const scoringRung = !hasRung || (RUNG_CAPS[event.rung as number] ?? 0) > 0;
  const trickle = gain > 0 || !scoringRung ? 0 : Math.min(
    isRepeat ? cappedPracticeStep(state.score) / 2 : cappedPracticeStep(state.score),
    Math.max(0, rule.cap - state.score),
  );
  state.score = clamp(state.score + gain + trickle);
  if (state.score >= 90 && state.ninetyReachedOn === undefined) state.ninetyReachedOn = event.localDate;
}

function clamp(value: number): number {
  /*
   * **小数第2位で丸める。** 微増（+0.05 など）を積むと端数が溜まり、
   * 89.99999999 で止まって「90 に届いた」判定が外れる——その先の経路が開かなくなる。
   * 整数の加算しか無かったころは効かなかったが、微増を入れた以上ここで揃える。
   */
  return Math.round(Math.max(0, Math.min(100, value)) * 100) / 100;
}
