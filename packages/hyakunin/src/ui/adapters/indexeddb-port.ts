import type { Report, Session, UserSettings } from '@koten/shared/domain/event';
import { openDatabase } from '@koten/shared/storage/db';
import { writeFallback, readFallback } from '@koten/shared/storage/fallback';
import { appendEvent, listEvents } from '@koten/shared/storage/repo/events';
import { saveReport } from '@koten/shared/storage/repo/reports';
import { listSessions, saveSession } from '@koten/shared/storage/repo/sessions';
import { getSettings, saveSettings } from '@koten/shared/storage/repo/settings';
import type { SaveFailure, SaveReceipt, SessionPort } from '../../domain/ports.ts';

export type ApplicationPort = SessionPort & { saveLocalReport(poemId?: string, questionId?: string): Promise<boolean> };
const fail = (error?: unknown): SaveFailure => ({ reason: 'write-failed', error });
const receipt = (eventId: string): SaveReceipt => ({ eventId } as SaveReceipt);
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
    async saveLocalReport(poemId, questionId) {
      const report: Report = { reportId: crypto.randomUUID(), product: 'hyakunin', poemId, questionId, kind: 'other', createdOn: new Date().toISOString().slice(0, 10), status: 'local' };
      const opened = await database;
      if (!opened.ok) return writeFallback(storage(), `hyakunin:report:${report.reportId}`, report).ok;
      return (await saveReport(opened.value, report)).ok;
    },
  };
}
