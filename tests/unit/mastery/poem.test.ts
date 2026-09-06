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

// 本文80%・作者20%。作者問題の出題画面と同じ工程で復帰した。

test('本文28・作者0は22.4%で赤帯になる', () => {
  const result = mastery(28, 0);
  assert.equal(result.score, 22.400000000000002);
  assert.equal(masteryDisplay(result.score).color, 'red');
});

test('本文52・作者0は41.6%で黄帯になる', () => {
  const result = mastery(52, 0);
  assert.equal(result.score, 41.6);
  assert.equal(masteryDisplay(result.score).color, 'yellow');
});

test('本文72・作者0は57.6%で黄帯になる', () => {
  const result = mastery(72, 0);
  assert.equal(result.score, 57.6);
  assert.equal(masteryDisplay(result.score).color, 'yellow');
});

test('本文85・作者0は68%で青帯に止まる', () => {
  const result = mastery(85, 0);
  assert.equal(result.score, 68);
  assert.equal(masteryDisplay(result.score).color, 'blue');
});

test('本文100・作者0は80%で止まる', () => {
  const result = mastery(100, 0);
  assert.equal(result.score, 80);
  assert.equal(masteryDisplay(result.score).color, 'blue');
});

test('作者の素点は20%の配点で習熟度へ入る', () => {
  assert.equal(mastery(0, 90).score, 18);
  assert.equal(mastery(50, 100).score, 60);
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
  assert.equal(mastery(0.8, 0).score, 0.6400000000000001);
});
