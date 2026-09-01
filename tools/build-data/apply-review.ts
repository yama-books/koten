import { readFileSync } from 'node:fs';
import { parseYaml } from './parse-yaml.ts';
import { paths } from './paths.ts';

export type ReviewEntry = Record<string, any>;
export type ReviewLedgers = Record<'authors' | 'readings' | 'kugire' | 'layout' | 'blanks', ReviewEntry[]>;
const names = ['authors', 'readings', 'kugire', 'layout', 'blanks'] as const;
const statuses = ['pending', 'approved', 'rejected', 'hold'] as const;

export function readReviewLedgers(directory = paths.review): ReviewLedgers {
  return Object.fromEntries(names.map((name) => {
    const parsed = parseYaml(readFileSync(paths.reviewFile(directory, name), 'utf8'));
    if (parsed.version !== 1 || !Array.isArray(parsed.entries)) throw new Error(`review ${name}: expected version 1 and entries array`);
    return [name, parsed.entries];
  })) as ReviewLedgers;
}

export function reviewCounts(ledgers: ReviewLedgers, blankCandidates = 0) {
  return Object.fromEntries(names.map((name) => {
    const entries = ledgers[name];
    const expected = name === 'blanks' ? blankCandidates : 100;
    const missing = Math.max(0, expected - entries.length);
    return [name, Object.fromEntries(statuses.map((status) => [status, entries.filter((entry) => entry.status === status).length + (status === 'pending' ? missing : 0)]))];
  }));
}

export function applyReview(poems: any[], directory = paths.review, blankCandidates = 0) {
  const review = readReviewLedgers(directory);
  for (const entry of review.authors.filter((item) => item.status === 'approved')) {
    const poem = poems.find((item) => item.cardNo === entry.cardNo);
    if (poem) { poem.author.aliases = entry.aliases; poem.author.confirmed = true; }
  }
  for (const entry of review.readings.filter((item) => item.status === 'approved')) {
    const poem = poems.find((item) => item.cardNo === entry.cardNo);
    if (poem) poem.reading.status = 'confirmed';
  }
  const layoutHints = review.layout.filter((entry) => entry.status === 'approved').map((entry) => ({ cardNo: entry.cardNo, breaks: entry.breaks, confirmedBy: entry.confirmedBy, confirmedOn: entry.confirmedOn, device: entry.device }));
  return { poems, layoutHints, review, reviewCounts: reviewCounts(review, blankCandidates) };
}
