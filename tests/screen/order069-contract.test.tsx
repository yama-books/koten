import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const styles = () => source('packages/hyakunin/src/styles.css');
const session = () => source('packages/hyakunin/src/ui/screens/Session.tsx');
const feedback = () => source('packages/hyakunin/src/ui/components/AnswerFeedback.tsx');
const result = () => source('packages/hyakunin/src/ui/screens/Result.tsx');
const picker = () => source('packages/hyakunin/src/ui/screens/RangePicker.tsx');
const history = () => source('packages/hyakunin/src/ui/screens/History.tsx');

test('069 M-1: 作者の縦書きは縦書き設定だけで指定する', () => expect(styles()).toContain('.question-text--vertical .question-line { display: inline-block; max-inline-size: 12em; direction: ltr; text-orientation: mixed; white-space: nowrap; writing-mode: vertical-rl; }'));
test('069 M-2: 作者の横書きは横書き設定で縦書き指定を受けない', () => expect(styles()).not.toContain('.question-text--horizontal .question-line { writing-mode: vertical-rl'));
test('069 M-3: 作者候補はprimaryではない', () => expect(session()).not.toMatch(/question\.candidates\.map[\s\S]{0,300}class="primary"/));
test('069 M-4: 作者の歌は句ごとのquestion-lineへ分ける', () => expect(session()).toContain('displayKu?.map((line, index) => <span class="question-line"'));
test('069 M-5: フィードバック画像は乗算表示する', () => expect(styles()).toContain('.feedback-mark img, .perfect-mark img { mix-blend-mode: multiply; }'));
test('069 M-6: 同じ作者読みには歴史的仮名遣い行を足さない', () => expect(feedback()).toContain('historical && historical !== modern'));
test('069 M-7: 作者の上段には現代読みを出す', () => expect(feedback()).toContain("正解：{answer}{modern"));
test('069 M-8: 解答欄の印は開示時だけ置く', () => expect(session()).toContain('{displayFlow.phase === "revealed" && ('));
test('069 M-9: 結果の各操作はpractice-choiceに入れる', () => expect(result().match(/class="practice-choice"/g)).toHaveLength(2));
test('069 M-10: 歌順はラジオでなく押下状態を持つボタンで選ぶ', () => { expect(picker()).not.toContain('type="radio"'); expect(picker()).toContain('aria-pressed={selectedOrder === "number"}'); });
test('069 M-11: 範囲入力は変更操作でだけ開く', () => expect(picker()).toContain('{rangeOpen && <div class="range-fields">'));
test('069 M-12: 完全な空記録でも要確認の基準を出す', () => expect(history()).toMatch(/summary\.isEmpty[\s\S]{0,500}最後に解いたとき、まちがえたか/));
