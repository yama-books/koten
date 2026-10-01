import type { Event } from '@koten/shared/domain/event';
import { masteryDisplay, type MasteryColor } from '@koten/shared/domain/mastery/color';
import { computeMastery } from '@koten/shared/domain/mastery/compute';
import { poemMastery } from '@koten/shared/domain/mastery/poem';
import { recommendNext, type Recommendation } from '@koten/shared/domain/recommend/recommend';
import { computePoints } from '@koten/shared/domain/points/compute';
import { reviewQuestionIds } from './review.ts';

export type OutcomeKind = 'viewed' | 'correct' | 'partial' | 'needs-review' | 'incorrect';

export type Breakdown = Readonly<{
  viewed: number;
  correct: number;
  partial: number;
  needsReview: number;
  incorrect: number;
}>;

/**
 * 習熟度の変化に添える補足（依頼者・2026-10-01）。画面はバッジにし、押すと説明を出す。
 *
 * - `daily-cap`（当日上限）：本文の点が、この回を解いた日に 90 へ届いた。90 の先へ進めるのは
 *   別の日に限られる（`compute.ts` の `ninetyReachedOn`）ので、その日はもう上がらない。
 * - `author`（要作者）：作者が未確認で、本文は満点（80%）。残りは作者の分だけ。
 *   記録一覧の「作者も確認しましょう」と同じ条件である。
 */
export type MasteryNote = 'daily-cap' | 'author';
export type MasteryChange = Readonly<{ poemId: string; before: number; after: number; notes?: readonly MasteryNote[] }>;

export type PoemOutcome = Readonly<{
  poemId: string;
  cardNo: number;
  kind: OutcomeKind | null;
  percent: number;
  color: MasteryColor;
  untouched: boolean;
  authorUnconfirmed: boolean;
  /** 作者の項目だけの点。作者のイベントが 1 件も無ければ null。記録一覧と同じ出し方。 */
  authorPercent: number | null;
}>;

export type SummarizeInput = Readonly<{
  sessionId: string;
  range: Readonly<{ from: number; to: number }>;
  outcomes: readonly Readonly<{ questionId: string; poemId: string; kind: Exclude<OutcomeKind, 'viewed'> }>[];
  allEvents: readonly Event[];
  poemIds: readonly string[];
  today: string;
}>;

export type SessionResult = Readonly<{
  range: Readonly<{ from: number; to: number }>;
  questionCount: number;
  breakdown: Breakdown;
  allCorrect: boolean;
  changes: readonly MasteryChange[];
  poems: readonly PoemOutcome[];
  retryCardNumbers: readonly number[];
  retryQuestionIds: readonly string[];
  recommendation: Recommendation | undefined;
  /** 今回のセッションで得たポイント。習熟度とは別の、飽和しない積算値。 */
  points: number;
}>;

const weakness: Readonly<Record<OutcomeKind, number>> = {
  correct: 4,
  partial: 3,
  'needs-review': 2,
  incorrect: 1,
  viewed: 0,
};

/** Summarizes one session from its explicit judgements and persisted event history. */
export function summarizeSession(input: SummarizeInput): SessionResult {
  const sessionEvents = input.allEvents.filter((event) => event.sessionId === input.sessionId);
  const viewed = sessionEvents
    .filter((event) => event.outcome === 'viewed')
    .map((event) => ({ poemId: event.poemId, kind: 'viewed' as const }));
  /**
   * 「わからない！」で答えを見た問も再確認へ回す（依頼者裁定・2026-09-07）。
   *
   * **答えを見たということは、解けなかったということである。** 誤答と同じく、次に出し直す。
   * 発注057 は閲覧を再確認から外していたが、**学習者から見ると、いちばん出し直してほしい問**が
   * 落ちていた。全問「わからない！」で終えると、結果に「まちがえた歌だけをもう一度」が出なかった。
   */
  const viewedQuestionIds = sessionEvents
    .filter((event) => event.outcome === 'viewed' && typeof event.questionId === 'string' && event.questionId.length > 0)
    .map((event) => event.questionId as string);
  const answers = input.outcomes;
  const attempts = [...answers, ...viewed];
  const breakdown = countBreakdown(attempts);
  const before = computeMastery(input.allEvents.filter((event) => event.sessionId !== input.sessionId));
  const after = computeMastery(input.allEvents);
  const poems = input.poemIds.map((poemId) => poemOutcome(poemId, attempts, input.allEvents, after.scores));
  const reached = ninetyReachedOn(input.allEvents);
  /*
   * **補足のある歌は、習熟度が変わらなくても欄に出す**（依頼者・2026-10-01）。
   * 当日上限で止まった歌は ±0 になり、変化の欄から消えていた——「なぜ上がらないのか」が
   * いちばん知りたい歌である。補足は**この回に解いた歌にだけ**付ける。
   */
  const changes = input.poemIds
    .map((poemId) => {
      const afterMastery = poemMastery(poemId, input.allEvents, after.scores);
      const notes = masteryNotes(poemId, sessionEvents, afterMastery, after.scores, reached);
      return {
        poemId,
        before: poemMastery(poemId, input.allEvents.filter((event) => event.sessionId !== input.sessionId), before.scores).score,
        after: afterMastery.score,
        ...(notes.length > 0 ? { notes } : {}),
      };
    })
    .filter((change) => change.before !== change.after || change.notes !== undefined);
  const retryCardNumbers = [...new Set(attempts
    .filter((attempt) => attempt.kind === 'viewed' || attempt.kind === 'partial' || attempt.kind === 'needs-review' || attempt.kind === 'incorrect')
    .map((attempt) => cardNo(attempt.poemId)))]
    .sort((left, right) => left - right);

  return {
    range: input.range,
    questionCount: attempts.length,
    breakdown,
    allCorrect: answers.length > 0 && viewed.length === 0 && answers.every((attempt) => attempt.kind === 'correct'),
    changes,
    poems,
    retryCardNumbers,
    retryQuestionIds: [...new Set([...reviewQuestionIds(answers), ...viewedQuestionIds])],
    recommendation: recommendNext({ today: input.today, poemIds: input.poemIds, events: input.allEvents, scores: after.scores }),
    points: computePoints(input.allEvents).bySession[input.sessionId] ?? 0,
  };
}

/**
 * 項目ごとに、点が初めて 90 以上になった日。`compute.ts` の `ninetyReachedOn` と同じ規則を、
 * 走査の観察（`MasteryObserver`）から読み直す——**習熟度の計算そのものには手を入れない。**
 * 観察は「適用する前の点」を渡すので、次のイベントで 90 以上が見えたら、ひとつ前のイベントの日が届いた日である。
 * 最後のイベントで届いた項目は、走査の後に最後の日を当てる。
 */
function ninetyReachedOn(events: readonly Event[]): ReadonlyMap<string, string> {
  const reached = new Map<string, string>();
  const lastDate = new Map<string, string>();
  const { scores } = computeMastery(events, (event, scoreBefore) => {
    if (scoreBefore >= 90 && !reached.has(event.itemKey)) reached.set(event.itemKey, lastDate.get(event.itemKey)!);
    lastDate.set(event.itemKey, event.localDate);
  });
  for (const [itemKey, score] of Object.entries(scores)) {
    if (score >= 90 && !reached.has(itemKey)) reached.set(itemKey, lastDate.get(itemKey)!);
  }
  return reached;
}

function masteryNotes(poemId: string, sessionEvents: readonly Event[], mastery: Readonly<{ score: number; authorUnconfirmed: boolean }>, scores: Readonly<Record<string, number>>, reached: ReadonlyMap<string, string>): MasteryNote[] {
  // **「その日」は、この回で解いた日である。** 端末の時計を読まない——日付の境目をまたいだ回でもずれない。
  const solvedOn = sessionEvents.filter((event) => event.poemId === poemId).map((event) => event.localDate).sort().at(-1);
  if (solvedOn === undefined) return [];
  const notes: MasteryNote[] = [];
  const textKey = `${poemId}:text`;
  if ((scores[textKey] ?? 0) >= 90 && reached.get(textKey) === solvedOn) notes.push('daily-cap');
  if (mastery.authorUnconfirmed && masteryDisplay(mastery.score).percent === 80) notes.push('author');
  return notes;
}

function countBreakdown(attempts: readonly Readonly<{ kind: OutcomeKind }>[]): Breakdown {
  const result = { viewed: 0, correct: 0, partial: 0, needsReview: 0, incorrect: 0 };
  for (const attempt of attempts) {
    if (attempt.kind === 'needs-review') result.needsReview += 1;
    else result[attempt.kind] += 1;
  }
  return result;
}

function poemOutcome(poemId: string, attempts: readonly Readonly<{ poemId: string; kind: OutcomeKind }>[], events: readonly Event[], scores: Readonly<Record<string, number>>): PoemOutcome {
  const kinds = attempts.filter((attempt) => attempt.poemId === poemId).map((attempt) => attempt.kind);
  const mastery = poemMastery(poemId, events, scores);
  const display = masteryDisplay(mastery.score);
  return {
    poemId,
    cardNo: cardNo(poemId),
    kind: kinds.length === 0 ? null : kinds.reduce(weaker),
    percent: display.percent,
    color: display.color,
    untouched: mastery.untouched,
    authorUnconfirmed: mastery.authorUnconfirmed,
    authorPercent: mastery.authorUnconfirmed ? null : masteryDisplay(scores[`${poemId}:author`] ?? 0).percent,
  };
}

function weaker(left: OutcomeKind, right: OutcomeKind): OutcomeKind {
  return weakness[left] <= weakness[right] ? left : right;
}

function cardNo(poemId: string): number {
  return Number(poemId.replace(/^\D+/, ''));
}
