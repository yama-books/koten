import { render } from 'preact';
import { act } from 'preact/test-utils';
import { expect, test } from 'vitest';
import { RangePicker } from '../../packages/hyakunin/src/ui/screens/RangePicker.tsx';

test('range-picker: returns the chosen range and random order', async () => { let result: unknown; const root = document.createElement('div'); document.body.append(root); await act(() => { render(<RangePicker entry="quick" range={{ from: 10, to: 20 }} order="number" onBack={() => {}} onStart={(range, order) => { result = { range, order }; }} />, root); }); const radios = root.querySelectorAll('input[type="radio"]'); await act(() => { radios[1].dispatchEvent(new MouseEvent('click', { bubbles: true })); }); await act(() => { root.querySelector('button.primary')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); expect(result).toEqual({ range: { from: 10, to: 20 }, order: 'random' }); root.remove(); });

test('range-picker: shows a compact numbered range and explains paper grading per question', async () => {
  const root = document.createElement('div'); document.body.append(root);
  await act(() => { render(<RangePicker entry="exam" range={{ from: 10, to: 20 }} order="number" onBack={() => {}} onStart={() => {}} />, root); });
  expect(root.textContent).toContain('範囲を確認する');
  expect(root.textContent).toContain('10番〜20番');
  await act(() => { Array.from(root.querySelectorAll('button')).find((button) => button.textContent === '紙に書く')!.click(); });
  expect(root.textContent).toContain('1問ずつ答えを開き、自分で採点します。');
  expect(root.textContent).not.toContain('最後に答えを開き');
  root.remove();
});
