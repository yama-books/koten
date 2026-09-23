import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, expect, test } from 'vitest';
import { History } from '../../packages/hyakunin/src/ui/screens/History.tsx';
import { createIndexedDbPort, IMPORT_RECORD_LIMIT } from '../../packages/hyakunin/src/ui/adapters/indexeddb-port.ts';
import type { ApplicationPort } from '../../packages/hyakunin/src/ui/adapters/indexeddb-port.ts';
import type { HistorySummary } from '../../packages/hyakunin/src/domain/history.ts';

let root: HTMLDivElement | undefined;
afterEach(() => { if (root) { render(null, root); root.remove(); root = undefined; } });

const summary: HistorySummary = { isEmpty: false, touchedCount: 1, needsReview: [], entries: [], groups: [] } as never;
const plan = { document: {} as never, preview: { schemaVersion: 1 as const, counts: { sessions: 2, events: 7, reports: 0 }, products: ['hyakunin'] } };

function stub(overrides: Partial<ApplicationPort> = {}): ApplicationPort {
  return {
    async appendEvent() { return { reason: 'write-failed' } as never; },
    async listEvents() { return []; },
    async saveSession() { return { reason: 'write-failed' } as never; },
    async loadLastSession() { return null; },
    async saveSettings() { return { reason: 'write-failed' } as never; },
    async loadSettings() { return null; },
    async saveLocalReport() { return true; },
    async exportRecords() { return { text: '{}', summary: { counts: { sessions: 2, events: 7, reports: 0 }, characters: 2 } }; },
    async previewImport() { return { ok: true, plan } as never; },
    async commitImport() { return { sessions: { added: 1, duplicates: 1 }, events: { added: 5, duplicates: 2 }, reports: { added: 0, duplicates: 0 } }; },
    async previewDelete() { return { sessions: 3, events: 40, reports: 1, outbox: 0 }; },
    async commitDelete(counts) { return counts; },
    ...overrides,
  } as ApplicationPort;
}

function mount(port?: ApplicationPort, given: HistorySummary = summary, onChanged?: () => void) {
  root = document.createElement('div');
  document.body.append(root);
  render(<History summary={given} onHome={() => {}} port={port} onChanged={onChanged} />, root);
  return root;
}
const button = (text: string) => Array.from(root!.querySelectorAll('button')).find((item) => item.textContent === text);
/**
 * 持ち出しは**タブの向こう**へ移った（2026-09-16）。取り返しのつかない操作を一覧と同じ面に
 * 置かないための移動なので、試験でもタブを押してから見る。押す口が無ければ何もしない。
 */
function openTransfer() { const tab = Array.from(root!.querySelectorAll<HTMLButtonElement>('[role="tab"]')).find((item) => item.textContent === 'データ管理'); if (tab) act(() => { tab.click(); }); return root!; }

/**
 * 転送の口は `Partial` で任意にしてある。本番のポートから落ちても型は通り、
 * 画面は黙って機能ごと消える。**ここが唯一それを止める釘である。**
 */
test('transfer: 本番のポートは持ち出しの5つの口をすべて持つ', () => {
  const port = createIndexedDbPort();
  for (const name of ['exportRecords', 'previewImport', 'commitImport', 'previewDelete', 'commitDelete'] as const) {
    expect(typeof port[name], `${name} が本番のポートに無い`).toBe('function');
  }
});

test('transfer: 取り込みには上限がある', () => {
  expect(IMPORT_RECORD_LIMIT).toBeGreaterThan(0);
});

test('transfer: 記録の画面に書き出しと読み込みを出す', () => {
  const view = (mount(stub()), openTransfer());
  expect(view.textContent).toContain('データ管理');
  expect(button('記録を書き出す')).toBeTruthy();
  expect(view.querySelector('input[type="file"]')).toBeTruthy();
  expect(button('記録を消す')).toBeTruthy();
});

test('transfer: 記録が空でも取り込みの入口を出す', () => {
  // 別の端末から持ち込む人にとって、ここが唯一の入口である。
  const view = (mount(stub(), { ...summary, isEmpty: true, touchedCount: 0 }), openTransfer());
  expect(view.textContent).toContain('データ管理');
});

test('transfer: 口を持たないポートでは出さない', () => {
  const view = (mount(stub({ exportRecords: undefined, previewImport: undefined, commitImport: undefined, previewDelete: undefined, commitDelete: undefined })), openTransfer());
  expect(view.textContent).not.toContain('データ管理');
});

test('transfer: port を渡さなければ出さない', () => {
  expect(mount(undefined).textContent).not.toContain('記録の持ち出し');
});

test('transfer: 読み込みは件数を見せてから、押されて初めて書く', async () => {
  let committed = 0;
  const view = (mount(stub({ async commitImport() { committed += 1; return { sessions: { added: 1, duplicates: 0 }, events: { added: 5, duplicates: 2 }, reports: { added: 0, duplicates: 0 } }; } })), openTransfer());
  const input = view.querySelector('input[type="file"]') as HTMLInputElement;
  Object.defineProperty(input, 'files', { value: [{ text: async () => '{}' }], configurable: true });

  await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); await Promise.resolve(); });
  expect(view.textContent).toContain('回 2 件・解答 7 件');
  // 下見の段階では 1 件も書いていないこと。ここが §9 の「確認してから」である。
  expect(committed).toBe(0);

  await act(async () => { button('この内容で読み込む')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
  expect(committed).toBe(1);
  expect(view.textContent).toContain('6件を追加し、2件は同じ記録なので重ねませんでした');
});

test('transfer: やめると書かずに戻る', async () => {
  let committed = 0;
  const view = (mount(stub({ async commitImport() { committed += 1; return null; } })), openTransfer());
  const input = view.querySelector('input[type="file"]') as HTMLInputElement;
  Object.defineProperty(input, 'files', { value: [{ text: async () => '{}' }], configurable: true });
  await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); await Promise.resolve(); });
  await act(async () => { button('やめる')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
  expect(committed).toBe(0);
  expect(view.textContent).not.toContain('この内容で読み込む');
});

test('transfer: 読めないファイルは理由を出し、書かない', async () => {
  let committed = 0;
  const view = (mount(stub({
    async previewImport() { return { ok: false, message: 'このアプリの書き出し形式ではありません。' }; },
    async commitImport() { committed += 1; return null; },
  })), openTransfer());
  const input = view.querySelector('input[type="file"]') as HTMLInputElement;
  Object.defineProperty(input, 'files', { value: [{ text: async () => 'x' }], configurable: true });
  await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); await Promise.resolve(); });
  expect(view.querySelector('[role="alert"]')?.textContent).toContain('このアプリの書き出し形式ではありません。');
  expect(committed).toBe(0);
});

test('transfer: 削除は件数を見せてから、押されて初めて消す', async () => {
  let deleted = 0;
  let changed = 0;
  const view = (mount(stub({ async commitDelete(counts) { deleted += 1; return counts; } }), summary, () => { changed += 1; }), openTransfer());

  await act(async () => { button('記録を消す')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
  expect(view.textContent).toContain('回 3 件・解答 40 件・報告 1 件');
  expect(view.textContent).toContain('元には戻せません');
  // 下見だけでは 1 件も消さない。
  expect(deleted).toBe(0);

  await act(async () => { button('消す')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
  expect(deleted).toBe(1);
  expect(view.textContent).toContain('44件の記録を消しました');
  // 一覧は古くなる。親へ知らせること。
  expect(changed).toBe(1);
});

test('transfer: 削除をやめると消さない', async () => {
  let deleted = 0;
  const view = (mount(stub({ async commitDelete(counts) { deleted += 1; return counts; } })), openTransfer());
  await act(async () => { button('記録を消す')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
  await act(async () => { button('やめる')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
  expect(deleted).toBe(0);
  expect(view.textContent).not.toContain('消える記録');
});

test('transfer: 取り込みも一覧の読み直しを促す', async () => {
  let changed = 0;
  const view = (mount(stub(), summary, () => { changed += 1; }), openTransfer());
  const input = view.querySelector('input[type="file"]') as HTMLInputElement;
  Object.defineProperty(input, 'files', { value: [{ text: async () => '{}' }], configurable: true });
  await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); await Promise.resolve(); });
  await act(async () => { button('この内容で読み込む')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
  expect(changed).toBe(1);
});

// ---- 消す先の選択（依頼者・2026-09-22） ----

/** 同期中の「データ管理」を開き、削除の確認まで進める。 */
async function openDeleteConfirm(extra: Partial<Parameters<typeof History>[0]> = {}) {
  root = document.createElement('div');
  document.body.append(root);
  render(<History summary={summary} onHome={() => {}} port={stub()} initialTab="データ管理" syncEnabled onOpenSync={() => {}} {...extra} />, root!);
  await act(async () => { button('記録を消す')!.click(); });
  return root!;
}

test('同期中は「どこから消すか」を選ばせる', async () => {
  // **同期したまま端末から消しても戻ってくる。** 黙って消した風に見せない。
  const view = await openDeleteConfirm();
  expect(view.textContent).toContain('この端末だけ消しても、同期先から戻ってきます');
  expect(button('同期先とこの端末から消す')).toBeTruthy();
  expect(button('この端末だけ消す（同期を止めます）')).toBeTruthy();
  expect(button('やめる')).toBeTruthy();
  // 消す操作どうしを横に並べない。押し間違えを避けるため縦に積む。
  expect(view.querySelector('.transfer-choices')).not.toBeNull();
});

test('同期していなければ選択肢を出さない', async () => {
  root = document.createElement('div');
  document.body.append(root);
  render(<History summary={summary} onHome={() => {}} port={stub()} initialTab="データ管理" />, root!);
  await act(async () => { button('記録を消す')!.click(); });
  expect(button('消す')).toBeTruthy();
  expect(root!.querySelector('.transfer-choices')).toBeNull();
});

test('「同期先とこの端末から消す」は同期先を先に空にする', async () => {
  const order: string[] = [];
  const view = await openDeleteConfirm({
    port: stub({ async commitDelete(counts) { order.push('local'); return counts; } }),
    onDeleteRemote: async () => { order.push('remote'); return true; },
    onStopSync: async () => { order.push('stop'); return true; },
  });
  await act(async () => { button('同期先とこの端末から消す')!.click(); });
  await act(async () => { await new Promise((resolve) => queueMicrotask(resolve)); });
  expect(order, '同期先より先に端末を消している').toEqual(['remote', 'local']);
  expect(view.textContent).toContain('消しました');
});

test('「この端末だけ消す」は先に同期を止める', async () => {
  const order: string[] = [];
  await openDeleteConfirm({
    port: stub({ async commitDelete(counts) { order.push('local'); return counts; } }),
    onDeleteRemote: async () => { order.push('remote'); return true; },
    onStopSync: async () => { order.push('stop'); return true; },
  });
  await act(async () => { button('この端末だけ消す（同期を止めます）')!.click(); });
  expect(order, '止める前に消している').toEqual(['stop', 'local']);
});

test('同期先を消せなかったら、端末の記録も消さない', async () => {
  // **片方だけ消えた状態にしない。** 戻ってくる記録を消したと見せるのが一番悪い。
  const order: string[] = [];
  const view = await openDeleteConfirm({
    port: stub({ async commitDelete(counts) { order.push('local'); return counts; } }),
    onDeleteRemote: async () => false,
  });
  await act(async () => { button('同期先とこの端末から消す')!.click(); });
  expect(order).toEqual([]);
  expect(view.textContent).toContain('同期先の記録を消せませんでした');
});

test('「同期先とこの端末から消す」は消すあいだ購読を止めて張り直す', () => {
  // **止めないと、消したあとに届いた古い snapshot が書き戻す。**
  // 2026-09-23 に公開版で実測：クラウドは空になったのに端末へ 12 件戻った。
  const order: string[] = [];
  return (async () => {
    await openDeleteConfirm({
      port: stub({ async commitDelete(counts) { order.push('local'); return counts; } }),
      onDeleteRemote: async () => { order.push('remote'); return true; },
      onPauseSync: () => { order.push('pause'); },
      onResumeSync: () => { order.push('resume'); },
    });
    await act(async () => { button('同期先とこの端末から消す')!.click(); });
    await act(async () => { await new Promise((resolve) => queueMicrotask(resolve)); });
    expect(order).toEqual(['pause', 'remote', 'local', 'resume']);
  })();
});

test('同期先を消せなかったら購読を張り直して元へ戻す', () => {
  // 止めっぱなしにすると、消えていないのに同期も効かない面が残る。
  const order: string[] = [];
  return (async () => {
    await openDeleteConfirm({
      port: stub({ async commitDelete(counts) { order.push('local'); return counts; } }),
      onDeleteRemote: async () => false,
      onPauseSync: () => { order.push('pause'); },
      onResumeSync: () => { order.push('resume'); },
    });
    await act(async () => { button('同期先とこの端末から消す')!.click(); });
    await act(async () => { await new Promise((resolve) => queueMicrotask(resolve)); });
    expect(order).toEqual(['pause', 'resume']);
  })();
});
