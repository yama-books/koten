import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { startSync } from '../../packages/hyakunin/src/sync/runtime.ts';
import { initialSettings } from '../../packages/hyakunin/src/ui/settings.ts';
import { createMemoryPort } from '../../packages/hyakunin/src/domain/ports.ts';
import type { SyncKind } from '../../packages/shared/src/sync/codec.ts';
import type { UserSettings } from '../../packages/shared/src/domain/event.ts';

const mock = vi.hoisted(() => ({
  records: {} as Record<string, (records: [], fromServer: boolean) => void>,
  settings: null as null | ((payload: unknown) => void),
  flush: vi.fn(async () => ({ sent: 0, failed: 0 })),
  apply: vi.fn(async () => ({ added: 0, duplicates: 0 })),
  put: vi.fn(async () => 'ok'),
}));
vi.mock('@koten/shared/storage/db', () => ({ openDatabase: async () => ({ ok: true, value: { close() {} } }) }));
vi.mock('@koten/shared/sync/seed', () => ({ seedSyncOutbox: async () => true }));
vi.mock('@koten/shared/sync/engine', () => ({ flushOutbox: mock.flush, applyRemoteRecords: mock.apply }));
vi.mock('@koten/shared/sync/crypto', () => ({
  houseIdFor: async () => 'house', isCiphertext: () => true,
  encryptField: async (_field: string, _code: string, value: unknown) => JSON.stringify(value),
  decryptField: async (_field: string, _code: string, enc: string) => JSON.parse(enc),
}));
vi.mock('@koten/shared/sync/client', () => ({
  createRecord: vi.fn(), createRecords: vi.fn(), putSettings: mock.put,
  watchCollection: (_house: string, kind: SyncKind, callback: typeof mock.records[string]) => { mock.records[kind] = callback; return () => {}; },
  watchSettings: (_house: string, callback: typeof mock.settings) => { mock.settings = callback; return () => {}; },
}));
let stop: (() => void) | undefined;
beforeEach(() => {
  vi.clearAllMocks();
  mock.records = {}; mock.settings = null;
  mock.flush.mockResolvedValue({ sent: 0, failed: 0 });
  mock.apply.mockResolvedValue({ added: 0, duplicates: 0 });
  mock.put.mockResolvedValue('ok');
});
afterEach(() => { stop?.(); });

async function begin(joining = true) {
  let local: UserSettings = { ...initialSettings, syncEnabled: true, syncCode: 'abcdefghjkmnpqrs', syncSeededFor: 'house', ...(joining ? { syncJoinRequest: 'receipt-1' } : {}) };
  const status = vi.fn();
  const port = { ...createMemoryPort(), loadSettings: async () => local, saveSettings: async (next: UserSettings) => { local = next; return { eventId: 'settings' }; }, saveLocalReport: async () => true };
  stop = startSync(local, port, (next) => { local = next; }, status);
  await vi.waitFor(() => expect(mock.settings).toBeTruthy());
  mock.settings!({ enc: JSON.stringify(initialSettings) });
  await vi.waitFor(() => expect(mock.flush).toHaveBeenCalled());
  return { status, local: () => local };
}

test('3種類のサーバー受信と送信が終わるまで完了せず、完了時に受領票を送る', async () => {
  const { status, local } = await begin();
  mock.records.events([], true); mock.records.sessions([], true); mock.records.reports([], false);
  await vi.waitFor(() => expect(mock.apply).toHaveBeenCalledTimes(3));
  expect(status).not.toHaveBeenCalledWith('connected');
  expect(local().syncJoinRequest).toBe('receipt-1');
  mock.records.reports([], true);
  await vi.waitFor(() => expect(status).toHaveBeenCalledWith('connected'));
  expect(local().syncJoinRequest).toBeUndefined();
  expect(local().syncPairingReceipt).toBe('receipt-1');
  expect(JSON.parse(mock.put.mock.calls.at(-1)![1].enc).syncPairingReceipt).toBe('receipt-1');
});

test('送信失敗時は完了を通知せず、再送成功後に完了する', async () => {
  mock.flush.mockResolvedValue({ sent: 0, failed: 1 });
  const { status } = await begin();
  for (const kind of ['events', 'sessions', 'reports']) mock.records[kind]([], true);
  await vi.waitFor(() => expect(mock.apply).toHaveBeenCalledTimes(3));
  expect(status).not.toHaveBeenCalledWith('connected');
  mock.flush.mockResolvedValue({ sent: 1, failed: 0 });
  window.dispatchEvent(new Event('koten:record-saved'));
  await vi.waitFor(() => expect(status).toHaveBeenCalledWith('connected'));
});

test('受信記録の保存失敗や受領票の送信失敗では参加完了にしない', async () => {
  mock.apply.mockRejectedValueOnce(new Error('storage failed'));
  const { status, local } = await begin();
  for (const kind of ['events', 'sessions', 'reports']) mock.records[kind]([], true);
  await vi.waitFor(() => expect(status).toHaveBeenCalledWith('error'));
  expect(status).not.toHaveBeenCalledWith('connected');
  mock.put.mockResolvedValue('error');
  mock.records.events([], true);
  await vi.waitFor(() => expect(mock.put).toHaveBeenCalled());
  expect(status).not.toHaveBeenCalledWith('connected');
  expect(local().syncJoinRequest).toBe('receipt-1');
});

test('同期元は既存の受領票で通知せず、新しい完了受領票で1回通知する', async () => {
  const notify = vi.fn();
  window.addEventListener('koten:pairing-complete', notify);
  try {
    const { local } = await begin(false);
    expect(notify).not.toHaveBeenCalled();
    mock.settings!({ enc: JSON.stringify({ ...initialSettings, syncPairingReceipt: 'new-receipt' }) });
    await vi.waitFor(() => expect(notify).toHaveBeenCalledTimes(1));
    mock.settings!({ enc: JSON.stringify({ ...initialSettings, syncPairingReceipt: 'new-receipt' }) });
    await vi.waitFor(() => expect(local().syncPairingReceipt).toBe('new-receipt'));
    expect(notify).toHaveBeenCalledTimes(1);
  } finally { window.removeEventListener('koten:pairing-complete', notify); }
});
