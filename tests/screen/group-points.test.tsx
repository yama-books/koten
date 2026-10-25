import { afterEach, expect, test, vi } from 'vitest';
import { mountPoints } from '../../packages/shared/src/sync/points-view.ts';
import { fetchPoints } from '../../packages/shared/src/sync/points-client.ts';
vi.mock('../../packages/shared/src/sync/points-client.ts', () => ({ fetchPoints: vi.fn() }));
const cleanups: Array<() => void> = [];
afterEach(() => { cleanups.splice(0).forEach(fn => fn()); document.body.replaceChildren(); vi.resetAllMocks(); });
test('group total shows missing apps as unknown, sums known entries, and clears on stop', async () => {
  vi.mocked(fetchPoints).mockImplementation(async (_code, app) => ({ points: app === 'conj' ? 20 : null }));
  const target = document.createElement('div'); document.body.append(target);
  const view = mountPoints(target, 'hyakunin', async () => 7); cleanups.push(view.dispose);
  expect(target.hidden).toBe(true); view.select('synthetic-a');
  await vi.waitFor(() => expect(target.querySelector('[data-points-total]')?.textContent).toBe('27'));
  expect(target.textContent).toContain('確認できた合計');
  expect(target.querySelector('[data-points-app="vintage-kana"]')?.textContent).toBe('未確認');
  view.select(null); expect(target.hidden).toBe(true); expect(target.textContent).toBe('');
});
test('an unmounted view cannot clear or repaint a new group on the same element', async () => {
  let resolve!: (value: boolean) => void;
  const delayed = new Promise<boolean>(r => { resolve = r; });
  const target = document.createElement('div'); document.body.append(target);
  const old = mountPoints(target, 'hyakunin', async () => 100, () => delayed); old.select('synthetic-a');
  old.dispose();
  vi.mocked(fetchPoints).mockResolvedValue({ points: 2 });
  const next = mountPoints(target, 'hyakunin', async () => 3); cleanups.push(next.dispose); next.select('synthetic-b');
  await vi.waitFor(() => expect(target.querySelector('[data-points-total]')?.textContent).toBe('7'));
  resolve(false); await delayed; await Promise.resolve();
  expect(target.hidden).toBe(false); expect(target.querySelector('[data-points-total]')?.textContent).toBe('7');
});
