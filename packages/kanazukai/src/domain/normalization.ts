export type GradingAction = 'button' | 'enter';

/** 採点用。歴史的表記の変換とは独立し、仕様表にある整形だけを行う。 */
export function normalizeForGrading(value: string): string {
  return toHiragana(value.normalize('NFC')).replace(/^[ \u3000]+|[ \u3000]+$/g, '');
}

/** IME確定前と Enter では採点を開始しない。 */
export function shouldGrade(isComposing: boolean, action: GradingAction): boolean {
  return !isComposing && action === 'button';
}

function toHiragana(value: string): string {
  return value.replace(/[ァ-ヶ]/g, (character) => String.fromCharCode(character.charCodeAt(0) - 0x60));
}
