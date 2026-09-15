import { orderCardNumbers, type OrderMode } from './order.ts';
import type { PublishedQuestion } from '../data/question-schema.ts';
import { FLAG_RUNG, LOWEST_RUNG, RUNG_CAPS, rungProgress, type RungState } from '@koten/shared/domain/mastery/rungs';
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

/**
 * 一度は正解したことのある問題（依頼者・2026-09-15）。**記録から作る。**
 * **呼び出し側で組み立てを書き写さない**——書き写すと片方だけ古くなる（`progressFrom` と同じ理由）。
 */
export function answeredFrom(events: readonly Event[]): ReadonlySet<string> {
  return new Set(events.filter((event) => event.outcome === 'correct' && event.questionId !== undefined).map((event) => event.questionId!));
}

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

/**
 * **まだ正解していない問題を先に出す**（依頼者・2026-09-15）。
 *
 * 段の移行は「制覇」——その段を全部一度は正解すること——で起きる。
 * **同じ句ばかり出ると、何回解いても制覇が進まず、段が上がらない。**
 *
 * **正解済みを捨てない。** その段を全部正解し終えた歌では、これまでどおり全部から選ぶ
 * ——捨てると、制覇済みの段に居る歌が 1 問も出なくなる。
 */
function preferUnanswered(candidates: readonly PublishedQuestion[], answered: ReadonlySet<string>): readonly PublishedQuestion[] {
  const unanswered = candidates.filter((question) => !answered.has(question.questionId));
  return unanswered.length > 0 ? unanswered : candidates;
}

function takeAcrossCards(available: readonly PublishedQuestion[], cardNumbers: readonly number[], seed: string, mode: OrderMode, rule: EntryRule, strictType = false, answered: ReadonlySet<string> = new Set()): PublishedQuestion[] {
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
    const candidates = preferUnanswered(preferredQuestions.length > 0 ? preferredQuestions : strictType ? [] : cardQuestions, answered);
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
function authorQuestionIdFor(poemId: string, authorScore: number, adjust: RungAdjust = 0): string {
  /*
   * **手動の調整は作者にも効く**（依頼者・2026-09-15）。これまでは本文の段にしか効かず、
   * 「やさしくする」を押しても作者問題は同じものが出ていた。
   *
   * **向きだけを見る。** 作者は 2 通り（選択式・自由入力）しかないので、何段ぶん動かしたかは意味を持たない。
   * `kana` を挟まないのは上の注記のとおりである。
   */
  if (adjust > 0) return `${poemId}-author-choice`;
  if (adjust < 0) return `${poemId}-author-free`;
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
 * 記録に残す段と、手で上げて挑んだ印（発注086・§4.1・§4.3）。**段だけを書き写さない。**
 *
 * **天井は自動の位置の段のものを使う。** 段3 の学習者が段5 に挑んでも天井は 55 のままである
 * ——開けてしまうと、段1・2・3 を 1 問も制覇せずに段5 で 80 まで行ける。梯子の意味が消える。
 * 天井は `computeMastery` が `rung` から引くので、**ここで低いほうを渡す。**
 *
 * **印は真のときだけ付ける。** 既定値を保存へ書き込まない。
 */
export function rungRecordFor(question: PublishedQuestion, progress: RungProgress = new Map(), masteryScores: Readonly<Record<string, number>> = {}): Readonly<{ rung: number | null; raised?: true }> {
  if (question.rung === null) return { rung: null }; // 作者問は本文の梯子に乗らない。
  // **自動の段と同じ土台で測る。** `openRung` で測ると、自動で送った段まで「手で上げた」ことになり、
  // 記録の段が下がって**天井が開かないまま**になる（行き止まりが直らない）。
  const autoRung = autoRungFor(question.poemId, progress, masteryScores);
  if (question.rung <= autoRung) return { rung: question.rung };
  return { rung: autoRung, raised: true };
}

/**
 * その歌に自動で配る段（2026-09-15・依頼者裁定）。**点が入る一番下の段である。**
 *
 * **段の梯子を後から入れたので、すでに段の天井より上にいる学習者は加算が 0 になる。**
 * 本文 81 の学習者に段3（天井55）を配っても、20 問正解して 81 のままである。
 * `openRung` は「制覇」でしか上がらないので、**点も段も動かない行き止まりになる**
 * （利用者からの報告——「85%で頭打ち、ほかの70%台も上がらない」。実測で再現した）。
 *
 * **段は歌ごとに決まる。範囲の平均では決めない。** 飛ばすのは「その歌で天井を超えている段」だけで、
 * 習熟度が低い歌はこれまでどおり一番下から配る。
 *
 * **易しい段を捨てるのではない。** 自動が黙って配らないだけで、「やさしくする」で取りに行ける
 * ——点は入らないが制覇は進む。
 *
 * 一番上の段（`FLAG_RUNG`）は点を動かさない段なので天井では測れない。**そこで打ち止めにする。**
 */
export function autoRungFor(poemId: string, progress: RungProgress, masteryScores: Readonly<Record<string, number>> = {}): number {
  const score = masteryScores[`${poemId}:text`] ?? 0;
  let rung = openRungFor(poemId, progress);
  while (rung < FLAG_RUNG && (RUNG_CAPS[rung] ?? 0) <= score) rung += 1;
  return rung;
}

/**
 * 範囲でいちばん易しい自動の段（発注086）。**画面には出さない。** 操作の可否だけに使う
 * ——段は歌ごとに決まるので、範囲に対して 1 つの段を名乗ると実際の出題と食い違う。
 */
export function rangeAutoRung(range: Readonly<{ from: number; to: number }>, progress: RungProgress, masteryScores: Readonly<Record<string, number>> = {}): number {
  let lowest = FLAG_RUNG;
  for (let cardNo = range.from; cardNo <= range.to; cardNo += 1) {
    lowest = Math.min(lowest, autoRungFor(`p${String(cardNo).padStart(3, '0')}`, progress, masteryScores));
  }
  return lowest;
}

/**
 * 歌ごとに、この回に配る段を決める（発注086・2026-09-15）。
 *
 * **送り先の段の問題がその歌に無ければ、あるうちで一番近い下の段へ落とす。**
 * 落とさないと絞り込みが空になり、**その歌だけ 1 問も出なくなる**——目録がそろっていない歌
 * （試験用の目録、段を足している途中）で起きる。**歌を出題から消さない。**
 */
function servedRungs(available: readonly PublishedQuestion[], progress: RungProgress, adjust: RungAdjust, masteryScores: Readonly<Record<string, number>>): ReadonlyMap<string, number> {
  const byPoem = new Map<string, number[]>();
  for (const question of available) {
    if (question.type !== 'blank' || question.rung === null) continue;
    byPoem.set(question.poemId, [...(byPoem.get(question.poemId) ?? []), question.rung]);
  }
  const served = new Map<string, number>();
  for (const [poemId, rungs] of byPoem) {
    const target = effectiveRung(autoRungFor(poemId, progress, masteryScores), adjust);
    const below = rungs.filter((rung) => rung <= target);
    served.set(poemId, below.length > 0 ? Math.max(...below) : Math.min(...rungs));
  }
  return served;
}

function isServedBlank(question: PublishedQuestion, served: ReadonlyMap<string, number>): boolean {
  return question.type === 'blank' && question.rung === served.get(question.poemId);
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
  /**
   * 一度は正解したことのある問題（依頼者・2026-09-15）。**同じ段の中をまんべんなく回すために渡す。**
   * 省略時はこれまでどおりの選び方になる。
   */
  answered: ReadonlySet<string> = new Set(),
): PublishedQuestion[] {
  if (!available.length) return [];
  const served = servedRungs(available, progress, rungAdjust, masteryScores);
  const ordered = inCardOrder(available, cardNumbers, seed, mode);
  // 本番だけは範囲選択で作者問を外せる。回数は常に本番の10問のままにする。
  const rule = entry === 'exam' && !includeAuthors
    ? { ...ENTRY_RULES.exam, blankWeight: 1, authorWeight: 0 }
    : ENTRY_RULES[entry];
  if (entry === 'review') return ordered;
  if (entry === 'view') return [];
  if (entry === 'learn') return takeAcrossCards(available.filter((question) => isServedBlank(question, served)), cardNumbers, seed, mode, rule, false, answered);
  // 作者問題は首ごとに 1 問へ絞る。kana/free も type は author なので、
  // questionId を明示しないと 1 首から複数の作者問題が候補に入る。
  const selectable = available.filter((question) => isServedBlank(question, served)
    || (includeAuthors && question.questionId === authorQuestionIdFor(question.poemId, masteryScores[`${question.poemId}:author`] ?? 0, rungAdjust)));
  if (entry === 'quick' || entry === 'author' || entry === 'exam') return takeAcrossCards(selectable, cardNumbers, seed, mode, rule, true, answered);
  return takeAcrossCards(available, cardNumbers, seed, mode, rule, false, answered);
}
