import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { paths } from '../build-data/paths.ts';
import { parseSource } from './parse-source.ts';
import { tokenizeKu } from './tokenize.ts';
import { alignChunksToReading } from './align-reading.ts';
import { splitSeihonAtBreakpoints } from './align-seihon.ts';
import { BLANK_CHUNK_READING_ALLOCATIONS } from './allocations.ts';
import { stringifyBlankChunks, type BlankChunkEntry } from './yaml.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SOURCE_MD = path.join(root, '百人一首_句未満ランダム空欄候補_v3.md');
const OUTPUT = path.join(paths.review, 'blank-chunks.yaml');

type Poem = { cardNo: number; ku: string[]; reading: { historical: { ku: string[] } } };

export type BuildResult = { entries: BlankChunkEntry[]; counts: { unsplit: number; unique: number; table: number; impossible: number } };

/** 発注085の本体。資料の区切りを正本表記へ移す。停止条件は投げて呼び手に返す。 */
export function buildBlankChunks(sourceMarkdown: string, poems: readonly Poem[]): BuildResult {
  const docPoems = parseSource(sourceMarkdown);
  const poemsByCardNo = new Map(poems.map((poem) => [poem.cardNo, poem]));
  const allocationsByKey = new Map(BLANK_CHUNK_READING_ALLOCATIONS.map((item) => [`${item.cardNo}-${item.ku}`, item.readings]));

  const entries: BlankChunkEntry[] = [];
  const counts = { unsplit: 0, unique: 0, table: 0, impossible: 0 };

  for (const docPoem of docPoems) {
    const poem = poemsByCardNo.get(docPoem.cardNo);
    if (!poem) throw new Error(`${docPoem.cardNo}番: poems.json に無い`);

    docPoem.kuRaw.forEach((raw, kuIndex) => {
      const ku = kuIndex + 1;
      const docChunks = tokenizeKu(raw);
      const seihonText = poem.ku[kuIndex]!;
      const readingText = poem.reading.historical.ku[kuIndex]!;

      if (docChunks.length === 1) {
        counts.unsplit += 1;
        entries.push({ cardNo: docPoem.cardNo, ku, text: seihonText, chunks: [seihonText], readings: [readingText], candidate: [docChunks[0]!.candidate] });
        return;
      }

      const chunkTexts = docChunks.map((chunk) => chunk.text);
      const solutions = alignChunksToReading(chunkTexts, readingText);
      if (solutions.length === 0) {
        throw new Error(`${docPoem.cardNo}番第${ku}句: 割り付け不能（0件のはず）。資料か読みの取り違えを疑う: ${raw} / ${readingText}`);
      }

      let readings: string[];
      if (solutions.length === 1) {
        counts.unique += 1;
        readings = solutions[0]!;
      } else {
        const key = `${docPoem.cardNo}-${ku}`;
        const allocated = allocationsByKey.get(key);
        if (!allocated) {
          throw new Error(
            `${docPoem.cardNo}番第${ku}句: 読みの割り付けが一意に決まらない（${solutions.length} 通り）が、` +
            `§2 の裁定表に無い。11件のはずが12件目が出た。自分で読みを決めず、資料か読みの取り違えを疑うこと: ${raw} / ${readingText}`,
          );
        }
        if (allocated.length !== chunkTexts.length) {
          throw new Error(`${docPoem.cardNo}番第${ku}句: 裁定表のかたまり数（${allocated.length}）が資料の区切り数（${chunkTexts.length}）と合わない`);
        }
        if (allocated.join('') !== readingText) {
          throw new Error(`${docPoem.cardNo}番第${ku}句: 裁定表の読みをつないでも ${readingText} に戻らない（${allocated.join('｜')}）`);
        }
        counts.table += 1;
        readings = [...allocated];
      }

      const breakpoints: number[] = [];
      let cursor = 0;
      for (const reading of readings.slice(0, -1)) { cursor += reading.length; breakpoints.push(cursor); }

      const seihonChunks = splitSeihonAtBreakpoints(seihonText, readingText, breakpoints);
      if (!seihonChunks) {
        throw new Error(`${docPoem.cardNo}番第${ku}句: 読みの区切りを正本表記へ当てはめられない（${seihonText} / ${readingText} / ${breakpoints.join(',')}）`);
      }

      entries.push({
        cardNo: docPoem.cardNo, ku, text: seihonText,
        chunks: seihonChunks, readings, candidate: docChunks.map((chunk) => chunk.candidate),
      });
    });
  }

  if (entries.length !== 500) throw new Error(`entries が500件でない（実測 ${entries.length}）`);
  return { entries, counts };
}

function main(): void {
  const sourceMarkdown = fs.readFileSync(SOURCE_MD, 'utf8');
  const poems = JSON.parse(fs.readFileSync(path.join(paths.generated, 'poems.json'), 'utf8')) as Poem[];
  const { entries, counts } = buildBlankChunks(sourceMarkdown, poems);
  entries.sort((left, right) => left.cardNo - right.cardNo || left.ku - right.ku);
  fs.writeFileSync(OUTPUT, stringifyBlankChunks(entries));
  console.log(`書き出し: ${OUTPUT}`);
  console.log(`割れない句: ${counts.unsplit}`);
  console.log(`一意に決まる: ${counts.unique}`);
  console.log(`裁定表で解く: ${counts.table}`);
  console.log(`割り付け不能: ${counts.impossible}`);
  console.log(`合計: ${entries.length}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
