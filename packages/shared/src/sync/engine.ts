import { decodeRecord, encodeRecord, type SyncKind } from './codec.ts';
import { listSyncOutbox, removeSyncOutbox } from '../storage/repo/sync-outbox.ts';
import { listEvents } from '../storage/repo/events.ts';
import { listSessions } from '../storage/repo/sessions.ts';
import { listReports } from '../storage/repo/reports.ts';
import { mergeEvents, mergeReports, mergeSessions } from '../storage/merge.ts';
import { runTransaction } from '../storage/db.ts';
import type { Event, Report, Session } from '../domain/event.ts';

export type SyncDeps = {
  createRecord: (houseId: string, kind: SyncKind, id: string, payload: { enc: string }) => Promise<'created' | 'already-exists' | 'error'>;
};

const idFieldFor: Record<SyncKind, string> = { events: 'eventId', sessions: 'sessionId', reports: 'reportId' };

async function listByKind(database: IDBDatabase, kind: SyncKind) {
  return kind === 'events' ? listEvents(database) : kind === 'sessions' ? listSessions(database) : listReports(database);
}

async function findRecord(database: IDBDatabase, kind: SyncKind, recordId: string) {
  const list = await listByKind(database, kind);
  if (!list.ok) return null;
  const idField = idFieldFor[kind];
  return list.value.find((record) => (record as Record<string, unknown>)[idField] === recordId) ?? null;
}

export async function flushOutbox(
  database: IDBDatabase,
  code: string,
  houseId: string,
  deps: SyncDeps,
): Promise<{ sent: number; failed: number }> {
  const queued = await listSyncOutbox(database);
  if (!queued.ok) return { sent: 0, failed: 0 };
  let sent = 0;
  let failed = 0;
  for (const item of queued.value) {
    const record = await findRecord(database, item.kind, item.recordId);
    if (!record) { await removeSyncOutbox(database, item.syncOutboxId); continue; }
    const encoded = await encodeRecord(item.kind, code, record as never);
    const outcome = await deps.createRecord(houseId, item.kind, encoded.id, encoded.payload);
    if (outcome === 'created' || outcome === 'already-exists') {
      await removeSyncOutbox(database, item.syncOutboxId);
      sent += 1;
    } else {
      failed += 1;
    }
  }
  return { sent, failed };
}

export async function applyRemoteRecords(
  database: IDBDatabase,
  code: string,
  kind: SyncKind,
  remote: Array<{ id: string; payload: unknown }>,
): Promise<{ added: number; duplicates: number }> {
  const decoded: Array<Event | Session | Report> = [];
  for (const doc of remote) {
    const value = await decodeRecord<Event | Session | Report>(kind, code, doc.id, doc.payload);
    if (value) decoded.push(value);
  }
  if (decoded.length === 0) return { added: 0, duplicates: 0 };

  const existing = await listByKind(database, kind);
  if (!existing.ok) return { added: 0, duplicates: 0 };

  const merged = kind === 'events'
    ? mergeEvents(existing.value as Event[], decoded as Event[])
    : kind === 'sessions'
      ? mergeSessions(existing.value as Session[], decoded as Session[])
      : mergeReports(existing.value as Report[], decoded as Report[]);

  const written = await runTransaction(database, kind, 'readwrite', (store) => {
    store.clear();
    for (const record of merged.records) store.put(record);
    return store.count() as unknown as IDBRequest<unknown>;
  });
  if (!written.ok) return { added: 0, duplicates: 0 };
  return merged.counts;
}
