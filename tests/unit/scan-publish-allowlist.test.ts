import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const manifest = readFileSync(path.join(root, 'docs', 'PUBLISH_MANIFEST.md'), 'utf8');
const scanPublishSource = readFileSync(path.join(root, 'tools', 'scan-publish', 'index.ts'), 'utf8');
const buildBlock = manifest.match(/### 5\.1\b[\s\S]*?```text\r?\n([\s\S]*?)```/)?.[1];
const extensions = new Set(
  (buildBlock ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim().toLowerCase())
    .filter((line) => line.length > 0 && !line.startsWith('#')),
);

test('PUBLISH_MANIFEST §5.1 has a usable build extension allowlist', () => {
  assert.ok(buildBlock, '§5.1 の text コードブロックが見つかる');
  assert.ok(extensions.size > 0, '§5.1 に有効な行が1件以上ある');
  for (const extension of ['.html', '.js', '.css', '.json', '.woff2']) {
    assert.ok(extensions.has(extension), `${extension} が含まれる`);
  }
  assert.equal(extensions.has('.map'), false, '.map は含まれない');
});

test('scan-publish does not hardcode build extensions in an array literal', () => {
  assert.equal(
    /\[[^\]]*['"]\.html['"][^\]]*['"]\.js['"][^\]]*\]/s.test(scanPublishSource),
    false,
  );
});
