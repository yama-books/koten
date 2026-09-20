import test from 'node:test';
import assert from 'node:assert/strict';
import { enqueueSyncOutbox, listSyncOutbox, removeSyncOutbox } from '../../../packages/shared/src/storage/repo/sync-outbox.ts';
import { createFakeDatabase } from './fake-database.ts';

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
