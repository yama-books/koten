import type { Normalization, Question } from '../domain/question.ts';

export type BlankUnit = 'word' | 'bunsetsu' | 'ku' | null;
export type PublishedQuestion = Readonly<{
  questionId: string;
  poemId: string;
  skill: 'text' | 'author' | 'reading';
  type: 'blank' | 'author';
  blankUnit: BlankUnit;
  /**
   * 隠す句（1〜5・昇順・重複なし）。作者問は空。
   *
   * **ID の文字列から推測させないために置いた**（発注084）。`Session.tsx` は
   * `/ku([1-5])$/` で ID の末尾を見ており、接尾辞が付くと句番号を捨てて
   * 「答えを含む最初の行」へ落ちていた。段4〜7 は複数行を隠すので、推測では成立しない。
   *
   * **昇順・重複なしを要求するのは表示の都合である**——隠す行が続いているかどうかで
   * 「まとめて 1 つの大きな空欄」を作る（依頼者指示・2026-09-15）。
   */
  blankedKu: readonly number[];
  /**
   * 難度の段（3〜8）。作者問は `null`——作者は別の梯子（選択式・読み・記述）を持つ。
   *
   * 3=一句 / 4=上句・下句 / 5=間3句 / 6=残り4句 / 7=全部書く / 8=番号だけ。
   * 段1（漢字だけ）・段2（句未満）は台帳の区切りが要るので未着手（工程3）。
   */
  rung: number | null;
  prompt: string;
  answer: string;
  answerHistorical: string;
  answerModern: string;
  acceptedAnswers: readonly string[];
  partialAnswers: readonly string[];
  candidates: readonly string[];
  normalization: Normalization;
  /** 学習者へ見せる一言。掛詞のように、正誤だけでは伝わらない事情がある問題にだけ入る。 */
  note: string | null;
  sourceRef: string;
  reviewStatus: 'human-confirmed';
  confirmationMode: 'individual' | 'batch';
  confirmedBy: string | null;
  confirmedOn: string | null;
  proposedBy: string;
  batchEvidenceRef: string | null;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStrings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

const KU_COUNT = 5;
/** 1〜5 の整数が昇順で重複なく並んでいること。表示が「まとめて 1 つの空欄」を作るのに要る。 */
function isBlankedKu(value: unknown): value is number[] {
  if (!Array.isArray(value)) return false;
  return value.every((item, index) => Number.isInteger(item)
    && item >= 1 && item <= KU_COUNT
    && (index === 0 || (value[index - 1] as number) < item));
}

const LOWEST_RUNG = 3;
const HIGHEST_RUNG = 8;
function isRung(value: unknown): value is number | null {
  return value === null || (Number.isInteger(value) && (value as number) >= LOWEST_RUNG && (value as number) <= HIGHEST_RUNG);
}

function isPublishedQuestion(value: unknown): value is PublishedQuestion {
  if (!isRecord(value)) return false;
  return typeof value.questionId === 'string'
    && typeof value.poemId === 'string'
    && (value.skill === 'text' || value.skill === 'author' || value.skill === 'reading')
    && (value.type === 'blank' || value.type === 'author')
    && (value.blankUnit === 'word' || value.blankUnit === 'bunsetsu' || value.blankUnit === 'ku' || value.blankUnit === null)
    && isBlankedKu(value.blankedKu)
    && isRung(value.rung)
    && typeof value.prompt === 'string'
    && typeof value.answer === 'string'
    && typeof value.answerHistorical === 'string'
    && typeof value.answerModern === 'string'
    && isStrings(value.acceptedAnswers)
    && isStrings(value.partialAnswers)
    && isStrings(value.candidates)
    && (value.normalization === 'exact' || value.normalization === 'kana')
    && (value.note === null || typeof value.note === 'string')
    && typeof value.sourceRef === 'string'
    && value.reviewStatus === 'human-confirmed'
    && (value.confirmationMode === 'individual' || value.confirmationMode === 'batch')
    && (typeof value.confirmedBy === 'string' || value.confirmedBy === null)
    && (typeof value.confirmedOn === 'string' || value.confirmedOn === null)
    && typeof value.proposedBy === 'string'
    && (typeof value.batchEvidenceRef === 'string' || value.batchEvidenceRef === null);
}

export function parseQuestions(value: unknown): PublishedQuestion[] {
  if (!Array.isArray(value)) throw new TypeError('questions must be an array');
  value.forEach((question, index) => {
    if (!isPublishedQuestion(question)) throw new TypeError(`invalid question record at ${index}`);
  });
  return value;
}

export function toQuestion(published: PublishedQuestion): Question {
  return {
    questionId: published.questionId,
    answer: published.answer,
    acceptedAnswers: published.acceptedAnswers,
    partialAnswers: published.partialAnswers,
    normalization: published.normalization,
  };
}
