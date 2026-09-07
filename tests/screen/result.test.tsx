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
  retryQuestionIds: ['p003-ku1', 'p005-ku2'],
  recommendation: { poemId: 'p004', tier: 4, reason: 'まだ確認していない歌です', percent: 0 },
};

function mount(result: SessionResult = base, handlers = { onRetryWeak: (_questionIds: readonly string[]) => {}, onRetrySame: () => {}, onHome: () => {} }) {
  root = document.createElement('div');
  document.body.append(root);
  render(<Result result={result} {...handlers} />, root);
  return root;
}

afterEach(() => { if (root) { render(null, root); root.remove(); root = undefined; } });

test('result: 対象範囲と問題数を表示する', () => { const view = mount(); expect(view.textContent).toContain('対象範囲: 3番〜5番'); expect(view.textContent).toContain('問題数: 4問'); });
test('result: 内訳を表示する', () => { const view = mount(); for (const text of ['閲覧1問', '正答1問', '△ 仮名遣い確認1問', '誤答1問']) expect(view.textContent).toContain(text); });
// 「要確認」は読み未確認の内部区分で、学習者には誤答の意味に読まれる（実機確認・2026-09-05）。内部の5区分は維持し、表示から落とす。
test('result: 内訳に「要確認」を出さない', () => { const view = mount({ ...base, breakdown: { ...base.breakdown, needsReview: 3 } }); expect(view.textContent).not.toContain('要確認'); });
test('result: 全問正解の回に花丸画像が出る', () => { const view = mount({ ...base, allCorrect: true }); expect(view.textContent).toContain('全問花丸'); expect(view.querySelector('img[src*="perfect-hanamaru"]')).not.toBeNull(); });
test('result: 部分正解を含む回に花丸が出ない', () => { const view = mount(); expect(view.textContent).not.toContain('全問花丸'); });
test('result: 変化がある歌を表に表示する', () => { const view = mount(); expect(view.textContent).toContain('3'); expect(view.textContent).not.toContain('p003'); expect(view.textContent).toContain('12%'); expect(view.textContent).toContain('21%'); });
test('result: 変化がないとき表の代わりに文言を表示する', () => { const view = mount({ ...base, changes: [] }); expect(view.textContent).toContain('変化はありません'); expect(view.querySelector('table')).toBeNull(); });
test('result: 該当なしのとき提案を出さない', () => { const view = mount({ ...base, recommendation: undefined }); expect(view.textContent).not.toContain('次に確認する'); });
// 発注075 §3-3: おすすめは歌番号と理由だけにし、習熟度%を併記しない。数値は詳細の中で読む。
test('result: 次のおすすめ一件を理由とともに表示する', () => { const view = mount(); expect(view.textContent).toContain('4番'); expect(view.textContent).toContain('まだ確認していない歌です'); });
test('result: 未着手は0%と書かない', () => { const view = mount(); const item = Array.from(view.querySelectorAll('li')).find((node) => node.textContent?.includes('4番'))!; expect(item.textContent).toContain('未着手'); expect(item.textContent).not.toContain('0%'); });
test('result: 学習済みで0%の首は0%と書く', () => { const view = mount(); const item = Array.from(view.querySelectorAll('li')).find((node) => node.textContent?.includes('5番'))!; expect(item.textContent).toContain('習熟度 0%'); });
test('result: 作者未確認を作者イベントがない首にだけ併記する', () => { const view = mount(); expect(view.textContent).toContain('作者 未確認'); const answered = Array.from(view.querySelectorAll('li')).find((node) => node.textContent?.includes('5番'))!; expect(answered.textContent).not.toContain('作者 未確認'); });
test('result: 学習済みの首は色付きメーターと数値を表示する', () => { const view = mount(); const item = Array.from(view.querySelectorAll('li')).find((node) => node.textContent?.includes('3番'))!; expect(item.className).toContain('result-poem--red'); expect(item.querySelector('[role="meter"]')?.getAttribute('aria-valuenow')).toBe('21'); expect(item.textContent).toContain('習熟度 21%'); });
test('result: まちがえた歌だけをもう一度に対象の問題IDを渡す', async () => { let received: readonly string[] = []; const view = mount(base, { onRetryWeak: (questionIds) => { received = questionIds; }, onRetrySame: () => {}, onHome: () => {} }); await act(() => { Array.from(view.querySelectorAll('button')).find((button) => button.textContent === 'まちがえた歌だけをもう一度')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); }); expect(received).toEqual(['p003-ku1', 'p005-ku2']); });
test('result: 要確認がないとき再確認ボタンを出さない', () => { const view = mount({ ...base, retryCardNumbers: [], retryQuestionIds: [] }); expect(view.textContent).not.toContain('まちがえた歌だけをもう一度'); });
test('result: 首は残っていても再出題する問題がなければボタンを出さない', () => { const view = mount({ ...base, retryCardNumbers: [3, 5], retryQuestionIds: [] }); expect(view.textContent).not.toContain('まちがえた歌だけをもう一度'); });
test('result: 再確認の文言は歌だけに限定する', () => { const view = mount(); expect(view.textContent).toContain('まちがえた歌だけをもう一度'); expect(view.textContent).not.toContain('要確認の首をふくむ範囲をもう一度'); });
test('result: 同じ範囲をもう一度は常に出す', () => { const view = mount({ ...base, retryCardNumbers: [] }); expect(view.textContent).toContain('同じ範囲をもう一度'); });
// 074 工程13 の「同じ空欄」は作者問題を含む再確認の説明として狭い（発注075 §1）。
// 件数と問題IDの規則は 074 のまま。文言だけを「同じ出題内容」へ置き換え、二件数の弁別も残す。
test('074-13: 再確認の説明は同じ出題内容と実際の問題数を、異なる二件数で示す', () => {
  const one = mount({ ...base, retryQuestionIds: ['p003-ku1'] });
  expect(one.textContent).toContain('同じ出題内容で1問くりかえし練習します。');
  render(null, one); one.remove(); root = undefined;
  const three = mount({ ...base, retryQuestionIds: ['p003-ku1', 'p004-ku2', 'p005-ku3'] });
  expect(three.textContent).toContain('同じ出題内容で3問くりかえし練習します。');
});
test('result: 再確認は渡された飛び飛びの問題を順序どおり保つ', async () => { let received: readonly string[] = []; const view = mount({ ...base, retryQuestionIds: ['p005-ku2', 'p003-ku1'] }, { onRetryWeak: (questionIds) => { received = questionIds; }, onRetrySame: () => {}, onHome: () => {} }); await act(() => { Array.from(view.querySelectorAll('button')).find((button) => button.textContent === 'まちがえた歌だけをもう一度')!.click(); }); expect(received).toEqual(['p005-ku2', 'p003-ku1']); });
test('result: 再確認ボタンは一つだけ表示する', () => { const view = mount(); expect(Array.from(view.querySelectorAll('button')).filter((button) => button.textContent === 'まちがえた歌だけをもう一度')).toHaveLength(1); });
test('result: 各操作の説明は同じまとまりに入る', () => { const view = mount(); for (const button of Array.from(view.querySelectorAll('.result-actions button'))) expect(button.parentElement?.className).toContain('practice-choice'); expect(view.textContent).toContain('同じ範囲でもう一度出題します。'); });

// --- 発注057 R5：変化表の％だけを小数第1位まで ---
test('result: 変化表の長い小数を小数第1位まで丸める', () => {
  const view = mount({ ...base, changes: [{ poemId: 'p003', before: 0, after: 18.400000000000002 }] });
  const cells = Array.from(view.querySelectorAll('tbody td')).map((cell) => cell.textContent);
  expect(cells).toEqual(['0%', '18.4%']);
  expect(view.textContent).not.toContain('18.400000000000002');
});

test('result: 変化表は整数に .0 を足さず端点をそのまま出す', () => {
  const view = mount({ ...base, changes: [{ poemId: 'p003', before: 20, after: 100 }, { poemId: 'p004', before: 0.8, after: 0 }] });
  const cells = Array.from(view.querySelectorAll('tbody td')).map((cell) => cell.textContent);
  expect(cells).toEqual(['20%', '100%', '0.8%', '0%']);
});

// --- 発注075：結果より先に再練習へ進める ---

/** 文書順の位置。`compareDocumentPosition` は前後しか返さないので、走査して番号を振る。 */
function documentOrder(view: HTMLElement, nodes: (Element | null | undefined)[]): number[] {
  const all = Array.from(view.querySelectorAll('*'));
  return nodes.map((node) => { const index = node ? all.indexOf(node) : -1; if (index < 0) throw new Error('要素が見つかりません'); return index; });
}
const actionsOf = (view: HTMLElement) => view.querySelector('.result-actions') as HTMLElement;
const detailsOf = (view: HTMLElement) => view.querySelector('details.result-details') as HTMLDetailsElement;
const buttonNamed = (view: HTMLElement, name: string) => Array.from(view.querySelectorAll('button')).find((button) => button.textContent === name);

test('075: 次の操作は内訳の後・学習記録の詳細の前に置く', () => {
  const view = mount();
  const [summary, breakdown, actions, recommend, details] = documentOrder(view, [
    view.querySelector('.result-summary'), view.querySelector('.result-breakdown'), actionsOf(view),
    view.querySelector('#recommend-heading'), detailsOf(view),
  ]);
  expect(summary).toBeLessThan(breakdown);
  expect(breakdown).toBeLessThan(actions);
  expect(actions).toBeLessThan(recommend);
  expect(recommend).toBeLessThan(details);
});

test('075: 再練習の操作は詳細の外にある', () => {
  const view = mount();
  const details = detailsOf(view);
  for (const name of ['まちがえた歌だけをもう一度', '同じ範囲をもう一度']) {
    const button = buttonNamed(view, name)!;
    expect(button, name).toBeTruthy();
    expect(details.contains(button), `${name} が詳細の中にある`).toBe(false);
  }
});

test('075: 詳細は初期状態で閉じている', () => {
  const view = mount();
  const details = detailsOf(view);
  expect(details.open).toBe(false);
  expect(details.hasAttribute('open')).toBe(false);
  expect(details.querySelector('summary')?.textContent).toBe('学習記録の詳細');
});

test('075: 詳細は開閉できて、開いた後も操作が残る', () => {
  const view = mount();
  const details = detailsOf(view);
  details.open = true;
  expect(buttonNamed(view, '同じ範囲をもう一度')).toBeTruthy();
  expect(details.contains(buttonNamed(view, '同じ範囲をもう一度')!)).toBe(false);
});

test('075: 詳細の中は注記・習熟度の変化・歌ごとの状態の順に持つ', () => {
  const view = mount();
  const details = detailsOf(view);
  expect(details.textContent).toContain('習熟度は、これまでの学習記録をもとにした目安です。今回の正答率ではありません。');
  const [note, changes, poems] = documentOrder(view, [
    details.querySelector('.result-details__note'), view.querySelector('#changes-heading'), view.querySelector('#poems-heading'),
  ]);
  expect(note).toBeLessThan(changes);
  expect(changes).toBeLessThan(poems);
  expect(details.querySelector('#changes-heading')).not.toBeNull();
  expect(details.querySelector('#poems-heading')).not.toBeNull();
  expect(details.querySelector('table tbody td')?.textContent).toBe('12%');
  expect(details.querySelectorAll('.result-poems li')).toHaveLength(3);
});

test('075: 詳細は一段だけで、入れ子の開閉を持たない', () => {
  const view = mount();
  expect(view.querySelectorAll('details')).toHaveLength(1);
});

test('075: 操作をページ末尾へ複製しない', () => {
  const view = mount();
  expect(Array.from(view.querySelectorAll('button')).filter((button) => button.textContent === '同じ範囲をもう一度')).toHaveLength(1);
  expect(view.querySelectorAll('.result-actions')).toHaveLength(1);
});

test('075: 詳細を閉じたまま、キーボードで両方の再練習へ到達できる', () => {
  const view = mount();
  const focusables = Array.from(view.querySelectorAll<HTMLElement>('button, summary, [tabindex]'))
    .filter((node) => !node.hasAttribute('disabled') && node.getAttribute('tabindex') !== '-1' && !node.closest('[aria-hidden="true"]'));
  const names = focusables.map((node) => node.textContent);
  expect(names).toContain('まちがえた歌だけをもう一度');
  expect(names).toContain('同じ範囲をもう一度');
  // 操作可能な要素を `aria-hidden` で隠さない。
  for (const node of focusables) expect(node.closest('[aria-hidden="true"]')).toBeNull();
});

test('075: おすすめは「○番」で示し、習熟度%を併記しない', () => {
  const view = mount();
  const section = view.querySelector('.result-recommend') as HTMLElement;
  expect(section.textContent).toContain('4番');
  expect(section.textContent).toContain('まだ確認していない歌です');
  expect(section.textContent).not.toContain('%');
  expect(section.textContent).not.toContain('習熟度');
});

test('075: 再確認の説明は答えを見た問題も含むと述べ、実際の問題数を出す', () => {
  const one = mount({ ...base, retryQuestionIds: ['p003-ku1'] });
  expect(one.textContent).toContain('答えを見た問題・正答にならなかった問題を、同じ出題内容で1問くりかえし練習します。');
  expect(one.textContent).not.toContain('同じ空欄');
  render(null, one); one.remove(); root = undefined;
  const three = mount({ ...base, retryQuestionIds: ['p003-ku1', 'p004-ku2', 'p005-ku3'] });
  expect(three.textContent).toContain('答えを見た問題・正答にならなかった問題を、同じ出題内容で3問くりかえし練習します。');
});

test('075: 再確認が0問でも同じ範囲の操作は詳細の前に残る', () => {
  const view = mount({ ...base, retryQuestionIds: [] });
  const [actions, details] = documentOrder(view, [actionsOf(view), detailsOf(view)]);
  expect(actions).toBeLessThan(details);
  expect(buttonNamed(view, '同じ範囲をもう一度')?.className).toContain('primary');
});

test('075: 常時表示部分に全体平均や達成段階を足さない', () => {
  const view = mount();
  const details = detailsOf(view);
  const always = Array.from(view.querySelectorAll('*')).filter((node) => !details.contains(node) && node !== details);
  // 葉の判定は element の子で見る。childNodes だと文字だけの <p> も 1 子となり、走査から漏れる。
  const text = always.map((node) => node.children.length === 0 ? node.textContent : '').join('');
  for (const banned of ['全体平均', '連続', '達成', '順位', 'ランク']) expect(text).not.toContain(banned);
});
