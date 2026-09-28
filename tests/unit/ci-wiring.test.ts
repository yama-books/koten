import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const scripts = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).scripts as Record<string, string>;
const ci = readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8');

/**
 * CI から外してよい検査は、ここに 1 行だけ書く。**両方向に検査する**ので、免除は理由より長生きしない。
 * H-21: check:storage は「未知 product の拒否」シナリオで止まる（docs/HANDOFF.md 4.2）。
 * 常に落ちる検査は、検査が無いより悪い。原因が分かったらこの一覧から外して CI へ戻す。
 */
const ciExemptChecks: readonly string[] = ['check:storage'];

test('CI は package.json の全 check: スクリプトを実行する（免除を除く）', () => {
  const all = Object.keys(scripts).filter((name) => name.startsWith('check:'));
  assert.ok(all.length > ciExemptChecks.length, '検査対象が免除だけでは意味がない');
  for (const name of all.filter((name) => !ciExemptChecks.includes(name))) {
    assert.match(ci, new RegExp(`^\\s*- run: npm run ${escapeRegExp(name)}\\s*$`, 'm'), `${name} が CI にない`);
  }
});

test('CI の免除一覧は、実在して・実際に外れている検査だけを載せる', () => {
  assert.ok(ciExemptChecks.length > 0, '免除が 0 件ならこの検査は何も見ていない');
  for (const name of ciExemptChecks) {
    assert.ok(name in scripts, `${name} が package.json に無い。免除一覧から外すこと`);
    assert.doesNotMatch(ci, new RegExp(`^\\s*- run: npm run ${escapeRegExp(name)}\\s*$`, 'm'), `${name} は CI に戻っている。免除一覧から外すこと`);
  }
  assert.match(ci, /H-21/, '免除の理由が ci.yml に書かれていない');
});

test('CI は既存の公開ゲートを実行する', () => {
  for (const name of ['data:check', 'typecheck', 'lint', 'test', 'build', 'scan:publish']) {
    const command = name === 'test' ? 'npm test' : `npm run ${name}`;
    assert.match(ci, new RegExp(escapeRegExp(command)), `${name} が CI にない`);
  }
});

test('overflow と font-weight は別の run 行で実行する', () => {
  for (const line of ci.split(/\r?\n/).filter((line) => /^\s*- run:/.test(line))) {
    assert.ok(!(line.includes('check:overflow') && line.includes('check:font-weight')), `同じ run 行: ${line}`);
  }
});

test('実ブラウザの検査は、build と Playwright の導入より後に実行する', () => {
  // conj-layout は /100/（packages/hyakunin/dist）の Web フォントを、overflow と font-weight は vite preview を使う。
  const lines = ci.split(/\r?\n/);
  const at = (pattern: RegExp) => lines.findIndex((line) => pattern.test(line));
  const build = at(/^\s*- run: npm run build\s*$/);
  const install = at(/^\s*- run: npx playwright install\b/);
  assert.ok(build >= 0 && install >= 0, 'build または Playwright の導入が CI にない');
  for (const name of ['check:overflow', 'check:font-weight', 'check:conj-layout']) {
    const index = at(new RegExp(`^\\s*- run: npm run ${escapeRegExp(name)}\\s*$`));
    assert.ok(index > build && index > install, `${name} が build・Playwright の導入より前にある`);
  }
});

test('CI のポート表に conj-layout の既定ポートがある', () => {
  const source = readFileSync(path.join(root, 'tools/conj-layout-check/index.ts'), 'utf8');
  const port = /CONJ_LAYOUT_CHECK_PORT \?\? (\d+)/.exec(source)?.[1];
  assert.ok(port, 'conj-layout の既定ポートが読めない');
  assert.match(ci, new RegExp(`# ports:.*\\bconj-layout=${port}\\b`), 'ci.yml のポート表と conj-layout の既定ポートが違う');
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
