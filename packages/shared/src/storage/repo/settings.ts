import type { UserSettings } from '../../domain/event.ts';
import { runTransaction, type StorageResult } from '../db.ts';

export function saveSettings(database: IDBDatabase, settings: UserSettings): Promise<StorageResult<IDBValidKey>> {
  return runTransaction(database, 'settings', 'readwrite', (store) => store.put(settings));
}

export function getSettings(database: IDBDatabase): Promise<StorageResult<UserSettings | undefined>> {
  return runTransaction(database, 'settings', 'readonly', (store) => store.get('user') as IDBRequest<UserSettings | undefined>);
}
