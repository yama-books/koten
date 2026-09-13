import type { StatsDocument } from '../../../tools/stats-report/aggregate.ts';

/**
 * **数を全部違える。** 同じ値や 0 ばかりだと、項目を取り違える集計でも合計が一致してしまう。
 * 基数を 0 / 100 / 200 / 300 にしてあるので、fixture 全体で同じ数が 2 度出てこない。
 */
export function counts(base: number): Record<string, unknown> {
  return {
    pageViews: base + 15,
    attemptCount: base + 16,
    buttonCounts: { start: base + 1, answer: base + 2, hint: base + 3, reveal: base + 4, history: base + 5, report: base + 6 },
    entryCounts: { quick: base + 7, view: base + 8, learn: base + 9, review: base + 10, exam: base + 11, author: base + 12 },
    questionTypeCounts: { blank: base + 13, author: base + 14 },
  };
}

export function document(clientNumber: string, localDate: string, base: number, overrides: Record<string, unknown> = {}): StatsDocument {
  return {
    collection: 'stats_days_test',
    id: `${clientNumber}_${localDate}_hyakunin`,
    data: { clientNumber, localDate, product: 'hyakunin', grade: '', ...counts(base), ...overrides },
  };
}

/** 3 端末・2 日分。渡す順は日付の昇順ではない——並べ替えを試験するためである。 */
export function documents(): StatsDocument[] {
  return [
    document('aaaaaaaaaaaaaaaaaaaa', '2026-09-02', 0),
    document('bbbbbbbbbbbbbbbbbbbb', '2026-09-02', 100),
    document('aaaaaaaaaaaaaaaaaaaa', '2026-09-01', 200),
    document('cccccccccccccccccccc', '2026-09-01', 300),
  ];
}
