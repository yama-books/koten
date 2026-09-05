import { buildFeedback, type Feedback } from '../../domain/flow.ts';

export const PARTIAL_MARK = '△';
export const PARTIAL_NOTE = '仮名遣い確認';
export const PARTIAL_LABEL = `${PARTIAL_MARK} ${PARTIAL_NOTE}`;

/**
 * D-26 の補足2行。練習・再確認の開示と本番の採点一覧が同じ描画を使う。
 * 括弧行の有無は `buildFeedback` が決める——ここで漢字を判定し直さない。
 */
export function KanaSupplement({ historical, answer }: { historical: string; answer: string }) {
  return <>
    {historical && <p class="kana-supplement">{historical}</p>}
    {answer && <p class="kana-supplement">（{answer}）</p>}
  </>;
}

/** 掛詞のように、正誤だけでは伝わらない事情がある問題にだけ付く一言。出所は台帳。 */
export function QuestionNote({ note }: { note: string | null }) {
  return note ? <p class="question-note">{note}</p> : null;
}

/** 本番の採点一覧・紙の△選択から、問題そのものを渡して同じ補足を出すための入口。 */
export function PartialSupplement({ answerHistorical, answer }: { answerHistorical: string; answer: string }) {
  const feedback = buildFeedback({ historical: answerHistorical, answer }, 'partial');
  return <KanaSupplement historical={feedback.historical} answer={feedback.answer} />;
}

export function AnswerFeedback({ feedback, note = null }: { feedback: Feedback; note?: string | null }) {
  const label = feedback.mark === 'maru' ? '○ 正解' : feedback.mark === 'check' ? '✓ もう一度！' : PARTIAL_LABEL;
  return <section class="answer-feedback" aria-live="polite"><p>{label}</p>
    <KanaSupplement historical={feedback.historical} answer={feedback.answer} />
    <QuestionNote note={note} />
  </section>;
}
