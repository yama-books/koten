import { decryptField, encryptField, isCiphertext } from './crypto.ts';

export type AppId = 'vintage-kana' | 'conj';
export type AppRecord = { id: string; type: string; value: unknown };
export type AppAdapter = {
  read: () => Promise<AppRecord[]>;
  merge: (records: AppRecord[], active?: () => boolean) => Promise<void>;
};
export type AppRemote = {
  list: () => Promise<{ id: string; enc: string }[]>;
  put: (id: string, enc: string) => Promise<void>;
};
/** Immutable record IDs are derived from app-local IDs, never array positions.
 * The complete record is authenticated with app + ID as AES-GCM additional data. */
export async function recordKey(record: AppRecord): Promise<string> {
  const data = new TextEncoder().encode(`${record.type}|${record.id}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}
export async function syncApp(app: AppId, code: string, adapter: AppAdapter, remote: AppRemote, active: () => boolean = () => true): Promise<{ received: number; sent: number }> {
  const incoming: AppRecord[] = [];
  const remoteIds = new Set<string>();
  for (const item of await remote.list()) {
    if (!active()) return { received: 0, sent: 0 };
    if (!isCiphertext(item.enc)) throw new Error('同期データの暗号形式が違います。');
    const decoded = await decryptField(`app:${app}:${item.id}`, code, item.enc) as AppRecord;
    if (!decoded || typeof decoded.id !== 'string' || typeof decoded.type !== 'string' || await recordKey(decoded) !== item.id) throw new Error('同期データの識別子が一致しません。');
    incoming.push(decoded); remoteIds.add(item.id);
  }
  if (!active()) return { received: 0, sent: 0 };
  await adapter.merge(incoming, active);
  let sent = 0;
  for (const record of await adapter.read()) {
    if (!active()) break;
    const id = await recordKey(record);
    if (remoteIds.has(id)) continue;
    const enc = await encryptField(`app:${app}:${id}`, code, record);
    if (!active()) break;
    await remote.put(id, enc); sent += 1;
  }
  return { received: incoming.length, sent };
}

/** Read-only projection: never merge another application's records locally. */
export async function readAppRecords(app: AppId, code: string, remote: AppRemote): Promise<AppRecord[]> {
  const records: AppRecord[] = [];
  for (const item of await remote.list()) {
    if (!isCiphertext(item.enc)) throw Error('同期データの暗号形式が違います。');
    const record = await decryptField(`app:${app}:${item.id}`, code, item.enc) as AppRecord;
    if (!record || typeof record.id !== 'string' || typeof record.type !== 'string' || await recordKey(record) !== item.id) throw Error('同期データの識別子が一致しません。');
    records.push(record);
  }
  return records;
}
