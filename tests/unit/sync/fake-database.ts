// 複数ストアを持つ最小限のフェイクIndexedDBを組み立てる。
// tests/unit/storage/storage.test.ts の createEventRepositoryDatabase(174行)と同じ発想を
// 複数ストア対応に一般化したもの。fake-indexeddbのような外部依存は使わない方針に合わせている。
//
// 完了(oncomplete)は、そのトランザクション内で作られた全リクエストのPromiseが
// 解決してから発火させる。リクエストを作った順にqueueMicrotaskするだけだと、
// 「完了が個々のリクエストの結果確定より先に走る」順序異常が起きるため。
import { stores, type StoreName } from '../../../packages/shared/src/storage/schema.ts';

type PendingList = Promise<unknown>[];
type FakeRequest<T> = IDBRequest<T> & { onsuccess: ((ev: unknown) => void) | null; onerror: ((ev: unknown) => void) | null };

function makeRequest<T>(pending: PendingList, run: () => T): FakeRequest<T> {
  const request = { result: undefined as unknown as T, error: null, onsuccess: null, onerror: null } as FakeRequest<T>;
  const settled = Promise.resolve().then(() => {
    try {
      request.result = run();
      request.onsuccess?.({});
    } catch (error) {
      request.error = error as DOMException;
      request.onerror?.({});
      throw error;
    }
  });
  pending.push(settled.catch(() => undefined));
  return request;
}

function makeStore(name: StoreName, table: Map<string, unknown>, pending: PendingList): IDBObjectStore {
  const keyPath = stores[name].keyPath;
  const keyOf = (value: unknown) => String((value as Record<string, unknown>)[keyPath]);
  return {
    add: (value: unknown) => makeRequest(pending, () => {
      const key = keyOf(value);
      if (table.has(key)) throw new DOMException('duplicate key', 'ConstraintError');
      table.set(key, value);
      return key;
    }),
    put: (value: unknown) => makeRequest(pending, () => { table.set(keyOf(value), value); return keyOf(value); }),
    get: (key: IDBValidKey) => makeRequest(pending, () => table.get(String(key))),
    getAll: () => makeRequest(pending, () => Array.from(table.values())),
    delete: (key: IDBValidKey) => makeRequest(pending, () => { table.delete(String(key)); return undefined; }),
    clear: () => makeRequest(pending, () => { table.clear(); return undefined; }),
    count: () => makeRequest(pending, () => table.size),
  } as unknown as IDBObjectStore;
}

export function createFakeDatabase(initial: Partial<Record<StoreName, unknown[]>> = {}): IDBDatabase {
  const tables = new Map<StoreName, Map<string, unknown>>();
  for (const name of Object.keys(stores) as StoreName[]) {
    const table = new Map<string, unknown>();
    for (const record of initial[name] ?? []) table.set(String((record as Record<string, unknown>)[stores[name].keyPath]), record);
    tables.set(name, table);
  }
  return {
    transaction: (storeNames: StoreName | StoreName[]) => {
      const names = Array.isArray(storeNames) ? storeNames : [storeNames];
      const pending: PendingList = [];
      const tx = {
        oncomplete: null as ((ev: unknown) => void) | null,
        onerror: null as ((ev: unknown) => void) | null,
        onabort: null as ((ev: unknown) => void) | null,
        error: null,
        objectStore: (name: StoreName) => {
          if (!names.includes(name)) throw new Error(`store ${name} was not requested for this transaction`);
          return makeStore(name, tables.get(name)!, pending);
        },
      } as unknown as IDBTransaction;
      queueMicrotask(() => {
        Promise.all(pending).then(() => (tx as unknown as { oncomplete: ((ev: unknown) => void) | null }).oncomplete?.({}));
      });
      return tx;
    },
  } as unknown as IDBDatabase;
}
