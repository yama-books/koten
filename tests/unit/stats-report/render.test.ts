import assert from 'node:assert/strict';
import { toolPresent, toolTest } from './guard.ts';
import { BUTTON_KEYS } from '../../../packages/shared/src/telemetry/registry.ts';
import { document, documents } from './fixtures.ts';

const { BUTTON_LABELS, renderReport } = toolPresent ? await import('../../../tools/stats-report/render.ts') : { BUTTON_LABELS: null as never, renderReport: null as never };
const { summarize } = toolPresent ? await import('../../../tools/stats-report/aggregate.ts') : { summarize: null as never };

const at = '2026-09-13T12:00:00.000Z';

toolTest('描画: ボタンのラベルは BUTTON_KEYS を過不足なく覆う', () => {
  // 項目を足してラベルを忘れると、報告に「start」のような生のキーが出る。
  assert.deepEqual(Object.keys(BUTTON_LABELS).sort(), [...BUTTON_KEYS].sort());
});

toolTest('描画: ラベルは画面の文言で出す', () => {
  const html = renderReport({ summary: summarize(documents()), fetchedAt: at });
  for (const label of ['答えを確認する', 'これまでの記録', '問題を報告']) {
    assert.ok(html.includes(label), `ボタンのラベルが出ていない: ${label}`);
  }
  // 入口は ENTRY_LABELS を import している。複製すると片方だけ古くなる。
  assert.ok(html.includes('とりあえず始める'), '入口のラベルが出ていない');
});

toolTest('描画: 0 件を空の表にせず、読み違えないための断りを出す', () => {
  // 空の表は「使われていない」と読めるが、実際は鍵の権限不足かもしれない。
  //
  // **`0 件` を探してはいけない。** 見出しの「文書 0 件」に当たってしまい、
  // 断りを消しても緑のままになる（2026-09-13 の破壊試験で実際に当たらなかった）。
  const html = renderReport({ summary: summarize([]), fetchedAt: at });
  assert.ok(html.includes('「使われていない」とは限りません'), `0 件の断りが出ていない: ${html.slice(0, 300)}`);
});

toolTest('描画: 取得した日時を出す', () => {
  // 古い HTML を今日のものと読み違えないため。
  assert.ok(renderReport({ summary: summarize(documents()), fetchedAt: at }).includes(at));
});

toolTest('描画: 警告を報告の中に出す', () => {
  const drifted = document('eeeeeeeeeeeeeeeeeeee', '2026-09-04', 0, {
    entryCounts: { quick: 1, view: 0, learn: 0, review: 0, exam: 0, author: 0, karuta: 9 },
  });
  assert.ok(renderReport({ summary: summarize([drifted]), fetchedAt: at }).includes('karuta'));
});

toolTest('描画: 警告に混じった記号を組み立てに使わせない', () => {
  const injected = document('ffffffffffffffffffff', '2026-09-05', 0, {
    entryCounts: { quick: 1, view: 0, learn: 0, review: 0, exam: 0, author: 0, '<script>x</script>': 1 },
  });
  const html = renderReport({ summary: summarize([injected]), fetchedAt: at });
  assert.equal(html.includes('<script>'), false, '受け取った文字列がそのまま組み立てに入っている');
  assert.ok(html.includes('&lt;script&gt;'), '逃がした形で出ていない');
});

toolTest('描画: 外へ取りに行かない 1 枚の HTML である', () => {
  // 手元で開く報告が、開いた先から通信を出さないこと。
  const html = renderReport({ summary: summarize(documents()), fetchedAt: at });
  for (const outside of ['http://', 'https://', '<script']) {
    assert.equal(html.includes(outside), false, `外部への参照が入っている: ${outside}`);
  }
});
