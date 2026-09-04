import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parsePoems } from '../../packages/hyakunin/src/data/schema.ts';

const poems = JSON.parse(readFileSync(new URL('../../packages/hyakunin/src/data/generated/poems.json', import.meta.url), 'utf8'));

test('公開用の100首データを実行時スキーマで受理する', () => {
  assert.equal(parsePoems(poems).length, 100);
});

test('欠損または番号不整合のデータを拒否する', () => {
  assert.throws(() => parsePoems(poems.slice(0, 99)), /exactly 100/);
  const changed = structuredClone(poems);
  changed[11].cardNo = 99;
  assert.throws(() => parsePoems(changed), /invalid poem record at 12/);
});
