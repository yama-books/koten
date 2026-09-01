import type { Report } from '../../domain/event.ts';
import { runTransaction, type StorageResult } from '../db.ts';

export function saveReport(database: IDBDatabase, report: Report): Promise<StorageResult<IDBValidKey>> {
  return runTransaction(database, 'reports', 'readwrite', (store) => store.put(report));
}

export function listReports(database: IDBDatabase): Promise<StorageResult<Report[]>> {
  return runTransaction(database, 'reports', 'readonly', (store) => store.getAll() as IDBRequest<Report[]>);
}
