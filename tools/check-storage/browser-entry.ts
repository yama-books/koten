import { dbVersion, databaseName, stores } from '@koten/shared/storage/schema';
import { openDatabase } from '@koten/shared/storage/db';
import { appendEvent, listEvents } from '@koten/shared/storage/repo/events';

// This entry is served by Vite during each check; it has no checked-in build output.
export const storageCheckApi = {
  databaseName,
  dbVersion,
  stores,
  openDatabase,
  appendEvent,
  listEvents,
  loadFallback: () => import('@koten/shared/storage/fallback'),
};
