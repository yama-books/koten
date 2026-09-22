import { decodeRecord, encodeRecord, type SyncKind } from './codec.ts';
import { listSyncOutbox, removeSyncOutbox } from '../storage/repo/sync-outbox.ts';
import { listEvents } from '../storage/repo/events.ts';
import { listSessions } from '../storage/repo/sessions.ts';
import { listReports } from '../storage/repo/reports.ts';
import { mergeEvents, mergeReports, mergeSessions } from '../storage/merge.ts';
import { runTransaction } from '../storage/db.ts';
import type { Event, Report, Session } from '../domain/event.ts';

export type SyncRecordInput = Readonly<{ kind: SyncKind; id: string; payload: { enc: string } }>;

export type SyncDeps = {
  createRecord: (houseId: string, kind: SyncKind, id: string, payload: { enc: string }) => Promise<'created' | 'already-exists' | 'error'>;
  /**
   * まとめて書く口（任意）。**1 件ずつだと 1 件につき 1 往復かかる。**
   * 実測（2026-09-22・公開版）で 40 件に 8.0 秒、1 件あたり約 200ms だった。
   * 数百件を持つ端末では数分かかり、その間は相手の端末に少しずつしか届かない。
   *
   * まとめ書きは**全件まとめて成否が決まる**ので、失敗したらその束は 1 件ずつへ落とす。
   * 既にある記録へ書くと規則が拒む（events と reports は create しか許さない）ため、
   * 束の中に 1 件でもあると束ごと失敗する。落とせば通る分だけ通る。
   */
  createRecords?: (houseId: string, items: readonly SyncRecordInput[]) => Promise<'ok' | 'error'>;
};

/** まとめ書き 1 回あたりの件数。Firestore の上限は 500 だが、1 往復の重さを抑えて 200 にする。 */
const BATCH_SIZE = 200;

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

  // 先に全部を暗号にしておく。記録が消えている待ち行列はここで畳む。
  const pending: Array<{ syncOutboxId: string; kind: SyncKind; id: string; payload: { enc: string } }> = [];
  for (const item of queued.value) {
    const record = await findRecord(database, item.kind, item.recordId);
    if (!record) { await removeSyncOutbox(database, item.syncOutboxId); continue; }
    const encoded = await encodeRecord(item.kind, code, record as never);
    pending.push({ syncOutboxId: item.syncOutboxId, kind: item.kind, id: encoded.id, payload: encoded.payload });
  }

  let sent = 0;
  let failed = 0;
  for (let start = 0; start < pending.length; start += BATCH_SIZE) {
    const chunk = pending.slice(start, start + BATCH_SIZE);
    // **まず束で試す。** 1 往復で済むならそれが一番速い。
    if (deps.createRecords !== undefined && chunk.length > 1) {
      const outcome = await deps.createRecords(houseId, chunk.map(({ kind, id, payload }) => ({ kind, id, payload })));
      if (outcome === 'ok') {
        for (const item of chunk) await removeSyncOutbox(database, item.syncOutboxId);
        sent += chunk.length;
        continue;
      }
    }
    // 束が通らなかったか、まとめ書きの口が無い。**1 件ずつへ落とす**——通る分だけ通す。
    for (const item of chunk) {
      const outcome = await deps.createRecord(houseId, item.kind, item.id, item.payload);
      if (outcome === 'created' || outcome === 'already-exists') {
        await removeSyncOutbox(database, item.syncOutboxId);
        sent += 1;
      } else {
        failed += 1;
      }
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

  const existingIds = new Set(existing.value.map((record) => String((record as Record<string, unknown>)[idFieldFor[kind]])));
  const newRecords = decoded.filter((record) => !existingIds.has(String((record as unknown as Record<string, unknown>)[idFieldFor[kind]])));
  // 開始時のセッションを受け取った後でも、完了した版を反映する。
  const completedSessions = kind === 'sessions'
    ? (decoded as Session[]).filter((record) => record.completed && (existing.value as Session[]).some((local) => local.sessionId === record.sessionId && !local.completed))
    : [];
  const written = await runTransaction(database, kind, 'readwrite', (store) => {
    for (const record of [...newRecords, ...completedSessions]) store.put(record);
    return store.count() as unknown as IDBRequest<unknown>;
  });
  if (!written.ok) return { added: 0, duplicates: 0 };
  return merged.counts;
}
