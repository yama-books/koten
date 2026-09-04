import test from 'node:test';
import assert from 'node:assert/strict';
import { DataLoadError, loadJson } from '../../packages/shared/src/data/load.ts';

test('共有ローダーはJSONを製品スキーマへ渡す', async () => {
  const result = await loadJson('data:application/json,%7B%22value%22%3A7%7D', (value) => {
    if (typeof value !== 'object' || value === null || !('value' in value) || value.value !== 7) throw new TypeError('invalid');
    return value.value;
  });
  assert.equal(result, 7);
});

test('共有ローダーは壊れたJSONとスキーマ不一致を公開向けエラーへ変換する', async () => {
  await assert.rejects(() => loadJson('data:application/json,not-json', () => true), DataLoadError);
  await assert.rejects(() => loadJson('data:application/json,%7B%7D', () => { throw new TypeError('invalid'); }), DataLoadError);
});
