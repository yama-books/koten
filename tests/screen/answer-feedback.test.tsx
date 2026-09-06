import { render } from 'preact';
import { afterEach, expect, test } from 'vitest';
import { AnswerFeedback } from '../../packages/hyakunin/src/ui/components/AnswerFeedback.tsx';

let root: HTMLDivElement | undefined;
function mount(historical: string, modern: string) {
  root = document.createElement('div'); document.body.append(root);
  render(<AnswerFeedback feedback={{ mark: 'maru' }} forms={{ answer: '権中納言定頼', historical, modern }} isAuthor />, root);
  return root;
}
afterEach(() => { root?.remove(); root = undefined; });

test('answer-feedback: 作者は現代読みを上段、異なる歴史的仮名遣いを下段に出す', () => {
  const view = mount('ごんちゆうなごんさだより', 'ごんちゅうなごんさだより');
  expect(view.textContent).toContain('正解：権中納言定頼　ごんちゅうなごんさだより');
  expect(view.textContent).toContain('（歴史的仮名遣い：ごんちゆうなごんさだより）');
});

test('answer-feedback: 作者の読みが同じなら歴史的仮名遣いの行を出さない', () => {
  const view = mount('じとうてんのう', 'じとうてんのう');
  expect(view.textContent).toContain('正解：権中納言定頼　じとうてんのう');
  expect(view.textContent).not.toContain('歴史的仮名遣い：');
});
