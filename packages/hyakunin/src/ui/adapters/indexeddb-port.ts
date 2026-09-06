import type { Report, Session, UserSettings } from '@koten/shared/domain/event';
import { openDatabase } from '@koten/shared/storage/db';
import { createExport, serializeExport, summarizeExport, type ExportSummary } from '@koten/shared/storage/export';
import { applyImport, parseImport, type ImportPlan, type ImportResult } from '@koten/shared/storage/import';
import { makeResetConfirmation, previewReset, resetRecords, type ResetCounts } from '@koten/shared/storage/reset';
import { enqueueOutbox, listOutbox, removeOutbox } from '@koten/shared/storage/repo/outbox';
import { listReports } from '@koten/shared/storage/repo/reports';
import { bumpCounter, readCounters, type DailyCounters, type UiCounterKey } from '@koten/shared/telemetry/counters';
import type { OutboxItem } from '@koten/shared/domain/event';
import { writeFallback, readFallback } from '@koten/shared/storage/fallback';
import { appendEvent, listEvents } from '@koten/shared/storage/repo/events';
import { saveReport } from '@koten/shared/storage/repo/reports';
import { listSessions, saveSession } from '@koten/shared/storage/repo/sessions';
import { getSettings, saveSettings } from '@koten/shared/storage/repo/settings';
import type { SaveFailure, SaveReceipt, SessionPort } from '../../domain/ports.ts';

/**
 * 1 種類あたりの取り込み上限。端末1台の学習記録は 100 首 × 数十回でこの桁に届かない。
 * 上限そのものより「上限があること」が要点で、壊れた巨大ファイルで固まらせないための門である。
 */
export const IMPORT_RECORD_LIMIT = 50_000;

/**
 * 削除は百人一首の記録だけを対象にする（依頼者裁定・2026-09-06）。
 * この画面は百人一首のものなので、他製品の記録まで消えるのは利用者の予期に反する。
 * 送信待ちは全製品共通のため `previewReset` の仕様どおり残る。設定も消えない。
 */
const DELETE_SCOPE = 'hyakunin' as const;

export type TransferPort = Readonly<{
  /** 書き出す文字列と件数。データベースを開けなければ null。 */
  exportRecords(exportedAt: string): Promise<{ text: string; summary: ExportSummary } | null>;
  /** 取り込みの下見。ここでは 1 件も書かない。§9「読み込み前に件数を示して確認する」。 */
  previewImport(text: string): Promise<{ ok: true; plan: ImportPlan } | { ok: false; message: string }>;
  /** 下見した計画をそのまま適用する。重複は eventId 等で落とす。 */
  commitImport(plan: ImportPlan): Promise<ImportResult | null>;
  /** 消える件数の下見。ここでは 1 件も消さない。 */
  previewDelete(): Promise<ResetCounts | null>;
  /** 下見で見せた件数をそのまま渡して消す。件数を伴わない削除はできない。 */
  commitDelete(counts: ResetCounts): Promise<ResetCounts | null>;
  /** 台帳から導けない3つを1つ数える。保存は端末内だけで、送信はしない。 */
  countUi(key: UiCounterKey, localDate: string): void;
  /** その日のカウンタ。日付が変われば空から数え直す。 */
  readUiCounters(localDate: string): DailyCounters;
  /** 生のカウンタ保存。終わった日を判定するために使う。 */
  rawUiCounters(): unknown;
  /** 統計の集計に要る記録。習熟度は全期間、回と報告は日付で絞って使う。 */
  listSessionsAll(): Promise<readonly Session[]>;
  listReportsAll(): Promise<readonly Report[]>;
  /** 送信待ち。 */
  enqueueStats(item: OutboxItem): Promise<boolean>;
  listStats(): Promise<readonly OutboxItem[]>;
  removeStats(outboxId: string): Promise<void>;
}>;

/**
 * 転送の口は任意にしてある。`Home.tsx` の簡易ポートや試験のダブルに実装を強いないためである。
 * ただし「無ければ画面に出さない」作りなので、**本番のポートから落ちると黙って機能ごと消える。**
 * 本番が必ず持つことは `tests/screen/history-transfer.test.tsx` で名指しで確かめる。
 */
export type ApplicationPort = SessionPort & Partial<TransferPort> & { saveLocalReport(poemId?: string, questionId?: string): Promise<boolean> };
const fail = (error?: unknown): SaveFailure => ({ reason: 'write-failed', error });
const receipt = (eventId: string): SaveReceipt => ({ eventId } as SaveReceipt);
/** カウンタは端末内だけ。IndexedDB の schema を触らずに済ませる。 */
const COUNTER_KEY = 'hyakunin:ui-counters';
const storage = (): Storage | undefined => typeof window === 'undefined' ? undefined : window.localStorage;

export function createIndexedDbPort(): ApplicationPort {
  const database = openDatabase();
  async function withDatabase<T>(action: (db: IDBDatabase) => Promise<{ ok: boolean; error?: unknown }>, fallbackKey: string, value: T, id: string): Promise<SaveReceipt | SaveFailure> {
    const opened = await database;
    if (opened.ok) {
      const result = await action(opened.value);
      if (result.ok) return receipt(id);
      return fail(result.error);
    }
    const result = writeFallback(storage(), fallbackKey, value);
    return result.ok ? receipt(id) : fail(result.error);
  }
  return {
    async appendEvent(event) { return withDatabase((db) => appendEvent(db, event), `hyakunin:event:${event.eventId}`, event, event.eventId); },
    async listEvents() {
      const opened = await database;
      if (!opened.ok) return [];
      const result = await listEvents(opened.value);
      return result.ok ? result.value : [];
    },
    async saveSession(session) { return withDatabase((db) => saveSession(db, session), 'hyakunin:last-session', session, session.sessionId); },
    async loadLastSession() {
      const opened = await database;
      if (!opened.ok) return readFallback<Session>(storage(), 'hyakunin:last-session') ?? null;
      const result = await listSessions(opened.value);
      return result.ok ? result.value.filter((session) => !session.completed).at(-1) ?? null : null;
    },
    async saveSettings(settings) { return withDatabase((db) => saveSettings(db, settings), 'hyakunin:settings', settings, settings.key); },
    async loadSettings() {
      const opened = await database;
      if (!opened.ok) return readFallback<UserSettings>(storage(), 'hyakunin:settings') ?? null;
      const result = await getSettings(opened.value);
      return result.ok ? result.value ?? null : null;
    },
    async exportRecords(exportedAt) {
      const opened = await database;
      if (!opened.ok) return null;
      const result = await createExport(opened.value, exportedAt);
      if (!result.ok) return null;
      return { text: serializeExport(result.value), summary: summarizeExport(result.value) };
    },
    async previewImport(text) {
      const outcome = parseImport(text, IMPORT_RECORD_LIMIT);
      return outcome.ok ? { ok: true, plan: outcome.value } : { ok: false, message: outcome.message };
    },
    async commitImport(plan) {
      const opened = await database;
      if (!opened.ok) return null;
      const result = await applyImport(opened.value, plan);
      return result.ok ? result.value : null;
    },
    async previewDelete() {
      const opened = await database;
      if (!opened.ok) return null;
      const result = await previewReset(opened.value, DELETE_SCOPE);
      return result.ok ? result.value : null;
    },
    async commitDelete(counts) {
      const opened = await database;
      if (!opened.ok) return null;
      // makeResetConfirmation を通さないと resetRecords は必ず拒否する。確認の証跡がここ。
      const result = await resetRecords(opened.value, makeResetConfirmation(DELETE_SCOPE, counts));
      return result.ok ? result.value : null;
    },
    countUi(key, localDate) {
      const store = storage();
      if (!store) return;
      const next = bumpCounter(readFallback<unknown>(store, COUNTER_KEY), localDate, key);
      writeFallback(store, COUNTER_KEY, next);
    },
    readUiCounters(localDate) { return readCounters(readFallback<unknown>(storage(), COUNTER_KEY), localDate); },
    rawUiCounters() { return readFallback<unknown>(storage(), COUNTER_KEY); },
    async listSessionsAll() {
      const opened = await database;
      if (!opened.ok) return [];
      const result = await listSessions(opened.value);
      return result.ok ? result.value : [];
    },
    async listReportsAll() {
      const opened = await database;
      if (!opened.ok) return [];
      const result = await listReports(opened.value);
      return result.ok ? result.value : [];
    },
    async enqueueStats(item) {
      const opened = await database;
      if (!opened.ok) return false;
      return (await enqueueOutbox(opened.value, item)).ok;
    },
    async listStats() {
      const opened = await database;
      if (!opened.ok) return [];
      const result = await listOutbox(opened.value);
      return result.ok ? result.value : [];
    },
    async removeStats(outboxId) {
      const opened = await database;
      if (opened.ok) await removeOutbox(opened.value, outboxId);
    },
    async saveLocalReport(poemId, questionId) {
      const report: Report = { reportId: crypto.randomUUID(), product: 'hyakunin', poemId, questionId, kind: 'other', createdOn: new Date().toISOString().slice(0, 10), status: 'local' };
      const opened = await database;
      if (!opened.ok) return writeFallback(storage(), `hyakunin:report:${report.reportId}`, report).ok;
      return (await saveReport(opened.value, report)).ok;
    },
  };
}
