import { isEvent, type Event } from '../../domain/event.ts';
import { runTransaction, type StorageResult } from '../db.ts';

export function appendEvent(database: IDBDatabase, event: Event): Promise<StorageResult<IDBValidKey>> {
  if (!isEvent(event)) return Promise.resolve({ ok: false, reason: 'transaction-failed', error: new TypeError('Invalid event product') });
  return runTransaction(database, 'events', 'readwrite', (store) => store.add(event));
}

export function listEvents(database: IDBDatabase): Promise<StorageResult<Event[]>> {
  return runTransaction(database, 'events', 'readonly', (store) => store.getAll() as IDBRequest<Event[]>);
}
