import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { appConfig } from '../../packages/shared/src/app-config.ts';
import { KNOWN_LIMITATIONS, releaseStageLabel } from '../../packages/shared/src/release-notes.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readme = readFileSync(path.join(root, 'README.md'), 'utf8');
const manifest = JSON.parse(readFileSync(path.join(root, 'packages/hyakunin/src/data/generated/manifest.json'), 'utf8'));

/**
 * 憲章 §10: README・仕様・使い方・画面文言が一致すること、既知の制約を隠さないこと.
 * The counts below move whenever a ledger is approved, and nothing else notices.
 */
test('README states the question counts the build actually produces', () => {
  const blank = readme.match(/穴埋め \*\*(\d+) 問\*\*|穴埋め \*\*(\d+)\*\* 問|穴埋め (\d+) 問/)?.slice(1).find(Boolean);
  const author = readme.match(/作者 \*\*(\d+) 問\*\*|作者 \*\*(\d+)\*\* 問|作者 (\d+) 問/)?.slice(1).find(Boolean);
  assert.ok(blank, 'README が穴埋めの問題数を書いていない');
  assert.ok(author, 'README が作者の問題数を書いていない');
  assert.equal(Number(blank), manifest.counts.questionsBlank);
  assert.equal(Number(author), manifest.counts.questionsAuthor);
});

test('README does not hide a known limitation behind a blanket claim', () => {
  for (const phrase of ['完全対応', '完全に対応', 'すべての端末で動作']) {
    assert.equal(readme.includes(phrase), false, `README に「${phrase}」がある`);
  }
});

test('README does not promise telemetry while the transport is disabled', () => {
  assert.equal(appConfig.firebaseEnabled, false, 'firebaseEnabled を true にしたらこの試験を書き直すこと');
  assert.match(readme, /匿名(の利用)?統計(の送信)?は\*\*行いません\*\*|統計は送信しません|送信しません/, 'README が統計を送らないことを明記していない');
  assert.equal(/統計を(送信|送り)ます/.test(readme), false, 'README が送らない統計を送ると書いている');
});

test('README names the blank-unit limitation while only one unit is generated', () => {
  const blanks = JSON.parse(readFileSync(path.join(root, 'packages/hyakunin/src/data/generated/questions.blank.json'), 'utf8'));
  const units = new Set(blanks.map((question: { blankUnit: string }) => question.blankUnit));
  assert.ok(units.size > 0, '穴埋めが 0 件では検査にならない');
  // APP_SPEC §15 item 5 asks for three units. Until all three exist, the README must say so.
  if (units.size === 1) assert.match(readme, /句を丸ごと隠す形だけ|「句」単位だけ/, `生成は ${[...units]} だけなのに README が制約を書いていない`);
});

test('every limitation the screen shows is also written in the README', () => {
  assert.ok(KNOWN_LIMITATIONS.length > 0, '制約が 0 件では検査にならない');
  const missing = KNOWN_LIMITATIONS.filter((limitation) => !readme.includes(limitation));
  // 憲章 §10 項目 7. Written twice, these drift; the screen is what a user actually reads.
  assert.deepEqual(missing, [], `画面に出るのに README に無い: ${missing.join(' / ')}`);
});

test('the screen names the release stage instead of staying silent about it', () => {
  assert.equal(appConfig.isOfficial, false, 'isOfficial を true にしたらこの試験を書き直すこと');
  assert.match(releaseStageLabel, /テスト公開版/);
  assert.ok(releaseStageLabel.includes(appConfig.appVersion), '版番号が入っていない');
});
