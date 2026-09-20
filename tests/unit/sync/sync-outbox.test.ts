import test from 'node:test';
import assert from 'node:assert/strict';
import { enqueueSyncOutbox, listSyncOutbox, removeSyncOutbox } from '../../../packages/shared/src/storage/repo/sync-outbox.ts';
import { appendEvent } from '../../../packages/shared/src/storage/repo/events.ts';
import { saveSession } from '../../../packages/shared/src/storage/repo/sessions.ts';
import { saveReport } from '../../../packages/shared/src/storage/repo/reports.ts';
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
