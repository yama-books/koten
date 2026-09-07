import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const home = () => source('packages/hyakunin/src/ui/screens/Home.tsx');
const styles = () => source('packages/hyakunin/src/styles.css');
const picker = () => source('packages/hyakunin/src/ui/screens/RangePicker.tsx');
const overflow = () => source('tools/overflow-check/index.ts');

test('074-2: 初回設定は見た目の順でも説明が OK のすぐ上に来る', () => {
  // DOM 順は 073-4a が見ている。ここは `order` で説明と OK の間へ学年が割り込まないことを見る。
  const value = styles();
  expect(value).not.toContain('.onboarding__dialog > .stats-notice { order:');
  expect(value).not.toContain('.onboarding__dialog > .grade-picker { order:');
  expect(value).not.toContain('.onboarding__dialog > .stats-notice__confirm { order:');
});

test('074-2b: 学年の見出しは「（必須）」を名乗らない', () => {
  const value = source('packages/shared/src/ui/components/GradePicker.tsx');
  expect(value).toContain('>学年</h3>');
  expect(value).not.toContain('（必須）');
});

test('074-3: ホームはテスト公開の名乗りと制約一覧の出所を持たない', () => {
  // 画面に何が出るかは home.test の 074-3 が見る。ここは取り込みだけを見て、主張を重ねない。
  const value = home();
  expect(value).not.toContain('releaseStageLabel');
  expect(value).not.toContain('KNOWN_LIMITATIONS');
  expect(value).not.toContain('appConfig.publisher');
});

// 発注074 工程4・工程8。**§19 の破壊試験17件は、この2工程を1件も壊していない**（検収の所見2）。
// 基準線の `border-block` へ戻しても全部緑のままだったので、戻したら赤くなる釘をここへ置く。
test('074-4: 区切りの線を重ねない', () => {
  const value = styles();
  // ㉒ フッタの区切り線のすぐ下に、案内の枠線を重ねて引かない。
  expect(value).toContain('.install-guide { margin-block: var(--space-md); }');
  expect(value).not.toMatch(/\.install-guide \{[^}]*border/);
  // ㉛ 見出しごとに上下2本を引かない。下の1本だけにする。
  expect(value).not.toMatch(/\.answer-mode \{[^}]*border-block:/);
  expect(value).toMatch(/\.answer-mode \{[^}]*border-block-end:/);
  expect(value).not.toMatch(/\.question-text \{[^}]*border-block:/);
  expect(value).toMatch(/\.question-text \{[^}]*border-block-end:/);
});

test('074-8: 横書きの出題画面の線の本数を実画面で数える', () => {
  // 距離では区別できない。基準線の引き方へ戻しても最小の間隔は変わらず、増えるのは本数だけだった。
  expect(overflow()).toContain("'horizontalRuleCount'");
  expect(overflow()).toContain('if (structuralRules.length !== 3)');
});

test('074-6: 本番の問数は数字を直接書かない', () => {
  // 出ているかどうかは range-picker.test が見る。ここは規則を経由していることだけを見る。
  expect(picker()).not.toMatch(/この範囲では \d+問/);
});

test('074-9-10-15: 縦書きの器と、それに添う操作部の軸を固定する', () => {
  const value = styles();
  // 073 工程1 と同じ器。本番の出題画面もこの器に乗る（発注074 工程10）。
  expect(value).toContain('.question-text--vertical { box-sizing: border-box; width: min(100%, 30rem); margin-inline: auto; overflow-x: auto; }');
  // 「わからない！」を半分の列に置かない（発注074 工程15）。中心が歌からずれる。
  expect(value).toContain('.question-text--vertical + .answer-controls .answer-actions { grid-template-columns: minmax(0, 1fr); }');
});

test('074-17b: マークを左端へ移しても、答えの器の幅を見出しに決めさせない', () => {
  // この条件を見ているのは `check:overflow` の retainedInputFillsRow だけで、`npm test` では気づけない。
  // 見出しが匿名のグリッド項目に戻ると、320px で答えの器が 3 分の 2 まで縮む。
  expect(source('packages/hyakunin/src/ui/screens/Session.tsx')).toContain('<span class="answer-retained__label">自分の答え</span>');
  expect(styles()).toContain('.answer-retained__label { grid-column: 1 / -1; }');
});

test('074-17: フィードバック画像は白い箱を出さず、実画面で隅の画素を測る', () => {
  // 「乗算であること」は仕組みであって狙いではない。**狙いは白い箱が出ないことである。**
  expect(styles()).not.toContain('mix-blend-mode: normal');
  expect(styles()).toContain('.feedback-mark img, .perfect-mark img { mix-blend-mode: darken; }');
  expect(overflow()).toContain("'feedbackMarkCornerMatchesBackground'");
  // 地色を描画時に持ち上げないと、背景より暗い四角が残る（外周の最大の差 10）。
  expect(styles()).toContain('.feedback-mark img, .perfect-mark img { filter: brightness(1.05); }');
  // 走査器が `filter` を読まないと、画面と違う色を測って緑になる。
  expect(overflow()).toContain("if (markStyle.filter && markStyle.filter !== 'none') context.filter = markStyle.filter;");
});
