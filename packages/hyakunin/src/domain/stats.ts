import type { Event, Report, Session, UserSettings } from '@koten/shared/domain/event';
import { masteryDisplay } from '@koten/shared/domain/mastery/color';
import { computeMastery } from '@koten/shared/domain/mastery/compute';
import { poemMastery } from '@koten/shared/domain/mastery/poem';
import type { StatsFacts } from '@koten/shared/telemetry/aggregate';
import { isDailyCounters, type DailyCounters } from '@koten/shared/telemetry/counters';

/**
 * 台帳からその日の数を数える。**識別子を扱ってよいのはこの層までである。**
 *
 * `packages/shared/src/telemetry/**` は個別の識別子に触れてはならず、
 * `tests/unit/telemetry/static.test.ts` の W-14 がソースの語でそれを守っている。
 * ここで数へ畳んでから渡すことで、送信側は「どの歌か」を知りようがない。
 *
 * **新しいカウンタを足さないこと。** 台帳から導ける数をアプリ側で二重に数えると、
 * 画面の記録と統計が食い違ったときにどちらが正しいか分からなくなる（発注061 §1b）。
 */
export function summarizeDailyStats(input: {
  readonly localDate: string;
  readonly events: readonly Event[];
  readonly sessions: readonly Session[];
  readonly reports: readonly Report[];
  /** 習熟度の母数。未着手も 0% として数える。 */
  readonly poemIds: readonly string[];
}): StatsFacts {
  const events = input.events.filter((event) => event.product === 'hyakunin');
  const answers = events.filter((event) => event.kind === 'answer' && event.localDate === input.localDate);
  const sessions = input.sessions.filter((session) => session.product === 'hyakunin' && session.startedOn === input.localDate);
  const reports = input.reports.filter((report) => report.product === 'hyakunin' && report.createdOn === input.localDate);

  const entryCounts = { quick: 0, view: 0, learn: 0, review: 0, exam: 0, author: 0 };
  for (const session of sessions) if (session.entry in entryCounts) entryCounts[session.entry as keyof typeof entryCounts] += 1;

  // 種別は `itemKey` の末尾で分ける。問題の識別子の綴りに頼ると、命名を変えた日に黙って 0 になる。
  const questionTypeCounts = { blank: 0, author: 0 };
  for (const event of answers) {
    if (event.itemKey.endsWith(':author')) questionTypeCounts.author += 1;
    else if (event.itemKey.endsWith(':text')) questionTypeCounts.blank += 1;
  }

  // 習熟度は当日ではなく現在値。当日で絞ると、学習した翌日に 0 が送られてしまう。
  const { scores } = computeMastery(events);
  const masteryPercents = input.poemIds.map((poemId) => masteryDisplay(poemMastery(poemId, events, scores).score).percent);

  return {
    attemptCount: answers.length,
    starts: sessions.length,
    answers: answers.length,
    hints: answers.filter((event) => event.hintUsed).length,
    reports: reports.length,
    entryCounts,
    questionTypeCounts,
    masteryPercents,
  };
}

/**
 * 統計を送ってよいか。**両方が揃ったときだけ真である。**
 *
 * - 案内を確認済みであること（`noticeConfirmed`）——見せる前に送らない。
 * - 止めていないこと（`statsOptOut` が真でない）——裁定2。止めたあとは1件も送らない。
 *
 * **設定を読めていない（`null`）ときは送らない。** 読めない状態を「同意済み」と解釈すると、
 * 保存が壊れた端末から黙って出て行く。**迷ったら送らない側へ倒す。**
 */
export function canSendStats(settings: UserSettings | null): boolean {
  if (settings === null) return false;
  return settings.noticeConfirmed === true && settings.statsOptOut !== true;
}

/**
 * 統計の収集を有効にするか。**ここが唯一の出どころである。**
 * 059 F-3 で「送るようになるまで案内を出さない」と決めたため、送信を実装するまで偽だった。
 * 送信の出口（`ui/adapters/stats-sender.ts`）を配線した 2026-09-06 に真へ変えた。
 */
export const STATS_COLLECTION_ENABLED = true;

/**
 * 送ってよい「終わった日」を返す。**今日は返さない**——まだ終わっておらず、
 * 途中の数を送ると 1 日が二重に数えられるか、欠けた数が確定してしまう。
 *
 * 保存が今日のものなら `null`。壊れていても `null`（数え直しは `readCounters` が受け持つ）。
 */
export function finishedDay(stored: unknown, today: string): DailyCounters | null {
  if (!isDailyCounters(stored)) return null;
  if (stored.localDate === today) return null;
  return stored;
}
