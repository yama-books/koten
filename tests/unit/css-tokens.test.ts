import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appCss = [
  readFileSync('packages/hyakunin/src/styles.css', 'utf8'),
  readFileSync('packages/kanazukai/src/styles.css', 'utf8'),
].join('\n');
const tokenCss = readFileSync('packages/shared/src/styles/tokens.css', 'utf8');

test('hyakunin CSS が参照するトークンは定義されている', () => {
  const names = [...appCss.matchAll(/var\((--[\w-]+)\)/g)].map((match) => match[1]);
  assert.ok(names.length > 0, 'トークン参照が空では検査にならない');
  for (const name of names) assert.match(appCss + tokenCss, new RegExp(`${name}:`), `${name} が定義されていない`);
});

test('kanazukai CSS のトークン参照も同じ定義集合で検査する', () => {
  const kanazukai = readFileSync('packages/kanazukai/src/styles.css', 'utf8');
  const names = [...kanazukai.matchAll(/var\((--[\w-]+)\)/g)].map((match) => match[1]);
  for (const name of names) assert.match(kanazukai + tokenCss, new RegExp(`${name}:`), `${name} が定義されていない`);
});
