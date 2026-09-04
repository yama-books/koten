import test from 'node:test';
import assert from 'node:assert/strict';
import { TELEMETRY_EXEMPT_FILES, TELEMETRY_FILES, telemetryDirectoryFiles, telemetrySources } from './fixtures.ts';

function sourceText(): string { return telemetrySources().map(({ text }) => text).join('\n'); }

// 種別: 弁別的
test('W-10 static: telemetry に送信の語が現れない', () => {
  for (const word of ['fetch', 'firebase', 'firestore', 'XMLHttpRequest']) assert.equal(sourceText().includes(word), false);
});

// 種別: 弁別的
test('W-11 static: telemetry に画面と時刻を読む語が現れない', () => {
  for (const word of ['textContent', 'innerHTML', 'getAttribute', 'Date.now', 'toISOString', 'getTimezoneOffset', 'localStorage']) assert.equal(sourceText().includes(word), false);
});

// 種別: 弁別的
test('W-12 static: telemetry が環境変数を読まない', () => {
  for (const word of ['import.meta.env', 'process.env']) assert.equal(sourceText().includes(word), false);
});

// 種別: 弁別的
test('W-13 static: client-number が crypto を直接呼ばない', () => {
  const source = telemetrySources().find(({ file }) => file === 'client-number.ts')?.text ?? '';
  assert.equal(source.includes('getRandomValues'), false);
});

// 種別: 弁別的
test('W-14 static: telemetry に個別履歴の識別子が現れない', () => {
  for (const word of ['poemId', 'questionId', 'sessionId', 'eventId']) assert.equal(sourceText().includes(word), false);
});

// 種別: 固定ピン
test('X-8 static: 禁止語の検査対象が名指しの 4 ファイルに固定されている', () => {
  assert.deepEqual(telemetrySources().map(({ file }) => file), [
    'client-number.ts', 'queue.ts', 'registry.ts', 'sanitize.ts',
  ]);
  assert.equal(TELEMETRY_FILES.length, 4);
});

// 種別: 弁別的
test('X-9 static: 検査対象にも免除一覧にも無い実装が増えていない', () => {
  assert.deepEqual(
    [...telemetryDirectoryFiles()].sort(),
    [...TELEMETRY_FILES, ...TELEMETRY_EXEMPT_FILES].sort(),
  );
});

test('X-10 static: 免除一覧は transport.ts だけである', () => { assert.deepEqual(TELEMETRY_EXEMPT_FILES, ['transport.ts']); });
