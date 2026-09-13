import test from 'node:test';
import assert from 'node:assert/strict';
import { toolPresent, toolTest, workRepository } from './guard.ts';
import { document, documents } from './fixtures.ts';

const { summarize } = toolPresent ? await import('../../../tools/stats-report/aggregate.ts') : { summarize: null as never };

/** **この 1 本だけ守らない。** 守りが静かに飛んでいることに、ここで気づく。 */
test('統計報告: 作業用リポジトリでは試験を飛ばさない', () => {
  if (!workRepository) return; // 公開ツリーには道具が無い。飛ばしてよい。
  assert.equal(toolPresent, true, 'tools/stats-report が見つからず、以下の試験が全部飛んでいる');
});

toolTest('集計: 全端末・全日を足した合計を出す', () => {
  const summary = summarize(documents());
  // 基数 0 + 100 + 200 + 300 = 600 に、項目ごとの位置を 4 回足す。
  assert.equal(summary.totals.pageViews, 600 + 15 * 4);
  assert.equal(summary.totals.attemptCount, 600 + 16 * 4);
  assert.deepEqual(summary.totals.buttonCounts, {
    start: 604, answer: 608, hint: 612, reveal: 616, history: 620, report: 624,
  });
  assert.deepEqual(summary.totals.entryCounts, {
    quick: 628, view: 632, learn: 636, review: 640, exam: 644, author: 648,
  });
  assert.deepEqual(summary.totals.questionTypeCounts, { blank: 652, author: 656 });
});

toolTest('集計: 日別は日付の昇順に並ぶ', () => {
  // fixture は 09-02 を先に渡している。**並べ替えを消したら赤くなる。**
  const summary = summarize(documents());
  assert.deepEqual(summary.daily.map((row) => row.localDate), ['2026-09-01', '2026-09-02']);
  assert.equal(summary.daily[0]!.buttonCounts.start, 201 + 301);
  assert.equal(summary.daily[1]!.buttonCounts.start, 1 + 101);
});

toolTest('集計: 同じ端末が複数日にあっても端末数は 1 と数える', () => {
  const summary = summarize(documents());
  // a は 2 日分あるが 1 端末。b・c を足して 3。
  assert.equal(summary.deviceCount, 3);
  assert.deepEqual(summary.daily.map((row) => row.deviceCount), [2, 2]);
});

toolTest('集計: 旧 5 キーの文書を落とさず、欠けた入口を 0 として扱う', () => {
  // `author` 入口は後から足した（LEGACY_ENTRY_KEYS）。古い文書にはこの項目が無い。
  const legacy = document('dddddddddddddddddddd', '2026-09-03', 0, {
    entryCounts: { quick: 2, view: 0, learn: 0, review: 0, exam: 0 },
  });
  const summary = summarize([legacy]);
  assert.equal(summary.documentCount, 1, '古い文書が落ちている');
  assert.equal(summary.totals.entryCounts.author, 0, '欠けが NaN になっている');
  assert.equal(summary.totals.entryCounts.quick, 2);
});

toolTest('集計: 知らないキーは黙って捨てず警告に出す', () => {
  const drifted = document('eeeeeeeeeeeeeeeeeeee', '2026-09-04', 0, {
    entryCounts: { quick: 1, view: 0, learn: 0, review: 0, exam: 0, author: 0, karuta: 9 },
  });
  const summary = summarize([drifted]);
  assert.ok(summary.warnings.some((warning) => warning.includes('karuta')), `警告に出ていない: ${summary.warnings.join(' / ')}`);
});

toolTest('集計: 0 件でも落ちず、期間が空であることを返す', () => {
  const summary = summarize([]);
  assert.equal(summary.documentCount, 0);
  assert.equal(summary.period, null);
  assert.deepEqual(summary.daily, []);
});
