import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'vitest';

const uiRoot = join(process.cwd(), 'packages/hyakunin/src/ui');
const uiRoots = [uiRoot, join(process.cwd(), 'packages/shared/src/ui')];
function collectUiSources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? collectUiSources(join(directory, entry.name)) : entry.name.endsWith('.tsx') || entry.name.endsWith('.ts') ? [join(directory, entry.name)] : []);
}
const forbidden = [/setTimeout/, /setInterval/, /fetch\(/, /XMLHttpRequest/, /sendBeacon/, /順位|偏差値|ランキング|連続日数|他の人/, /平均|学年別|みんなの/, /MASTERY_RULES|INCORRECT_DECREMENT|normalizeAnswer/];

test('no-pressure: UI source targets are non-empty and include Session', () => {
  const files = uiRoots.flatMap(collectUiSources);
  assert.ok(files.length > 0, '検査対象が空では検査にならない');
  assert.ok(files.some((file) => file.endsWith('Session.tsx')), 'Session.tsx が対象に入っていない');
  assert.ok(files.some((file) => file.endsWith('MasteryMeter.tsx')), 'MasteryMeter.tsx が対象に入っていない');
  for (const file of files) for (const pattern of forbidden) assert.equal(pattern.test(readFileSync(file, 'utf8')), false, `${file} contains ${pattern}`);
});

test('no-pressure: UI source targets include .ts adapters', () => {
  const files = uiRoots.flatMap(collectUiSources);
  assert.ok(files.some((file) => file.endsWith('Session.tsx')), 'Session.tsx が対象に入っていない');
  assert.ok(files.some((file) => file.endsWith('indexeddb-port.ts')), 'indexeddb-port.ts（.ts）が対象に入っていない');
});

test('no-pressure: Home.tsx loads generated data through static new URL() calls', () => {
  const source = readFileSync(join(uiRoot, 'screens/Home.tsx'), 'utf8');
  const newUrlArgs = Array.from(source.matchAll(/new URL\(([^,]+),/g)).map((match) => match[1]);
  assert.ok(newUrlArgs.length > 0, 'new URL( の呼び出しが見つからない');
  for (const arg of newUrlArgs) assert.equal(arg.includes('`'), false, `new URL() の引数がテンプレートリテラルになっている: ${arg}`);
});
