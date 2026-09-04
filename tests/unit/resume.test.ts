import test from 'node:test';
import assert from 'node:assert/strict';
import type { Event } from '../../packages/shared/src/domain/event.ts';
import type { ProductId } from '../../packages/shared/src/app-config.ts';
import { confirmedCardNumbers, planResume } from '../../packages/hyakunin/src/domain/resume.ts';

function event(poemId: string, product: ProductId = 'hyakunin'): Event {
  return {
    eventId: `${product}-${poemId}`, product, poemId, sessionId: 'session-1', itemKey: `${poemId}:text`,
    kind: 'view', method: 'view', outcome: 'viewed', hintUsed: false, effectiveMethod: 'view', delta: 0,
    localDate: '2026-09-02', sameSessionRepeat: false, appVersion: '0.1.0', dataVersion: 1, masteryRulesVersion: 1,
  };
}

const range = { from: 1, to: 40 };
const firstChunk = Array.from({ length: 20 }, (_, index) => index + 1);
const secondChunk = Array.from({ length: 20 }, (_, index) => index + 21);

test('他製品のイベントは確認済みに数えない', () => {
  assert.deepEqual([...confirmedCardNumbers([event('p001', 'kanazukai')])], []);
});

test('壊れた poemId は確認済みに数えない', () => {
  assert.deepEqual([...confirmedCardNumbers([event('p21'), event('poem-001'), event('p0001')])], []);
});

test('閲覧イベントも確認済みに数える', () => {
  assert.deepEqual([...confirmedCardNumbers([event('p007')])], [7]);
});

test('同じ首のイベントは確認済み集合で重複しない', () => {
  assert.deepEqual([...confirmedCardNumbers([event('p007'), event('p007')])], [7]);
});

test('未確認が最も多いまとまりを選ぶ', () => {
  const plan = planResume(range, firstChunk.map((number) => event(`p${String(number).padStart(3, '0')}`)));
  assert.equal(plan.chunkIndex, 1);
  assert.deepEqual(plan.cardNumbers, secondChunk);
});

test('まとまり内に未確認があれば未確認の首だけを返す', () => {
  const plan = planResume(range, [event('p001'), event('p003'), ...secondChunk.map((number) => event(`p${String(number).padStart(3, '0')}`))]);
  assert.ok(plan.cardNumbers.length > 0, 'fixture が空では検査にならない');
  assert.deepEqual(plan.cardNumbers, firstChunk.filter((number) => number !== 1 && number !== 3));
  assert.ok(!plan.cardNumbers.includes(1));
});

test('全首確認済みでも空にならずまとまり全首を返す', () => {
  const plan = planResume(range, [...firstChunk, ...secondChunk].map((number) => event(`p${String(number).padStart(3, '0')}`)));
  assert.ok(plan.cardNumbers.length > 0, 'fixture が空では検査にならない');
  assert.deepEqual(plan.cardNumbers, firstChunk);
  assert.equal(plan.chunkFullyConfirmed, true);
});

test('部分的に未確認のまとまりは全首確認済みではない', () => {
  const plan = planResume(range, [event('p001'), ...secondChunk.map((number) => event(`p${String(number).padStart(3, '0')}`))]);
  assert.equal(plan.chunkFullyConfirmed, false);
  assert.ok(plan.cardNumbers.includes(2));
});

test('あと○首は選んだまとまりでなく範囲全体の未確認数', () => {
  const plan = planResume(range, [event('p001'), ...secondChunk.slice(1).map((number) => event(`p${String(number).padStart(3, '0')}`))]);
  assert.equal(plan.remainingInRange, 20);
});

test('chunkCount は範囲を20首単位で分割した数', () => {
  const plan = planResume({ from: 1, to: 41 }, []);
  assert.equal(plan.chunkCount, 3);
  assert.deepEqual(plan.cardNumbers, firstChunk);
});

test('範囲の先頭が1でなくても初回は先頭のまとまりを返す', () => {
  const plan = planResume({ from: 21, to: 41 }, []);
  assert.deepEqual(plan.cardNumbers, Array.from({ length: 20 }, (_, index) => index + 21));
  assert.equal(plan.chunkCount, 2);
});

test('イベントが無い初回は最初のまとまりを番号順に返す', () => {
  const plan = planResume(range, []);
  assert.equal(plan.chunkIndex, 0);
  assert.deepEqual(plan.cardNumbers, firstChunk);
  assert.equal(plan.chunkFullyConfirmed, false);
});
