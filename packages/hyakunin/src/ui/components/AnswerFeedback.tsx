import type { Feedback } from '../../domain/flow.ts';

export const PARTIAL_MARK = '△';
export const PARTIAL_NOTE = '仮名遣い確認';
export const PARTIAL_LABEL = `${PARTIAL_MARK} ${PARTIAL_NOTE}`;

/**
 * 正解の表示。**漢字の横に歴史的仮名遣いを括弧で添える**（依頼者指示・2026-09-06）。
 *
 *     正解：八重桜（やへざくら）
 *     △やえざくら（現代仮名遣い）
 *
 * 括弧を出すのは**読みが表記と違うときだけ**である。仮名だけの句（「これやこの」等）で
 * 同じ文字列を二度並べない。現代仮名遣いの行も、歴史的仮名遣いと同じなら出さない——
 * 対照するものが無い行は、読み手に差があると誤解させる。
 */
export function AnswerLines({ answer, historical, modern, showModern, isAuthor = false }: {
  answer: string; historical: string; modern: string; showModern: boolean; isAuthor?: boolean;
}) {
  if (isAuthor) return <>
    <p class="kana-supplement">正解：{answer}{modern ? <>{'　'}{modern}</> : ''}</p>
    {historical && historical !== modern && <p class="kana-supplement">（歴史的仮名遣い：{historical}）</p>}
  </>;
  return <>
    <p class="kana-supplement">正解：{answer}{historical && historical !== answer ? `（${historical}）` : ''}</p>
    {showModern && modern && modern !== historical && (
      <p class="kana-supplement">{PARTIAL_MARK}{modern}（現代仮名遣い）</p>
    )}
  </>;
}

/** 掛詞のように、正誤だけでは伝わらない事情がある問題にだけ付く一言。出所は台帳。 */
export function QuestionNote({ note }: { note: string | null }) {
  return note ? <p class="question-note">{note}</p> : null;
}

/** 本番の採点一覧・紙の自己採点から、問題そのものを渡して同じ表示を出すための入口。 */
export function PartialSupplement({ answerHistorical, answerModern, answer, showModern = true, isAuthor = false }: {
  answerHistorical: string; answerModern: string; answer: string; showModern?: boolean; isAuthor?: boolean;
}) {
  return <AnswerLines answer={answer} historical={answerHistorical} modern={answerModern} showModern={showModern} isAuthor={isAuthor} />;
}

export function AnswerFeedback({ feedback, forms = null, note = null, isAuthor = false }: {
  feedback: Feedback;
  /** 正解の3表記。開示のときだけ渡す。 */
  forms?: { answer: string; historical: string; modern: string } | null;
  note?: string | null;
  isAuthor?: boolean;
}) {
  const label = feedback.mark === 'maru' ? '正解' : feedback.mark === 'check' ? '要確認！' : PARTIAL_LABEL;
  return <section class="answer-feedback" aria-live="polite"><p>{label}</p>
    {forms && <AnswerLines answer={forms.answer} historical={forms.historical} modern={forms.modern} showModern={feedback.mark === 'none'} isAuthor={isAuthor} />}
    <QuestionNote note={note} />
  </section>;
}
