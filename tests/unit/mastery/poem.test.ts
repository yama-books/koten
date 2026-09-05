import test from 'node:test';
import assert from 'node:assert/strict';
import type { Event } from '../../../packages/shared/src/domain/event.ts';
import { masteryDisplay } from '../../../packages/shared/src/domain/mastery/color.ts';
import { poemMastery } from '../../../packages/shared/src/domain/mastery/poem.ts';

function event(overrides: Partial<Event> = {}): Event {
  return {
    eventId: 'event-a', product: 'hyakunin', poemId: 'p010', questionId: 'q-a', sessionId: 'session-a',
    itemKey: 'p010:text', kind: 'answer', method: 'free-input', outcome: 'correct', hintUsed: false,
    effectiveMethod: 'free-input', delta: 9, localDate: '2026-09-01', sameSessionRepeat: false,
    appVersion: 'test', dataVersion: 1, masteryRulesVersion: 1, ...overrides,
  };
}

function mastery(text: number, author: number, events: readonly Event[] = [event()]) {
  return poemMastery('p010', events, { 'p010:text': text, 'p010:author': author });
}

test('未着手の首は0%で灰帯になる', () => {
  const result = poemMastery('p010', [], {});
  assert.equal(result.score, 0);
  assert.equal(masteryDisplay(result.score).color, 'gray');
});

// 初回公開は作者を出題しないため、配点は本文だけで100%（依頼者裁定・2026-09-05）。
// 作者を出題へ戻すときは poem.ts の 2 値と下の期待値を同時に戻す。

test('本文28・作者0は28%で赤帯になる', () => {
  const result = mastery(28, 0);
  assert.equal(result.score, 28);
  assert.equal(masteryDisplay(result.score).color, 'red');
});

test('本文52・作者0は52%で黄帯になる', () => {
  const result = mastery(52, 0);
  assert.equal(result.score, 52);
  assert.equal(masteryDisplay(result.score).color, 'yellow');
});

test('本文72・作者0は72%で青帯になる', () => {
  const result = mastery(72, 0);
  assert.equal(result.score, 72);
  assert.equal(masteryDisplay(result.score).color, 'blue');
});

test('本文85・作者0でも緑帯へ届く', () => {
  const result = mastery(85, 0);
  assert.equal(result.score, 85);
  assert.equal(masteryDisplay(result.score).color, 'green');
});

test('本文100・作者0は100%になる', () => {
  const result = mastery(100, 0);
  assert.equal(result.score, 100);
  assert.equal(masteryDisplay(result.score).color, 'green');
});

test('作者の素点は習熟度へ入らない', () => {
  assert.equal(mastery(0, 90).score, 0);
  assert.equal(mastery(50, 100).score, mastery(50, 0).score);
});

test('未着手と着手済み0%をイベントの有無で書き分ける', () => {
  assert.equal(poemMastery('p010', [], {}).untouched, true);
  assert.equal(mastery(0, 0).untouched, false);
});

test('作者イベントがない首には作者未確認を付ける', () => {
  assert.equal(mastery(65, 0).authorUnconfirmed, true);
});

test('作者イベントがあれば作者未確認を外す', () => {
  assert.equal(mastery(65, 0, [event({ itemKey: 'p010:author' })]).authorUnconfirmed, false);
});

test('素点を丸めずに返す', () => {
  assert.equal(mastery(0.8, 0).score, 0.8);
});
