import test from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../../../packages/shared/src/storage/db.ts';
import { dbVersion, stores, type StoreName } from '../../../packages/shared/src/storage/schema.ts';

/**
 * 版1の時点で存在していたストア。**この配列を現在の `stores` から作らないこと。**
 * 作ると「既存利用者の手元にある古いDB」を表せず、追加したストアが作られるかを試験できない。
 */
const VERSION_ONE_STORES = ['events', 'sessions', 'settings', 'reports', 'outbox'];

type UpgradeProbe = { factory: IDBFactory; created: Map<string, string>; openedVersions: number[] };

/** 既存ストアを持つDBを開いたときに、何が新しく作られたかを記録するフェイク。 */
function createUpgradeProbe(existingStoreNames: readonly string[]): UpgradeProbe {
  const created = new Map<string, string>();
  const openedVersions: number[] = [];
  const names = new Set(existingStoreNames);
  const objectStore = { indexNames: { contains: () => false }, createIndex() { return undefined; } } as unknown as IDBObjectStore;
  const transaction = { objectStore: () => objectStore } as unknown as IDBTransaction;
  const database = {
    objectStoreNames: { contains: (name: string) => names.has(name) },
    createObjectStore(name: string, options: { keyPath: string }) {
      names.add(name);
      created.set(name, options.keyPath);
      return objectStore;
    },
  } as unknown as IDBDatabase;
  const factory = {
    open(_name: string, version: number) {
      openedVersions.push(version);
      const request = { result: database, transaction, error: null } as unknown as IDBOpenDBRequest;
      queueMicrotask(() => {
        request.onupgradeneeded?.(new globalThis.Event('upgradeneeded'));
        request.onsuccess?.(new globalThis.Event('success'));
      });
      return request;
    },
  } as unknown as IDBFactory;
  return { factory, created, openedVersions };
}

test('U-1 版1のDBを開くと、版2で足したストアが作られる', async () => {
  const probe = createUpgradeProbe(VERSION_ONE_STORES);
  const opened = await openDatabase(probe.factory);
  assert.equal(opened.ok, true, 'U-1: 既存DBの昇格で開けなくなっている');
  assert.ok(probe.created.size > 0, 'U-1: 1つも作られていない（走査対象が空の緑を防ぐ）');
  assert.equal(probe.created.get('syncOutbox'), 'syncOutboxId', 'U-1: syncOutbox が作られないと appendEvent が全件失敗する');
});

test('U-2 版1から在るストアは作り直さない', async () => {
  const probe = createUpgradeProbe(VERSION_ONE_STORES);
  await openDatabase(probe.factory);
  assert.ok(probe.created.size > 0, 'U-2: 1件も作られていないなら、この否定は何も証明しない');
  for (const name of VERSION_ONE_STORES) {
    assert.equal(probe.created.has(name), false, `U-2: 既存の ${name} を作り直している（既存の記録が消える）`);
  }
});

test('U-3 空のDBを開くと、schema の全ストアが作られる', async () => {
  const probe = createUpgradeProbe([]);
  await openDatabase(probe.factory);
  const expected = Object.keys(stores) as StoreName[];
  assert.deepEqual([...probe.created.keys()].sort(), [...expected].sort());
  for (const name of expected) assert.equal(probe.created.get(name), stores[name].keyPath, `U-3: ${name} の keyPath がずれている`);
});

test('U-4 開くときに渡す版は schema の dbVersion である', async () => {
  const probe = createUpgradeProbe(VERSION_ONE_STORES);
  await openDatabase(probe.factory);
  assert.deepEqual(probe.openedVersions, [dbVersion]);
  assert.ok(dbVersion >= 2, 'U-4: ストアを足したのに版を上げていないと、既存のDBは昇格しない');
});
