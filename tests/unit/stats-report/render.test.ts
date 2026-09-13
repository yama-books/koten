import assert from 'node:assert/strict';
import { toolPresent, toolTest } from './guard.ts';
import { BUTTON_KEYS } from '../../../packages/shared/src/telemetry/registry.ts';
import { document, documents } from './fixtures.ts';

const { BUTTON_LABELS, SHOWN_BUTTON_KEYS, renderReport } = toolPresent ? await import('../../../tools/stats-report/render.ts') : { BUTTON_LABELS: null as never, SHOWN_BUTTON_KEYS: null as never, renderReport: null as never };
const { summarize } = toolPresent ? await import('../../../tools/stats-report/aggregate.ts') : { summarize: null as never };

const at = '2026-09-13T12:00:00.000Z';

toolTest('描画: ボタンのラベルは BUTTON_KEYS を過不足なく覆う', () => {
  // 項目を足してラベルを忘れると、報告に「start」のような生のキーが出る。
  assert.deepEqual(Object.keys(BUTTON_LABELS).sort(), [...BUTTON_KEYS].sort());
});

toolTest('描画: ラベルは画面の文言で、表の行として出す', () => {
  const html = renderReport({ summary: summarize(documents()), fetchedAt: at });
  // **文字列が在るかでは見ない。** 注記にも同じ語が出るので、行の形で見ないと
  // 「表から消しても注記に当たって緑」になる（2026-09-14 に実際にそうなりかけた）。
  for (const label of ['これまでの記録', '問題を報告']) {
    assert.ok(html.includes(`<td>${label}</td>`), `ボタンのラベルが表の行に出ていない: ${label}`);
  }
  assert.ok(html.includes('<td>とりあえず始める</td>'), '入口のラベルが表の行に出ていない');
});

toolTest('描画: 数えていないボタンは表から外し、理由を書く', () => {
  // `reveal` は紙モードでしか増えず、紙モードは本番でしか選べず、本番では数えない。
  // **0 を並べると「使われていない」と読み違える。**
  const html = renderReport({ summary: summarize(documents()), fetchedAt: at });
  assert.equal(html.includes('<td>答えを確認する</td>'), false, '合計の表に出ている');
  assert.equal(html.includes('<th>答えを確認する</th>'), false, '日別の見出しに出ている');
  // **黙って消さない。** 消すだけだと、次に読む人は「そんな項目は無い」と思う。
  assert.ok(html.includes('紙モードは本番でしか選べず'), '外した理由が書かれていない');
});

toolTest('描画: 出すボタンは、数えていないものを引いた集合と一致する', () => {
  // 片側だけ足すと、ラベルはあるのに表へ出ない（またはその逆）が静かに起きる。
  assert.deepEqual([...SHOWN_BUTTON_KEYS].sort(), ['answer', 'hint', 'history', 'report', 'start']);
  assert.equal(SHOWN_BUTTON_KEYS.includes('reveal'), false);
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
