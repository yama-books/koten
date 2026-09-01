import type { ProductId } from '../app-config.ts';
import type { Event, OutboxItem, Report, Session } from '../domain/event.ts';
import { runTransaction, type StorageResult } from './db.ts';
import { listEvents } from './repo/events.ts';
import { listOutbox } from './repo/outbox.ts';
import { listReports } from './repo/reports.ts';
import { listSessions } from './repo/sessions.ts';

export type ResetScope = 'all' | ProductId;
export type ResetCounts = { sessions: number; events: number; reports: number; outbox: number };
export type ResetConfirmation = { scope: ResetScope; counts: ResetCounts; confirmed: true };
export type UnconfirmedReset = { scope: ResetScope; counts: ResetCounts; confirmed?: false };
const matches = <T extends { product: ProductId }>(record: T, scope: ResetScope) => scope === 'all' || record.product === scope;
export function makeResetConfirmation(scope: ResetScope, counts: ResetCounts): ResetConfirmation { return { scope, counts, confirmed: true }; }

export async function previewReset(database: IDBDatabase, scope: ResetScope): Promise<StorageResult<ResetCounts>> {
  const [sessions, events, reports, outbox] = await Promise.all([listSessions(database), listEvents(database), listReports(database), listOutbox(database)]);
  if (!sessions.ok) return sessions;
  if (!events.ok) return events;
  if (!reports.ok) return reports;
  if (!outbox.ok) return outbox;
  return { ok: true, value: { sessions: sessions.value.filter((x) => matches(x, scope)).length, events: events.value.filter((x) => matches(x, scope)).length, reports: reports.value.filter((x) => matches(x, scope)).length, outbox: scope === 'all' ? outbox.value.length : 0 } };
}

async function removeRecords(database: IDBDatabase, store: 'sessions' | 'events' | 'reports' | 'outbox', records: (Session | Event | Report | OutboxItem)[], scope: ResetScope): Promise<StorageResult<undefined>> {
  const selected = store === 'outbox' ? (scope === 'all' ? records : []) : records.filter((record) => 'product' in record && matches(record, scope));
  for (const record of selected) {
    const key: IDBValidKey = ('sessionId' in record ? record.sessionId : 'eventId' in record ? record.eventId : 'reportId' in record ? record.reportId : (record as OutboxItem).outboxId) as IDBValidKey;
    const result = await runTransaction(database, store, 'readwrite', (objectStore) => objectStore.delete(key) as IDBRequest<undefined>);
    if (!result.ok) return result;
  }
  return { ok: true, value: undefined };
}

export async function resetRecords(database: IDBDatabase, confirmation: ResetConfirmation | UnconfirmedReset): Promise<StorageResult<ResetCounts>> {
  if (confirmation.confirmed !== true) return { ok: false, reason: 'transaction-failed', error: new Error('Reset confirmation is required') };
  const [sessions, events, reports, outbox] = await Promise.all([listSessions(database), listEvents(database), listReports(database), listOutbox(database)]);
  if (!sessions.ok) return sessions;
  if (!events.ok) return events;
  if (!reports.ok) return reports;
  if (!outbox.ok) return outbox;
  const sessionsResult = await removeRecords(database, 'sessions', sessions.value, confirmation.scope); if (!sessionsResult.ok) return sessionsResult;
  const eventsResult = await removeRecords(database, 'events', events.value, confirmation.scope); if (!eventsResult.ok) return eventsResult;
  const reportsResult = await removeRecords(database, 'reports', reports.value, confirmation.scope); if (!reportsResult.ok) return reportsResult;
  const outboxResult = await removeRecords(database, 'outbox', outbox.value, confirmation.scope); if (!outboxResult.ok) return outboxResult;
  return { ok: true, value: confirmation.counts };
}
