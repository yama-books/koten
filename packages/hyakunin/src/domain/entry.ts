import { orderCardNumbers, type OrderMode } from './order.ts';
import type { PublishedQuestion } from '../data/question-schema.ts';

export type EntryId = 'quick' | 'view' | 'learn' | 'author' | 'review' | 'exam';
export type EntryRule = Readonly<{ questionCount: number; blankWeight: number; authorWeight: number }>;

export const ENTRY_RULES_VERSION = 1 as const;
export const ENTRY_RULES: Readonly<Record<EntryId, EntryRule>> = {
  quick: { questionCount: 8, blankWeight: 3, authorWeight: 1 },
  view: { questionCount: 10, blankWeight: 0, authorWeight: 0 },
  learn: { questionCount: 10, blankWeight: 1, authorWeight: 0 },
  author: { questionCount: 10, blankWeight: 0, authorWeight: 1 },
  review: { questionCount: 0, blankWeight: 1, authorWeight: 1 },
  exam: { questionCount: 10, blankWeight: 1, authorWeight: 1 },
};

/**
 * 学習者に見せる入口の名前。復元カードと出題画面の見出しが同じ語を使うために 1 か所へ置く。
 * 別々に書くと、片方だけ直った状態が試験を通ってしまう。
 */
export const ENTRY_LABELS: Readonly<Record<EntryId, string>> = {
  quick: 'とりあえず始める',
  view: '歌を確認する',
  learn: '歌本文',
  author: '作者',
  review: 'もう一度確認する',
  exam: '本番',
};

/** まとまり 1 つの首数。復元カードの案内はこの値を名指しで出す。 */
export { MAX_CHUNK_SIZE as CHUNK_CARD_COUNT } from './range.ts';

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

function takeAcrossCards(available: readonly PublishedQuestion[], cardNumbers: readonly number[], seed: string, mode: OrderMode, rule: EntryRule, strictType = false): PublishedQuestion[] {
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
    const candidates = preferredQuestions.length > 0 ? preferredQuestions : strictType ? [] : cardQuestions;
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
  includeAuthors = true,
): PublishedQuestion[] {
  if (!available.length) return [];
  const ordered = inCardOrder(available, cardNumbers, seed, mode);
  // 本番だけは範囲選択で作者問を外せる。回数は常に本番の10問のままにする。
  const rule = entry === 'exam' && !includeAuthors
    ? { ...ENTRY_RULES.exam, blankWeight: 1, authorWeight: 0 }
    : ENTRY_RULES[entry];
  if (entry === 'review') return ordered;
  if (entry === 'view') return [];
  if (entry === 'learn') return takeAcrossCards(available.filter((question) => question.type === 'blank'), cardNumbers, seed, mode, rule);
  // 初回に出す作者問題は、候補の順序まで生成データで確定した 4〜5 択だけである。
  // kana/free も type は author なので、ここで questionId を明示して混ぜない。
  const selectable = available.filter((question) => question.type === 'blank' || (includeAuthors && question.questionId.endsWith('-author-choice')));
  if (entry === 'quick' || entry === 'author' || entry === 'exam') return takeAcrossCards(selectable, cardNumbers, seed, mode, rule, true);
  return takeAcrossCards(available, cardNumbers, seed, mode, rule);
}
