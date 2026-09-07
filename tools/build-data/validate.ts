import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { paths } from './paths.ts';
import { sha256 } from './hash.ts';
import { outputFiles, serialize } from './emit.ts';

export const FIXTURE_VALUES = [
  [3, 'author', '柿本人麻呂'], [5, 'author', '猿丸大夫'], [7, 'author', '安倍仲麿'], [13, 'ku1', 'つくばねの'], [28, 'author', '源宗于朝臣'],
  [32, 'ku1', '山川に'], [46, 'author', '曾禰好忠'], [66, 'author', '前大僧正行尊'], [70, 'ku4', 'いづこもおなじ'], [74, 'ku3', '山おろしよ'],
] as const;
const kana = /^[ぁ-ゖゝゞー]+$/u;

export function validateData(data: { poems: any[]; layoutHints?: any[]; questionsBlank?: any[]; questionsAuthor?: any[]; review?: any; manifest: any }, sourceFiles = paths.sources) {
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
  const review = data.review;
  if (review) {
    for (const [name, entries] of Object.entries(review) as [string, any[]][]) {
      for (const entry of entries) {
        if (entry.confirmationMode === 'batch' && !entry.batchEvidenceRef) throw new Error(`V-15: ${name} cardNo ${entry.cardNo ?? 'none'} lacks batchEvidenceRef`);
        if (entry.proposedBy === 'ai' && entry.status === 'approved' && (!entry.confirmedBy || !entry.confirmedOn)) throw new Error(`V-16: ${name} cardNo ${entry.cardNo ?? 'none'} lacks confirmation`);
      }
    }
    for (const entry of review.kugire) if (entry.displayConvenienceOnly !== true) throw new Error(`V-09: kugire cardNo ${entry.cardNo} lacks displayConvenienceOnly`);
    const approvedAliases = new Set(review.authors.filter((entry: any) => entry.status === 'approved').flatMap((entry: any) => (entry.aliases ?? []).map((alias: string) => `${entry.cardNo}:${alias}`)));
    for (const poem of data.poems) for (const alias of poem.author.aliases) if (!approvedAliases.has(`${poem.cardNo}:${alias}`)) throw new Error(`V-10: authors cardNo ${poem.cardNo} lacks approved alias ${alias}`);
  }
  for (const hint of data.layoutHints ?? []) if (!hint.confirmedBy || !hint.confirmedOn) throw new Error(`V-08: layout cardNo ${hint.cardNo} lacks confirmation`);
  for (const [file, questions] of [['questions.blank.json', data.questionsBlank ?? []], ['questions.author.json', data.questionsAuthor ?? []] as const]) {
    for (const question of questions) if (question.reviewStatus !== 'human-confirmed') throw new Error(`V-07: ${file} ${question.questionId} is not human-confirmed`);
  }
  for (const question of data.questionsAuthor ?? []) {
    if (!question.candidates.length) continue;
    const unique = new Set(question.candidates);
    if (unique.size !== question.candidates.length) throw new Error(`V-13: ${question.questionId} has duplicate candidates`);
    const correctCandidate = data.poems.find((poem) => poem.poemId === question.poemId)?.author.canonical;
    if (!unique.has(correctCandidate)) throw new Error(`V-13: ${question.questionId} has no correct candidate`);
    const distractors = question.candidates.filter((candidate: string) => candidate !== correctCandidate).length;
    if (distractors < 4) throw new Error(`V-13: ${question.questionId} has ${distractors} distractors`);
  }
}
export function assertGeneratedCurrent(data: Record<string, unknown>, directory = paths.generated) {
  for (const { file, content } of outputFiles(directory, data)) {
    if (!existsSync(file)) throw new Error(`V-14: stale generated file ${path.basename(file)} (file is missing)`);
    const actual = readFileSync(file, 'utf8');
    if (path.basename(file) !== 'manifest.json') {
      if (actual !== content) throw new Error(`V-14: stale generated file ${path.basename(file)} (content differs)`);
      continue;
    }

    let actualManifest: Record<string, unknown>;
    try {
      actualManifest = JSON.parse(actual) as Record<string, unknown>;
    } catch {
      throw new Error('V-14: stale generated file manifest.json (invalid JSON)');
    }
    if (!Object.prototype.hasOwnProperty.call(actualManifest, 'generatedOn')) {
      throw new Error('V-14: stale generated file manifest.json (field generatedOn is missing)');
    }
    if (typeof actualManifest.generatedOn !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(actualManifest.generatedOn)) {
      throw new Error('V-14: stale generated file manifest.json (field generatedOn must be YYYY-MM-DD)');
    }
    const expectedManifest = JSON.parse(content) as Record<string, unknown>;
    const actualComparable = { ...actualManifest }; delete actualComparable.generatedOn;
    const expectedComparable = { ...expectedManifest }; delete expectedComparable.generatedOn;
    if (serialize(actualComparable) !== serialize(expectedComparable)) {
      const fields = new Set([...Object.keys(actualComparable), ...Object.keys(expectedComparable)]);
      const differing = [...fields].filter((field) => serialize(actualComparable[field]) !== serialize(expectedComparable[field]));
      throw new Error(`V-14: stale generated file manifest.json (field differs: ${differing.join(', ') || 'unknown'})`);
    }
  }
}
