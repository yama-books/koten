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

function seededQuestionIndex(seed: string, cardNo: number, questionIndex: number, length: number): number {
  let hash = 2166136261;
  for (const character of `${seed}:${cardNo}:${questionIndex}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % length;
}

function inCardOrder(available: readonly PublishedQuestion[], cardNumbers: readonly number[], seed: string, mode: OrderMode): PublishedQuestion[] {
  const orderedCards = orderCardNumbers([...cardNumbers], mode, seed);
  return orderedCards.flatMap((cardNo) => available.filter((question) => cardNumber(question) === cardNo));
}

function takeAcrossCards(available: readonly PublishedQuestion[], cardNumbers: readonly number[], seed: string, mode: OrderMode, rule: EntryRule): PublishedQuestion[] {
  const orderedCards = orderCardNumbers([...cardNumbers], mode, seed);
  const cycleLength = rule.blankWeight + rule.authorWeight;
  const used = new Set<string>();
  const selected: PublishedQuestion[] = [];
  for (let index = 0; index < rule.questionCount; index += 1) {
    const cardNo = orderedCards[index % orderedCards.length];
    if (cardNo === undefined) break;
    const isBlank = index % cycleLength < rule.blankWeight;
    const cardQuestions = available.filter((question) => cardNumber(question) === cardNo && !used.has(question.questionId));
    const preferredType = isBlank ? 'blank' : 'author';
    const preferredQuestions = cardQuestions.filter((question) => question.type === preferredType);
    const candidates = preferredQuestions.length > 0 ? preferredQuestions : cardQuestions;
    const preferred = candidates[seededQuestionIndex(seed, cardNo, index, candidates.length)];
    if (preferred) {
      used.add(preferred.questionId);
      selected.push(preferred);
    }
  }
  return selected;
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
  if (entry === 'learn' || entry === 'exam') return takeAcrossCards(available.filter((question) => question.type === 'blank'), cardNumbers, seed, mode, rule);
  return takeAcrossCards(available, cardNumbers, seed, mode, rule);
}
