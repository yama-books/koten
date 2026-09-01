import test from 'node:test';
import assert from 'node:assert/strict';
import { appConfig } from '../../../packages/shared/src/app-config.ts';
import { isEvent, type Event } from '../../../packages/shared/src/domain/event.ts';
import { dbVersion } from '../../../packages/shared/src/storage/schema.ts';
import { writeFallback } from '../../../packages/shared/src/storage/fallback.ts';
import { openDatabase } from '../../../packages/shared/src/storage/db.ts';
import * as eventsRepository from '../../../packages/shared/src/storage/repo/events.ts';

const event: Event = {
  eventId: 'event-1', product: 'hyakunin', poemId: 'p001', sessionId: 'session-1', itemKey: 'p001:text',
  kind: 'answer', method: 'free-input', outcome: 'correct', hintUsed: false, effectiveMethod: 'free-input',
  delta: 9, localDate: '2026-08-31', sameSessionRepeat: false, appVersion: '0.1.0', dataVersion: 1, masteryRulesVersion: 1,
};

test('storage: product is mandatory', () => {
  assert.equal(isEvent(event), true);
  assert.equal(isEvent({ ...event, product: undefined }), false);
});

test('storage: product vocabulary matches appConfig product keys', () => {
  assert.equal(isEvent(event), true);
  assert.equal(isEvent({ ...event, product: 'other' }), false);
  assert.deepEqual(Object.keys(appConfig.products), ['hyakunin', 'kanazukai']);
});

test('storage: events repository has append and read APIs only', () => {
  assert.deepEqual(Object.keys(eventsRepository).sort(), ['appendEvent', 'listEvents']);
});

test('storage: schemaVersion remains one', () => assert.equal(dbVersion, 1));

test('storage: fallback returns an export prompt when storage capacity is exhausted', () => {
  const quotaStorage = { setItem() { throw new DOMException('full', 'QuotaExceededError'); } } as unknown as Storage;
  assert.doesNotThrow(() => writeFallback(quotaStorage, 'answers', event));
  const result = writeFallback(quotaStorage, 'answers', event);
  assert.deepEqual(result.ok ? undefined : { reason: result.reason, shouldExport: result.shouldExport, value: result.value }, {
    reason: 'capacity-exceeded', shouldExport: true, value: event,
  });
});

test('storage: fallback reports non-capacity write failures without export', () => {
  const failingStorage = { setItem() { throw new Error('disk failure'); } } as unknown as Storage;
  const result = writeFallback(failingStorage, 'answers', event);
  assert.deepEqual(result.ok ? undefined : { reason: result.reason, shouldExport: result.shouldExport, value: result.value }, {
    reason: 'write-failed', shouldExport: false, value: event,
  });
});

test('storage: fallback returns a typed result when storage is unavailable', () => {
  assert.doesNotThrow(() => writeFallback(undefined, 'answers', event));
  const result = writeFallback(undefined, 'answers', event);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.reason, 'write-failed');
    assert.equal(result.shouldExport, false);
  }
});

test('storage: an upgrade exception aborts and preserves the existing event', async () => {
  const existingEvents = [{ eventId: 'already-saved' }];
  const factory = createFailingUpgradeFactory(existingEvents);
  const result = await openDatabase(factory, {
    version: 2,
    afterSchemaUpgrade: (_database, transaction) => {
      transaction.objectStore('events').add({ eventId: 'written-during-upgrade' });
      throw new Error('test upgrade failure');
    },
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, 'upgrade-failed');
  assert.deepEqual(existingEvents, [{ eventId: 'already-saved' }]);
});

test('storage: events are appended and duplicate event IDs are rejected', async () => {
  const records = new Map<string, Event>();
  const factory = createEventRepositoryDatabase(records);
  const first = await eventsRepository.appendEvent(factory, event);
  const second = await eventsRepository.appendEvent(factory, { ...event, outcome: 'incorrect' });
  assert.equal(first.ok, true);
  assert.equal(second.ok, false);
  if (!second.ok) assert.equal(second.reason, 'transaction-failed');
  assert.deepEqual(records.get(event.eventId), event);
});

function createFailingUpgradeFactory(existingEvents: { eventId: string }[]): IDBFactory {
  const names = new Set(['events', 'sessions', 'settings', 'reports', 'outbox']);
  const pendingEvents = [...existingEvents];
  const store = {
    indexNames: { contains: () => true },
    createIndex() { return undefined; },
    add(value: { eventId: string }) { pendingEvents.push(value); return undefined; },
  } as unknown as IDBObjectStore;
  const transaction = {
    objectStore: () => store,
    abort() { pendingEvents.length = existingEvents.length; },
  } as unknown as IDBTransaction;
  const database = {
    objectStoreNames: { contains: (name: string) => names.has(name) },
    createObjectStore(name: string) { names.add(name); return store; },
  } as unknown as IDBDatabase;
  return {
    open() {
      const request = { result: database, transaction, error: null } as unknown as IDBOpenDBRequest;
      queueMicrotask(() => {
        request.onupgradeneeded?.(new globalThis.Event('upgradeneeded'));
        if (pendingEvents.length > existingEvents.length) existingEvents.push(...pendingEvents.slice(existingEvents.length));
      });
      return request;
    },
  } as unknown as IDBFactory;
}

function createEventRepositoryDatabase(records: Map<string, Event>): IDBDatabase {
  const transaction = {
    objectStore: () => store,
    error: null,
  } as unknown as IDBTransaction;
  const store = {
    add(value: Event) {
      const request = { result: value.eventId, error: null } as unknown as IDBRequest<IDBValidKey>;
      queueMicrotask(() => {
        if (records.has(value.eventId)) {
          request.error = new DOMException('duplicate key', 'ConstraintError');
          request.onerror?.(new globalThis.Event('error'));
        } else {
          records.set(value.eventId, value);
          request.onsuccess?.(new globalThis.Event('success'));
          transaction.oncomplete?.(new globalThis.Event('complete'));
        }
      });
      return request;
    },
  } as unknown as IDBObjectStore;
  return {
    transaction: () => transaction,
  } as unknown as IDBDatabase;
}
