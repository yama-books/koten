import test from 'node:test';
import assert from 'node:assert/strict';
import { computeMastery } from '../../../packages/shared/src/domain/mastery/compute.ts';
import { downgradeForHint } from '../../../packages/shared/src/domain/mastery/rules.v1.ts';
import { event } from './fixtures.ts';

test('hint-downgrade: 仕様に明記された写像とview下限だけを返す', () => {
  assert.equal(downgradeForHint('free-input'), 'kanji-to-kana');
  assert.equal(downgradeForHint('kanji-to-kana'), 'choice');
  assert.equal(downgradeForHint('choice'), 'self-tri');
  assert.equal(downgradeForHint('self-tri'), 'view');
  assert.equal(downgradeForHint('view'), 'view');
  assert.equal(downgradeForHint('self-x'), undefined);
  assert.equal(downgradeForHint('self-o'), undefined);
  assert.equal(downgradeForHint('paper-handwriting'), 'kanji-to-kana');
});

test('hint-downgrade: 計算はeffectiveMethodを唯一の係数として使う', () => {
  const hinted = event({ method: 'free-input', effectiveMethod: 'kanji-to-kana', hintUsed: true });
  assert.equal(computeMastery([hinted]).scores['p001:text'], 7);
});
