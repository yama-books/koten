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

/**
 * 削除の鍵は**置き場（store）が決める**。記録の欄を順に見て当てない。
 *
 * 2026-09-23 に踏んだ: イベントは `sessionId` の欄を持つ。欄を順に見る書き方では
 * `eventId` より先に `sessionId` が当たり、**存在しない鍵で消していた**。
 * 「消しました」と出るのに解答が 1 件も消えない、という状態が公開版で起きた。
 */
const keyFieldFor = { sessions: 'sessionId', events: 'eventId', reports: 'reportId', outbox: 'outboxId' } as const;

async function removeRecords(database: IDBDatabase, store: 'sessions' | 'events' | 'reports' | 'outbox', records: (Session | Event | Report | OutboxItem)[], scope: ResetScope): Promise<StorageResult<number>> {
  const selected = store === 'outbox' ? (scope === 'all' ? records : []) : records.filter((record) => 'product' in record && matches(record, scope));
  let removed = 0;
  for (const record of selected) {
    const key = (record as unknown as Record<string, unknown>)[keyFieldFor[store]] as IDBValidKey;
    const result = await runTransaction(database, store, 'readwrite', (objectStore) => objectStore.delete(key) as IDBRequest<undefined>);
    if (!result.ok) return result;
    removed += 1;
  }
  return { ok: true, value: removed };
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
  // **数えた件数ではなく、消した件数を返す。** 下見の数をそのまま返していたため、
  // 1 件も消えていないのに「消しました」と出ていた（2026-09-23）。
  return { ok: true, value: { sessions: sessionsResult.value, events: eventsResult.value, reports: reportsResult.value, outbox: outboxResult.value } };
}
