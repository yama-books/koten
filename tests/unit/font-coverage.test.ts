import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseUnicodeRange } from '../../tools/font-check/index.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const fontsCss = path.join(root, 'packages/shared/src/styles/fonts.css');

test('self-host font declarations exist', () => {
  const css = readFileSync(fontsCss, 'utf8');
  assert.match(css, /@font-face\s*\{/);
});

test('font declarations do not reference external hosts', () => {
  const css = readFileSync(fontsCss, 'utf8');
  assert.doesNotMatch(css, /src:\s*url\(['"]?https?:\/\//i);
});

test('unicode-range parser expands individual code points and ranges', () => {
  assert.deepEqual([...parseUnicodeRange('U+3042')], [0x3042]);
  const range = parseUnicodeRange('U+3040-309F');
  assert.equal(range.size, 0x60);
  assert.ok(range.has(0x3040));
  assert.ok(range.has(0x309f));
});

test('each public font directory includes the OFL text', () => {
  for (const product of ['hyakunin', 'kanazukai']) {
    for (const family of ['klee-one', 'zen-maru-gothic']) {
      assert.ok(existsSync(path.join(root, 'packages', product, 'public', 'fonts', family, 'OFL.txt')));
    }
  }
});
