import test from 'node:test';
import assert from 'node:assert/strict';
import { bumpCounter, emptyCounters, isDailyCounters, readCounters } from '../../../packages/shared/src/telemetry/counters.ts';

const TODAY = '2026-09-06';
const YESTERDAY = '2026-09-05';

test('カウンタ: 空から数え始める', () => {
  assert.deepEqual(emptyCounters(TODAY), { localDate: TODAY, pageViews: 0, reveal: 0, history: 0 });
});

test('カウンタ: 1つずつ増える', () => {
  const once = bumpCounter(emptyCounters(TODAY), TODAY, 'reveal');
  assert.equal(once.reveal, 1);
  assert.equal(bumpCounter(once, TODAY, 'reveal').reveal, 2);
  // 他の数を巻き込まない。
  assert.equal(once.pageViews, 0);
});

test('カウンタ: 日付が変わったら数え直す', () => {
  // 前日の数を今日の分として送らないための要。
  const yesterday = { localDate: YESTERDAY, pageViews: 9, reveal: 9, history: 9 };
  const today = bumpCounter(yesterday, TODAY, 'pageViews');
  assert.deepEqual(today, { localDate: TODAY, pageViews: 1, reveal: 0, history: 0 });
});

test('カウンタ: 壊れた保存はその日の空として扱う', () => {
  for (const broken of [null, undefined, 'x', 42, [], { localDate: TODAY }, { localDate: 'いつか', pageViews: 1, reveal: 1, history: 1 }, { localDate: TODAY, pageViews: -1, reveal: 0, history: 0 }, { localDate: TODAY, pageViews: 1.5, reveal: 0, history: 0 }]) {
    assert.deepEqual(readCounters(broken, TODAY), emptyCounters(TODAY), `壊れた値を受け入れた: ${JSON.stringify(broken)}`);
    assert.equal(bumpCounter(broken, TODAY, 'history').history, 1);
  }
});

test('カウンタ: 形の検査は両方向に効く', () => {
  assert.equal(isDailyCounters({ localDate: TODAY, pageViews: 0, reveal: 0, history: 0 }), true);
  assert.equal(isDailyCounters({ localDate: TODAY, pageViews: 0, reveal: 0 }), false);
  assert.equal(isDailyCounters(emptyCounters(TODAY)), true);
});

test('カウンタ: 数えるのは3つだけ', () => {
  // 台帳から導ける数をここへ足さないための釘（発注061 §1b）。
  assert.deepEqual(Object.keys(emptyCounters(TODAY)).sort(), ['history', 'localDate', 'pageViews', 'reveal']);
});
