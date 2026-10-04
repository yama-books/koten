import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { assemble, pagesFiles, staticApps } from '../../tools/pages-assemble/index.ts';
import { readAllowlist } from '../../tools/scan-publish/allowlist.ts';
import { heldConjData, heldDataExpected, isWorkingRepository } from '../../tools/conj-layout-check/held-data.ts';

/**
 * GitHub Pages の静的アプリ（conj / vintage-kana / checkpoint）の配信物。
 * **最優先は、アプリの中身（用例・出典・画像・データ）を配信から落とさないこと。** 作業文書を外すのはその次。
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const workflow = readFileSync(path.join(root, '.github/workflows/deploy-pages.yml'), 'utf8');
const app = (dir: string) => {
  const found = staticApps.find((entry) => entry.dir === dir);
  assert.ok(found, `${dir} が tools/pages-assemble にない`);
  return found;
};
const deployed = (dir: string) => new Set(pagesFiles(app(dir)));
/**
 * vintage-kana/ と checkpoint/ は公開許可リストに無い（公開ツリーには無い）。作業リポジトリでは必ず検査する。
 * conj/ は許可リストにあるので、どちらでも検査する。
 */
const present = staticApps.filter(({ dir }) => isWorkingRepository || dir === 'conj' || existsSync(path.join(root, dir)));

/** index.html から辿れる、アプリ内の相対参照（href/src 属性と "./…" の文字列）。スクリプトとマニフェストも辿る。 */
function runtimeReferences(dir: string): Set<string> {
  const appDir = path.join(root, dir);
  const refs = new Set<string>();
  const pending = ['index.html'];
  const seen = new Set<string>();
  while (pending.length) {
    const file = pending.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const text = readFileSync(path.join(appDir, file), 'utf8');
    const raw = [
      ...[...text.matchAll(/\b(?:href|src)="([^"]+)"/g)].map((m) => m[1]),
      ...[...text.matchAll(/["'](\.\/[^"'\s]+)["']/g)].map((m) => m[1]),
    ];
    if (file.endsWith('.webmanifest') || file.endsWith('manifest.json')) {
      for (const icon of (JSON.parse(text).icons ?? []) as { src: string }[]) raw.push(icon.src);
    }
    for (const value of raw) {
      if (/^(?:[a-z]+:|\/\/|#|\/)/i.test(value) || value.startsWith('${')) continue;
      const clean = value.replace(/[?#].*$/, '');
      if (clean.endsWith('/') || clean === '') continue;
      const relative = path.posix.normalize(path.posix.join(path.posix.dirname(file), clean));
      if (relative.startsWith('../')) continue; // 他のアプリ（/100/ の Web フォント）
      refs.add(relative);
      if (/\.(?:js|webmanifest|html)$/.test(relative) && existsSync(path.join(appDir, relative))) pending.push(relative);
    }
  }
  return refs;
}

test('Pages の組み立ては、静的アプリを丸ごと複写しない', () => {
  for (const dir of ['conj', 'vintage-kana', 'checkpoint']) {
    assert.doesNotMatch(workflow, new RegExp(`cp -r ${dir}\\b`), `${dir}/ を丸ごと複写している`);
    app(dir);
  }
  assert.match(workflow, /^\s*node --experimental-strip-types tools\/pages-assemble\/index\.ts --out _site\s*$/m);
});

test('conj: アプリが実行時に読むファイル（データ・画像・CSS・マニフェスト・アイコン）をすべて Pages に置く', () => {
  const refs = runtimeReferences('conj');
  // conj/adjv-runtime-adapter.js はデータを base（既定 ./data/）＋ファイル名で読む。
  const adapter = readFileSync(path.join(root, 'conj/adjv-runtime-adapter.js'), 'utf8');
  assert.match(adapter, /const DEFAULT_BASE="\.\/data\/";/);
  const data = [...adapter.matchAll(/base\+"([^"]+\.json)"/g)].map((m) => `data/${m[1]}`);
  // 活用表5・公開本文・CHJ 引用・語釈・助動詞の用例・助動詞の意味。減ったら抽出が壊れている。
  assert.equal(new Set(data).size, 10, data.join(', '));
  for (const file of data) refs.add(file);
  for (const expected of ['adjv-runtime-adapter.js', 'branding.css', 'icon.svg', 'manifest.webmanifest',
    'img/hanamaru.png', 'img/record-cat.webp', 'img/result-ok.png', 'img/result-ng.png',
    'data/adjectival-noun-public-examples.json', 'data/adjectival-noun-chj-quotations.json', 'data/aux-examples.json']) {
    assert.ok(refs.has(expected), `参照の抽出から ${expected} が漏れている`);
  }
  const files = deployed('conj');
  const missing = [...refs].filter((ref) => !files.has(ref))
    // 内部扱いのデータ（CHJ の引用・example-index-120・助動詞の用例）は公開ツリーには無い。作業リポジトリでは必ず配信する。
    .filter((ref) => !heldConjData.includes(`conj/${ref}`) || heldDataExpected(`conj/${ref}`));
  assert.deepEqual(missing, [], `Pages に置かれない: ${missing.join(', ')}`);
  assert.ok(files.has('index.html'));
});

for (const dir of ['vintage-kana', 'checkpoint']) {
  (present.some((entry) => entry.dir === dir) ? test : test.skip)(`${dir}: index.html から辿れるファイルをすべて Pages に置く`, () => {
    const refs = runtimeReferences(dir);
    assert.ok(refs.size >= 5, `${dir}: 参照を ${refs.size} 件しか拾えていない`);
    const files = deployed(dir);
    const missing = [...refs].filter((ref) => !files.has(ref));
    assert.deepEqual(missing, [], `${dir}: Pages に置かれない: ${missing.join(', ')}`);
  });
}

test('Pages に作業文書（.md）・監査ファイルを置かない', () => {
  for (const { dir } of present) {
    const leaked = [...deployed(dir)].filter((file) => file.toLowerCase().endsWith('.md') || file.split('/').some((part) => part.startsWith('.')));
    assert.deepEqual(leaked, [], `${dir}: ${leaked.join(', ')}`);
  }
  const conj = [...deployed('conj')];
  assert.deepEqual(conj.filter((file) => file.startsWith('audit/')), []);
  for (const file of ['adjv-runtime-smoke.html', 'data/adjectival-noun-selection-120.json', 'data/corpus-status.json', 'HANDOFF.md']) {
    assert.equal(conj.includes(file), false, `conj/${file} が Pages に置かれる`);
  }
});

test('ソースとして公開する conj のファイルは、すべて Pages にも置く', () => {
  const entries = readAllowlist().sources.filter((entry) => entry.startsWith('conj/'));
  assert.ok(entries.length > 0, '許可リストに conj の行が無い');
  const files = deployed('conj');
  for (const entry of entries) {
    if (entry.endsWith('/**')) {
      const prefix = entry.slice('conj/'.length, -'**'.length);
      assert.ok([...files].some((file) => file.startsWith(prefix)), `${entry} が Pages に 1 件も無い`);
    } else {
      assert.ok(files.has(entry.slice('conj/'.length)), `${entry} が Pages に無い`);
    }
  }
});

test('組み立ての出力は、一覧どおりのファイルだけである', () => {
  const out = mkdtempSync(path.join(tmpdir(), 'pages-assemble-'));
  try {
    const counts = assemble(out, present);
    for (const { dir } of present) {
      const listed = pagesFiles(app(dir));
      assert.equal(counts[dir], listed.length);
      const walk = (directory: string, prefix = ''): string[] => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
        return entry.isDirectory() ? walk(path.join(directory, entry.name), relative) : [relative];
      });
      assert.deepEqual(walk(path.join(out, dir)).sort(), listed);
    }
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});
