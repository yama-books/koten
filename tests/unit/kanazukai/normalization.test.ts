import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeForGrading, shouldGrade } from '../../../packages/kanazukai/src/domain/normalization.ts';

test('§7.3: NFC, katakana, and surrounding half/full-width spaces are normalized', () => {
  assert.equal(normalizeForGrading('  か\u3099  '), 'が');
  assert.equal(normalizeForGrading('　チョウズ　'), 'ちょうず');
});

test('§7.3: inner spaces and a long-vowel mark are not silently corrected', () => {
  assert.equal(normalizeForGrading('ちょ うず'), 'ちょ うず');
  assert.notEqual(normalizeForGrading('ちょーず'), 'ちょうず');
});

test('§7.3: only an explicit button after composition ends can grade', () => {
  assert.equal(shouldGrade(true, 'button'), false);
  assert.equal(shouldGrade(false, 'enter'), false);
  assert.equal(shouldGrade(false, 'button'), true);
});
