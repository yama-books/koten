import assert from 'node:assert/strict';
import test from 'node:test';
import { makeSanitizer } from '../../tools/check-storage/sanitize.ts';

// 2026-08-31 に実測した欠陥の回帰試験。
// 旧実装は区切り文字を「エスケープしてから置換」していたため Windows では
// 区切り 2 個を要求する式になり、一度も一致しなかった（＝伏字化が効いていなかった）。
const windowsRoot = 'C:\\Users\\tester\\AI\u958b\u767a\\koten';
const windowsHome = 'C:\\Users\\tester';
const posixRoot = '/home/tester/AI\u958b\u767a/koten';
const posixHome = '/home/tester';

test('sanitize: Windows のスタックトレースから作業ディレクトリが消える', () => {
  const sanitize = makeSanitizer(windowsRoot, windowsHome);
  const output = sanitize(`at ${windowsRoot}\\tools\\check-storage\\index.ts:52:11`);
  assert.equal(output, 'at .\\tools\\check-storage\\index.ts:52:11');
  assert.doesNotMatch(output, /tester/);
});

test('sanitize: POSIX のスタックトレースから作業ディレクトリが消える', () => {
  const sanitize = makeSanitizer(posixRoot, posixHome);
  const output = sanitize(`at ${posixRoot}/tools/check-storage/index.ts:52:11`);
  assert.equal(output, 'at ./tools/check-storage/index.ts:52:11');
  assert.doesNotMatch(output, /tester/);
});

test('sanitize: 百分率符号化された file:// URL からも消える', () => {
  const sanitize = makeSanitizer(windowsRoot, windowsHome);
  const output = sanitize('file:///C:/Users/tester/AI%E9%96%8B%E7%99%BA/koten/node_modules/vite/dist/node.js:28153:30');
  assert.doesNotMatch(output, /tester/);
  assert.match(output, /node_modules\/vite/);
});

test('sanitize: 作業ディレクトリの外にある一時領域でも利用者名が消える', () => {
  const sanitize = makeSanitizer(windowsRoot, windowsHome);
  const output = sanitize('profile: C:\\Users\\tester\\AppData\\Local\\Temp\\koten-storage-abc');
  assert.doesNotMatch(output, /tester/);
  assert.match(output, /koten-storage-abc/);
});

test('sanitize: 伏字化の対象が無い出力は変わらない', () => {
  const sanitize = makeSanitizer(posixRoot, posixHome);
  assert.equal(sanitize('check:storage: シナリオ 5 件、合格 5 件'), 'check:storage: シナリオ 5 件、合格 5 件');
});
