import test from 'node:test';
import assert from 'node:assert/strict';
import type { Event, Report, Session, UserSettings } from '../../../packages/shared/src/domain/event.ts';
import { makeExportDocument } from '../../../packages/shared/src/storage/export.ts';
import { applyImport, type ImportPlan } from '../../../packages/shared/src/storage/import.ts';

const initialSession: Session = { sessionId: 'before-session', product: 'hyakunin', from: 1, to: 1, entry: 'learn', order: 'number', startedOn: '2026-08-31', completed: true, questionCount: 1 };
const initialEvent = event('before-event');
const initialReport: Report = { reportId: 'before-report', product: 'hyakunin', kind: 'text', createdOn: '2026-08-31', status: 'local' };
const initialSettings: UserSettings = { key: 'user', reading: 'no-ruby', writing: 'vertical', order: 'number', soundEnabled: false, noticeConfirmed: true, deviceId: 'local-device' };

function event(eventId: string): Event {
  return { eventId, product: 'hyakunin', poemId: 'p1', sessionId: 'imported-session', itemKey: 'p1:text', kind: 'answer', method: 'free-input', outcome: 'correct', hintUsed: false, effectiveMethod: 'free-input', delta: 9, localDate: '2026-08-31', sameSessionRepeat: false, appVersion: '0.1.0', dataVersion: 1, masteryRulesVersion: 1 };
}

const plan: ImportPlan = {
  document: makeExportDocument({
    exportedAt: '2026-08-31', deviceId: 'import-device',
    settings: { reading: 'modern', writing: 'horizontal', order: 'random', soundEnabled: true, grade: '2' },
    sessions: [{ ...initialSession, sessionId: 'imported-session', product: 'kanazukai' }],
    events: [event('import-event-1'), event('import-event-2'), event('import-event-3')],
    reports: [{ ...initialReport, reportId: 'import-report', product: 'kanazukai' }],
  }),
  preview: { schemaVersion: 1, counts: { sessions: 1, events: 3, reports: 1 }, products: ['kanazukai', 'hyakunin'] },
};

function initialRecords() {
  return { sessions: [initialSession], events: [initialEvent], reports: [initialReport], settings: [initialSettings] };
}

test('storage import: commits all four stores in one write transaction', async () => {
  const database = createAtomicDatabase(initialRecords());
  const result = await applyImport(database, plan);
  assert.equal(result.ok, true);
  assert.equal(database.writeTransactions, 1);
  assert.deepEqual(database.records.sessions.map((record) => record.sessionId).sort(), ['before-session', 'imported-session']);
  assert.deepEqual(database.records.events.map((record) => record.eventId).sort(), ['before-event', 'import-event-1', 'import-event-2', 'import-event-3']);
  assert.deepEqual(database.records.reports.map((record) => record.reportId).sort(), ['before-report', 'import-report']);
  assert.deepEqual(database.records.settings, [{ ...initialSettings, reading: 'modern', writing: 'horizontal', order: 'random', soundEnabled: true, grade: '2' }]);
});

test('storage import: rolls back every store when the third event put fails', async () => {
  const before = initialRecords();
  const database = createAtomicDatabase(before, { store: 'events', put: 3 });
  let result: Awaited<ReturnType<typeof applyImport>> | undefined;
  await assert.doesNotReject(async () => { result = await applyImport(database, plan); });
  assert.ok(result);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, 'transaction-failed');
  assert.equal(database.writeTransactions, 1);
  assert.deepEqual(database.records, before);
});

test('storage import: applying the same plan twice does not add records twice', async () => {
  const database = createAtomicDatabase(initialRecords());
  const first = await applyImport(database, plan);
  assert.deepEqual(first, {
    ok: true,
    value: {
      sessions: { added: 1, duplicates: 0 },
      events: { added: 3, duplicates: 0 },
      reports: { added: 1, duplicates: 0 },
    },
  });
  const afterFirst = structuredClone(database.records);
  const second = await applyImport(database, plan);
  assert.deepEqual(second, {
    ok: true,
    value: {
      sessions: { added: 0, duplicates: 1 },
      events: { added: 0, duplicates: 3 },
      reports: { added: 0, duplicates: 1 },
    },
  });
  assert.deepEqual(database.records, afterFirst);
});

test('storage import: reports failure when the commit itself fails', async () => {
  const before = initialRecords();
  const database = createAtomicDatabase(before, { failAtCommit: true });
  let result: Awaited<ReturnType<typeof applyImport>> | undefined;
  await assert.doesNotReject(async () => { result = await applyImport(database, plan); });
  assert.ok(result);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, 'transaction-failed');
  assert.equal(database.writeTransactions, 1);
  assert.deepEqual(database.records, before);
});

type Records = { sessions: Session[]; events: Event[]; reports: Report[]; settings: UserSettings[] };
type Failure = { store: keyof Records; put: number };
type CommitFailure = { failAtCommit: true };

function createAtomicDatabase(seed: Records, failure?: Failure | CommitFailure): IDBDatabase & { records: Records; writeTransactions: number } {
  const records = structuredClone(seed);
  let writeTransactions = 0;
  const database = {
    records,
    get writeTransactions() { return writeTransactions; },
    transaction(names: string | string[], mode?: IDBTransactionMode) {
      const storeNames = Array.isArray(names) ? names : [names];
      const writable = mode === 'readwrite';
      if (writable) writeTransactions += 1;
      const workspace = structuredClone(records) as Records;
      let aborted = false;
      let finished = false;
      const putCounts: Partial<Record<keyof Records, number>> = {};
      const transaction = {
        error: null,
        oncomplete: null as ((event: globalThis.Event) => void) | null,
        onerror: null as ((event: globalThis.Event) => void) | null,
        onabort: null as ((event: globalThis.Event) => void) | null,
        abort() { aborted = true; queueMicrotask(() => transaction.onabort?.(new globalThis.Event('abort'))); },
        objectStore(name: string) {
          if (!storeNames.includes(name)) throw new Error(`Store ${name} was not included in this transaction`);
          const storeName = name as keyof Records;
          const complete = () => queueMicrotask(() => {
            if (finished || aborted) return;
            finished = true;
            if (writable && 'failAtCommit' in (failure ?? {})) {
              aborted = true;
              transaction.error = new DOMException('planned commit failure', 'AbortError');
              transaction.onabort?.(new globalThis.Event('abort'));
              return;
            }
            if (writable) Object.assign(records, structuredClone(workspace));
            transaction.oncomplete?.(new globalThis.Event('complete'));
          });
          const request = <T>(result: T, fail = false): IDBRequest<T> => {
            const value = { result, error: null, onsuccess: null, onerror: null } as unknown as IDBRequest<T>;
            queueMicrotask(() => {
              if (fail) {
                aborted = true;
                value.error = new DOMException('planned write failure', 'ConstraintError');
                value.onerror?.(new globalThis.Event('error'));
                transaction.onerror?.(new globalThis.Event('error'));
                transaction.onabort?.(new globalThis.Event('abort'));
                return;
              }
              value.onsuccess?.(new globalThis.Event('success'));
              complete();
            });
            return value;
          };
          return {
            getAll: () => request(structuredClone(records[storeName])),
            get: (key: string) => request(structuredClone(storeName === 'settings' ? records.settings.find((record) => record.key === key) : undefined), false),
            clear: () => { workspace[storeName] = []; return request(undefined); },
            put: (value: Records[keyof Records][number]) => {
              const put = (putCounts[storeName] = (putCounts[storeName] ?? 0) + 1);
              const key = keyFor(storeName, value);
              const index = workspace[storeName].findIndex((record) => keyFor(storeName, record) === key);
              if (index >= 0) workspace[storeName][index] = value as never;
              else workspace[storeName].push(value as never);
              return request(key, 'store' in (failure ?? {}) && failure.store === storeName && failure.put === put);
            },
          } as unknown as IDBObjectStore;
        },
      } as unknown as IDBTransaction;
      return transaction;
    },
  } as unknown as IDBDatabase & { records: Records; writeTransactions: number };
  return database;
}

function keyFor(store: keyof Records, value: Records[keyof Records][number]): string {
  if (store === 'sessions') return (value as Session).sessionId;
  if (store === 'events') return (value as Event).eventId;
  if (store === 'reports') return (value as Report).reportId;
  return (value as UserSettings).key;
}
