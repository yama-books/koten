import { listEvents } from '../storage/repo/events.ts';
import { listSessions } from '../storage/repo/sessions.ts';
import { listReports } from '../storage/repo/reports.ts';
import { enqueueSyncOutbox, listSyncOutbox } from '../storage/repo/sync-outbox.ts';
import type { SyncKind } from './codec.ts';

/** 同期を初めて有効にした端末の古い記録も送る。途中失敗時は再試行できる。 */
export async function seedSyncOutbox(database: IDBDatabase): Promise<boolean> {
  const [events, sessions, reports, queued] = await Promise.all([
    listEvents(database), listSessions(database), listReports(database), listSyncOutbox(database),
  ]);
  if (!events.ok || !sessions.ok || !reports.ok || !queued.ok) return false;
  const pending = new Set(queued.value.map(({ kind, recordId }) => `${kind}:${recordId}`));
  const records: [SyncKind, string][] = [
    ...events.value.map((r): [SyncKind, string] => ['events', r.eventId]),
    ...sessions.value.map((r): [SyncKind, string] => ['sessions', r.sessionId]),
    ...reports.value.map((r): [SyncKind, string] => ['reports', r.reportId]),
  ];
  for (const [kind, recordId] of records) {
    if (pending.has(`${kind}:${recordId}`)) continue;
    const saved = await enqueueSyncOutbox(database, { syncOutboxId: crypto.randomUUID(), kind, recordId });
    if (!saved.ok) return false;
  }
  return true;
}
