import test from 'node:test';
import assert from 'node:assert/strict';
import type { Event, Report, Session } from '../../../packages/shared/src/domain/event.ts';
import { makeExportDocument, serializeExport } from '../../../packages/shared/src/storage/export.ts';
import { parseImport } from '../../../packages/shared/src/storage/import.ts';
import { mergeEvents, mergeReports, mergeSessions } from '../../../packages/shared/src/storage/merge.ts';
import { resetRecords } from '../../../packages/shared/src/storage/reset.ts';

const session: Session = { sessionId: 's1', product: 'hyakunin', from: 1, to: 1, entry: 'learn', order: 'number', startedOn: '2026-08-31', completed: true, questionCount: 1 };
const event: Event = { eventId: 'e1', product: 'hyakunin', poemId: 'p1', sessionId: 's1', itemKey: 'p1:text', kind: 'answer', method: 'free-input', outcome: 'correct', hintUsed: false, effectiveMethod: 'free-input', delta: 9, localDate: '2026-08-31', sameSessionRepeat: false, appVersion: '0.1.0', dataVersion: 1, masteryRulesVersion: 1 };
const report: Report = { reportId: 'r1', product: 'hyakunin', kind: 'text', createdOn: '2026-08-31', status: 'local' };
const document = makeExportDocument({ exportedAt: '2026-08-31', deviceId: 'device', settings: { reading: 'modern', writing: 'horizontal', order: 'random', soundEnabled: true, grade: '2' }, sessions: [session], events: [event], reports: [report] });

test('transfer: export has exactly the contracted keys and safe settings', () => {
  assert.deepEqual(Object.keys(document).sort(), ['deviceId', 'events', 'exportedAt', 'reports', 'schemaVersion', 'sessions', 'settings']);
  assert.deepEqual(Object.keys(document.settings).sort(), ['grade', 'order', 'reading', 'soundEnabled', 'writing']);
  assert.equal(document.events[0].product, 'hyakunin');
  assert.equal(document.sessions[0].product, 'hyakunin');
  assert.equal(document.reports[0].product, 'hyakunin');
});

test('transfer: parse rejects malformed JSON, schemas, limits, and missing or unknown product without throwing', () => {
  assert.equal(parseImport('{', 100).ok, false);
  assert.equal(parseImport('', 100).ok, false);
  assert.equal(parseImport(JSON.stringify({ ...document, schemaVersion: 2 }), 100).ok, false);
  assert.equal(parseImport(JSON.stringify({ ...document, schemaVersion: 0 }), 100).ok, false);
  assert.equal(parseImport(JSON.stringify({ ...document, schemaVersion: '1' }), 100).ok, false);
  assert.equal(parseImport(JSON.stringify({ ...document, events: [{ ...event, product: undefined }] }), 100).ok, false);
  assert.equal(parseImport(JSON.stringify({ ...document, reports: [{ ...report, product: 'other' }] }), 100).ok, false);
  assert.equal(parseImport(JSON.stringify({ ...document, sessions: [session, session] }), 1).ok, false);
});

test('transfer: export parses to a preview preserving counts and products', () => {
  const result = parseImport(serializeExport(document), 100);
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.value.preview, { schemaVersion: 1, counts: { sessions: 1, events: 1, reports: 1 }, products: ['hyakunin'] });
});

test('transfer: merging is idempotent and preserves existing records', () => {
  assert.deepEqual(mergeEvents([event], [{ ...event, outcome: 'incorrect' }]), { records: [event], counts: { added: 0, duplicates: 1 } });
  assert.deepEqual(mergeSessions([session], [{ ...session, product: 'kanazukai' }]).records, [session]);
  assert.deepEqual(mergeReports([], [report]).counts, { added: 1, duplicates: 0 });
});

test('transfer: merging converges on the same record ID sets in either direction', () => {
  const other = { ...event, eventId: 'e2', product: 'kanazukai' as const };
  const ids = (records: Event[]) => records.map((record) => record.eventId).sort();
  assert.deepEqual(ids(mergeEvents([event], [other]).records), ids(mergeEvents([other], [event]).records));
});

test('transfer: reset cannot run without a confirmation', async () => {
  let transactions = 0;
  const database = { transaction() { transactions += 1; throw new Error('must not be called'); } } as unknown as IDBDatabase;
  const result = await resetRecords(database, { scope: 'all', counts: { sessions: 1, events: 1, reports: 1, outbox: 1 } });
  assert.equal(result.ok, false);
  assert.equal(transactions, 0);
});

// 種別: 弁別的
test('AA-14 transfer: reports は reportId で重複を判定する', () => {
  const incoming = { ...report, product: 'kanazukai' as const };
  assert.deepEqual(mergeReports([report], [incoming]), { records: [report], counts: { added: 0, duplicates: 1 } });
});

// 種別: 弁別的
test('AA-15 transfer: events の件数上限を超える import を弾く', () => {
  assert.equal(parseImport(JSON.stringify({ ...document, events: [event, event] }), 1).ok, false);
});

// 種別: 弁別的
test('AA-16 transfer: reports の件数上限を超える import を弾く', () => {
  assert.equal(parseImport(JSON.stringify({ ...document, reports: [report, report] }), 1).ok, false);
});

// 種別: 弁別的
test('AA-17 transfer: sessions の product が不正なら import を弾く', () => {
  assert.equal(parseImport(JSON.stringify({ ...document, sessions: [{ ...session, product: 'other' }] }), 100).ok, false);
});

// 種別: 弁別的
test('AA-18 transfer: sessions が配列でなければ import を弾く', () => {
  assert.equal(parseImport(JSON.stringify({ ...document, sessions: {} }), 100).ok, false);
});

// 種別: 弁別的
test('AA-19 transfer: events が配列でなければ import を弾く', () => {
  assert.equal(parseImport(JSON.stringify({ ...document, events: {} }), 100).ok, false);
});

// 種別: 弁別的
test('AA-20 transfer: reports が配列でなければ import を弾く', () => {
  assert.equal(parseImport(JSON.stringify({ ...document, reports: {} }), 100).ok, false);
});

// 種別: 弁別的
test('AA-21 transfer: 最上位キーが余分でも欠けても import を弾く', () => {
  const extra = { ...document, extra: true };
  const missing = { ...document } as Record<string, unknown>;
  delete missing.deviceId;
  assert.equal(parseImport(JSON.stringify(extra), 100).ok, false);
  assert.equal(parseImport(JSON.stringify(missing), 100).ok, false);
});

// 種別: 弁別的
test('AA-22 transfer: preview の件数は各配列に対応する', () => {
  const imported = {
    ...document,
    events: [event, { ...event, eventId: 'e2' }],
    reports: [report, { ...report, reportId: 'r2' }, { ...report, reportId: 'r3' }],
  };
  const result = parseImport(JSON.stringify(imported), 100);
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.value.preview.counts, { sessions: 1, events: 2, reports: 3 });
});
