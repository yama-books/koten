import { orderCardNumbers, type OrderMode } from './order.ts';
import type { PublishedQuestion } from '../data/question-schema.ts';
import { FLAG_RUNG, LOWEST_RUNG, rungProgress, type RungState } from '@koten/shared/domain/mastery/rungs';
import type { Event } from '@koten/shared/domain/event';

export type RungProgress = ReadonlyMap<string, RungState>;

/**
 * 記録と問題目録から、歌ごとの段の進み具合を作る。
 * **呼び出し側で目録の組み立てを書き写さない**——書き写すと片方だけ古くなる。
 */
export function progressFrom(events: readonly Event[], questions: readonly PublishedQuestion[]): RungProgress {
  return rungProgress(
    events.filter((event) => event.questionId !== undefined).map((event) => ({ questionId: event.questionId!, outcome: event.outcome })),
    questions.map((question) => ({ questionId: question.questionId, poemId: question.poemId, rung: question.rung })),
  );
}
import { MASTERY_RULES } from '@koten/shared/domain/mastery/rules.v1';

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

/**
 * その首の作者問題を、いまの習熟度に合った 1 問へ絞る。
 *
 * **初回（0）は必ず選択式である。** 候補の順序まで生成データで確定した 4〜5 択を初回に出すのは
 * 裁定であり、これを壊さない。上げるのは**選択式の上限に達した首だけ**——上限とは
 * 「その方式ではもう伸びない点」なので、学習者が進めなくなったその瞬間に方式が上がる。
 * 閾値を上限そのものから引いているので、`rules.v1.ts` を直せばここも一緒に動く。
 *
 * **降格を許す**（依頼者裁定・2026-09-09）。自由入力で誤答して上限を割った首は選択式へ戻る。
 *
 * kana（上限 80）の段は置かない。`kanji-to-kana` を記録する経路が出題画面に無く、
 * 出しても自由入力として記録されるので、段が段として働かないためである。
 */
function authorQuestionIdFor(poemId: string, authorScore: number): string {
  return `${poemId}-author-${authorScore >= MASTERY_RULES.choice.cap ? 'free' : 'choice'}`;
}

/** APP_SPEC §5.1: 最初の一巡は番号順。一巡後に呼び出し側が 'random' を渡す。 */
/**
 * その歌でいま出してよい段（発注084・D-12）。**開いている 1 段だけを出す。**
 *
 * 制覇済みの段はもう天井に達していて点が入らないので、出しても学習にならない。
 * **進み具合を渡さなければ段3 だけ**——記録の無い学習者と同じ扱いになる。
 */
function openRungFor(poemId: string, progress: RungProgress): number {
  return progress.get(poemId)?.openRung ?? LOWEST_RUNG;
}

/**
 * その回かぎりの難度の手動調整（発注086・D-17）。**＋が易しく、−が難しい。**
 * **保存しない**——次に始めるときは自動の位置に戻る。下げたままにすると、
 * すでに天井へ達した段を延々と練習することになり、**加算が 0 のまま行き止まりになる。**
 */
export type RungAdjust = number;

/** 自動の位置から何段上まで挑めるか（D-17「挑戦は自由」）。 */
export const RUNG_RAISE_LIMIT = 2;

/**
 * その回に配る段。**上限は `openRung + 2`、ただし一番上の段でも止める。**
 *
 * **一番上で止めるのを忘れると、`openRung = 8` から上げたときに存在しない段9 が出る。**
 * `openRung + 2` だけでは足りない（2026-09-15・検算で発見）。
 */
export function highestRung(openRung: number): number {
  // **上限は 1 か所に置く。** 判定と出題で別々に書くと、片方だけ直った状態が試験を通る。
  return Math.min(openRung + RUNG_RAISE_LIMIT, FLAG_RUNG);
}

export function effectiveRung(openRung: number, adjust: RungAdjust): number {
  return Math.max(LOWEST_RUNG, Math.min(highestRung(openRung), openRung - adjust));
}

export function canEase(openRung: number, adjust: RungAdjust): boolean {
  return effectiveRung(openRung, adjust) > LOWEST_RUNG;
}

export function canHarden(openRung: number, adjust: RungAdjust): boolean {
  return effectiveRung(openRung, adjust) < highestRung(openRung);
}

/**
 * いま何を書く段かを 1 行で言うための名前。**段の番号だけでは学習者に伝わらない。**
 * 段8 は点を動かさず「完全制覇」の印を立てる段である（`RUNG_CAPS` に天井が無い）。
 */
export const RUNG_LABELS: Readonly<Record<number, string>> = {
  1: '語をひとつ書く',
  2: '文節を書く',
  3: '句をまるごと書く',
  4: '上句か下句を書く',
  5: '間の三句を書く',
  6: '四句をつづけて書く',
  7: '一首をまるごと書く',
  8: '番号だけを見て一首を書く',
};

/**
 * 記録に残す段と、手で上げて挑んだ印（発注086・§4.1・§4.3）。**段だけを書き写さない。**
 *
 * **天井は自動の位置の段のものを使う。** 段3 の学習者が段5 に挑んでも天井は 55 のままである
 * ——開けてしまうと、段1・2・3 を 1 問も制覇せずに段5 で 80 まで行ける。梯子の意味が消える。
 * 天井は `computeMastery` が `rung` から引くので、**ここで低いほうを渡す。**
 *
 * **印は真のときだけ付ける。** 既定値を保存へ書き込まない。
 */
export function rungRecordFor(question: PublishedQuestion, progress: RungProgress = new Map()): Readonly<{ rung: number | null; raised?: true }> {
  if (question.rung === null) return { rung: null }; // 作者問は本文の梯子に乗らない。
  const openRung = openRungFor(question.poemId, progress);
  if (question.rung <= openRung) return { rung: question.rung };
  return { rung: openRung, raised: true };
}

/**
 * その範囲の自動の位置（発注086・画面の 1 行に出す）。**一番低い段を出す。**
 *
 * 首ごとに段は違う。高いほうを出すと、実際には出ない段を「いまの段」として見せることになる
 * ——**配られるのは首ごとの実効の段**であり、この値は表示と操作の可否のためだけに使う。
 */
export function autoRungFor(progress: RungProgress, range: Readonly<{ from: number; to: number }>): number {
  let lowest = FLAG_RUNG;
  for (let cardNo = range.from; cardNo <= range.to; cardNo += 1) {
    lowest = Math.min(lowest, openRungFor(`p${String(cardNo).padStart(3, '0')}`, progress));
  }
  return lowest;
}

function isServedBlank(question: PublishedQuestion, progress: RungProgress, adjust: RungAdjust): boolean {
  return question.type === 'blank' && question.rung === effectiveRung(openRungFor(question.poemId, progress), adjust);
}

export function planQuestions(
  entry: EntryId,
  available: readonly PublishedQuestion[],
  cardNumbers: readonly number[],
  seed: string,
  mode: OrderMode = 'number',
  includeAuthors = true,
  /**
   * `computeMastery` の項目別得点。**同じセッションの計画と問題数の計算へ同じ値を渡すこと**——
   * 別々に取ると、出題の内訳と「全何問」の表示が食い違う。省略時は全首 0 として扱うので、
   * 記録がまだ無い学習者と、得点を渡さない呼び出し側は、どちらも初回の選択式になる。
   */
  masteryScores: Readonly<Record<string, number>> = {},
  /**
   * 歌ごとの段の進み具合（`rungProgress`）。**得点と同じく呼び出し側が渡す**——
   * ここで読み直すと記録を二度読み、画面の切り替えが 1 拍遅れる。
   * 省略時は全首が段3 で、記録の無い学習者と同じになる。
   */
  progress: RungProgress = new Map(),
  /**
   * その回かぎりの手動調整（発注086）。**進み具合と同じく呼び出し側が渡す**——
   * 省略時は 0 で、自動の位置がそのまま配られる。
   */
  rungAdjust: RungAdjust = 0,
): PublishedQuestion[] {
  if (!available.length) return [];
  const ordered = inCardOrder(available, cardNumbers, seed, mode);
  // 本番だけは範囲選択で作者問を外せる。回数は常に本番の10問のままにする。
  const rule = entry === 'exam' && !includeAuthors
    ? { ...ENTRY_RULES.exam, blankWeight: 1, authorWeight: 0 }
    : ENTRY_RULES[entry];
  if (entry === 'review') return ordered;
  if (entry === 'view') return [];
  if (entry === 'learn') return takeAcrossCards(available.filter((question) => isServedBlank(question, progress, rungAdjust)), cardNumbers, seed, mode, rule);
  // 作者問題は首ごとに 1 問へ絞る。kana/free も type は author なので、
  // questionId を明示しないと 1 首から複数の作者問題が候補に入る。
  const selectable = available.filter((question) => isServedBlank(question, progress, rungAdjust)
    || (includeAuthors && question.questionId === authorQuestionIdFor(question.poemId, masteryScores[`${question.poemId}:author`] ?? 0)));
  if (entry === 'quick' || entry === 'author' || entry === 'exam') return takeAcrossCards(selectable, cardNumbers, seed, mode, rule, true);
  return takeAcrossCards(available, cardNumbers, seed, mode, rule);
}
