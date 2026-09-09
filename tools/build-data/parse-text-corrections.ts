import { readFileSync } from 'node:fs';

export type TextCorrection = {
  cardNo: number;
  ku: number;
  acceptedAnswer: string;
  originalForm: string;
};

/**
 * PDF 原本との表記差を、表示用の原本表記と入力時の許容解答に分けて読む。
 * この台帳は監査ログであり、一次データの本文そのものはここから書き換えない。
 */
export function parseTextCorrections(file: string) {
  const rows = readFileSync(file, 'utf8').split(/\r?\n/u)
    .filter((line) => /^\|\s*\d+\s*\|/u.test(line))
    .map((line) => line.split('|').slice(1, -1).map((value) => value.trim().replace(/^`|`$/gu, '')));
  const corrections = rows.map(([cardNo, ku, _page, acceptedAnswer, originalForm, status]) => {
    if (status !== 'pdf_visual_checked_candidate') throw new Error(`text corrections: unsupported review status at ${cardNo}-${ku}`);
    if (!acceptedAnswer || !originalForm) throw new Error(`text corrections: empty form at ${cardNo}-${ku}`);
    return { cardNo: Number(cardNo), ku: Number(ku), acceptedAnswer, originalForm };
  });
  const keys = corrections.map((entry) => `${entry.cardNo}-${entry.ku}`);
  if (new Set(keys).size !== keys.length) throw new Error('text corrections: duplicate card/ku');
  return corrections;
}
