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
  const field = root!.querySelector<HTMLInputElement>('input[autocomplete="off"]')!;
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
