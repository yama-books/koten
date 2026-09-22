import test from 'node:test';
import assert from 'node:assert/strict';
import { guessDeviceName, normalizeDeviceName } from '../../../packages/shared/src/sync/device-name.ts';

// 依頼者・2026-09-22:「大雑把な推測の端末名をデフォルトのフォーム内に出し、
// 端末名（任意・共有先端末からの確認用）として書いてor確認してもらう」

test('端末名: UA から種類を当てる', () => {
  assert.equal(guessDeviceName('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari'), 'iPhone');
  assert.equal(guessDeviceName('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) Safari'), 'iPad');
  assert.equal(guessDeviceName('Mozilla/5.0 (Linux; Android 14; Pixel) Mobile Safari'), 'Android スマホ');
  assert.equal(guessDeviceName('Mozilla/5.0 (Linux; Android 14; SM-X200) Safari'), 'Android タブレット');
  assert.equal(guessDeviceName('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari'), 'Mac');
  assert.equal(guessDeviceName('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome'), 'Windows PC');
  assert.equal(guessDeviceName('Mozilla/5.0 (X11; CrOS x86_64) Chrome'), 'Chromebook');
});

test('端末名: 分からなければ当てずに濁す', () => {
  // **機種名は取れない。** 知らない UA に嘘の機種名を当てるより、書き換えてもらう。
  assert.equal(guessDeviceName('Mozilla/5.0 (Unknown)'), 'この端末');
});

test('端末名: iPad を iPhone と取り違えない', () => {
  // iPad の UA にも "like Mac OS X" が入る。**順序を変えると Mac と誤る。**
  assert.equal(guessDeviceName('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)'), 'iPad');
});

test('端末名: 空白だけなら名前なしにする', () => {
  assert.equal(normalizeDeviceName('   '), undefined);
  assert.equal(normalizeDeviceName(''), undefined);
  assert.equal(normalizeDeviceName('  わたしのスマホ  '), 'わたしのスマホ');
});

test('端末名: 長すぎる名前は切り詰める', () => {
  assert.equal(normalizeDeviceName('あ'.repeat(40))?.length, 24);
});
