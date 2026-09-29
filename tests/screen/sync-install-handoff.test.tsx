import { afterEach, expect, test, vi } from 'vitest';
import { readInstallHandoff, writeInstallHandoff } from '../../packages/hyakunin/src/sync/install-handoff.ts';
import { initialSettings, loadUserSettings } from '../../packages/hyakunin/src/ui/settings.ts';
import type { UserSettings } from '../../packages/shared/src/domain/event.ts';

afterEach(() => { writeInstallHandoff(null); vi.unstubAllGlobals(); });
const code = 'abcdefghjkmnpqrs';
const standalone = () => vi.stubGlobal('matchMedia', () => ({ matches: true }));

test('同期→追加: コピーされたCookieから新しい保存領域に同期設定を復元し、記録を再取得する', async () => {
  writeInstallHandoff({ ...initialSettings, syncEnabled: true, syncCode: code });
  expect(readInstallHandoff()).toBeNull();
  standalone();
  const save = vi.fn(async () => ({ eventId: 'settings' }));
  const restored = await loadUserSettings({ loadSettings: async () => null, saveSettings: save });
  expect(restored.syncCode).toBe(code);
  expect(restored.syncEnabled).toBe(true);
  expect(restored.syncJoinRequest).toBeTruthy();
  expect(save).toHaveBeenCalledWith(restored);
  expect(readInstallHandoff()).toBeNull();
});

test('追加→同期: 保存済みの同期先・設定をCookieで上書きしない', async () => {
  writeInstallHandoff({ ...initialSettings, syncEnabled: true, syncCode: code });
  standalone();
  const saved: UserSettings = { ...initialSettings, syncEnabled: true, syncCode: '23456789abcdefgh', grade: '中三' };
  const save = vi.fn(async () => ({ eventId: 'settings' }));
  expect(await loadUserSettings({ loadSettings: async () => saved, saveSettings: save })).toBe(saved);
  expect(save).not.toHaveBeenCalled();
  expect(readInstallHandoff()).toBeNull();
});

test('復元設定の保存失敗では引き継ぎCookieを失わず、再試行できる', async () => {
  writeInstallHandoff({ ...initialSettings, syncEnabled: true, syncCode: code });
  standalone();
  await loadUserSettings({ loadSettings: async () => null, saveSettings: async () => ({ reason: 'write-failed' }) });
  expect(readInstallHandoff()).toBe(code);
});

test('同期停止時は古い同期先の引き継ぎを解除する', () => {
  standalone();
  writeInstallHandoff({ ...initialSettings, syncEnabled: true, syncCode: code });
  expect(readInstallHandoff()).toBe(code);
  writeInstallHandoff({ ...initialSettings, syncEnabled: false });
  expect(readInstallHandoff()).toBeNull();
});
