import { parsePoems } from './parse-poems.ts';
import { parseAllReadings } from './parse-readings.ts';
import { parseVariants, readingReviewCardNumbers } from './parse-variants.ts';
import { DATA_VERSION, GENERATOR_VERSION, paths } from './paths.ts';
import { sourceHashes } from './hash.ts';
import { emit } from './emit.ts';
import { assertGeneratedCurrent, validateData } from './validate.ts';
import { applyReview } from './apply-review.ts';
import { generateQuestions } from './questions.ts';
import { fileURLToPath } from 'node:url';

export function buildData(reviewDirectory = paths.review) {
  const source = parsePoems(); const readings = parseAllReadings(); const variants = parseVariants(); const reviewCards = readingReviewCardNumbers(variants);
  assertCardAlignment(source, readings);
  const poems = source.map((poem, index) => {
    const historical = readings.historical[index], modern = readings.modern[index];
    return { cardNo: poem.cardNo, poemId: `p${String(poem.cardNo).padStart(3, '0')}`, ku: poem.ku, text: poem.ku.join(''), kami: poem.ku.slice(0, 3).join(''), shimo: poem.ku.slice(3).join(''),
      author: { canonical: poem.author, aliases: [], confirmed: false },
      // confirmed means the variant record has no unsettled reading, not that a human approved a review ledger.
      reading: { historical: { ku: historical.ku, author: historical.author }, modern: { ku: modern.ku, author: modern.author }, status: reviewCards.has(poem.cardNo) ? 'review' : 'confirmed' },
      sourceRef: '百人一首_本文・作者_一次データ.md', dataVersion: DATA_VERSION };
  });
  const reviewed = applyReview(poems, reviewDirectory, poems.length * 5);
  const questions = generateQuestions(reviewed.poems, reviewed.review);
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
