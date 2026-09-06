import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BUTTON_KEYS, ENTRY_KEYS, QUESTION_TYPE_KEYS, STATS_KEYS } from '../../../packages/shared/src/telemetry/registry.ts';

const rulesFile = join(process.cwd(), 'firebase', 'firestore.rules');

function rulesText(): string {
  return readFileSync(rulesFile, 'utf8');
}

function listArgs(text: string, method: 'hasOnly' | 'hasAll', subject?: string): string[] {
  const escapedSubject = subject?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') ?? 'data\\.keys\\(\\)';
  const match = text.match(new RegExp(`${escapedSubject}\\.${method}\\(\\s*\\[([\\s\\S]*?)\\]\\s*\\)`));
  if (!match) throw new Error(`Missing ${method} allowlist${subject ? ` for ${subject}` : ''}`);
  return [...match[1].matchAll(/'([^']+)'/g)].map((entry) => entry[1]);
}

function hasOnlyArgs(text: string): string[] {
  return listArgs(text, 'hasOnly');
}

function sorted(values: readonly string[]): string[] {
  return [...values].sort();
}

function statsMatch(text: string, collection: 'test' | 'official'): string {
  const match = text.match(new RegExp(`match /stats_days_${collection}/\\{docId\\} \\{([\\s\\S]*?)\\n    \\}`));
  if (!match) throw new Error(`Missing stats_days_${collection} match block`);
  return match[1];
}

function packageSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return packageSourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

test('R-1 rules: hasOnly は外側の許可リストに1回だけ現れる', () => {
  assert.equal((rulesText().match(/data\.keys\(\)\.hasOnly/g) ?? []).length, 1, 'R-1: outer hasOnly must occur exactly once');
});

test('R-2 rules: hasOnly の許可キーが STATS_KEYS と一致する', () => {
  assert.deepEqual(sorted(hasOnlyArgs(rulesText())), sorted(STATS_KEYS), 'R-2: hasOnly keys must equal STATS_KEYS');
});

test('R-3 rules: hasAll の必須キーが STATS_KEYS と一致する', () => {
  assert.deepEqual(sorted(listArgs(rulesText(), 'hasAll')), sorted(STATS_KEYS), 'R-3: hasAll keys must equal STATS_KEYS');
});

test('R-4 rules: 入れ子のカウントマップ許可キーが registry と一致する', () => {
  const text = rulesText();
  assert.deepEqual(sorted(listArgs(text, 'hasAll', 'data.buttonCounts.keys()')), sorted(BUTTON_KEYS), 'R-4: buttonCounts keys must equal BUTTON_KEYS');
  assert.deepEqual(sorted(listArgs(text, 'hasOnly', 'data.entryCounts.keys()')), sorted(ENTRY_KEYS), 'R-4: entryCounts allowlist must equal ENTRY_KEYS');
  assert.deepEqual(sorted(listArgs(text, 'hasAll', 'data.entryCounts.keys()')), sorted(ENTRY_KEYS.filter((key) => key !== 'author')), 'R-4: legacy keys must remain required during migration');
  assert.deepEqual(sorted(listArgs(text, 'hasAll', 'data.questionTypeCounts.keys()')), sorted(QUESTION_TYPE_KEYS), 'R-4: questionTypeCounts keys must equal QUESTION_TYPE_KEYS');
  assert.match(text, /data\.buttonCounts\.keys\(\)\.size\(\) == 6/, 'R-4: buttonCounts key count must be fixed');
  assert.doesNotMatch(text, /data\.entryCounts\.keys\(\)\.size\(\)/, 'R-4: entryCounts must accept both 5 and 6 keys during migration');
  assert.match(text, /data\.questionTypeCounts\.keys\(\)\.size\(\) == 2/, 'R-4: questionTypeCounts key count must be fixed');
});

test('R-5 rules: test と official の両方の統計コレクションを定義する', () => {
  const text = rulesText();
  assert.match(text, /match \/stats_days_test\/\{docId\}/, 'R-5: stats_days_test match must exist');
  assert.match(text, /match \/stats_days_official\/\{docId\}/, 'R-5: stats_days_official match must exist');
});

test('R-6 rules: 両方の統計コレクションで create のみを許可する', () => {
  for (const collection of ['test', 'official'] as const) {
    const block = statsMatch(rulesText(), collection);
    const official = collection === 'official' ? 'true' : 'false';
    assert.match(block, new RegExp(`allow create: if isValidStats\\(request\\.resource\\.data, docId, ${official}\\);`), `R-6: ${collection} must allow validated create with matching official flag`);
    assert.match(block, /allow get, list, update, delete: if false;/, `R-6: ${collection} must deny non-create operations`);
  }
});

test('R-7 rules: 包括 match と認証内容による分岐を置かない', () => {
  const text = rulesText();
  assert.equal(text.includes('document=**'), false, 'R-7: catch-all match must not exist');
  assert.equal(text.includes('request.auth'), false, 'R-7: request.auth branching must not exist');
});

test('R-8 static: packages 全体に Analytics 実装を置かない', () => {
  const files = packageSourceFiles(join(process.cwd(), 'packages'));
  assert.ok(files.length >= 50, `R-8: expected at least 50 package source files, found ${files.length}`);
  const text = files.map((file) => readFileSync(file, 'utf8')).join('\n');
  for (const word of ['getAnalytics', 'firebase/analytics', 'gtag', 'measurementId']) {
    assert.equal(text.includes(word), false, `R-8: ${word} must not appear in package sources`);
  }
});
