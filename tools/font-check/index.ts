import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// 100 首の本文・作者・読みから出る符号位置は現在 471 件であり、400 件未満は入力異常である。
const minimumCharacterCount = 400;

export function parseUnicodeRange(value: string): Set<number> {
  const codePoints = new Set<number>();
  for (const token of value.match(/U\+[0-9a-f]+(?:-[0-9a-f]+)?/gi) ?? []) {
    const [startHex, endHex] = token.slice(2).split('-');
    const start = Number.parseInt(startHex, 16);
    const end = Number.parseInt(endHex ?? startHex, 16);
    for (let codePoint = start; codePoint <= end; codePoint += 1) codePoints.add(codePoint);
  }
  return codePoints;
}

export function coverageByFamily(css: string): Map<string, Set<number>> {
  const coverage = new Map<string, Set<number>>();
  for (const match of css.matchAll(/@font-face\s*\{([\s\S]*?)\}/g)) {
    const face = match[1];
    const family = face.match(/font-family:\s*['"]([^'"]+)['"]/i)?.[1];
    const range = face.match(/unicode-range:\s*([^;]+);/i)?.[1];
    if (!family || !range) continue;
    const familyCoverage = coverage.get(family) ?? new Set<number>();
    for (const codePoint of parseUnicodeRange(range)) familyCoverage.add(codePoint);
    coverage.set(family, familyCoverage);
  }
  return coverage;
}

type FirstOccurrence = { cardNo: number; field: string; character: string; codePoint: number };

function collectCharacters(poems: Array<Record<string, any>>): Map<number, FirstOccurrence> {
  const occurrences = new Map<number, FirstOccurrence>();
  const add = (value: string, cardNo: number, field: string) => {
    for (const character of value) {
      const codePoint = character.codePointAt(0)!;
      if (!occurrences.has(codePoint)) occurrences.set(codePoint, { cardNo, field, character, codePoint });
    }
  };
  for (const poem of poems) {
    const cardNo = poem.cardNo;
    for (const text of poem.ku) add(text, cardNo, '本文');
    add(poem.author.canonical, cardNo, '作者名');
    for (const mode of ['historical', 'modern'] as const) {
      for (const text of poem.reading[mode].ku) add(text, cardNo, `${mode === 'historical' ? '歴史的仮名遣い' : '現代仮名遣い'}本文`);
      add(poem.reading[mode].author, cardNo, `${mode === 'historical' ? '歴史的仮名遣い' : '現代仮名遣い'}作者名`);
    }
  }
  return occurrences;
}

export function runFontCheck(): number {
  const poems = JSON.parse(readFileSync(path.join(root, 'packages/hyakunin/src/data/generated/poems.json'), 'utf8')) as Array<Record<string, any>>;
  const css = readFileSync(path.join(root, 'packages/shared/src/styles/fonts.css'), 'utf8');
  const characters = collectCharacters(poems);
  const coverage = coverageByFamily(css);
  let missingTotal = 0;

  console.log(`走査符号位置数: ${characters.size}`);
  if (characters.size < minimumCharacterCount) {
    console.error(`check:font: 検査対象が不足しています（走査 ${characters.size} 件、必要 ${minimumCharacterCount} 件以上）`);
    return 1;
  }
  for (const family of ['Klee One', 'Zen Maru Gothic']) {
    const supported = coverage.get(family) ?? new Set<number>();
    const missing = [...characters.values()].filter(({ codePoint }) => !supported.has(codePoint));
    missingTotal += missing.length;
    console.log(`${family}: 対応 ${characters.size - missing.length}/${characters.size}, 未対応 ${missing.length}`);
    for (const item of missing) {
      console.log(`未対応 ${family}: U+${item.codePoint.toString(16).toUpperCase().padStart(4, '0')} ${item.character} 第${item.cardNo}首 ${item.field}`);
    }
  }
  return missingTotal === 0 ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = runFontCheck();
