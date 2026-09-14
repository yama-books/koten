import test from 'node:test';
import assert from 'node:assert/strict';
import { promptGroups } from '../../packages/hyakunin/src/ui/screens/prompt-layout.ts';

const poem = ['夕されば', '門田の稲葉', 'おとづれて', '芦のまろやに', '秋風ぞ吹く'];

test('句の並び: 隠す句が 1 つなら、その行だけを空欄にする', () => {
  assert.deepEqual(promptGroups(poem, [2]), [
    { kind: 'line', line: '夕されば', from: 1 },
    { kind: 'blank', span: 1, lines: ['門田の稲葉'], from: 2 },
    { kind: 'line', line: 'おとづれて', from: 3 },
    { kind: 'line', line: '芦のまろやに', from: 4 },
    { kind: 'line', line: '秋風ぞ吹く', from: 5 },
  ]);
});

test('句の並び: 続いた句はまとめて 1 つの空欄にする', () => {
  // 依頼者指示（2026-09-15）——「該当行の分がまとめて大きめの空欄になるように」。
  assert.deepEqual(promptGroups(poem, [1, 2, 3]), [
    { kind: 'blank', span: 3, lines: ['夕されば', '門田の稲葉', 'おとづれて'], from: 1 },
    { kind: 'line', line: '芦のまろやに', from: 4 },
    { kind: 'line', line: '秋風ぞ吹く', from: 5 },
  ]);
});

test('句の並び: 離れた句は別々の空欄にする', () => {
  // 段6「初句か末句の 1 つだけ見える」は、見える句が真ん中に来ない限り続くが、
  // **続かない指定が来ても割れないこと**を見る。まとめる規則は「隣どうし」だけである。
  const groups = promptGroups(poem, [1, 3, 4]);
  assert.deepEqual(groups.map((group) => (group.kind === 'blank' ? `blank${group.span}` : group.line)), [
    'blank1', '門田の稲葉', 'blank2', '秋風ぞ吹く',
  ]);
});

test('句の並び: 全部隠すと 1 つの空欄になる', () => {
  const groups = promptGroups(poem, [1, 2, 3, 4, 5]);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0], { kind: 'blank', span: 5, lines: poem, from: 1 });
});

test('句の並び: 隠す句が無ければ、全部そのまま出す', () => {
  assert.equal(promptGroups(poem, []).every((group) => group.kind === 'line'), true);
});

test('句の並び: 範囲の外を指しても崩れない', () => {
  // 検証は `question-schema` が持つ。ここは描画が落ちないことだけを見る。
  assert.deepEqual(promptGroups(poem, [9]).map((group) => group.kind), ['line', 'line', 'line', 'line', 'line']);
});
