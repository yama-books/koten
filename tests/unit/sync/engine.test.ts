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

// ---- まとめ書き（依頼者・2026-09-22「一括送信でお願いします」） ----

/** n 件の記録と待ち行列を置く。 */
async function queueEvents(db: IDBDatabase, n: number) {
  for (let index = 0; index < n; index += 1) {
    const eventId = `batch-${index}`;
    await appendEvent(db, { ...sampleEvent, eventId, itemKey: `k${index}` });
    await enqueueSyncOutbox(db, { syncOutboxId: eventId, kind: 'events', recordId: eventId });
  }
}

test('flushOutbox は束で 1 回だけ書き、待ち行列を空にする', async () => {
  const db = createFakeDatabase();
  await queueEvents(db, 5);
  let calls = 0;
  let batched = 0;
  const result = await flushOutbox(db, 'flush-code-aaaaa', 'house-1', {
    createRecord: async () => { calls += 1; return 'created'; },
    createRecords: async (_houseId, items) => { batched += 1; calls += items.length; return 'ok'; },
  });
  assert.equal(batched, 1, '束で書いていない');
  assert.deepEqual(result, { sent: 5, failed: 0 });
  const remaining = await listSyncOutbox(db);
  assert.deepEqual(remaining.ok ? remaining.value : ['not-empty'], []);
});

test('flushOutbox は束が失敗したら 1 件ずつへ落とす', async () => {
  // **束は全件まとめて成否が決まる。** 既にある記録が 1 件混じると束ごと落ちるので、
  // そこで諦めると 1 件も送れない。落として通る分だけ通す。
  const db = createFakeDatabase();
  await queueEvents(db, 4);
  const single: string[] = [];
  const result = await flushOutbox(db, 'flush-code-aaaaa', 'house-1', {
    createRecord: async (_houseId, _kind, id) => { single.push(id); return id === 'batch-2' ? 'error' : 'created'; },
    createRecords: async () => 'error',
  });
  assert.equal(single.length, 4, '1 件ずつへ落ちていない');
  assert.deepEqual(result, { sent: 3, failed: 1 });
  const remaining = await listSyncOutbox(db);
  assert.deepEqual((remaining.ok ? remaining.value : []).map((item) => item.recordId), ['batch-2'], '失敗した1件だけが残る');
});

test('flushOutbox はまとめ書きの口が無くても動く', async () => {
  // 試験のダブルや古い呼び出し側が `createRecords` を渡さなくても、従来どおり 1 件ずつ送る。
  const db = createFakeDatabase();
  await queueEvents(db, 3);
  let calls = 0;
  const result = await flushOutbox(db, 'flush-code-aaaaa', 'house-1', {
    createRecord: async () => { calls += 1; return 'created'; },
  });
  assert.equal(calls, 3);
  assert.deepEqual(result, { sent: 3, failed: 0 });
});

test('flushOutbox は 1 件だけなら束にしない', async () => {
  // 1 件を束にしても往復は減らない。**余計な経路を通さない。**
  const db = createFakeDatabase();
  await queueEvents(db, 1);
  let batched = 0;
  await flushOutbox(db, 'flush-code-aaaaa', 'house-1', {
    createRecord: async () => 'created',
    createRecords: async () => { batched += 1; return 'ok'; },
  });
  assert.equal(batched, 0);
});
