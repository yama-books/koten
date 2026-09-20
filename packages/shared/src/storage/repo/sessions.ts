import type { Session } from '../../domain/event.ts';
import { runTransaction, runWriteTransaction, type StorageResult } from '../db.ts';

export function saveSession(database: IDBDatabase, session: Session): Promise<StorageResult<undefined>> {
  return runWriteTransaction(database, ['sessions', 'syncOutbox'], (stores) => {
    stores.sessions.put(session);
    stores.syncOutbox.put({ syncOutboxId: session.sessionId, kind: 'sessions', recordId: session.sessionId });
  });
}

export function listSessions(database: IDBDatabase): Promise<StorageResult<Session[]>> {
  return runTransaction(database, 'sessions', 'readonly', (store) => store.getAll() as IDBRequest<Session[]>);
}
