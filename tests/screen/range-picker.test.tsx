import { render } from 'preact';
import { act } from 'preact/test-utils';
import { expect, test } from 'vitest';
import { RangePicker } from '../../packages/hyakunin/src/ui/screens/RangePicker.tsx';

test('range-picker: returns the chosen range and random order', async () => { let result: unknown; const root = document.createElement('div'); document.body.append(root); await act(() => { render(<RangePicker entry="quick" range={{ from: 10, to: 20 }} order="number" onBack={() => {}} onStart={(range, order) => { result = { range, order }; }} />, root); }); const radios = root.querySelectorAll('input[type="radio"]'); await act(() => { radios[1].dispatchEvent(new MouseEvent('click', { bubbles: true })); }); await act(() => { root.querySelector('button.primary')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); expect(result).toEqual({ range: { from: 10, to: 20 }, order: 'random' }); root.remove(); });

test('range-picker: shows a compact numbered range and explains paper grading after the range', async () => {
  const root = document.createElement('div'); document.body.append(root);
  await act(() => { render(<RangePicker entry="exam" range={{ from: 10, to: 20 }} order="number" onBack={() => {}} onStart={() => {}} />, root); });
  expect(root.textContent).toContain('範囲を確認する');
  expect(root.textContent).toContain('10番〜20番');
  await act(() => { Array.from(root.querySelectorAll('button')).find((button) => button.textContent === '紙に書く')!.click(); });
  expect(root.textContent).toContain('範囲を解き終えたあとに、正答を見て自分で採点します。');
  root.remove();
});

test('range-picker: 作者問題の設定は本番だけにあり、既定で出す', async () => {
  const root = document.createElement('div'); document.body.append(root);
  let includeAuthors: boolean | undefined;
  await act(() => { render(<RangePicker entry="exam" range={{ from: 10, to: 20 }} order="number" onBack={() => {}} onStart={(_range, _order, _mode, value) => { includeAuthors = value; }} />, root); });
  const checkbox = root.querySelector<HTMLInputElement>('input[type="checkbox"]');
  expect(checkbox?.checked).toBe(true);
  await act(() => { checkbox!.click(); });
  await act(() => { root.querySelector('button.primary')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
  expect(includeAuthors).toBe(false);
  for (const entry of ['quick', 'view', 'learn', 'author'] as const) {
    render(null, root);
    await act(() => { render(<RangePicker entry={entry} range={{ from: 10, to: 20 }} order="number" onBack={() => {}} onStart={() => {}} />, root); });
    expect(root.querySelector('input[type="checkbox"]'), `${entry} に作者設定を出さない`).toBeNull();
  }
  root.remove();
});
