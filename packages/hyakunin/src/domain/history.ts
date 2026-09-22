import type { Event } from '@koten/shared/domain/event';
import { masteryDisplay, type MasteryColor } from '@koten/shared/domain/mastery/color';
import { computeMastery } from '@koten/shared/domain/mastery/compute';
import { poemMastery } from '@koten/shared/domain/mastery/poem';
import { computePoints } from '@koten/shared/domain/points/compute';
import { isViewOnly } from '@koten/shared/domain/mastery/rules.v1';
import { rungProgress, type RungCatalogueEntry } from '@koten/shared/domain/mastery/rungs';

/**
 * `poem` は歌そのもの。初句を一覧に出し、行を押したときに歌と作者を見せるのに使う。
 * **番号だけでは歌を思い出せない。** 歌データが渡されなかったときは `null` になり、
 * 画面は番号だけを出す——**一覧そのものは歌データ無しでも成立する**
 * （試験の多くは歌を渡していない）。
 *
 * `authorPercent` は作者の項目だけの点。作者のイベントが 1 件も無ければ `null`。
 * 一覧の「作者」欄はここから 未／△／○／◎ の段階を出す。
 */
export type HistoryEntry = Readonly<{ poemId: string; cardNo: number; percent: number; color: MasteryColor; untouched: boolean; authorUnconfirmed: boolean; needsReview: boolean; conquered: boolean; poem: HistoryPoem | null; authorPercent: number | null }>;

/** 作者の進み具合の段階。画面が 未／△／○／◎ と色に読み替える。 */
export type AuthorStage = 'none' | 'low' | 'mid' | 'full';

/**
 * 作者の点を段階にする。**境目は `masteryDisplay` の色の境目に合わせてある**——
 * 一覧の帯と作者欄で「良い」の基準が食い違うと、利用者が二つの尺度を覚えることになる。
 */
export function authorStage(percent: number | null | undefined): AuthorStage {
  // **`undefined` も「まだ」に倒す。** `null` だけを見ていたとき、項目を持たない
  // 古い形の集計が `◎`（覚えた）として出た。分からないものを「できている」側へ倒さない。
  if (percent === null || percent === undefined) return 'none';
  if (percent < 60) return 'low';
  if (percent < 85) return 'mid';
  return 'full';
}
/**
 * 10 首ごとのまとまり（依頼者・2026-09-16）。**平均をひとつの輪で見せる。**
 * 100 行の平坦な一覧では、どこを練習したのかが読み取れない。
 */
export type HistoryGroup = Readonly<{ from: number; to: number; percent: number; color: MasteryColor; entries: readonly HistoryEntry[] }>;
export type HistorySummary = Readonly<{ entries: readonly HistoryEntry[]; groups: readonly HistoryGroup[]; needsReview: readonly HistoryEntry[]; touchedCount: number; isEmpty: boolean; points: number }>;

/**
 * 一覧が要る分だけ。**`Poem` 全体を求めない**——
 * 歌データの形が変わっても、一覧の集計が巻き込まれないようにする。
 */
export type HistoryPoem = Readonly<{ poemId: string; ku: readonly string[]; author?: Readonly<{ canonical: string }> }>;

/** まとまりの首数。**画面と集計で別々に書かない。** */
export const HISTORY_GROUP_SIZE = 10;

/**
 * **集計はここで作る。** 画面で足し算を書くと、試験が「表示されている数字」しか見なくなる。
 * 割合は**その 10 首の平均**である——1 首ぶんの伸びがまとまりを埋め尽くしてはいけない。
 */
function groupEntries(entries: readonly HistoryEntry[]): HistoryGroup[] {
  const groups: HistoryGroup[] = [];
  for (let start = 0; start < entries.length; start += HISTORY_GROUP_SIZE) {
    const slice = entries.slice(start, start + HISTORY_GROUP_SIZE);
    const average = slice.reduce((total, entry) => total + entry.percent, 0) / slice.length;
    groups.push({
      from: slice[0]!.cardNo, to: slice.at(-1)!.cardNo,
      percent: masteryDisplay(average).percent, color: masteryDisplay(average).color, entries: slice,
    });
  }
  return groups;
}

/**
 * **完全制覇は点ではなく印である**（依頼者裁定・2026-09-15）。
 * `clamp` を 100 で止めたまま、段8（番号だけ見て全部書く）を制覇した歌に印を立てる。
 * 点の計算・5色の表示・メーターに一切触らない。
 */
export function summarizeHistory(input: Readonly<{ events: readonly Event[]; poemIds: readonly string[]; questions?: readonly RungCatalogueEntry[]; poems?: readonly HistoryPoem[] }>): HistorySummary {
  const scores = computeMastery(input.events).scores;
  const poemOf = new Map((input.poems ?? []).map((poem) => [poem.poemId, poem]));
  const progress = rungProgress(
    input.events.filter((event) => event.questionId !== undefined).map((event) => ({ questionId: event.questionId!, outcome: event.outcome })),
    input.questions ?? [],
  );
  const entries = input.poemIds.map((poemId) => {
    const mastery = poemMastery(poemId, input.events, scores);
    const display = masteryDisplay(mastery.score);
    return {
      poemId, cardNo: Number(poemId.replace(/^\D+/, '')), percent: display.percent, color: display.color,
      untouched: mastery.untouched, authorUnconfirmed: mastery.authorUnconfirmed,
      needsReview: needsReview(poemId, input.events),
      conquered: progress.get(poemId)?.conquered ?? false,
      poem: poemOf.get(poemId) ?? null,
      authorPercent: mastery.authorUnconfirmed ? null : masteryDisplay(scores[`${poemId}:author`] ?? 0).percent,
    };
  });
  return { entries, groups: groupEntries(entries), needsReview: entries.filter((entry) => entry.needsReview), touchedCount: entries.filter((entry) => !entry.untouched).length, isEmpty: input.events.length === 0, points: computePoints(input.events).total };
}

function needsReview(poemId: string, events: readonly Event[]): boolean {
  const latest = events
    .filter((event) => event.poemId === poemId && !isViewOnly(event.method))
    .slice()
    .sort((left, right) => left.localDate.localeCompare(right.localDate))
    .at(-1);
  return latest?.outcome === 'incorrect' || latest?.outcome === 'skipped';
}
