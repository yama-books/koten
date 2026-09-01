import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const scripts = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).scripts as Record<string, string>;
const ci = readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8');

test('CI は package.json の全 check: スクリプトを実行する', () => {
  for (const name of Object.keys(scripts).filter((name) => name.startsWith('check:'))) {
    assert.match(ci, new RegExp(`^\\s*- run: npm run ${escapeRegExp(name)}\\s*$`, 'm'), `${name} が CI にない`);
  }
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
