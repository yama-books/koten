import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, expect, test } from 'vitest';
import type { SessionResult } from '../../packages/hyakunin/src/domain/result.ts';
import { Result } from '../../packages/hyakunin/src/ui/screens/Result.tsx';

let root: HTMLDivElement | undefined;
const base: SessionResult = {
  range: { from: 3, to: 5 }, questionCount: 4,
  breakdown: { viewed: 1, correct: 1, partial: 1, needsReview: 0, incorrect: 1 },
  allCorrect: false,
  changes: [{ poemId: 'p003', before: 12, after: 21 }],
  poems: [
    { poemId: 'p003', cardNo: 3, kind: 'correct', percent: 21, color: 'red', untouched: false, authorUnconfirmed: true },
    { poemId: 'p004', cardNo: 4, kind: null, percent: 0, color: 'gray', untouched: true, authorUnconfirmed: true },
    { poemId: 'p005', cardNo: 5, kind: 'incorrect', percent: 0, color: 'red', untouched: false, authorUnconfirmed: false },
  ],
  retryCardNumbers: [3, 5],
  recommendation: { poemId: 'p004', tier: 4, reason: 'まだ確認していない歌です', percent: 0 },
};

function mount(result: SessionResult = base, handlers = { onRetryWeak: (_cards: readonly number[]) => {}, onRetrySame: () => {}, onHome: () => {} }) {
  root = document.createElement('div');
  document.body.append(root);
  render(<Result result={result} {...handlers} />, root);
  return root;
}

afterEach(() => { if (root) { render(null, root); root.remove(); root = undefined; } });

test('result: 対象範囲と問題数を表示する', () => { const view = mount(); expect(view.textContent).toContain('対象範囲: 3番〜5番'); expect(view.textContent).toContain('問題数: 4問'); });
test('result: 5区分の内訳を表示する', () => { const view = mount(); for (const text of ['閲覧1問', '正答1問', '部分正解1問', '要確認0問', '誤答1問']) expect(view.textContent).toContain(text); });
test('result: 全問正解の回に花丸が出る', () => { const view = mount({ ...base, allCorrect: true }); expect(view.textContent).toContain('全問花丸'); });
test('result: 部分正解を含む回に花丸が出ない', () => { const view = mount(); expect(view.textContent).not.toContain('全問花丸'); });
test('result: 変化がある首を表に表示する', () => { const view = mount(); expect(view.textContent).toContain('p003'); expect(view.textContent).toContain('12%'); expect(view.textContent).toContain('21%'); });
test('result: 変化がないとき表の代わりに文言を表示する', () => { const view = mount({ ...base, changes: [] }); expect(view.textContent).toContain('変化はありません'); expect(view.querySelector('table')).toBeNull(); });
test('result: 該当なしのとき提案を出さない', () => { const view = mount({ ...base, recommendation: undefined }); expect(view.textContent).not.toContain('次に確認する'); });
test('result: 次のおすすめ一件を理由とともに表示する', () => { const view = mount(); expect(view.textContent).toContain('p004（習熟度 0%）'); expect(view.textContent).toContain('まだ確認していない歌です'); });
test('result: 未着手は0%と書かない', () => { const view = mount(); const item = Array.from(view.querySelectorAll('li')).find((node) => node.textContent?.includes('4番'))!; expect(item.textContent).toContain('未着手'); expect(item.textContent).not.toContain('0%'); });
test('result: 学習済みで0%の首は0%と書く', () => { const view = mount(); const item = Array.from(view.querySelectorAll('li')).find((node) => node.textContent?.includes('5番'))!; expect(item.textContent).toContain('習熟度 0%'); });
test('result: 作者未確認を併記する', () => { const view = mount(); expect(view.textContent).toContain('作者 未確認'); });
test('result: 要確認の範囲をもう一度に対象の首を渡す', async () => { let received: readonly number[] = []; const view = mount(base, { onRetryWeak: (cards) => { received = cards; }, onRetrySame: () => {}, onHome: () => {} }); await act(() => { Array.from(view.querySelectorAll('button')).find((button) => button.textContent === '要確認の首をふくむ範囲をもう一度')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); expect(received).toEqual([3, 5]); });
test('result: 要確認がないとき再確認の範囲ボタンを出さない', () => { const view = mount({ ...base, retryCardNumbers: [] }); expect(view.textContent).not.toContain('要確認の首をふくむ範囲をもう一度'); });
