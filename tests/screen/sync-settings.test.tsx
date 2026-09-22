import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, expect, test, vi } from 'vitest';
import { SyncSettings } from '../../packages/hyakunin/src/ui/screens/SyncSettings.tsx';
import { initialSettings } from '../../packages/hyakunin/src/ui/settings.ts';
import type { UserSettings } from '../../packages/shared/src/domain/event.ts';

vi.mock('@koten/shared/sync/client', () => ({ readSettings: async () => ({ enc: 'enc:fixture' }) }));
vi.mock('@koten/shared/sync/crypto', async (importOriginal) => ({
  ...await importOriginal<object>(),
  houseIdFor: async () => 'a'.repeat(64),
  decryptField: async () => ({ reading: 'no-ruby', writing: 'vertical', order: 'number', soundEnabled: false }),
}));

let root: HTMLDivElement | null = null;
afterEach(() => { if (root) { render(null, root); root.remove(); root = null; } });
const button = (text: string) => Array.from(root!.querySelectorAll('button')).find((item) => item.textContent === text);
const mount = (settings: UserSettings, onChange: (value: UserSettings) => Promise<boolean>) => {
  root = document.createElement('div');
  document.body.append(root);
  render(<SyncSettings settings={settings} status={settings.syncEnabled ? 'connected' : 'off'} onChange={onChange} onBack={() => {}} />, root);
};

test('招待の入力だけでは参加せず、既存の同期先を確認した後に明示的に確定する', async () => {
  const saved: UserSettings[] = [];
  mount(initialSettings, async (value) => { saved.push(value); return true; });
  // **招待欄を名指しで取る。** 端末名の入力も同じ `autocomplete` を持つため、
  // 属性だけで選ぶと先に現れる端末名の方を掴んでしまう（2026-09-22 に踏んだ）。
  const field = root!.querySelector<HTMLInputElement>('.sync-join-input')!;
  act(() => { field.value = 'abcdefghjkmnpqrs'; field.dispatchEvent(new Event('input', { bubbles: true })); });
  expect(saved).toHaveLength(0);
  await act(async () => { button('同期先を確認')!.click(); });
  await vi.waitFor(() => expect(root!.textContent).toContain('同期先を確認できました'));
  expect(button('確認して参加する')).toBeTruthy();
  expect(saved).toHaveLength(0);
  await act(async () => { button('確認して参加する')!.click(); });
  expect(saved).toHaveLength(1);
  expect(saved[0].syncCode).toBe('abcdefghjkmnpqrs');
  expect(saved[0].syncEnabled).toBe(true);
});

test('停止は確認を挟み、記録を残して合言葉だけ外す', async () => {
  const saved: UserSettings[] = [];
  mount({ ...initialSettings, syncCode: 'abcdefghjkmnpqrs', syncEnabled: true }, async (value) => { saved.push(value); return true; });
  act(() => { button('同期を停止')!.click(); });
  expect(saved).toHaveLength(0);
  await act(async () => { button('停止する')!.click(); });
  expect(saved).toHaveLength(1);
  expect(saved[0].syncEnabled).toBe(false);
  expect(saved[0].syncCode).toBeUndefined();
  expect(saved[0].reading).toBe(initialSettings.reading);
});

// ---- 端末名（依頼者・2026-09-22） ----

test('端末名は推測を初期値に出し、作成時に一緒に保存する', () => {
  // **機種名は取れない。** 推測を初期値として出し、利用者が直せる形にしてある。
  const saved: UserSettings[] = [];
  mount(initialSettings, async (value) => { saved.push(value); return true; });
  const field = root!.querySelector<HTMLInputElement>('.sync-device-name input')!;
  expect(field, '端末名の欄が無い').toBeTruthy();
  expect(field.value.length, '初期値が空である').toBeGreaterThan(0);
  expect(root!.querySelector('.sync-device-name')?.textContent).toContain('端末名（任意・共有先端末からの確認用）');
  act(() => { field.value = 'わたしのスマホ'; field.dispatchEvent(new Event('input', { bubbles: true })); });
  act(() => { button('新しい同期グループを作る')!.click(); });
  expect(saved).toHaveLength(1);
  expect(saved[0].syncDeviceName).toBe('わたしのスマホ');
});

test('端末名が空なら名前なしで作る', () => {
  const saved: UserSettings[] = [];
  mount(initialSettings, async (value) => { saved.push(value); return true; });
  const field = root!.querySelector<HTMLInputElement>('.sync-device-name input')!;
  act(() => { field.value = '   '; field.dispatchEvent(new Event('input', { bubbles: true })); });
  act(() => { button('新しい同期グループを作る')!.click(); });
  expect(saved[0].syncDeviceName).toBeUndefined();
});
