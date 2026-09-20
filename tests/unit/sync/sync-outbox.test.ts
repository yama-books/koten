import test from 'node:test';
import assert from 'node:assert/strict';
import { clearSyncOutbox, enqueueSyncOutbox, listSyncOutbox, removeSyncOutbox } from '../../../packages/shared/src/storage/repo/sync-outbox.ts';
import { appendEvent, listEvents } from '../../../packages/shared/src/storage/repo/events.ts';
import { listSessions, saveSession } from '../../../packages/shared/src/storage/repo/sessions.ts';
import { listReports, saveReport } from '../../../packages/shared/src/storage/repo/reports.ts';
import { seedSyncOutbox } from '../../../packages/shared/src/sync/seed.ts';
import { createFakeDatabase } from './fake-database.ts';

const sampleEvent = {
  eventId: 'evt-outbox-1', product: 'hyakunin', poemId: 'p1', sessionId: 's1', itemKey: 'k1',
  kind: 'answer', method: 'choice', outcome: 'correct', hintUsed: false, effectiveMethod: 'choice',
  delta: 3, localDate: '2026-09-20', sameSessionRepeat: false, appVersion: '0.2.0', dataVersion: 1, masteryRulesVersion: 1,
} as const;
const sampleSession = { sessionId: 'sess-outbox-1', product: 'hyakunin', from: 1, to: 10, entry: 'quick', order: 'number', startedOn: '2026-09-20', completed: false, questionCount: 10 } as const;
const sampleReport = { reportId: 'rep-outbox-1', product: 'hyakunin', kind: 'text', createdOn: '2026-09-20', status: 'local' } as const;

test('enqueue, list, and remove round-trip a sync outbox item', async () => {
  const db = createFakeDatabase();
  await enqueueSyncOutbox(db, { syncOutboxId: 'evt-1', kind: 'events', recordId: 'evt-1' });
  const listed = await listSyncOutbox(db);
  assert.equal(listed.ok, true);
  assert.deepEqual(listed.ok ? listed.value : [], [{ syncOutboxId: 'evt-1', kind: 'events', recordId: 'evt-1' }]);
  await removeSyncOutbox(db, 'evt-1');
  const afterRemove = await listSyncOutbox(db);
  assert.deepEqual(afterRemove.ok ? afterRemove.value : [], []);
});

test('appendEvent also enqueues a sync outbox entry for the new event', async () => {
  const db = createFakeDatabase();
  const result = await appendEvent(db, sampleEvent);
  assert.equal(result.ok, true);
  const queued = await listSyncOutbox(db);
  assert.deepEqual(queued.ok ? queued.value : [], [{ syncOutboxId: 'evt-outbox-1', kind: 'events', recordId: 'evt-outbox-1' }]);
});

test('saveSession also enqueues a sync outbox entry for the session', async () => {
  const db = createFakeDatabase();
  const result = await saveSession(db, sampleSession);
  assert.equal(result.ok, true);
  const queued = await listSyncOutbox(db);
  assert.deepEqual(queued.ok ? queued.value : [], [{ syncOutboxId: 'sess-outbox-1', kind: 'sessions', recordId: 'sess-outbox-1' }]);
});

test('saveReport also enqueues a sync outbox entry for the report', async () => {
  const db = createFakeDatabase();
  const result = await saveReport(db, sampleReport);
  assert.equal(result.ok, true);
  const queued = await listSyncOutbox(db);
  assert.deepEqual(queued.ok ? queued.value : [], [{ syncOutboxId: 'rep-outbox-1', kind: 'reports', recordId: 'rep-outbox-1' }]);
});

test('clearSyncOutbox empties the queue but keeps the records themselves', async () => {
  const db = createFakeDatabase();
  await appendEvent(db, sampleEvent);
  await saveSession(db, sampleSession);
  await saveReport(db, sampleReport);
  const before = await listSyncOutbox(db);
  assert.equal(before.ok ? before.value.length : 0, 3, '前提：3 件が積まれている');

  const cleared = await clearSyncOutbox(db);
  assert.equal(cleared.ok, true);
  const after = await listSyncOutbox(db);
  assert.deepEqual(after.ok ? after.value : [{ marker: 'unreadable' }], [], '待ち行列だけが空になる');

  const events = await listEvents(db);
  const sessions = await listSessions(db);
  const reports = await listReports(db);
  assert.equal(events.ok ? events.value.length : 0, 1, '記録そのものは消えない');
  assert.equal(sessions.ok ? sessions.value.length : 0, 1, '記録そのものは消えない');
  assert.equal(reports.ok ? reports.value.length : 0, 1, '記録そのものは消えない');
});

test('seedSyncOutbox puts every local record back after the queue was cleared', async () => {
  const db = createFakeDatabase();
  await appendEvent(db, sampleEvent);
  await saveSession(db, sampleSession);
  await saveReport(db, sampleReport);
  await clearSyncOutbox(db);

  assert.equal(await seedSyncOutbox(db), true);
  const queued = await listSyncOutbox(db);
  const pairs = (queued.ok ? queued.value : []).map(({ kind, recordId }) => `${kind}:${recordId}`).sort();
  assert.deepEqual(pairs, ['events:evt-outbox-1', 'reports:rep-outbox-1', 'sessions:sess-outbox-1'],
    '捨てた分は参加時の seed で積み直される——だから捨てても送られない記録は生まれない');
});
