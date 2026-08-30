import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { paths } from './paths.ts';
import { sha256 } from './hash.ts';
import { outputFiles } from './emit.ts';

export const FIXTURE_VALUES = [
  [3, 'author', '柿本人麻呂'], [5, 'author', '猿丸大夫'], [7, 'author', '安倍仲麿'], [13, 'ku1', 'つくばねの'], [28, 'author', '源宗于朝臣'],
  [32, 'ku1', '山川に'], [46, 'author', '曾禰好忠'], [66, 'author', '前大僧正行尊'], [70, 'ku4', 'いづこも同じ'], [74, 'ku3', '山おろしよ'],
] as const;
const kana = /^[ぁ-ゖゝゞー]+$/u;

export function validateData(data: { poems: any[]; manifest: any }, sourceFiles = paths.sources) {
  if (data.poems.length !== 100) throw new Error('V-01: expected 100 poems');
  const cards = data.poems.map((poem) => poem.cardNo);
  if (new Set(cards).size !== 100 || cards.some((card, index) => card !== index + 1)) throw new Error('V-01: output card numbers invalid');
  for (const poem of data.poems) {
    if (poem.ku.length !== 5 || poem.ku.some((value: string) => !value)) throw new Error(`V-02: invalid ku at ${poem.cardNo}`);
    if (poem.text !== poem.ku.join('')) throw new Error(`V-05: text mismatch at ${poem.cardNo}`);
    for (const reading of [poem.reading.historical, poem.reading.modern]) if ([reading.author, ...reading.ku].some((value: string) => !kana.test(value))) throw new Error(`V-06: non-kana reading at ${poem.cardNo}`);
  }
  for (const [cardNo, field, expected] of FIXTURE_VALUES) {
    const poem = data.poems[cardNo - 1]; const actual = field === 'author' ? poem.author.canonical : poem.ku[Number(field.slice(2)) - 1];
    if (actual !== expected) throw new Error(`V-04: fixture mismatch at ${cardNo} ${field}`);
  }
  for (const [name, expected] of Object.entries(data.manifest.sourceHashes)) {
    if (sha256(path.join(path.dirname(sourceFiles.poems), name)) !== expected) throw new Error(`V-12: hash mismatch for ${name}`);
  }
}
export function assertGeneratedCurrent(data: Record<string, unknown>, directory = paths.generated) {
  for (const { file, content } of outputFiles(directory, data)) if (!existsSync(file) || readFileSync(file, 'utf8') !== content) throw new Error(`V-14: stale generated file ${path.basename(file)}`);
}
