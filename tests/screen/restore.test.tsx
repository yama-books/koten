import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, expect, test } from 'vitest';
import { createMemoryPort } from '../../packages/hyakunin/src/domain/ports.ts';
import { Home } from '../../packages/hyakunin/src/ui/screens/Home.tsx';

let root: HTMLDivElement | undefined;
const poems = [{ cardNo: 1, ku: ['a', 'b', 'c', 'd', 'e'], author: { canonical: '作者' }, reading: { status: 'confirmed', historical: { ku: ['a', 'b', 'c', 'd', 'e'], author: 'a' }, modern: { ku: ['a', 'b', 'c', 'd', 'e'], author: 'a' } } }] as never[];
const session = (extra = {}) => ({ sessionId: 'saved-session', product: 'hyakunin' as const, from: 1, to: 21, entry: 'quick' as const, order: 'number' as const, seed: 'saved-seed', startedOn: '2026-09-01', completed: false, questionCount: 2, ...extra });
const event = (cardNo: number) => ({ eventId: `e${cardNo}`, product: 'hyakunin' as const, poemId: `p${String(cardNo).padStart(3, '0')}`, sessionId: 'old', itemKey: 'x', kind: 'answer' as const, method: 'choice' as const, outcome: 'correct' as const, hintUsed: false, effectiveMethod: 'choice' as const, delta: 1, localDate: '2026-09-01', sameSessionRepeat: false, appVersion: 'x', dataVersion: 1, masteryRulesVersion: 1 });

async function mount(saved = session(), events: readonly ReturnType<typeof event>[] = [], onResume = () => {}) {
  const base = createMemoryPort();
  const port = { ...base, loadLastSession: async () => saved, listEvents: async () => events, saveLocalReport: async () => true };
  root = document.createElement('div'); document.body.append(root);
  await act(async () => { render(<Home port={port} poems={poems} questions={[]} onResume={onResume} />, root!); await new Promise((resolve) => setTimeout(resolve, 0)); });
  return root;
}
function click(text: string) { Array.from(root!.querySelectorAll('button')).find((button) => button.textContent === text)!.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
afterEach(() => { if (root) { render(null, root); root.remove(); root = undefined; } window.history.replaceState(null, '', '/'); });

test('restore: 未完了で残りがある回に選択肢を出す', async () => { const view = await mount(); expect(view.textContent).toContain('続きから始める'); expect(view.textContent).toContain('最初から選び直す'); });
test('restore: 復元は保存された回と次のまとまりを親へ渡す', async () => { let received: unknown[] = []; await mount(session(), Array.from({ length: 20 }, (_, index) => event(index + 1)), (...args) => { received = args; }); await act(() => click('続きから始める')); expect(received[0]).toMatchObject({ sessionId: 'saved-session', seed: 'saved-seed' }); expect(received[1]).toEqual([21]); });
test('restore: 保存された範囲をURLより優先する', async () => { window.history.replaceState(null, '', '/?from=50&to=60'); let cards: readonly number[] = []; await mount(session({ from: 1, to: 21 }), Array.from({ length: 20 }, (_, index) => event(index + 1)), (_session, received) => { cards = received; }); await act(() => click('続きから始める')); expect(cards).toEqual([21]); });
test('restore: 終わった回には誘いを出さない', async () => { const view = await mount(session({ completed: true })); expect(view.textContent).not.toContain('続きから始める'); });
test('restore: 残りがない回には誘いを出さない', async () => { const view = await mount(session(), Array.from({ length: 21 }, (_, index) => event(index + 1))); expect(view.textContent).not.toContain('続きから始める'); });
// 実機確認（2026-09-05）で「何を復元しようとしているのか分からない」と出た。入口名・範囲・分割の単位を名乗る。
test('restore: 誘いは入口名と範囲と20首ずつの分割を名乗る', async () => {
  const view = await mount(session({ to: 100 }), Array.from({ length: 79 }, (_, index) => event(index + 1)));
  expect(view.textContent).toContain('前回の「とりあえず始める」の続きがあります');
  expect(view.textContent).toContain('範囲 1番〜100番');
  expect(view.textContent).toContain('20首ずつ・全5セット');
  expect(view.textContent).toContain('次は 81番〜100番（20首）');
});
test('restore: 誘いは次に出すまとまりと範囲全体の進みを区別する', async () => {
  const view = await mount(session({ to: 100 }), Array.from({ length: 79 }, (_, index) => event(index + 1)));
  expect(view.textContent).toContain('次は 81番〜100番（20首）');
  expect(view.textContent).toContain('79首/100首');
});
test('restore: 誘いは順番を表す回目やセット目を出さない', async () => {
  const view = await mount(session({ to: 100 }), Array.from({ length: 79 }, (_, index) => event(index + 1)));
  expect(view.textContent).not.toMatch(/\d+(?:回目|セット目)/);
  expect(view.textContent).not.toContain('続きから始めると、');
});
test('restore: 復元しないは保存を書き換えず同じ起動では畳む', async () => { let resumed = false; const view = await mount(session(), [], () => { resumed = true; }); await act(() => click('最初から選び直す')); expect(view.textContent).not.toContain('続きから始める'); expect(resumed).toBe(false); });
test('restore: 復元しないは保存済みの回を書き換えない', async () => { const base = createMemoryPort(); const saved = session(); const writes: string[] = []; const port = { ...base, loadLastSession: async () => saved, listEvents: async () => [], saveSession: async (next: typeof saved) => { writes.push(next.sessionId); return base.saveSession(next); }, saveLocalReport: async () => true }; root = document.createElement('div'); document.body.append(root); await act(async () => { render(<Home port={port} poems={poems} questions={[]} />, root!); await new Promise((resolve) => setTimeout(resolve, 0)); }); await act(() => click('最初から選び直す')); expect(writes).toEqual([]); expect((await port.loadLastSession()).completed).toBe(false); });

// 発注057 R2：再確認は途中から再開できない。誘いを出してから断るのではなく、最初から出さない。
test('restore: 未完了の再確認には誘いを出さない', async () => {
  const view = await mount(session({ entry: 'review' }));
  expect(view.textContent).not.toContain('続きから始める');
  expect(view.textContent).not.toContain('の続きがあります');
});
test('restore: 再確認以外の未完了には誘いを出す', async () => {
  const view = await mount(session({ entry: 'learn' }));
  expect(view.textContent).toContain('続きから始める');
});

/*
 * 発注081: 作者問題の方式は習熟度で決まる。**再開経路にも同じ配線がある。**
 * 新規開始の側だけを釘付けにすると、ここを空にしても全緑になる（破壊試験・2026-09-09）。
 */
test('restore: 復元は再開計画と同じイベントから作った項目別得点を親へ渡す', async () => {
  const authorEvents = Array.from({ length: 3 }, (_, index) => ({
    ...event(index + 1), eventId: `a${index}`, poemId: 'p001', itemKey: 'p001:author',
    questionId: 'p001-author-choice', sessionId: `s${index}`, delta: 5,
  }));
  let received: unknown[] = [];
  await mount(session(), authorEvents, (...args) => { received = args; });
  await act(() => click('続きから始める'));
  // 選択式の正答3回で +5 ずつ。**得点そのものを見る**——空の器を渡す実装と区別できる。
  expect(received[4]).toMatchObject({ 'p001:author': 15 });
});
