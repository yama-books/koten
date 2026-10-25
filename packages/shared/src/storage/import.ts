import { isProductId, isEvent, type Event, type Report, type Session, type UserSettings } from '../domain/event.ts';
import { runWriteTransaction, type StorageResult } from './db.ts';
import { type ExportDocument, type ExportSettings } from './export.ts';
import { mergeEvents, mergeReports, mergeSessions, type MergeCounts } from './merge.ts';

export type ImportRejection = 'invalid-json' | 'invalid-format' | 'unsupported-schema' | 'too-many-records';
export type ImportPreview = { schemaVersion: 1; counts: { sessions: number; events: number; reports: number }; products: string[] };
export type ImportPlan = { document: ExportDocument; preview: ImportPreview };
export type ImportResult = { sessions: MergeCounts; events: MergeCounts; reports: MergeCounts };
export type ImportOutcome = { ok: true; value: ImportPlan } | { ok: false; reason: ImportRejection; message: string };

const topLevelKeys = ['deviceId', 'events', 'exportedAt', 'reports', 'schemaVersion', 'sessions', 'settings'];
function hasExactTopLevelKeys(value: Record<string, unknown>): boolean {
  return Object.keys(value).every(key => topLevelKeys.includes(key)) && topLevelKeys.filter(key => key !== 'deviceId').every(key => Object.hasOwn(value, key));
}
function productsAreValid(records: unknown[]): boolean { return records.every((record) => typeof record === 'object' && record !== null && isProductId((record as { product?: unknown }).product)); }
function reject(reason: ImportRejection, message: string): ImportOutcome { return { ok: false, reason, message }; }

export function parseImport(text: string, limit: number, expectedProduct?: string): ImportOutcome {
  let value: unknown;
  try { value = JSON.parse(text); } catch { return reject('invalid-json', 'JSONとして読み取れません。'); }
  if (typeof value !== 'object' || value === null || Array.isArray(value) || !hasExactTopLevelKeys(value as Record<string, unknown>)) return reject('invalid-format', 'このアプリの書き出し形式ではありません。');
  const document = value as ExportDocument;
  if (document.schemaVersion !== 1) return reject('unsupported-schema', 'この書き出しの版は読み込めません。');
  if (!Array.isArray(document.sessions) || !Array.isArray(document.events) || !Array.isArray(document.reports) || document.sessions.length > limit || document.events.length > limit || document.reports.length > limit) return reject('too-many-records', '記録件数が上限を超えています。');
  if (!productsAreValid(document.sessions) || !productsAreValid(document.events) || !productsAreValid(document.reports)) return reject('invalid-format', '記録に製品の種類がありません、または認識できません。');
  const validIds = (records: unknown[], key: string) => records.every(record => {
    const id = (record as Record<string, unknown>)[key];
    return typeof id === 'string' && id.length > 0 && id.length <= 200;
  });
  if (!validIds(document.events, 'eventId') || !validIds(document.sessions, 'sessionId') || !validIds(document.reports, 'reportId') || !document.events.every(isEvent)
    || !document.sessions.every(s => typeof s.completed === 'boolean' && typeof s.startedOn === 'string')
    || !document.reports.every(r => typeof r.kind === 'string' && typeof r.status === 'string')) return reject('invalid-format', '記録の識別子または内容が不正です。');
  const settings = document.settings;
  if (!settings || typeof settings !== 'object' || Object.keys(settings).some(key => !['reading','writing','order','soundEnabled','grade'].includes(key))
    || !['no-ruby','historical','modern'].includes(settings.reading) || !['vertical','horizontal'].includes(settings.writing)
    || !['number','random'].includes(settings.order) || typeof settings.soundEnabled !== 'boolean'
    || (settings.grade !== undefined && typeof settings.grade !== 'string')) return reject('invalid-format', '表示設定の形式が不正です。');
  const products = [...new Set([...document.sessions, ...document.events, ...document.reports].map((record) => record.product))];
  if (expectedProduct && products.some(product => product !== expectedProduct)) return reject('invalid-format', '別のアプリの記録は読み込めません。');
  return { ok: true, value: { document, preview: { schemaVersion: 1, counts: { sessions: document.sessions.length, events: document.events.length, reports: document.reports.length }, products } } };
}

function importedSettings(existing: UserSettings | undefined, imported: ExportSettings): UserSettings {
  return { ...existing, key: 'user', noticeConfirmed: existing?.noticeConfirmed ?? false, ...imported };
}

export async function applyImport(database: IDBDatabase, plan: ImportPlan): Promise<StorageResult<ImportResult>> {
  const counts: ImportResult = { sessions: { added: 0, duplicates: 0 }, events: { added: 0, duplicates: 0 }, reports: { added: 0, duplicates: 0 } };
  // Read and merge inside one transaction. No clear/rewrite window can erase a
  // simultaneous answer, and sync/notice/privacy settings remain device-local.
  const written = await runWriteTransaction(database, ['sessions', 'events', 'reports', 'settings', 'syncOutbox'], (stores) => {
    const sessions = stores.sessions.getAll();
    sessions.onsuccess = () => {
      const merged = mergeSessions(sessions.result as Session[], plan.document.sessions);
      counts.sessions = merged.counts;
      const prior = new Map((sessions.result as Session[]).map(record => [record.sessionId, record.completed]));
      for (const record of merged.records) {
        stores.sessions.put(record);
        if (prior.get(record.sessionId) !== record.completed) stores.syncOutbox.put({ syncOutboxId: 'sessions:' + record.sessionId, kind: 'sessions', recordId: record.sessionId });
      }
    };
    const events = stores.events.getAll();
    events.onsuccess = () => {
      const merged = mergeEvents(events.result as Event[], plan.document.events);
      counts.events = merged.counts;
      const ids = new Set((events.result as Event[]).map(record => record.eventId));
      for (const record of merged.records) {
        stores.events.put(record);
        if (!ids.has(record.eventId)) stores.syncOutbox.put({ syncOutboxId: 'events:' + record.eventId, kind: 'events', recordId: record.eventId });
      }
    };
    const reports = stores.reports.getAll();
    reports.onsuccess = () => {
      const merged = mergeReports(reports.result as Report[], plan.document.reports);
      counts.reports = merged.counts;
      const ids = new Set((reports.result as Report[]).map(record => record.reportId));
      for (const record of merged.records) {
        stores.reports.put(record);
        if (!ids.has(record.reportId)) stores.syncOutbox.put({ syncOutboxId: 'reports:' + record.reportId, kind: 'reports', recordId: record.reportId });
      }
    };
    const settings = stores.settings.get('user');
    settings.onsuccess = () => stores.settings.put(importedSettings(settings.result as UserSettings | undefined, plan.document.settings));
  });
  if (!written.ok) return written;
  return { ok: true, value: counts };
}
