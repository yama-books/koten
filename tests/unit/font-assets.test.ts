import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { Buffer } from 'node:buffer';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { compareFileMaps, hasOflFile, matchesRecord, parseFontSources } from '../../tools/font-assets-check/index.ts';

test('fonts.css の実際の @font-face 形式からローカル src を解析できる', () => {
  const sources = parseFontSources("@font-face { font-family: 'Klee One'; font-weight: 600; src: url(/fonts/klee-one/a.woff2) format('woff2'); }");
  assert.deepEqual(sources, [{ family: 'Klee One', weight: '600', file: 'klee-one/a.woff2' }]);
});

test('SHA-256 とバイト数の一致を判定できる', () => {
  const bytes = Buffer.from('font');
  const record = { sha256: createHash('sha256').update(bytes).digest('hex'), bytes: 4 };
  assert.equal(matchesRecord(bytes, record), true);
  assert.equal(matchesRecord(Buffer.from('fonT'), record), false);
});

test('2 パッケージの内容差分を検出できる', () => {
  assert.deepEqual(compareFileMaps(new Map([['a', '1']]), new Map([['a', '1'], ['b', '2']])), ['b']);
});

test('OFL.txt の存在判定はファミリー単位で独立する', () => {
  assert.equal(hasOflFile(['klee-one/a.woff2', 'klee-one/OFL.txt']), true);
  assert.equal(hasOflFile(['zen-maru-gothic/a.woff2']), false);
});

const root = path.resolve(import.meta.dirname, '../..');
const fontPackages = ['hyakunin', 'kanazukai'] as const;
const oflRecords = [
  ['klee-one/OFL.txt', 'https://raw.githubusercontent.com/google/fonts/main/ofl/kleeone/OFL.txt'],
  ['zen-maru-gothic/OFL.txt', 'https://raw.githubusercontent.com/google/fonts/main/ofl/zenmarugothic/OFL.txt'],
] as const;

test('両パッケージのSOURCES.jsonにOFL.txtの記録がある', () => {
  for (const packageName of fontPackages) {
    const records = JSON.parse(readFileSync(path.join(root, 'packages', packageName, 'public', 'fonts', 'SOURCES.json'), 'utf8')).files;
    for (const [file, url] of oflRecords) assert.deepEqual(records.find((record: { file: string }) => record.file === file)?.url, url);
  }
});

test('OFL.txtのSOURCES.json記録は実ファイルと一致する', () => {
  for (const packageName of fontPackages) {
    const fonts = path.join(root, 'packages', packageName, 'public', 'fonts');
    const records = JSON.parse(readFileSync(path.join(fonts, 'SOURCES.json'), 'utf8')).files;
    for (const [file] of oflRecords) {
      const record = records.find((item: { file: string }) => item.file === file);
      const bytes = readFileSync(path.join(fonts, file));
      assert.equal(record.bytes, statSync(path.join(fonts, file)).size);
      assert.equal(record.sha256, createHash('sha256').update(bytes).digest('hex'));
    }
  }
});
