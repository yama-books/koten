import type { Session } from '../../domain/event.ts';
import { runTransaction, type StorageResult } from '../db.ts';

export function saveSession(database: IDBDatabase, session: Session): Promise<StorageResult<IDBValidKey>> {
  return runTransaction(database, 'sessions', 'readwrite', (store) => store.put(session));
}

export function listSessions(database: IDBDatabase): Promise<StorageResult<Session[]>> {
  return runTransaction(database, 'sessions', 'readonly', (store) => store.getAll() as IDBRequest<Session[]>);
}
