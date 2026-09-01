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

test('本文35・作者0は28%で赤帯になる', () => {
  const result = mastery(35, 0);
  assert.equal(result.score, 28);
  assert.equal(masteryDisplay(result.score).color, 'red');
});

test('本文65・作者0は52%で黄帯になる', () => {
  const result = mastery(65, 0);
  assert.equal(result.score, 52);
  assert.equal(masteryDisplay(result.score).color, 'yellow');
});

test('本文90・作者0は72%で青帯になる', () => {
  const result = mastery(90, 0);
  assert.equal(result.score, 72);
  assert.equal(masteryDisplay(result.score).color, 'blue');
});

test('本文100・作者0は80%で止まり緑にならない', () => {
  const result = mastery(100, 0);
  assert.equal(result.score, 80);
  assert.equal(masteryDisplay(result.score).color, 'blue');
});

test('本文90・作者65は85%で緑帯になる', () => {
  const result = mastery(90, 65);
  assert.equal(result.score, 85);
  assert.equal(masteryDisplay(result.score).color, 'green');
});

test('本文0・作者90は18%で赤帯になる', () => {
  const result = mastery(0, 90);
  assert.equal(result.score, 18);
  assert.equal(masteryDisplay(result.score).color, 'red');
});

test('本文100・作者100は100%で緑帯になる', () => {
  const result = mastery(100, 100);
  assert.equal(result.score, 100);
  assert.equal(masteryDisplay(result.score).color, 'green');
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
  assert.equal(mastery(1, 0).score, 0.8);
});
