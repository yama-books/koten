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
  expect(root.textContent).toContain('範囲を解き終えたあとに、正答を見て自己採点します。');
  root.remove();
});

test('074-5: 本番の説明は選んだ答え方のボタンと同じまとまりにあり、切替とともに動く', async () => {
  const root = document.createElement('div'); document.body.append(root);
  await act(() => { render(<RangePicker entry="exam" range={{ from: 10, to: 20 }} order="number" onBack={() => {}} onStart={() => {}} />, root); });
  const screen = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent === '画面で答える')!;
  const paper = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent === '紙に書く')!;
  expect(screen.parentElement?.className).toContain('practice-choice');
  expect(screen.parentElement?.textContent).toContain('まとめて自動採点します。');
  expect(paper.parentElement?.textContent).not.toContain('自己採点します。');
  await act(() => { paper.click(); });
  expect(paper.parentElement?.className).toContain('practice-choice');
  expect(paper.parentElement?.textContent).toContain('正答を見て自己採点します。');
  expect(screen.parentElement?.textContent).not.toContain('まとめて自動採点します。');
  root.remove();
});

test('074-6: 本番の問数は規則から表示し、自己採点の文言を厳密に保つ', async () => {
  const root = document.createElement('div'); document.body.append(root);
  await act(() => { render(<RangePicker entry="exam" range={{ from: 10, to: 20 }} order="number" onBack={() => {}} onStart={() => {}} />, root); });
  expect(root.textContent).toContain('この範囲では 10問 出題します。');
  await act(() => { Array.from(root.querySelectorAll('button')).find((button) => button.textContent === '紙に書く')!.click(); });
  expect(root.textContent).toContain('範囲を解き終えたあとに、正答を見て自己採点します。');
  expect(root.textContent).not.toContain('正答を見て自分で採点します。');
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

/**
 * 2026-09-15・発注086。**難度の手動調整**（D-16「手動が勝つ」・D-17「挑戦は自由」）。
 *
 * **出題中ではなく、始める前に置く。** 解いている途中で難度が変わると、
 * その回の記録の意味が揺れる。
 */
const easeButton = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent === 'やさしくする')!;
const hardenButton = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent === 'むずかしくする')!;

const autoButton = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent === 'おまかせ')!;

test('086: 段の番号も名前も出さない（依頼者・2026-09-15）', async () => {
  // **歌ごとに段が違う**ので、範囲に対して 1 つの段を名乗ると実際の出題と食い違う。
  // 習熟度と二重の指標にもなる。出せるのは向きだけである。
  const root = document.createElement('div'); document.body.append(root);
  await act(() => { render(<RangePicker entry="learn" range={{ from: 1, to: 20 }} order="number" autoRung={3} onBack={() => {}} onStart={() => {}} />, root); });
  expect(root.querySelector('.rung-level'), '段の番号を出している').toBeNull();
  expect(root.querySelector('.rung-badge'), '段の名前を出している').toBeNull();
  expect(root.textContent).not.toContain('いまは');
  expect(root.textContent).not.toContain('段です');
  root.remove();
});

test('086: 難しさの操作は 3 つのボタンだけである', async () => {
  const root = document.createElement('div'); document.body.append(root);
  await act(() => { render(<RangePicker entry="learn" range={{ from: 1, to: 20 }} order="number" autoRung={3} onBack={() => {}} onStart={() => {}} />, root); });
  const labels = Array.from(root.querySelectorAll('.rung-adjust button')).map((button) => button.textContent);
  expect(labels).toEqual(['やさしくする', 'むずかしくする', 'おまかせ']);
  root.remove();
});

test('086: 段が習熟度で開くことを案内する', async () => {
  const root = document.createElement('div'); document.body.append(root);
  await act(() => { render(<RangePicker entry="learn" range={{ from: 1, to: 20 }} order="number" autoRung={3} onBack={() => {}} onStart={() => {}} />, root); });
  expect(root.textContent).toContain('習熟度が上がると、より難度の高い問題を選べるようになります');
  root.remove();
});

test('086: 「おまかせ」で自動の位置へ戻る', async () => {
  const root = document.createElement('div'); document.body.append(root);
  await act(() => { render(<RangePicker entry="learn" range={{ from: 1, to: 20 }} order="number" autoRung={3} onBack={() => {}} onStart={() => {}} />, root); });
  expect(autoButton(root).disabled, '自動の位置に居るのに押せる').toBe(true);
  await act(() => { easeButton(root).click(); });
  await act(() => { easeButton(root).click(); });
  expect(easeButton(root).disabled, '一番下まで下がっていない').toBe(true);
  expect(autoButton(root).disabled).toBe(false);
  await act(() => { autoButton(root).click(); });
  expect(easeButton(root).disabled, '自動へ戻っていない').toBe(false);
  expect(autoButton(root).disabled).toBe(true);
  expect(root.textContent, '戻ったのに調整中の表示が残っている').not.toContain('いつもより');
  root.remove();
});

test('086: 一番下の段に居ると「やさしくする」が押せない', async () => {
  const root = document.createElement('div'); document.body.append(root);
  await act(() => { render(<RangePicker entry="learn" range={{ from: 1, to: 20 }} order="number" autoRung={1} onBack={() => {}} onStart={() => {}} />, root); });
  expect(easeButton(root).disabled).toBe(true);
  expect(hardenButton(root).disabled, '自動の位置では挑戦できるはずである（D-17）').toBe(false);
  root.remove();
});

test('086: 2 段上まで上げると「むずかしくする」が押せない', async () => {
  const root = document.createElement('div'); document.body.append(root);
  await act(() => { render(<RangePicker entry="learn" range={{ from: 1, to: 20 }} order="number" autoRung={3} onBack={() => {}} onStart={() => {}} />, root); });
  await act(() => { hardenButton(root).click(); });
  expect(hardenButton(root).disabled).toBe(false);
  await act(() => { hardenButton(root).click(); });
  expect(root.textContent, 'むずかしくした表示が出ていない').toContain('むずかしく');
  expect(hardenButton(root).disabled, '2 段上を超えて上げられる').toBe(true);
  root.remove();
});

test('086: 自動の位置から離れていることが分かる', async () => {
  const root = document.createElement('div'); document.body.append(root);
  await act(() => { render(<RangePicker entry="learn" range={{ from: 1, to: 20 }} order="number" autoRung={3} onBack={() => {}} onStart={() => {}} />, root); });
  expect(root.textContent, '自動の位置に居るのに離れたと言っている').not.toContain('いつもより');
  await act(() => { easeButton(root).click(); });
  expect(root.textContent).toContain('いつもよりやさしく');
  expect(root.textContent, '戻し方が分からない').toContain('おまかせ');
  root.remove();
});

test('086: 段8から下げたときは、完全制覇の印が立たないことに触れる', async () => {
  const root = document.createElement('div'); document.body.append(root);
  await act(() => { render(<RangePicker entry="learn" range={{ from: 1, to: 20 }} order="number" autoRung={8} onBack={() => {}} onStart={() => {}} />, root); });
  expect(root.textContent, '下げる前から印の話をしている').not.toContain('完全制覇');
  await act(() => { easeButton(root).click(); });
  expect(root.textContent).toContain('完全制覇');
  root.remove();
});

test('086: 調整した段数を開始時に渡す', async () => {
  const root = document.createElement('div'); document.body.append(root);
  let received: number | undefined;
  await act(() => { render(<RangePicker entry="learn" range={{ from: 1, to: 20 }} order="number" autoRung={3} onBack={() => {}} onStart={(_range, _order, _mode, _authors, adjust) => { received = adjust; }} />, root); });
  await act(() => { easeButton(root).click(); });
  await act(() => { root.querySelector('button.primary')!.click(); });
  expect(received, '＋が易しく、−が難しい').toBe(1);
  root.remove();
});

test('086: 自動の位置が分からないうちは難しさの操作を出さない', async () => {
  // **既定値で描かない。** 記録を読む前に「いまは段3」と言うと、それが嘘になる。
  const root = document.createElement('div'); document.body.append(root);
  await act(() => { render(<RangePicker entry="learn" range={{ from: 1, to: 20 }} order="number" onBack={() => {}} onStart={() => {}} />, root); });
  expect(Array.from(root.querySelectorAll('button')).some((button) => button.textContent === 'やさしくする')).toBe(false);
  root.remove();
});

test('086: 難しさの操作は本番の三組に数えない', async () => {
  // 既存の釘（設定は見出しと二択ボタンの三組）を、難しさの節が黙って崩さないこと。
  const root = document.createElement('div'); document.body.append(root);
  await act(() => { render(<RangePicker entry="exam" range={{ from: 1, to: 20 }} order="number" autoRung={3} onBack={() => {}} onStart={() => {}} />, root); });
  expect(Array.from(root.querySelectorAll('button')).some((button) => button.textContent === 'やさしくする')).toBe(true);
  expect(root.querySelectorAll('.answer-mode')).toHaveLength(3);
  root.remove();
});
