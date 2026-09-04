import { isProductId, type Event, type Report, type Session, type UserSettings } from '../domain/event.ts';
import { runWriteTransaction, type StorageResult } from './db.ts';
import { type ExportDocument, type ExportSettings } from './export.ts';
import { mergeEvents, mergeReports, mergeSessions, type MergeCounts } from './merge.ts';
import { listEvents } from './repo/events.ts';
import { listReports } from './repo/reports.ts';
import { listSessions } from './repo/sessions.ts';
import { getSettings } from './repo/settings.ts';

export type ImportRejection = 'invalid-json' | 'invalid-format' | 'unsupported-schema' | 'too-many-records';
export type ImportPreview = { schemaVersion: 1; counts: { sessions: number; events: number; reports: number }; products: string[] };
export type ImportPlan = { document: ExportDocument; preview: ImportPreview };
export type ImportResult = { sessions: MergeCounts; events: MergeCounts; reports: MergeCounts };
export type ImportOutcome = { ok: true; value: ImportPlan } | { ok: false; reason: ImportRejection; message: string };

const topLevelKeys = ['deviceId', 'events', 'exportedAt', 'reports', 'schemaVersion', 'sessions', 'settings'];
function hasExactTopLevelKeys(value: Record<string, unknown>): boolean { return Object.keys(value).sort().join('|') === topLevelKeys.join('|'); }
function productsAreValid(records: unknown[]): boolean { return records.every((record) => typeof record === 'object' && record !== null && isProductId((record as { product?: unknown }).product)); }
function reject(reason: ImportRejection, message: string): ImportOutcome { return { ok: false, reason, message }; }

export function parseImport(text: string, limit: number): ImportOutcome {
  let value: unknown;
  try { value = JSON.parse(text); } catch { return reject('invalid-json', 'JSONとして読み取れません。'); }
  if (typeof value !== 'object' || value === null || Array.isArray(value) || !hasExactTopLevelKeys(value as Record<string, unknown>)) return reject('invalid-format', 'このアプリの書き出し形式ではありません。');
  const document = value as ExportDocument;
  if (document.schemaVersion !== 1) return reject('unsupported-schema', 'この書き出しの版は読み込めません。');
  if (!Array.isArray(document.sessions) || !Array.isArray(document.events) || !Array.isArray(document.reports) || document.sessions.length > limit || document.events.length > limit || document.reports.length > limit) return reject('too-many-records', '記録件数が上限を超えています。');
  if (!productsAreValid(document.sessions) || !productsAreValid(document.events) || !productsAreValid(document.reports)) return reject('invalid-format', '記録に製品の種類がありません、または認識できません。');
  const products = [...new Set([...document.sessions, ...document.events, ...document.reports].map((record) => record.product))];
  return { ok: true, value: { document, preview: { schemaVersion: 1, counts: { sessions: document.sessions.length, events: document.events.length, reports: document.reports.length }, products } } };
}

type Backup = { sessions: Session[]; events: Event[]; reports: Report[]; settings?: UserSettings };
async function readBackup(database: IDBDatabase): Promise<StorageResult<Backup>> {
  const [sessions, events, reports, settings] = await Promise.all([listSessions(database), listEvents(database), listReports(database), getSettings(database)]);
  if (!sessions.ok) return sessions;
  if (!events.ok) return events;
  if (!reports.ok) return reports;
  if (!settings.ok) return settings;
  return { ok: true, value: { sessions: sessions.value, events: events.value, reports: reports.value, settings: settings.value } };
}
function importedSettings(existing: UserSettings | undefined, imported: ExportSettings): UserSettings {
  return { key: 'user', noticeConfirmed: existing?.noticeConfirmed ?? false, ...(existing?.deviceId === undefined ? {} : { deviceId: existing.deviceId }), ...imported };
}

export async function applyImport(database: IDBDatabase, plan: ImportPlan): Promise<StorageResult<ImportResult>> {
  const backup = await readBackup(database);
  if (!backup.ok) return backup;
  const sessions = mergeSessions(backup.value.sessions, plan.document.sessions);
  const events = mergeEvents(backup.value.events, plan.document.events);
  const reports = mergeReports(backup.value.reports, plan.document.reports);
  const written = await runWriteTransaction(database, ['sessions', 'events', 'reports', 'settings'], (stores) => {
    stores.sessions.clear();
    for (const record of sessions.records) stores.sessions.put(record);
    stores.events.clear();
    for (const record of events.records) stores.events.put(record);
    stores.reports.clear();
    for (const record of reports.records) stores.reports.put(record);
    stores.settings.put(importedSettings(backup.value.settings, plan.document.settings));
  });
  if (!written.ok) return written;
  return { ok: true, value: { sessions: sessions.counts, events: events.counts, reports: reports.counts } };
}
