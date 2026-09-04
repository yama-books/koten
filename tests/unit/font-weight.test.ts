import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const css = readFileSync(path.join(root, 'packages/shared/src/styles/fonts.css'), 'utf8');
const faces = new Set([...css.matchAll(/@font-face\s*\{([\s\S]*?)\}/g)].flatMap((match) => {
  const family = match[1].match(/font-family:\s*['"]?([^;'"\n]+)['"]?\s*;/)?.[1].trim();
  const weight = match[1].match(/font-weight:\s*(\d+)\s*;/)?.[1];
  return family && weight ? [`${family} ${weight}`] : [];
}));

test('font faces are exactly the three D-04 weights', () => {
  assert.deepEqual(faces, new Set(['Zen Maru Gothic 500', 'Zen Maru Gothic 700', 'Klee One 600']));
});
test('retired 400 weights are absent', () => {
  assert.doesNotMatch(css, /(?:Klee One|Zen Maru Gothic)[\s\S]{0,100}font-weight:\s*400/);
});
test('font sources stay self-hosted', () => {
  assert.doesNotMatch(css, /src:[^;}]*https?:\/\//i);
});
test('each font family keeps its OFL text', () => {
  for (const product of ['hyakunin', 'kanazukai']) for (const family of ['klee-one', 'zen-maru-gothic']) {
    assert.ok(existsSync(path.join(root, 'packages', product, 'public', 'fonts', family, 'OFL.txt')));
  }
});
