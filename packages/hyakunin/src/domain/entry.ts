import { orderCardNumbers, type OrderMode } from './order.ts';
import type { PublishedQuestion } from '../data/question-schema.ts';

export type EntryId = 'quick' | 'view' | 'learn' | 'review' | 'exam';
export type EntryRule = Readonly<{ questionCount: number; blankWeight: number; authorWeight: number }>;

export const ENTRY_RULES_VERSION = 1 as const;
export const ENTRY_RULES: Readonly<Record<EntryId, EntryRule>> = {
  quick: { questionCount: 8, blankWeight: 3, authorWeight: 1 },
  view: { questionCount: 10, blankWeight: 0, authorWeight: 0 },
  learn: { questionCount: 10, blankWeight: 1, authorWeight: 0 },
  review: { questionCount: 0, blankWeight: 1, authorWeight: 1 },
  exam: { questionCount: 10, blankWeight: 1, authorWeight: 1 },
};

export function isEntryAvailable(entry: EntryId, availableQuestionCount: number): boolean {
  return entry === 'view' || availableQuestionCount > ENTRY_RULES.review.questionCount;
}

function cardNumber(question: PublishedQuestion): number {
  return Number(question.poemId.slice('p'.length));
}

function inCardOrder(available: readonly PublishedQuestion[], cardNumbers: readonly number[], seed: string, mode: OrderMode): PublishedQuestion[] {
  const orderedCards = orderCardNumbers([...cardNumbers], mode, seed);
  return orderedCards.flatMap((cardNo) => available.filter((question) => cardNumber(question) === cardNo));
}

function takeWeighted(questions: readonly PublishedQuestion[], rule: EntryRule): PublishedQuestion[] {
  const blanks = questions.filter((question) => question.type === 'blank');
  const authors = questions.filter((question) => question.type === 'author');
  const cycleLength = rule.blankWeight + rule.authorWeight;
  return Array.from({ length: rule.questionCount }, (_, index) => {
    const isBlank = index % cycleLength < rule.blankWeight;
    const prior = Array.from({ length: index }, (_, priorIndex) => priorIndex % cycleLength < rule.blankWeight)
      .filter((value) => value === isBlank).length;
    return isBlank ? blanks[prior] : authors[prior];
  }).filter((question): question is PublishedQuestion => question !== undefined);
}

/** APP_SPEC §5.1: 最初の一巡は番号順。一巡後に呼び出し側が 'random' を渡す。 */
export function planQuestions(
  entry: EntryId,
  available: readonly PublishedQuestion[],
  cardNumbers: readonly number[],
  seed: string,
  mode: OrderMode = 'number',
): PublishedQuestion[] {
  if (!available.length) return [];
  const ordered = inCardOrder(available, cardNumbers, seed, mode);
  const rule = ENTRY_RULES[entry];
  if (entry === 'review') return ordered;
  if (entry === 'view') return [];
  if (entry === 'learn') return ordered.filter((question) => question.type === 'blank').slice(undefined, rule.questionCount);
  return takeWeighted(ordered, rule);
}
