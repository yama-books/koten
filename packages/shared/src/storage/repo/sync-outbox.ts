import type { SyncKind } from '../../sync/codec.ts';
import { runTransaction, type StorageResult } from '../db.ts';

export type SyncOutboxItem = { syncOutboxId: string; kind: SyncKind; recordId: string };

export function enqueueSyncOutbox(database: IDBDatabase, item: SyncOutboxItem): Promise<StorageResult<IDBValidKey>> {
  return runTransaction(database, 'syncOutbox', 'readwrite', (store) => store.add(item));
}

export function listSyncOutbox(database: IDBDatabase): Promise<StorageResult<SyncOutboxItem[]>> {
  return runTransaction(database, 'syncOutbox', 'readonly', (store) => store.getAll() as IDBRequest<SyncOutboxItem[]>);
}

export function removeSyncOutbox(database: IDBDatabase, syncOutboxId: string): Promise<StorageResult<undefined>> {
  return runTransaction(database, 'syncOutbox', 'readwrite', (store) => store.delete(syncOutboxId) as IDBRequest<undefined>);
}
