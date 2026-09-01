import type { Event, Report, Session } from '../domain/event.ts';

export type MergeCounts = { added: number; duplicates: number };
export type MergeResult<T> = { records: T[]; counts: MergeCounts };

function mergeById<T>(existing: T[], incoming: T[], key: keyof T & string): MergeResult<T> {
  const ids = new Set(existing.map((record) => String(record[key])));
  const records = [...existing];
  let added = 0;
  let duplicates = 0;
  for (const record of incoming) {
    if (ids.has(String(record[key]))) duplicates += 1;
    else { ids.add(String(record[key])); records.push(record); added += 1; }
  }
  return { records, counts: { added, duplicates } };
}

export function mergeEvents(existing: Event[], incoming: Event[]): MergeResult<Event> { return mergeById(existing, incoming, 'eventId'); }
export function mergeSessions(existing: Session[], incoming: Session[]): MergeResult<Session> { return mergeById(existing, incoming, 'sessionId'); }
export function mergeReports(existing: Report[], incoming: Report[]): MergeResult<Report> { return mergeById(existing, incoming, 'reportId'); }
