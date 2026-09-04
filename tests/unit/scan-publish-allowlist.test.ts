import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
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

const sourceBlock = manifest.match(/^## 5\. この許可リスト[\s\S]*?```text\r?\n([\s\S]*?)```/m)?.[1];
const entries = (sourceBlock ?? '')
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line.length > 0 && !line.startsWith('#'));

/**
 * Entries the allowlist names ahead of the file existing. Checked in BOTH directions
 * below, so the exemption cannot quietly outlive the reason for it.
 */
const notYetCreated = new Set(['仮名遣い語彙_一次データ.md', '.github/workflows/deploy-pages.yml']);

function resolves(entry: string): boolean {
  if (entry.endsWith('/**')) {
    const directory = path.join(root, entry.slice(0, -'/**'.length));
    return existsSync(directory) && readdirSync(directory).length > 0;
  }
  const star = entry.lastIndexOf('*');
  if (star < 0) return existsSync(path.join(root, entry));
  const directory = path.join(root, path.posix.dirname(entry));
  const suffix = path.posix.basename(entry).slice(1);
  return existsSync(directory) && readdirSync(directory).some((name) => name.endsWith(suffix));
}

test('every PUBLISH_MANIFEST §5 entry names something that exists', () => {
  assert.ok(entries.length > 10, '§5 の許可リストを読み取れている');
  const missing = entries.filter((entry) => !notYetCreated.has(entry) && !resolves(entry));
  // An entry that matches nothing is silent: scan:publish only looks for things that
  // must NOT be there, so a mistyped path drops files from the transfer and stays green.
  assert.deepEqual(missing, [], `許可リストが実体と食い違っている: ${missing.join(', ')}`);
});

test('the not-yet-created exemptions are still not created', () => {
  const created = [...notYetCreated].filter((entry) => resolves(entry));
  assert.deepEqual(created, [], `作成済みなので免除一覧から外すこと: ${created.join(', ')}`);
});

test('every tool the root scripts invoke is covered by the allowlist', () => {
  const scripts = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).scripts as Record<string, string>;
  const invoked = new Set([...Object.values(scripts).join(' ').matchAll(/tools\/([\w-]+)\//g)].map((match) => match[1]));
  assert.ok(invoked.size > 0, 'package.json から tools/ の呼び出しを 1 件も拾えていない');
  const uncovered = [...invoked].filter((name) => !entries.includes(`tools/${name}/**`));
  assert.deepEqual(uncovered, [], `公開版で script が動かない: ${uncovered.join(', ')}`);
});
