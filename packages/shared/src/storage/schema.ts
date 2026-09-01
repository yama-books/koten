export const databaseName = 'koten';
export const dbVersion = 1;

export const stores = {
  events: { keyPath: 'eventId', indexes: ['poemId', 'sessionId', 'localDate', 'itemKey', 'product'] },
  sessions: { keyPath: 'sessionId', indexes: ['startedOn'] },
  settings: { keyPath: 'key', indexes: [] },
  reports: { keyPath: 'reportId', indexes: ['status'] },
  outbox: { keyPath: 'outboxId', indexes: ['kind'] },
} as const;

export type StoreName = keyof typeof stores;
