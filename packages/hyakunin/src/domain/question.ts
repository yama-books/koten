export type Normalization = 'exact' | 'kana';
export type Judgement = 'correct' | 'partial' | 'incorrect' | 'needs-review';
export const QUESTION_RULES_VERSION = 1;

export type Question = Readonly<{
  questionId: string;
  answer: string;
  acceptedAnswers: readonly string[];
  partialAnswers: readonly string[];
  normalization: Normalization;
}>;

export type JudgementContext = Readonly<{
  readingStatus: 'confirmed' | 'review';
}>;

/** Normalizes an answer only according to the question's declared matching mode. */
export function normalizeAnswer(input: string, mode: Normalization): string {
  const normalized = input.normalize('NFC').replace(/\u3000/g, ' ').trim();
  if (mode === 'exact') return normalized;

  return normalized
    .replace(/ /g, '')
    .replace(/[ｰー]/g, 'ー')
    .replace(/[ァ-ヶ]/g, (character) => String.fromCharCode(character.charCodeAt(0) - 0x60));
}

/** Judges one supplied answer without reading data files or consulting external state. */
export function judge(question: Question, input: string, context: JudgementContext): Judgement {
  const normalizedInput = normalizeAnswer(input, question.normalization);
  if (normalizedInput === '') return 'incorrect';

  if (normalizedInput === normalizeAnswer(question.answer, question.normalization)) return 'correct';

  const isAccepted = question.acceptedAnswers.some(
    (answer) => normalizedInput === normalizeAnswer(answer, question.normalization),
  );
  if (isAccepted && context.readingStatus === 'confirmed') return 'correct';
  if (isAccepted) return 'needs-review';

  const isPartial = question.partialAnswers.some(
    (answer) => normalizedInput === normalizeAnswer(answer, question.normalization),
  );
  if (isPartial && context.readingStatus === 'confirmed') return 'partial';
  if (isPartial) return 'needs-review';

  return 'incorrect';
}
