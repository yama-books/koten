import { decryptField, encryptField, isCiphertext } from './crypto.ts';
import type { Event, Report, Session } from '../domain/event.ts';

export type SyncKind = 'sessions' | 'events' | 'reports';
type RecordFor<K extends SyncKind> = K extends 'sessions' ? Session : K extends 'events' ? Event : Report;
const idField: Record<SyncKind, string> = { sessions: 'sessionId', events: 'eventId', reports: 'reportId' };

export function recordId<K extends SyncKind>(kind: K, record: RecordFor<K>): string {
  return String((record as unknown as Record<string, unknown>)[idField[kind]]);
}

export async function encodeRecord<K extends SyncKind>(
  kind: K,
  code: string,
  record: RecordFor<K>,
): Promise<{ id: string; payload: { enc: string } }> {
  return { id: recordId(kind, record), payload: { enc: await encryptField(kind, code, record) } };
}

export async function decodeRecord<T>(kind: SyncKind, code: string, id: string, payload: unknown): Promise<T | null> {
  if (typeof payload !== 'object' || payload === null) return null;
  const enc = (payload as { enc?: unknown }).enc;
  if (!isCiphertext(enc)) return null;
  try {
    const value = await decryptField(kind, code, enc);
    if (typeof value !== 'object' || value === null) return null;
    return value as T;
  } catch {
    return null;
  }
}
