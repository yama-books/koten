import { databaseName, dbVersion, stores, type StoreName } from './schema.ts';

export type StorageFailure = { ok: false; reason: 'unavailable' | 'open-failed' | 'upgrade-failed' | 'transaction-failed'; error: unknown };
export type StorageSuccess<T> = { ok: true; value: T };
export type StorageResult<T> = StorageSuccess<T> | StorageFailure;
export type UpgradeCallback = (database: IDBDatabase, transaction: IDBTransaction) => void;
export type OpenOptions = { version?: number; afterSchemaUpgrade?: UpgradeCallback };

export function getIndexedDbFactory(): IDBFactory | undefined {
  return globalThis.indexedDB;
}

export function openDatabase(factory: IDBFactory | undefined = getIndexedDbFactory(), options: OpenOptions = {}): Promise<StorageResult<IDBDatabase>> {
  if (!factory) return Promise.resolve({ ok: false, reason: 'unavailable', error: new Error('IndexedDB is unavailable') });
  return new Promise((resolve) => {
    let request: IDBOpenDBRequest;
    try { request = factory.open(databaseName, options.version ?? dbVersion); }
    catch (error) { resolve({ ok: false, reason: 'open-failed', error }); return; }
    request.onerror = () => resolve({ ok: false, reason: 'open-failed', error: request.error });
    request.onblocked = () => resolve({ ok: false, reason: 'open-failed', error: new Error('IndexedDB open is blocked') });
    request.onupgradeneeded = () => {
      try {
        const database = request.result;
        const transaction = request.transaction;
        if (!transaction) throw new Error('Missing upgrade transaction');
        for (const [name, definition] of Object.entries(stores) as [StoreName, typeof stores[StoreName]][]) {
          const store = database.objectStoreNames.contains(name)
            ? transaction.objectStore(name)
            : database.createObjectStore(name, { keyPath: definition.keyPath });
          for (const index of definition.indexes) if (!store.indexNames.contains(index)) store.createIndex(index, index);
        }
        options.afterSchemaUpgrade?.(database, transaction);
      } catch (error) {
        try { request.transaction?.abort(); } catch { /* abort has already happened */ }
        resolve({ ok: false, reason: 'upgrade-failed', error });
      }
    };
    request.onsuccess = () => resolve({ ok: true, value: request.result });
  });
}

export function runTransaction<T>(database: IDBDatabase, storeName: StoreName, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<StorageResult<T>> {
  return new Promise((resolve) => {
    let transaction: IDBTransaction;
    let request: IDBRequest<T>;
    try { transaction = database.transaction(storeName, mode); request = action(transaction.objectStore(storeName)); }
    catch (error) { resolve({ ok: false, reason: 'transaction-failed', error }); return; }
    request.onerror = () => resolve({ ok: false, reason: 'transaction-failed', error: request.error });
    transaction.onerror = () => resolve({ ok: false, reason: 'transaction-failed', error: transaction.error });
    transaction.onabort = () => resolve({ ok: false, reason: 'transaction-failed', error: transaction.error });
    transaction.oncomplete = () => resolve({ ok: true, value: request.result });
  });
}

export function runWriteTransaction(
  database: IDBDatabase,
  storeNames: StoreName[],
  action: (stores: Record<string, IDBObjectStore>) => void,
): Promise<StorageResult<undefined>> {
  return new Promise((resolve) => {
    let transaction: IDBTransaction | undefined;
    try {
      const createdTransaction = database.transaction(storeNames, 'readwrite');
      transaction = createdTransaction;
      const objectStores = Object.fromEntries(storeNames.map((name) => [name, createdTransaction.objectStore(name)]));
      action(objectStores);
    } catch (error) {
      try { transaction?.abort(); } catch { /* abort has already happened */ }
      resolve({ ok: false, reason: 'transaction-failed', error });
      return;
    }
    const activeTransaction = transaction;
    if (!activeTransaction) return;
    activeTransaction.onerror = () => resolve({ ok: false, reason: 'transaction-failed', error: activeTransaction.error });
    activeTransaction.onabort = () => resolve({ ok: false, reason: 'transaction-failed', error: activeTransaction.error });
    activeTransaction.oncomplete = () => resolve({ ok: true, value: undefined });
  });
}
