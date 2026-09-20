import type { Report } from '../../domain/event.ts';
import { runTransaction, runWriteTransaction, type StorageResult } from '../db.ts';

export function saveReport(database: IDBDatabase, report: Report): Promise<StorageResult<undefined>> {
  return runWriteTransaction(database, ['reports', 'syncOutbox'], (stores) => {
    stores.reports.put(report);
    stores.syncOutbox.put({ syncOutboxId: report.reportId, kind: 'reports', recordId: report.reportId });
  });
}

export function listReports(database: IDBDatabase): Promise<StorageResult<Report[]>> {
  return runTransaction(database, 'reports', 'readonly', (store) => store.getAll() as IDBRequest<Report[]>);
}
