import type { KanazukaiRuleId } from './rules.v1.ts';
import type { ProtectedRange, RuleContext } from './rule-context.ts';

export type ConversionStages = Readonly<{
  normalized: string;
  exceptionProtected: string;
  h1: string;
  longVowels: string;
  smallKana: string;
}>;

export type ConversionResult = Readonly<{
  output: string;
  appliedRules: readonly KanazukaiRuleId[];
  stages: ConversionStages;
  protectedRanges: readonly ProtectedRange[];
}>;

export function convertHistoricalKana(input: string, context: RuleContext = {}): ConversionResult {
  const appliedRules: KanazukaiRuleId[] = [];
  const protectedRanges = [...(context.protectedRanges ?? []), ...(context.d1ExceptionRanges ?? [])];
  const protectedAt = new Set<number>();
  for (const range of protectedRanges) for (let index = range.start; index < range.end; index += 1) protectedAt.add(index);
  const record = (ruleId: KanazukaiRuleId): void => { if (!appliedRules.includes(ruleId)) appliedRules.push(ruleId); };
  const protect = (positions: readonly number[] | undefined, ruleId: KanazukaiRuleId): Set<number> => {
    const set = new Set(positions ?? []);
    if (set.size > 0) record(ruleId);
    return set;
  };

  const h1Protected = new Set([
    ...protect(context.h1WordInitialPositions, 'H1-a'),
    ...protect(context.h1CompoundInitialPositions, 'H1-b'),
    ...protect(context.h1ParticlePositions, 'H1-c'),
  ]);
  const w2Protected = protect(context.w2ParticlePositions, 'W2-a');
  if ((context.d1ExceptionRanges?.length ?? 0) > 0) record('D1-a');
  const exceptionProtected = input;

  const h1 = replaceCharacters(exceptionProtected, (character, index) => {
    // 文字列の先頭は語頭として確定しており、語彙や文法の推測を要しない。
    if (index === 0 || protectedAt.has(index) || h1Protected.has(index)) return character;
    const replacement = ({ は: 'わ', ひ: 'い', ふ: 'う', へ: 'え', ほ: 'お' } as Record<string, string>)[character];
    if (replacement !== undefined) { record('H1'); return replacement; }
    return character;
  });
  const base = replaceCharacters(h1, (character, index) => {
    if (protectedAt.has(index)) return character;
    if (character === 'ゐ') { record('W1'); return 'い'; }
    if (character === 'ゑ') { record('W1'); return 'え'; }
    if (character === 'を' && !w2Protected.has(index)) { record('W2'); return 'お'; }
    if (character === 'ぢ') { record('D1'); return 'じ'; }
    if (character === 'づ') { record('D1'); return 'ず'; }
    if (context.n1Positions?.includes(index) && character === 'む') { record('N1'); return 'ん'; }
    return character;
  });
  const semantic = replaceRanges(base, context.k1Ranges, (segment) => {
    if (segment === 'くわ') { record('K1'); return 'か'; }
    if (segment === 'ぐわ') { record('K1'); return 'が'; }
    return segment;
  });
  const longVowels = semantic
    .replace(/[あかさたなはまやらわがざだばぱ]う/g, (segment) => { record('L1'); return `${toLongA(segment[0])}う`; })
    .replace(/[いきしちにひみりぎじびぴ]う/g, (segment) => { record('L2'); return `${toLongI(segment[0])}う`; })
    .replace(/[えけせてねへめれげぜでべぺ]う/g, (segment) => { record('L3'); return `${toLongE(segment[0])}う`; });
  if (/[おこそとのほもよろをごぞどぼぽ]う/.test(longVowels)) record('L4');
  const smallKana = longVowels.replace(/[きしちじにひみりぎびぴ]や/g, (segment) => { record('S1'); return `${segment[0]}ゃ`; })
    .replace(/[きしちじにひみりぎびぴ]ゆ/g, (segment) => { record('S1'); return `${segment[0]}ゅ`; })
    .replace(/[きしちじにひみりぎびぴ]よ/g, (segment) => { record('S1'); return `${segment[0]}ょ`; })
    .replace(/([きしちにひみりぎじびぴ])つ/g, (_segment, first: string) => { record('S1'); return `${first}っ`; });
  return { output: smallKana, appliedRules, stages: { normalized: input, exceptionProtected, h1, longVowels, smallKana }, protectedRanges };
}

function replaceCharacters(value: string, mapper: (character: string, index: number) => string): string {
  let result = '';
  for (let index = 0; index < value.length;) {
    const character = String.fromCodePoint(value.codePointAt(index) ?? 0);
    result += mapper(character, index);
    index += character.length;
  }
  return result;
}

function replaceRanges(value: string, ranges: readonly ProtectedRange[] | undefined, mapper: (segment: string) => string): string {
  if (!ranges) return value;
  return [...ranges].sort((a, b) => b.start - a.start).reduce((result, range) => result.slice(0, range.start) + mapper(result.slice(range.start, range.end)) + result.slice(range.end), value);
}

function toLongA(character: string): string {
  return ({ あ: 'お', か: 'こ', さ: 'そ', た: 'と', な: 'の', は: 'ほ', ま: 'も', や: 'よ', ら: 'ろ', わ: 'を', が: 'ご', ざ: 'ぞ', だ: 'ど', ば: 'ぼ', ぱ: 'ぽ' } as Record<string, string>)[character] ?? character;
}

function toLongI(character: string): string {
  return ({ い: 'ゆ', き: 'きゆ', し: 'しゆ', ち: 'ちゆ', に: 'にゆ', ひ: 'ひゆ', み: 'みゆ', り: 'りゆ', ぎ: 'ぎゆ', じ: 'じゆ', び: 'びゆ', ぴ: 'ぴゆ' } as Record<string, string>)[character] ?? character;
}

function toLongE(character: string): string {
  return ({ え: 'よ', け: 'きよ', せ: 'しよ', て: 'ちよ', ね: 'によ', へ: 'ひよ', め: 'みよ', れ: 'りよ', げ: 'ぎよ', ぜ: 'じよ', で: 'ぢよ', べ: 'びよ', ぺ: 'ぴよ' } as Record<string, string>)[character] ?? character;
}
