import { parsePoems } from './parse-poems.ts';
import { parseAllReadings } from './parse-readings.ts';
import { parseVariants, readingReviewCardNumbers } from './parse-variants.ts';
import { parseTextCorrections } from './parse-text-corrections.ts';
import { DATA_VERSION, GENERATOR_VERSION, paths } from './paths.ts';
import { sourceHashes } from './hash.ts';
import { emit } from './emit.ts';
import { assertGeneratedCurrent, validateData } from './validate.ts';
import { applyReview } from './apply-review.ts';
import { generateQuestions } from './questions.ts';
import { parseBlankChunksYaml } from '../blank-chunks/yaml.ts';
import { existsSync, readFileSync } from 'node:fs';
import nodePath from 'node:path';
import { fileURLToPath } from 'node:url';

export function buildData(reviewDirectory = paths.review) {
  const source = parsePoems(); const readings = parseAllReadings(); const variants = parseVariants(); const textCorrections = parseTextCorrections(paths.sources.textCorrections); const reviewCards = readingReviewCardNumbers(variants);
  const correctionsByKu = new Map(textCorrections.map((entry) => [`${entry.cardNo}-${entry.ku}`, entry]));
  assertCardAlignment(source, readings);
  const poems = source.map((poem, index) => {
    const historical = readings.historical[index], modern = readings.modern[index];
    const acceptedTextForms = poem.ku.map((form, kuIndex) => {
      const correction = correctionsByKu.get(`${poem.cardNo}-${kuIndex + 1}`);
      if (!correction) return [];
      if (correction.originalForm !== form) throw new Error(`text corrections: primary mismatch at ${poem.cardNo}-${kuIndex + 1}`);
      return [correction.acceptedAnswer];
    });
    return { cardNo: poem.cardNo, poemId: `p${String(poem.cardNo).padStart(3, '0')}`, ku: poem.ku, acceptedTextForms, text: poem.ku.join(''), kami: poem.ku.slice(0, 3).join(''), shimo: poem.ku.slice(3).join(''),
      author: { canonical: poem.author, aliases: [], confirmed: false },
      // confirmed means the variant record has no unsettled reading, not that a human approved a review ledger.
      reading: { historical: { ku: historical.ku, author: historical.author }, modern: { ku: modern.ku, author: modern.author }, status: reviewCards.has(poem.cardNo) ? 'review' : 'confirmed' },
      sourceRef: '百人一首_本文・作者_一次データ.md', dataVersion: DATA_VERSION };
  });
  const reviewed = applyReview(poems, reviewDirectory, poems.length * 5);
  // 語の境目の台帳（発注085）。無ければ段1・2 を作らない。
  const chunksPath = nodePath.join(paths.review, 'blank-chunks.yaml');
  const blankChunks = existsSync(chunksPath) ? parseBlankChunksYaml(readFileSync(chunksPath, 'utf8')).entries : [];
  const questions = generateQuestions(reviewed.poems, reviewed.review, undefined, blankChunks);
  // **ここが止め口である。** 読みの割り付けが決まらない句を残したまま配らない——
  // 機械に 1 つ選ばせると、誤った形（`よしの里に` など）が正解として配られる（裁定 D-10）。
  if (questions.allocationProblems.length > 0) throw new Error(['V-20: 読みの割り付けが決まらない句がある', ...questions.allocationProblems].join(String.fromCharCode(10)));
  const manifest = { dataVersion: DATA_VERSION, generatorVersion: GENERATOR_VERSION, generatedOn: new Date().toISOString().slice(0, 10), sourceHashes: sourceHashes(Object.values(paths.sources)), counts: { poems: poems.length, variants: variants.length, blankCandidates: questions.blankCandidates, authorCandidates: questions.authorCandidates, questionsBlank: questions.questionsBlank.length, questionsAuthor: questions.questionsAuthor.length }, reviewCounts: reviewed.reviewCounts };
  const data = { poems: reviewed.poems, variants, layoutHints: reviewed.layoutHints, questionsBlank: questions.questionsBlank, questionsAuthor: questions.questionsAuthor, manifest, review: reviewed.review };
  validateData(data); return data;
}
export function assertCardAlignment(source: { cardNo: number }[], readings: { historical: { cardNo: number }[]; modern: { cardNo: number }[] }) {
  if (source.length !== readings.historical.length || source.length !== readings.modern.length) throw new Error('V-03: table lengths do not match');
  for (let index = 0; index < source.length; index += 1) if (source[index]?.cardNo !== readings.historical[index]?.cardNo || source[index]?.cardNo !== readings.modern[index]?.cardNo) throw new Error(`V-03: card mismatch at row ${index + 1}`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const data = buildData();
  if (process.argv.includes('--check')) assertGeneratedCurrent(data); else emit(paths.generated, data);
}
