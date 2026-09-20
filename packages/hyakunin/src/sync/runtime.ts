import type { UserSettings } from '@koten/shared/domain/event';
import { openDatabase } from '@koten/shared/storage/db';
import { houseIdFor, decryptField, encryptField, isCiphertext } from '@koten/shared/sync/crypto';
import { seedSyncOutbox } from '@koten/shared/sync/seed';
import { flushOutbox, applyRemoteRecords } from '@koten/shared/sync/engine';
import { createRecord, putSettings, watchCollection, watchSettings } from '@koten/shared/sync/client';
import type { SyncKind } from '@koten/shared/sync/codec';
import type { ApplicationPort } from '../ui/adapters/indexeddb-port.ts';

export type SyncStatus = 'connecting' | 'connected' | 'offline' | 'error';
type SharedPreferences = Pick<UserSettings, 'reading' | 'writing' | 'order' | 'soundEnabled' | 'grade'>;
const kinds: SyncKind[] = ['events', 'sessions', 'reports'];

function sharedPreferences(settings: UserSettings): SharedPreferences {
  return {
    reading: settings.reading, writing: settings.writing, order: settings.order,
    soundEnabled: settings.soundEnabled,
    ...(settings.grade === undefined ? {} : { grade: settings.grade }),
  };
}

export function validPreferences(value: unknown): value is SharedPreferences {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<SharedPreferences>;
  return ['no-ruby', 'historical', 'modern'].includes(item.reading ?? '')
    && ['vertical', 'horizontal'].includes(item.writing ?? '')
    && ['number', 'random'].includes(item.order ?? '')
    && typeof item.soundEnabled === 'boolean'
    && (item.grade === undefined || typeof item.grade === 'string');
}

/** 画面の存続とは独立に、端末の同期設定が有効な間だけ稼働する。 */
export function startSync(settings: UserSettings, port: ApplicationPort, onSettings: (value: UserSettings) => void, onStatus: (status: SyncStatus) => void): () => void {
  const code = settings.syncCode;
  if (!settings.syncEnabled || !code) return () => {};
  let stopped = false;
  let db: IDBDatabase | null = null;
  let houseId = '';
  let unsubscribers: Array<() => void> = [];
  let flushing = false;
  let settingsReady = false;
  let settingsDirty = false;
  let applyingRemote = false;
  let subscriptionFailed = false;
  let lastShared = '';
  let lastObserved = JSON.stringify(sharedPreferences(settings));
  const received: Record<SyncKind, Promise<unknown>> = { events: Promise.resolve(), sessions: Promise.resolve(), reports: Promise.resolve() };
  const fail = () => { if (!stopped) onStatus(navigator.onLine ? 'error' : 'offline'); };

  async function flush() {
    if (stopped || !db || flushing || !navigator.onLine) return;
    flushing = true;
    try {
      const result = await flushOutbox(db, code!, houseId, { createRecord });
      if (result.failed) fail();
    } catch { fail(); }
    finally { flushing = false; }
  }

  async function publishSettings() {
    if (stopped || !settingsReady || !navigator.onLine) return;
    const local = await port.loadSettings();
    if (!local?.syncEnabled || local.syncCode !== code) return;
    const value = sharedPreferences(local);
    const serialized = JSON.stringify(value);
    if (serialized === lastShared) return;
    try {
      const enc = await encryptField('settings', code!, value);
      if (stopped) return;
      if (await putSettings(houseId, { enc }) === 'ok') { lastShared = serialized; settingsDirty = false; }
      else fail();
    } catch { fail(); }
  }

  async function receiveSettings(payload: unknown | null) {
    if (stopped) return;
    if (payload === null) {
      settingsReady = true;
      await publishSettings();
      return;
    }
    const enc = typeof payload === 'object' && payload !== null ? (payload as { enc?: unknown }).enc : null;
    if (!isCiphertext(enc)) { fail(); return; }
    try {
      const remote = await decryptField('settings', code!, enc);
      if (!validPreferences(remote) || stopped) { fail(); return; }
      lastShared = JSON.stringify(sharedPreferences(remote as UserSettings));
      settingsReady = true;
      if (settingsDirty) { await publishSettings(); return; }
      const local = await port.loadSettings();
      if (!local || !local.syncEnabled || local.syncCode !== code) return;
      if (JSON.stringify(sharedPreferences(local)) === lastShared) return;
      const next = { ...local, ...remote, key: 'user' as const };
      if (!('grade' in remote)) delete next.grade;
      applyingRemote = true;
      await port.saveSettings(next);
      applyingRemote = false;
      lastObserved = lastShared;
      if (!stopped) onSettings(next);
    } catch { applyingRemote = false; fail(); }
  }

  function subscribe() {
    unsubscribers.forEach((stop) => stop());
    unsubscribers = [];
    if (stopped) return;
    settingsReady = false;
    subscriptionFailed = false;
    onStatus(navigator.onLine ? 'connecting' : 'offline');
    const watchFailed = () => { subscriptionFailed = true; fail(); };
    for (const kind of kinds) {
      unsubscribers.push(watchCollection(houseId, kind, (records) => {
        received[kind] = received[kind].then(async () => {
          if (stopped || !db) return;
          const result = await applyRemoteRecords(db, code!, kind, records);
          if (result.added > 0 || kind === 'sessions') window.dispatchEvent(new Event('koten:remote-records'));
          onStatus(navigator.onLine ? 'connected' : 'offline');
        }).catch(fail);
      }, watchFailed));
    }
    unsubscribers.push(watchSettings(houseId, (payload) => { void receiveSettings(payload); }, watchFailed));
  }

  const onRecordSaved = () => { void flush(); };
  const onSettingsSaved = () => { void (async () => {
    if (applyingRemote) return;
    const local = await port.loadSettings();
    if (!local) return;
    const current = JSON.stringify(sharedPreferences(local));
    if (current !== lastObserved) { settingsDirty = true; lastObserved = current; }
    await publishSettings();
  })(); };
  const onOnline = () => { if (!stopped && db) { subscribe(); void flush(); } };
  const onOffline = () => { if (!stopped) onStatus('offline'); };
  window.addEventListener('koten:record-saved', onRecordSaved);
  window.addEventListener('koten:settings-saved', onSettingsSaved);
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  const retry = window.setInterval(() => { if (subscriptionFailed && navigator.onLine) subscribe(); void flush(); }, 30_000);
  onStatus(navigator.onLine ? 'connecting' : 'offline');

  void (async () => {
    try {
      houseId = await houseIdFor(code);
      const opened = await openDatabase();
      if (stopped) { if (opened.ok) opened.value.close(); return; }
      if (!opened.ok) { fail(); return; }
      db = opened.value;
      if (settings.syncSeededFor !== houseId) {
        if (!await seedSyncOutbox(db)) { fail(); return; }
        const latest = await port.loadSettings();
        if (latest?.syncCode === code && latest.syncEnabled) {
          const next = { ...latest, syncSeededFor: houseId };
          await port.saveSettings(next);
          if (!stopped) onSettings(next);
        }
      }
      if (stopped) return;
      subscribe();
      await flush();
    } catch { fail(); }
  })();

  return () => {
    stopped = true;
    unsubscribers.forEach((stop) => stop());
    window.clearInterval(retry);
    window.removeEventListener('koten:record-saved', onRecordSaved);
    window.removeEventListener('koten:settings-saved', onSettingsSaved);
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
    db?.close();
  };
}
