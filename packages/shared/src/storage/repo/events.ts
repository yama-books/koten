import { isEvent, type Event } from '../../domain/event.ts';
import { runTransaction, runWriteTransaction, type StorageResult } from '../db.ts';

export function appendEvent(database: IDBDatabase, event: Event): Promise<StorageResult<undefined>> {
  if (!isEvent(event)) return Promise.resolve({ ok: false, reason: 'transaction-failed', error: new TypeError('Invalid event product') });
  return runWriteTransaction(database, ['events', 'syncOutbox'], (stores) => {
    stores.events.add(event);
    stores.syncOutbox.add({ syncOutboxId: event.eventId, kind: 'events', recordId: event.eventId });
  });
}

export function listEvents(database: IDBDatabase): Promise<StorageResult<Event[]>> {
  return runTransaction(database, 'events', 'readonly', (store) => store.getAll() as IDBRequest<Event[]>);
}
