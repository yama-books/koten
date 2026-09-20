import test from 'node:test';
import assert from 'node:assert/strict';
import { flushOutbox, applyRemoteRecords } from '../../../packages/shared/src/sync/engine.ts';
import { encodeRecord } from '../../../packages/shared/src/sync/codec.ts';
import { enqueueSyncOutbox, listSyncOutbox } from '../../../packages/shared/src/storage/repo/sync-outbox.ts';
import { appendEvent, listEvents } from '../../../packages/shared/src/storage/repo/events.ts';
import { saveSession, listSessions } from '../../../packages/shared/src/storage/repo/sessions.ts';
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

/**
 * **受信分に含まれない手元の記録が残ることを、ここで釘付けにする。**
 * 両端末が同じ記録を持つ fixture にすると、「merge する」実装と
 * 「受信分で上書きする」実装が同じ結果になり、区別できない（2026-09-20 の破壊試験で実際に素通しした）。
 * ペアリング前やオフライン中に作った記録は受信分に無いので、これが消えるのが実運用で一番痛い。
 */
test('applyRemoteRecords keeps local-only records that the remote does not have', async () => {
  const db = createFakeDatabase();
  const code = 'apply-remote-code1';
  const localOnly = { ...sampleEvent, eventId: 'evt-local-only' };
  const shared = { ...sampleEvent, eventId: 'evt-shared' };
  await appendEvent(db, localOnly);
  await appendEvent(db, shared);

  const remoteNew = { ...sampleEvent, eventId: 'evt-remote-new' };
  const encodedNew = await encodeRecord('events', code, remoteNew);
  const encodedShared = await encodeRecord('events', code, shared);

  const result = await applyRemoteRecords(db, code, 'events', [
    { id: encodedNew.id, payload: encodedNew.payload },
    { id: encodedShared.id, payload: encodedShared.payload },
  ]);
  assert.deepEqual(result, { added: 1, duplicates: 1 });

  const all = await listEvents(db);
  const ids = all.ok ? all.value.map((event) => event.eventId).sort() : [];
  assert.deepEqual(ids, ['evt-local-only', 'evt-remote-new', 'evt-shared']);
});

test('applyRemoteRecords ignores documents that fail to decrypt', async () => {
  const db = createFakeDatabase();
  const result = await applyRemoteRecords(db, 'correct-code-1', 'events', [
    { id: 'garbage-1', payload: { enc: 'enc:not-really-encrypted' } },
  ]);
  assert.deepEqual(result, { added: 0, duplicates: 0 });
});

test('受信した完了済みセッションは同じ ID の未完了状態を更新する', async () => {
  const db = createFakeDatabase();
  const code = 'apply-session-code';
  const local = { sessionId: 'session-1', product: 'hyakunin', from: 1, to: 10, entry: 'quick', order: 'number', startedOn: '2026-09-20', completed: false, questionCount: 10 } as const;
  await saveSession(db, local);
  const remote = { ...local, completed: true } as const;
  const encoded = await encodeRecord('sessions', code, remote);
  await applyRemoteRecords(db, code, 'sessions', [encoded]);
  const stored = await listSessions(db);
  assert.equal(stored.ok && stored.value[0].completed, true);
});
