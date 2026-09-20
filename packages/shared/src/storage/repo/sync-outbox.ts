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

/**
 * 同期を使っていない端末の待ち行列を空にする。
 * 記録の保存は同期の有無を知らないまま 1 件積むので、放っておくと使わない利用者にも溜まり続ける。
 * 消しても記録そのものは残り、あとで参加したときは `seedSyncOutbox` が端末内の全記録を積み直すため、
 * 送られない記録は生まれない。
 */
export function clearSyncOutbox(database: IDBDatabase): Promise<StorageResult<undefined>> {
  return runTransaction(database, 'syncOutbox', 'readwrite', (store) => store.clear() as IDBRequest<undefined>);
}
