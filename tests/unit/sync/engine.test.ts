import test from 'node:test';
import assert from 'node:assert/strict';
import { flushOutbox, applyRemoteRecords } from '../../../packages/shared/src/sync/engine.ts';
import { encodeRecord } from '../../../packages/shared/src/sync/codec.ts';
import { enqueueSyncOutbox, listSyncOutbox } from '../../../packages/shared/src/storage/repo/sync-outbox.ts';
import { appendEvent, listEvents } from '../../../packages/shared/src/storage/repo/events.ts';
import { createFakeDatabase } from './fake-database.ts';

const sampleEvent = {
  eventId: 'evt-flush-1', product: 'hyakunin', poemId: 'p1', sessionId: 's1', itemKey: 'k1',
  kind: 'answer', method: 'choice', outcome: 'correct', hintUsed: false, effectiveMethod: 'choice',
  delta: 3, localDate: '2026-09-20', sameSessionRepeat: false, appVersion: '0.2.0', dataVersion: 1, masteryRulesVersion: 1,
} as const;

test('flushOutbox sends queued records and removes them from the outbox on success', async () => {
  const db = createFakeDatabase();
  await appendEvent(db, sampleEvent);
  await enqueueSyncOutbox(db, { syncOutboxId: 'evt-flush-1', kind: 'events', recordId: 'evt-flush-1' });
  const sent: Array<{ kind: string; id: string }> = [];
  const result = await flushOutbox(db, 'flush-code-aaaaa', 'house-1', {
    createRecord: async (houseId, kind, id) => { sent.push({ kind, id }); return 'created'; },
  });
  assert.deepEqual(result, { sent: 1, failed: 0 });
  assert.deepEqual(sent, [{ kind: 'events', id: 'evt-flush-1' }]);
  const remaining = await listSyncOutbox(db);
  assert.deepEqual(remaining.ok ? remaining.value : ['not-empty'], []);
});

test('flushOutbox treats already-exists as success', async () => {
  const db = createFakeDatabase();
  await appendEvent(db, sampleEvent);
  await enqueueSyncOutbox(db, { syncOutboxId: 'evt-flush-1', kind: 'events', recordId: 'evt-flush-1' });
  const result = await flushOutbox(db, 'flush-code-bbbbb', 'house-1', {
    createRecord: async () => 'already-exists',
  });
  assert.equal(result.sent, 1);
});

test('flushOutbox drops an outbox entry whose record no longer exists locally', async () => {
  const db = createFakeDatabase();
  await enqueueSyncOutbox(db, { syncOutboxId: 'missing-1', kind: 'events', recordId: 'missing-1' });
  const result = await flushOutbox(db, 'flush-code-ccccc', 'house-1', { createRecord: async () => 'created' });
  assert.deepEqual(result, { sent: 0, failed: 0 });
  const remaining = await listSyncOutbox(db);
  assert.deepEqual(remaining.ok ? remaining.value : ['not-empty'], []);
});

test('applyRemoteRecords decrypts and merges new events without duplicating existing ones', async () => {
  const db = createFakeDatabase();
  const code = 'apply-remote-code1';
  const existing = { ...sampleEvent, eventId: 'evt-local-1' };
  await appendEvent(db, existing);

  const remoteNew = { ...sampleEvent, eventId: 'evt-remote-1' };
  const encodedNew = await encodeRecord('events', code, remoteNew);
  const encodedExisting = await encodeRecord('events', code, existing);

  const result = await applyRemoteRecords(db, code, 'events', [
    { id: encodedNew.id, payload: encodedNew.payload },
    { id: encodedExisting.id, payload: encodedExisting.payload },
  ]);
  assert.deepEqual(result, { added: 1, duplicates: 1 });

  const all = await listEvents(db);
  assert.equal(all.ok && all.value.length, 2);
});

test('applyRemoteRecords ignores documents that fail to decrypt', async () => {
  const db = createFakeDatabase();
  const result = await applyRemoteRecords(db, 'correct-code-1', 'events', [
    { id: 'garbage-1', payload: { enc: 'enc:not-really-encrypted' } },
  ]);
  assert.deepEqual(result, { added: 0, duplicates: 0 });
});
