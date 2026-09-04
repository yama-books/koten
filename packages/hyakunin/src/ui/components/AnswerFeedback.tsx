import type { Feedback } from '../../domain/flow.ts';

export function AnswerFeedback({ feedback }: { feedback: Feedback }) {
  const label = feedback.mark === 'maru' ? '○ 正解' : feedback.mark === 'check' ? '✓ 要確認！' : '部分正解';
  return <section class="answer-feedback" aria-live="polite"><p>{label}</p>
    {feedback.historical && <p>{feedback.historical}</p>}
    {feedback.kanji && <p>{feedback.kanji}</p>}
    {feedback.mastery && <p>{feedback.mastery}</p>}
  </section>;
}
