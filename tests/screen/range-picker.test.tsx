import { render } from 'preact';
import { act } from 'preact/test-utils';
import { expect, test } from 'vitest';
import { RangePicker } from '../../packages/hyakunin/src/ui/screens/RangePicker.tsx';

test('range-picker: returns the chosen range and random order', async () => { let result: unknown; const root = document.createElement('div'); document.body.append(root); await act(() => { render(<RangePicker entry="quick" range={{ from: 10, to: 20 }} order="number" onBack={() => {}} onStart={(range, order) => { result = { range, order }; }} />, root); }); await act(() => { Array.from(root.querySelectorAll('button')).find((button) => button.textContent === 'ランダム')!.click(); }); await act(() => { root.querySelector('button.primary')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); expect(result).toEqual({ range: { from: 10, to: 20 }, order: 'random' }); root.remove(); });

test('range-picker: shows a compact numbered range and explains paper grading after the range', async () => {
  const root = document.createElement('div'); document.body.append(root);
  await act(() => { render(<RangePicker entry="exam" range={{ from: 10, to: 20 }} order="number" onBack={() => {}} onStart={() => {}} />, root); });
  expect(root.textContent).toContain('範囲を確認する');
  expect(root.textContent).toContain('10番〜20番');
  await act(() => { Array.from(root.querySelectorAll('button')).find((button) => button.textContent === '紙に書く')!.click(); });
  expect(root.textContent).toContain('範囲を解き終えたあとに、正答を見て自分で採点します。');
  root.remove();
});

test('range-picker: 範囲入力は既定で出ない', async () => {
  const root = document.createElement('div'); document.body.append(root);
  await act(() => { render(<RangePicker entry="exam" range={{ from: 10, to: 20 }} order="number" onBack={() => {}} onStart={() => {}} />, root); });
  expect(root.querySelectorAll('input[type="number"]')).toHaveLength(0);
  root.remove();
});

test('range-picker: 変更すると範囲入力が二つ出る', async () => {
  const root = document.createElement('div'); document.body.append(root);
  await act(() => { render(<RangePicker entry="exam" range={{ from: 10, to: 20 }} order="number" onBack={() => {}} onStart={() => {}} />, root); });
  await act(() => { Array.from(root.querySelectorAll('button')).find((button) => button.textContent === '変更する')!.click(); });
  expect(root.querySelectorAll('input[type="number"]')).toHaveLength(2);
  root.remove();
});

test('range-picker: 変更した範囲を開始時に渡す', async () => {
  const root = document.createElement('div'); document.body.append(root);
  let received: unknown;
  await act(() => { render(<RangePicker entry="exam" range={{ from: 10, to: 20 }} order="number" onBack={() => {}} onStart={(range) => { received = range; }} />, root); });
  await act(() => { Array.from(root.querySelectorAll('button')).find((button) => button.textContent === '変更する')!.click(); });
  const [from, to] = Array.from(root.querySelectorAll<HTMLInputElement>('input[type="number"]'));
  await act(() => { from.value = '31'; from.dispatchEvent(new InputEvent('input', { bubbles: true, data: '31', inputType: 'insertText' })); to.value = '37'; to.dispatchEvent(new InputEvent('input', { bubbles: true, data: '37', inputType: 'insertText' })); });
  await act(() => { root.querySelector('button.primary')!.click(); });
  expect(received).toEqual({ from: 31, to: 37 });
  root.remove();
});

test('range-picker: 歌の順番にラジオは無い', async () => {
  const root = document.createElement('div'); document.body.append(root);
  await act(() => { render(<RangePicker entry="exam" range={{ from: 10, to: 20 }} order="number" onBack={() => {}} onStart={() => {}} />, root); });
  expect(root.querySelectorAll('input[type="radio"]')).toHaveLength(0);
  root.remove();
});

test('range-picker: 作者問題にチェックボックスは無い', async () => {
  const root = document.createElement('div'); document.body.append(root);
  await act(() => { render(<RangePicker entry="exam" range={{ from: 10, to: 20 }} order="number" onBack={() => {}} onStart={() => {}} />, root); });
  expect(root.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
  root.remove();
});

test('range-picker: 本番の設定は見出しと二択ボタンの三組である', async () => {
  const root = document.createElement('div'); document.body.append(root);
  await act(() => { render(<RangePicker entry="exam" range={{ from: 10, to: 20 }} order="number" onBack={() => {}} onStart={() => {}} />, root); });
  expect(root.querySelectorAll('input[type="radio"], input[type="checkbox"]')).toHaveLength(0);
  expect(root.querySelectorAll('.answer-mode')).toHaveLength(3);
  root.remove();
});

test('range-picker: 作者問題の設定は本番だけにあり、既定で出す', async () => {
  const root = document.createElement('div'); document.body.append(root);
  let includeAuthors: boolean | undefined;
  await act(() => { render(<RangePicker entry="exam" range={{ from: 10, to: 20 }} order="number" onBack={() => {}} onStart={(_range, _order, _mode, value) => { includeAuthors = value; }} />, root); });
  const absent = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent === 'なし');
  expect(Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent === 'あり')?.getAttribute('aria-pressed')).toBe('true');
  await act(() => { absent!.click(); });
  await act(() => { root.querySelector('button.primary')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
  expect(includeAuthors).toBe(false);
  for (const entry of ['quick', 'view', 'learn', 'author'] as const) {
    render(null, root);
    await act(() => { render(<RangePicker entry={entry} range={{ from: 10, to: 20 }} order="number" onBack={() => {}} onStart={() => {}} />, root); });
    expect(Array.from(root.querySelectorAll('button')).some((button) => button.textContent === 'あり' || button.textContent === 'なし'), `${entry} に作者設定を出さない`).toBe(false);
  }
  root.remove();
});
