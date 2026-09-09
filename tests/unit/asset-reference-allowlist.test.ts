import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parseAllowlist, readAllowlist } from '../../tools/scan-publish/allowlist.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** 比較は常に「/」区切りで行う。Windows の path.relative は「\」を返す。 */
function rel(target: string): string {
  return path.relative(root, target).split(path.sep).join('/');
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' || entry.name === 'dist' ? [] : sourceFiles(full);
    return /\.(ts|tsx|css)$/.test(entry.name) ? [full] : [];
  });
}

/** `new URL('../../assets/...', import.meta.url)` と `url(...)` の両方を拾う。 */
function referencedAssets(): { from: string; asset: string }[] {
  const found: { from: string; asset: string }[] = [];
  for (const file of sourceFiles(path.join(root, 'packages'))) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(/['"(]((?:\.\.\/)+assets\/[^'")]+)['")]/g)) {
      const resolved = path.resolve(path.dirname(file), match[1]!);
      found.push({ from: rel(file), asset: rel(resolved) });
    }
  }
  return found;
}

/**
 * 参照している素材が公開許可リストから漏れると、**公開版だけが壊れる**。
 * 手元では `assets/` が存在するので、試験もビルドも緑のまま通ってしまう。
 *
 * 許可リストは1行足すだけで通るので、行を消したときに気付ける釘がここに要る。
 * 走査対象が空のときに緑にならないよう、参照が1件以上あることを先に確かめる。
 */
test('assets: 画面が参照する素材はすべて公開許可リストに載っている', () => {
  const references = referencedAssets();
  assert.ok(references.length > 0, '前提: packages 配下から assets/ を参照している箇所が存在する');

  const allowed = parseAllowlist(readFileSync(path.join(root, 'publish-allowlist.txt'), 'utf8')).sources;
  const covered = (asset: string) => allowed.some((entry) =>
    entry === asset || (entry.endsWith('/**') && asset.startsWith(entry.slice(0, -2))));

  const missing = references.filter((reference) => !covered(reference.asset));
  assert.deepEqual(missing, [], `公開許可リストに無い素材: ${missing.map((m) => `${m.asset} (${m.from})`).join(', ')}`);
});

test('assets: 参照している素材が実在する', () => {
  for (const { from, asset } of referencedAssets()) {
    assert.ok(existsSync(path.join(root, asset)) && statSync(path.join(root, asset)).isFile(), `${asset} が無い (${from})`);
  }
});
