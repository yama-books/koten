import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseAllowlist, readAllowlist } from '../../tools/scan-publish/allowlist.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const scanPublishSource = readFileSync(path.join(root, 'tools', 'scan-publish', 'index.ts'), 'utf8');
const { sources: entries, buildExtensions } = readAllowlist();
const extensions = new Set(buildExtensions);

test('the build extension allowlist is usable', () => {
  assert.ok(extensions.size > 0, '[build-extensions] に有効な行が1件以上ある');
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

/**
 * The allowlist must live where the published tree can read it. Keeping it under `docs/`
 * shipped a repository whose own `scan:publish` and `npm test` failed on the first run,
 * because `docs/` is excluded from the transfer.
 */
test('the allowlist is readable from the published tree and lists itself', () => {
  assert.equal(path.relative(root, path.join(root, 'publish-allowlist.txt')), 'publish-allowlist.txt');
  assert.equal(scanPublishSource.includes('PUBLISH_MANIFEST'), false, 'scan-publish が非公開の docs/ を読んでいる');
  assert.ok(entries.includes('publish-allowlist.txt'), '許可リストが自分自身を載せていない（移管先へ複写されない）');
});

test('the allowlist parser keeps sections apart and drops comments', () => {
  const parsed = parseAllowlist('# note\n[a]\none\n# skip\n\n[b]\ntwo\n');
  assert.deepEqual(parsed, { a: ['one'], b: ['two'] });
  assert.throws(() => parseAllowlist('stray\n'), /節の外に行がある/);
});

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

test('every allowlist entry names something that exists', () => {
  assert.ok(entries.length > 10, '許可リストを読み取れている');
  const missing = entries.filter((entry) => !resolves(entry));
  // An entry that matches nothing is silent: scan:publish only looks for things that
  // must NOT be there, so a mistyped path drops files from the transfer and stays green.
  assert.deepEqual(missing, [], `許可リストが実体と食い違っている: ${missing.join(', ')}`);
});

test('every tool the root scripts invoke is covered by the allowlist', () => {
  const scripts = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).scripts as Record<string, string>;
  const invoked = new Set([...Object.values(scripts).join(' ').matchAll(/tools\/([\w-]+)\//g)].map((match) => match[1]));
  assert.ok(invoked.size > 0, 'package.json から tools/ の呼び出しを 1 件も拾えていない');
  const uncovered = [...invoked].filter((name) => !entries.includes(`tools/${name}/**`));
  assert.deepEqual(uncovered, [], `公開版で script が動かない: ${uncovered.join(', ')}`);
});

/**
 * 複写の道具は**公開ツリーに無い**（許可リストに載せない）。あるときだけ検査する。
 *
 * `publish-transfer` はファイル系から複写するので、`.gitignore` を見ないと
 * 無視されている生成物が `packages/**` や `tests/**` に拾われて公開へ渡る。
 * **`scan:publish` はこれらを一度も見ていない**ので、そちらの0件は証拠にならない。
 * 2026-09-07 に `tsconfig.tsbuildinfo` 3件と Firebase エミュレータのログ 295KB が渡りかけた。
 */
const transferSource = path.join(root, 'tools', 'publish-transfer', 'index.ts');
const transferTest = existsSync(transferSource) ? test : test.skip;

transferTest('複写の一覧に、git が無視するファイルを入れない', async () => {
  const { plan } = await import('../../tools/publish-transfer/index.ts');
  const files = plan().files;
  // 一覧が空では、無視されたファイルが0件でも何も示さない。
  assert.ok(files.length > 500, `複写の一覧が ${files.length} 件では検査にならない`);
  const checked = spawnSync('git', ['check-ignore', '--stdin'], { cwd: root, input: files.join(String.fromCharCode(10)), encoding: 'utf8' });
  const ignored = (checked.stdout ?? '').split(String.fromCharCode(10)).map((line) => line.trim()).filter(Boolean);
  assert.deepEqual(ignored, [], `git が無視するファイルが複写の一覧にある: ${ignored.slice(0, 5).join(' / ')}`);
});
