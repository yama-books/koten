import test from 'node:test';
import assert from 'node:assert/strict';
import { recommendNext, type RecommendInput } from '../../../packages/shared/src/domain/recommend/recommend.ts';
import { event } from './fixtures.ts';

const today = '2026-08-31';

function input(overrides: Partial<RecommendInput> = {}): RecommendInput {
  return { today, poemIds: ['p001'], events: [], scores: {}, ...overrides };
}

function learned(poemId: string, localDate: string, score: number, overrides: Partial<ReturnType<typeof event>> = {}) {
  return {
    event: event({ poemId, itemKey: `${poemId}:text`, localDate, ...overrides }),
    scores: { [`${poemId}:text`]: score, [`${poemId}:author`]: score },
  };
}

test('A-1: 段1は段2より優先される', () => {
  const overdue = learned('p001', '2026-08-29', 20);
  const trouble = learned('p002', today, 20, { outcome: 'incorrect' });
  assert.deepEqual(recommendNext(input({ poemIds: ['p001', 'p002'], events: [overdue.event, trouble.event], scores: { ...overdue.scores, ...trouble.scores } })),
    { poemId: 'p001', tier: 1, reason: '前回から間隔が空いたため', percent: 20 });
});

test('A-2: 段2は段3から段5より優先される', () => {
  const trouble = learned('p001', today, 20, { outcome: 'incorrect' });
  const noRecall = learned('p002', today, 20);
  const overdueRecall = learned('p003', '2026-08-01', 90);
  const recall = event({ poemId: 'p003', itemKey: 'p003:text', localDate: '2026-08-02' });
  assert.equal(recommendNext(input({ poemIds: ['p001', 'p002', 'p003'], events: [trouble.event, noRecall.event, overdueRecall.event, recall], scores: { ...trouble.scores, ...noRecall.scores, ...overdueRecall.scores } }))?.tier, 2);
});

test('A-3: 段3は段4と5より、段4は段5より優先される', () => {
  const noRecall = learned('p001', today, 20);
  const overdueRecall = learned('p003', '2026-08-01', 90);
  const recall = event({ poemId: 'p003', itemKey: 'p003:text', localDate: '2026-08-02' });
  assert.equal(recommendNext(input({ poemIds: ['p001', 'p002', 'p003'], events: [noRecall.event, overdueRecall.event, recall], scores: { ...noRecall.scores, ...overdueRecall.scores } }))?.tier, 3);
  assert.equal(recommendNext(input({ poemIds: ['p002', 'p003'], events: [overdueRecall.event, recall], scores: overdueRecall.scores }))?.tier, 4);
});

for (const [label, score, interval] of [['赤', 20, 1], ['黄', 30, 3], ['青', 60, 7], ['緑', 85, 14]] as const) {
  test(`A-4: ${label}帯は期限ちょうどで段1に入る`, () => {
    const exact = learned('p001', dateDaysAgo(interval), score);
    const before = learned('p001', dateDaysAgo(interval - 1), score);
    const earlierRecall = event({ eventId: 'event-002', poemId: 'p001', itemKey: 'p001:text', localDate: '2026-08-01' });
    assert.equal(recommendNext(input({ events: [exact.event], scores: exact.scores }))?.tier, 1);
    assert.equal(recommendNext(input({ events: [before.event, earlierRecall], scores: before.scores })), undefined);
  });
}

test('A-5: 直近3日には3日前を含み4日前を含まない', () => {
  const threeDays = learned('p001', '2026-08-28', 85, { outcome: 'incorrect' });
  const fourDays = learned('p001', '2026-08-27', 85, { outcome: 'incorrect' });
  const recallOne = event({ eventId: 'event-002', poemId: 'p001', itemKey: 'p001:text', localDate: '2026-08-01' });
  const recallTwo = event({ eventId: 'event-003', poemId: 'p001', itemKey: 'p001:text', localDate: '2026-08-02' });
  assert.equal(recommendNext(input({ events: [threeDays.event, recallOne, recallTwo], scores: threeDays.scores }))?.tier, 2);
  assert.equal(recommendNext(input({ events: [fourDays.event, recallOne, recallTwo], scores: fourDays.scores })), undefined);
});

test('A-6: 同日の想起成功を重ねても別日の想起成功にはならない', () => {
  const first = learned('p001', '2026-08-30', 90);
  const second = event({ eventId: 'event-002', poemId: 'p001', itemKey: 'p001:text', localDate: '2026-08-30' });
  assert.equal(recommendNext(input({ events: [first.event, second], scores: first.scores }))?.tier, 3);
});

test('A-7: 首の習熟度は本文80%と作者20%を混ぜる', () => {
  const item = learned('p001', today, 90);
  const author = event({ eventId: 'event-002', poemId: 'p001', itemKey: 'p001:author', localDate: today, outcome: 'viewed', method: 'view', effectiveMethod: 'view' });
  const result = recommendNext(input({ events: [item.event, author], scores: { 'p001:text': 90, 'p001:author': 10 } }));
  assert.equal(result?.percent, 74);
  assert.equal(result?.tier, 3);
});

test('作者に一度も当たっていない首は本文の80%になる', () => {
  const item = event({ poemId: 'p001', itemKey: 'p001:text', localDate: today });
  assert.equal(recommendNext(input({ events: [item], scores: { 'p001:text': 90 } }))?.percent, 72);
});

test('A-8: 同点は期限超過日数、習熟度、番順で安定して決まる', () => {
  const p001 = learned('p001', '2026-08-27', 20);
  const p002 = learned('p002', '2026-08-29', 10);
  const p003 = learned('p003', '2026-08-27', 20);
  const fixture = input({ poemIds: ['p001', 'p002', 'p003'], events: [p001.event, p002.event, p003.event], scores: { ...p001.scores, ...p002.scores, ...p003.scores } });
  const results = Array.from({ length: 100 }, () => recommendNext(fixture));
  assert.equal(results[0]?.poemId, 'p001');
  assert.ok(results.every((result) => JSON.stringify(result) === JSON.stringify(results[0])));
});

test('A-9: 全首が期限内かつ別日想起済みなら提案しない', () => {
  const first = learned('p001', '2026-08-30', 90);
  const second = event({ eventId: 'event-002', poemId: 'p001', itemKey: 'p001:text', localDate: today });
  assert.equal(recommendNext(input({ events: [first.event, second], scores: first.scores })), undefined);
});

test('A-10: 未着手だけなら番順先頭を段4で返す', () => {
  assert.deepEqual(recommendNext(input({ poemIds: ['p002', 'p001'] })), { poemId: 'p002', tier: 4, reason: 'まだ確認していない歌です', percent: 0 });
});

test('C-1: 段5は別日想起済みで期限超過した首を返す', () => {
  const firstRecall = learned('p001', '2026-08-01', 90);
  const secondRecall = event({ eventId: 'event-002', poemId: 'p001', itemKey: 'p001:text', localDate: '2026-08-02' });
  assert.deepEqual(recommendNext(input({ events: [firstRecall.event, secondRecall], scores: firstRecall.scores })),
    { poemId: 'p001', tier: 5, reason: '前回から間隔が空いたため', percent: 90 });
});

test('C-2(a): 月またぎの暦日差で黄帯の期限両側を判定する', () => {
  const due = learned('p001', '2026-02-26', 30);
  const withinDeadline = learned('p001', '2026-02-27', 30);
  assert.equal(recommendNext(input({ today: '2026-03-01', events: [due.event], scores: due.scores }))?.tier, 1);
  assert.equal(recommendNext(input({ today: '2026-03-01', events: [withinDeadline.event], scores: withinDeadline.scores }))?.tier, 3);
});

test('C-2(b): 年またぎの暦日差で黄帯の期限両側を判定する', () => {
  const due = learned('p001', '2025-12-29', 30);
  const withinDeadline = learned('p001', '2025-12-30', 30);
  assert.equal(recommendNext(input({ today: '2026-01-01', events: [due.event], scores: due.scores }))?.tier, 1);
  assert.equal(recommendNext(input({ today: '2026-01-01', events: [withinDeadline.event], scores: withinDeadline.scores }))?.tier, 3);
});

test('C-2(c): うるう日をまたぐ暦日差で黄帯の期限両側を判定する', () => {
  const due = learned('p001', '2028-02-27', 30);
  const withinDeadline = learned('p001', '2028-02-28', 30);
  assert.equal(recommendNext(input({ today: '2028-03-01', events: [due.event], scores: due.scores }))?.tier, 1);
  assert.equal(recommendNext(input({ today: '2028-03-01', events: [withinDeadline.event], scores: withinDeadline.scores }))?.tier, 3);
});

test('C-3: 0%でもイベントがあれば赤帯の期限を使う', () => {
  const due = learned('p001', '2026-08-30', 0);
  const withinDeadline = learned('p001', today, 0);
  assert.equal(recommendNext(input({ events: [due.event], scores: due.scores }))?.tier, 1);
  assert.equal(recommendNext(input({ events: [withinDeadline.event], scores: withinDeadline.scores }))?.tier, 3);
});

test('C-4: 段2・段3・段5の理由文は仕様の正本と一致する', () => {
  const trouble = learned('p001', today, 20, { outcome: 'incorrect' });
  const noRecall = learned('p001', today, 20);
  const firstRecall = learned('p001', '2026-08-01', 90);
  const secondRecall = event({ eventId: 'event-002', poemId: 'p001', itemKey: 'p001:text', localDate: '2026-08-02' });
  assert.equal(recommendNext(input({ events: [trouble.event], scores: trouble.scores }))?.reason, 'もう一度思い出してみましょう');
  assert.equal(recommendNext(input({ events: [noRecall.event], scores: noRecall.scores }))?.reason, '別の日にも思い出せるか確かめましょう');
  assert.equal(recommendNext(input({ events: [firstRecall.event, secondRecall], scores: firstRecall.scores }))?.reason, '前回から間隔が空いたため');
});

test('V-5: 期限超過の歌を閲覧しても段1に残る', () => {
  const answered = learned('p001', '2026-08-25', 20);
  const viewed = event({ eventId: 'viewed', poemId: 'p001', itemKey: 'p001:text', localDate: today, kind: 'view', method: 'view', effectiveMethod: 'view', outcome: 'viewed' });
  assert.equal(recommendNext(input({ events: [answered.event], scores: answered.scores }))?.tier, 1);
  assert.equal(recommendNext(input({ events: [answered.event, viewed], scores: answered.scores }))?.tier, 1);
});

test('V-6: 閲覧しかしていない歌は段3に留まる', () => {
  const viewed = event({ kind: 'view', method: 'view', effectiveMethod: 'view', outcome: 'viewed' });
  assert.equal(recommendNext(input({ events: [viewed] }))?.tier, 3);
});

test('V-7: ヒント後の自己評価△は復習の時計を進める', () => {
  const answered = learned('p001', '2026-08-25', 20);
  const selfTri = event({ eventId: 'self-tri', poemId: 'p001', itemKey: 'p001:text', localDate: today, kind: 'self-rate', method: 'self-tri', effectiveMethod: 'view', hintUsed: true, outcome: 'correct' });
  assert.equal(recommendNext(input({ events: [answered.event, selfTri], scores: answered.scores }))?.tier, 3);
});

function dateDaysAgo(days: number): string {
  const day = 31 - days;
  return `2026-08-${String(day).padStart(2, '0')}`;
}

// ---- 段0「解いているのに、まちがいが多い」（依頼者・2026-09-22） ----

/** 同じ歌へ n 回の思い出す解答を積む。`wrong` 件だけ外す。 */
function attempts(poemId: string, total: number, wrong: number, day = '2026-08-20') {
  return Array.from({ length: total }, (_, index) => event({
    eventId: `${poemId}-a${index}`, poemId, itemKey: `${poemId}:text`, localDate: day,
    ...(index < wrong
      ? { outcome: 'incorrect' as const, effectiveMethod: 'free-input' as const }
      : { outcome: 'correct' as const, effectiveMethod: 'free-input' as const }),
  }));
}

test('段0: 4回以上解いて4割以上外している歌を先に出す', () => {
  const chosen = recommendNext(input({ poemIds: ['p001'], events: attempts('p001', 5, 3), scores: { 'p001:text': 40 } }));
  assert.equal(chosen?.tier, 0);
  assert.equal(chosen?.poemId, 'p001');
  assert.equal(chosen?.reason, '何度か解いていますが、まちがいが多い歌です');
});

test('段0: 取り組みが浅い歌は入れない', () => {
  // 3回で2回外しても、まだ「まちがいが多い」とは呼ばない。始めたばかりの歌を先頭に並べないため。
  assert.notEqual(recommendNext(input({ poemIds: ['p001'], events: attempts('p001', 3, 2), scores: { 'p001:text': 40 } }))?.tier, 0);
});

test('段0: まちがいが少なければ入れない', () => {
  // 5回中1回（20%）は下限の4割に満たない。
  assert.notEqual(recommendNext(input({ poemIds: ['p001'], events: attempts('p001', 5, 1), scores: { 'p001:text': 40 } }))?.tier, 0);
});

test('段0: 境目は4回・4割ちょうどを含む', () => {
  assert.equal(recommendNext(input({ poemIds: ['p001'], events: attempts('p001', 5, 2), scores: { 'p001:text': 40 } }))?.tier, 0);
  assert.notEqual(recommendNext(input({ poemIds: ['p001'], events: attempts('p001', 4, 1), scores: { 'p001:text': 40 } }))?.tier, 0);
});

test('段0: 同じ段ならまちがいの多い順に選ぶ', () => {
  const chosen = recommendNext(input({
    poemIds: ['p001', 'p002'],
    events: [...attempts('p001', 5, 2), ...attempts('p002', 5, 4)],
    scores: { 'p001:text': 40, 'p002:text': 40 },
  }));
  assert.equal(chosen?.poemId, 'p002', '率の高い方を選んでいない');
});

test('段0: 見ただけの記録は解いた回数に数えない', () => {
  // **見ただけを数えると、眺めただけの歌が「まちがいが多い」側へ入る。**
  const viewed = Array.from({ length: 6 }, (_, index) => event({
    eventId: `v${index}`, poemId: 'p001', itemKey: 'p001:text', method: 'view', effectiveMethod: 'view', outcome: 'correct',
  }));
  assert.notEqual(recommendNext(input({ poemIds: ['p001'], events: [...attempts('p001', 3, 2), ...viewed], scores: { 'p001:text': 40 } }))?.tier, 0);
});

test('段0: △ は分母に入れるが、まちがいには数えない', () => {
  // **判別できる形で見る。** 2回外し + △2回。
  // △ が分母に入るなら 4回中2回＝5割で段0、入らないなら 2回で取り組み不足。
  const partial = Array.from({ length: 2 }, (_, index) => event({
    eventId: `t${index}`, poemId: 'p001', itemKey: 'p001:text', outcome: 'partial', method: 'self-tri', effectiveMethod: 'self-tri',
  }));
  const chosen = recommendNext(input({ poemIds: ['p001'], events: [...attempts('p001', 2, 2), ...partial], scores: { 'p001:text': 40 } }));
  assert.equal(chosen?.tier, 0, '△ が分母に入っていない');
});

test('段0: 「わからない(×)」も解いた回数と、まちがいに数える', () => {
  // **ここを落とすと、外した歌ほど率が下がるという逆の結果になる。**
  // 4回すべて「わからない」なら率は 10 割である。
  const unknown = Array.from({ length: 4 }, (_, index) => event({
    eventId: `x${index}`, poemId: 'p001', itemKey: 'p001:text', outcome: 'incorrect', method: 'self-x', effectiveMethod: 'self-x',
  }));
  const chosen = recommendNext(input({ poemIds: ['p001'], events: unknown, scores: { 'p001:text': 10 } }));
  assert.equal(chosen?.tier, 0);
});
