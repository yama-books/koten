import type { PublishedQuestion } from '../data/question-schema.ts';
import type { OutcomeKind } from './result.ts';

export type AnswerOutcome = Readonly<{ questionId: string; poemId: string; kind: Exclude<OutcomeKind, 'viewed'> }>;

/** Reconfirmation is based on the last explicit answer to each question. */
export function reviewQuestionIds(outcomes: readonly AnswerOutcome[]): readonly string[] {
  const last = new Map<string, AnswerOutcome>();
  for (const outcome of outcomes) last.set(outcome.questionId, outcome);
  return [...last.values()].filter(({ kind }) => kind === 'partial' || kind === 'needs-review' || kind === 'incorrect').map(({ questionId }) => questionId);
}

/** Never widen review to a card: every requested id must be a usable blank. */
export function planReviewQuestions(questions: readonly PublishedQuestion[], questionIds: readonly string[]): PublishedQuestion[] | null {
  const byId = new Map(questions.map((question) => [question.questionId, question]));
  const planned = [...new Set(questionIds)].map((id) => byId.get(id));
  if (!planned.length || planned.some((question) => !question || question.type !== 'blank' || !/＿+/.test(question.prompt))) return null;
  return planned as PublishedQuestion[];
}
