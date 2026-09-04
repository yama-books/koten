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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
