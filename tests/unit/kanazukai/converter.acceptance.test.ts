import test from 'node:test';
import assert from 'node:assert/strict';
import { convertHistoricalKana } from '../../../packages/kanazukai/src/domain/converter.ts';
import { KANAZUKAI_RULES } from '../../../packages/kanazukai/src/domain/rules.v1.ts';
import type { RuleContext } from '../../../packages/kanazukai/src/domain/rule-context.ts';

const cases: readonly [string, string, RuleContext, string, readonly string[], readonly string[]][] = [
  ['H1', 'にほひ', {}, 'におい', ['H1'], []], ['H1 non', 'はな', { h1WordInitialPositions: [0] }, 'はな', ['H1-a'], ['H1']],
  ['H1-a', 'はな', { h1WordInitialPositions: [0] }, 'はな', ['H1-a'], ['H1']], ['H1-a non', 'にほひ', {}, 'におい', ['H1'], ['H1-a']],
  ['H1-b', 'はつはな', { h1WordInitialPositions: [0], h1CompoundInitialPositions: [2] }, 'はつはな', ['H1-b'], ['H1']], ['H1-b non', 'にほひ', {}, 'におい', ['H1'], ['H1-b']],
  ['H1-c', '花は', { h1ParticlePositions: [1] }, '花は', ['H1-c'], ['H1']], ['H1-c non', 'いへ', {}, 'いえ', ['H1'], ['H1-c']],
  ['W1', 'こゑ', {}, 'こえ', ['W1'], []], ['W1 non', 'こえ', {}, 'こえ', [], ['W1']],
  ['W2', 'をとこ', {}, 'おとこ', ['W2'], []], ['W2 non', '本を', { w2ParticlePositions: [1] }, '本を', ['W2-a'], ['W2']],
  ['W2-a', '本を', { w2ParticlePositions: [1] }, '本を', ['W2-a'], ['W2']], ['W2-a non', 'をとこ', {}, 'おとこ', ['W2'], ['W2-a']],
  ['D1', 'もみぢ', {}, 'もみじ', ['D1'], []], ['D1 non', 'つづく', { d1ExceptionRanges: [{ start: 0, end: 3 }] }, 'つづく', ['D1-a'], ['D1']],
  ['D1-a', 'ちぢむ', { d1ExceptionRanges: [{ start: 0, end: 3 }] }, 'ちぢむ', ['D1-a'], ['D1']], ['D1-a non', 'みづ', {}, 'みず', ['D1'], ['D1-a']],
  ['K1', 'くわし', { k1Ranges: [{ start: 0, end: 2 }] }, 'かし', ['K1'], []], ['K1 non', 'くはし', {}, 'くわし', ['H1'], ['K1']],
  ['N1', 'らむ', { n1Positions: [1] }, 'らん', ['N1'], []], ['N1 non', 'うむ', {}, 'うむ', [], ['N1']],
  ['L1', 'かうし', {}, 'こうし', ['L1'], []], ['L1 non', 'いうげん', {}, 'ゆうげん', ['L2'], ['L1']],
  ['L2', 'きう', {}, 'きゅう', ['L2', 'S1'], []], ['L2 non', 'かうし', {}, 'こうし', ['L1'], ['L2']],
  ['L3', 'せうと', {}, 'しょうと', ['L3', 'S1'], []], ['L3 non', 'かうし', {}, 'こうし', ['L1'], ['L3']],
  ['L4', 'ようい', {}, 'ようい', ['L4'], []], ['L4 non', 'よい', {}, 'よい', [], ['L4']],
  ['S1', 'しやう', {}, 'しょう', ['S1'], []], ['S1 non', 'しょう', {}, 'しょう', [], ['S1']],
];

for (const [name, input, context, output, expectedRules, absentRules] of cases) {
  test(`§7.1 ${name}: explicit context controls application`, () => {
    const result = convertHistoricalKana(input, context);
    assert.equal(result.output, output);
    for (const rule of expectedRules) assert.ok(result.appliedRules.includes(rule as never), `${rule} should apply`);
    for (const rule of absentRules) assert.ok(!result.appliedRules.includes(rule as never), `${rule} must not apply`);
  });
}

test('§7.2: protection precedes H1, H1 precedes long vowels, and S1 is last', () => {
  const protectedResult = convertHistoricalKana('をりふし', { h1CompoundInitialPositions: [2] });
  assert.equal(protectedResult.output, 'おりふし');
  assert.ok(protectedResult.appliedRules.indexOf('H1-b') < protectedResult.appliedRules.indexOf('W2'));
  const ordered = convertHistoricalKana('けふ');
  assert.equal(ordered.output, 'きょう');
  assert.deepEqual(ordered.stages, { normalized: 'けふ', exceptionProtected: 'けふ', h1: 'けう', longVowels: 'きよう', smallKana: 'きょう' });
  assert.ok(ordered.appliedRules.indexOf('H1') < ordered.appliedRules.indexOf('L3'));
  assert.ok(ordered.appliedRules.indexOf('L3') < ordered.appliedRules.indexOf('S1'));
});

test('§7.2: combined conversions preserve the required order and exception ranges', () => {
  assert.equal(convertHistoricalKana('ひとごゑ').output, 'ひとごえ');
  assert.equal(convertHistoricalKana('かはづ').output, 'かわず');
  assert.equal(convertHistoricalKana('たふとし').output, 'とうとし');
  assert.equal(convertHistoricalKana('てうづ').output, 'ちょうず');
  assert.equal(convertHistoricalKana('いへぢ').output, 'いえじ');
  assert.equal(convertHistoricalKana('あふぎ').output, 'おうぎ');
  assert.equal(convertHistoricalKana('はつはな', { h1WordInitialPositions: [0], h1CompoundInitialPositions: [2] }).output, 'はつはな');
  assert.equal(convertHistoricalKana('花は', { h1ParticlePositions: [1] }).output, '花は');
  assert.equal(convertHistoricalKana('本を', { w2ParticlePositions: [1] }).output, '本を');
  const exception = convertHistoricalKana('みかづき', { d1ExceptionRanges: [{ start: 0, end: 4, ruleId: 'D1-a' }] });
  assert.equal(exception.output, 'みかづき');
  assert.deepEqual(exception.protectedRanges, [{ start: 0, end: 4, ruleId: 'D1-a' }]);
});

test('A-5/A-6: conversion is deterministic and does not mutate the context', () => {
  const context: RuleContext = { h1WordInitialPositions: [0], d1ExceptionRanges: [{ start: 0, end: 3 }] };
  const original = structuredClone(context);
  const results = Array.from({ length: 10 }, () => convertHistoricalKana('はづづ', context));
  assert.ok(results.every((result) => result.output === results[0].output && JSON.stringify(result.appliedRules) === JSON.stringify(results[0].appliedRules)));
  assert.deepEqual(context, original);
});

test('A-10: the copied rule identifiers are exactly the 16 specified identifiers', () => {
  assert.deepEqual(KANAZUKAI_RULES.map((rule) => rule.ruleId), ['H1', 'H1-a', 'H1-b', 'H1-c', 'W1', 'W2', 'W2-a', 'D1', 'D1-a', 'K1', 'N1', 'L1', 'L2', 'L3', 'L4', 'S1']);
});
