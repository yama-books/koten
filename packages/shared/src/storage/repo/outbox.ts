import type { OutboxItem } from '../../domain/event.ts';
import { runTransaction, type StorageResult } from '../db.ts';

export function enqueueOutbox(database: IDBDatabase, item: OutboxItem): Promise<StorageResult<IDBValidKey>> {
  return runTransaction(database, 'outbox', 'readwrite', (store) => store.add(item));
}

export function listOutbox(database: IDBDatabase): Promise<StorageResult<OutboxItem[]>> {
  return runTransaction(database, 'outbox', 'readonly', (store) => store.getAll() as IDBRequest<OutboxItem[]>);
}

export function removeOutbox(database: IDBDatabase, outboxId: string): Promise<StorageResult<undefined>> {
  return runTransaction(database, 'outbox', 'readwrite', (store) => store.delete(outboxId) as IDBRequest<undefined>);
}
