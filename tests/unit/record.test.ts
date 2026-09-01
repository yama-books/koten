import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEvent, deltaFor, effectiveMethodFor, outcomeFor } from '../../packages/hyakunin/src/domain/record.ts';

test('record: ヒントだけなら一段下げる', () => assert.equal(effectiveMethodFor('free-input', true, 'correct'), 'kanji-to-kana'));
test('record: 部分正解だけなら一段下げる', () => assert.equal(effectiveMethodFor('free-input', false, 'partial'), 'kanji-to-kana'));
test('record: ヒントと部分正解が重なっても一段だけ下げる', () => assert.equal(effectiveMethodFor('free-input', true, 'partial'), 'kanji-to-kana'));
test('record: 紙手書きも一段だけ漢字候補へ下げる', () => assert.equal(effectiveMethodFor('paper-handwriting', true, 'partial'), 'kanji-to-kana'));
test('record: 下げ先のない方式はそのままにする', () => assert.equal(effectiveMethodFor('self-x', true, 'correct'), 'self-x'));
test('record: 正解は正解イベントにする', () => assert.equal(outcomeFor('correct'), 'correct'));
test('record: 部分正解は正解イベントにする', () => assert.equal(outcomeFor('partial'), 'correct'));
test('record: 不正解は不正解イベントにする', () => assert.equal(outcomeFor('incorrect'), 'incorrect'));
test('record: 要確認は減点せずスキップにする', () => assert.equal(outcomeFor('needs-review'), 'skipped'));
test('record: 選択式の正答増分は規則表から取る', () => assert.equal(deltaFor('choice', 'correct', 0, false), 5));
test('record: 漢字候補の正答増分は規則表から取る', () => assert.equal(deltaFor('kanji-to-kana', 'correct', 0, false), 7));
test('record: 自由入力の正答増分は規則表から取る', () => assert.equal(deltaFor('free-input', 'correct', 0, false), 9));
test('record: 同一回の加点は半分にする', () => assert.equal(deltaFor('free-input', 'correct', 0, true), 4));
test('record: 不正解の減分は規則表から取る', () => assert.equal(deltaFor('free-input', 'incorrect', 0, false), -5));
test('record: スキップは増減しない', () => assert.equal(deltaFor('choice', 'skipped', 0, false), 0));
test('record: イベントIDと日付は入力値を使う', () => {
  const result = buildEvent({ eventId: 'given-id', product: 'hyakunin', poemId: 'p001', questionId: 'q', sessionId: 'given-session', itemKey: 'p001:text', kind: 'answer', method: 'free-input', hintUsed: true, analysisKeys: [], localDate: '2026-09-01', sameSessionRepeat: false, appVersion: 'x', dataVersion: 1, judgement: 'correct', currentScore: 0 });
  assert.equal(result.eventId, 'given-id'); assert.equal(result.localDate, '2026-09-01'); assert.equal(result.effectiveMethod, 'kanji-to-kana');
});
