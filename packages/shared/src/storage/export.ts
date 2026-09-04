import type { Event, Report, Session, UserSettings } from '../domain/event.ts';
import type { StorageResult } from './db.ts';
import { listEvents } from './repo/events.ts';
import { listReports } from './repo/reports.ts';
import { listSessions } from './repo/sessions.ts';
import { getSettings } from './repo/settings.ts';

export type ExportSettings = Pick<UserSettings, 'reading' | 'writing' | 'order' | 'soundEnabled' | 'grade'>;
export type ExportDocument = { schemaVersion: 1; exportedAt: string; deviceId?: string; settings: ExportSettings; sessions: Session[]; events: Event[]; reports: Report[] };
export type ExportSummary = { counts: { sessions: number; events: number; reports: number }; characters: number };

export function makeExportDocument(input: Omit<ExportDocument, 'schemaVersion'>): ExportDocument {
  const { reading, writing, order, soundEnabled, grade } = input.settings;
  return { schemaVersion: 1, ...input, settings: { reading, writing, order, soundEnabled, ...(grade === undefined ? {} : { grade }) } };
}

export function serializeExport(document: ExportDocument): string { return JSON.stringify(document, null, 2); }
export function summarizeExport(document: ExportDocument): ExportSummary {
  return { counts: { sessions: document.sessions.length, events: document.events.length, reports: document.reports.length }, characters: serializeExport(document).length };
}

export async function createExport(database: IDBDatabase, exportedAt: string): Promise<StorageResult<ExportDocument>> {
  const [sessions, events, reports, settings] = await Promise.all([listSessions(database), listEvents(database), listReports(database), getSettings(database)]);
  if (!sessions.ok) return sessions;
  if (!events.ok) return events;
  if (!reports.ok) return reports;
  if (!settings.ok) return settings;
  const value = settings.value;
  const safeSettings: ExportSettings = value
    ? { reading: value.reading, writing: value.writing, order: value.order, soundEnabled: value.soundEnabled, ...(value.grade === undefined ? {} : { grade: value.grade }) }
    : { reading: 'no-ruby', writing: 'vertical', order: 'number', soundEnabled: false };
  return { ok: true, value: makeExportDocument({ exportedAt, deviceId: value?.deviceId, settings: safeSettings, sessions: sessions.value, events: events.value, reports: reports.value }) };
}
