import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';

const source = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const home = () => source('packages/hyakunin/src/ui/screens/Home.tsx');
const session = () => source('packages/hyakunin/src/ui/screens/Session.tsx');
const styles = () => source('packages/hyakunin/src/styles.css');
const overflow = () => source('tools/overflow-check/index.ts');

test('073-1: 縦書きの器を中央に置き、広幅を走査する', () => {
  expect(styles()).toContain('.poem-sheet--vertical { width: min(100%, 30rem); margin-inline: auto; }');
  expect(overflow()).toContain('const widths = [320, 375, 414, 768, 1024, 1440];');
  expect(overflow()).toContain("'verticalSheetCentered'");
});
test('073-2: ヘッダは歌番号だけで、メーターは進みを繰り返さない', () => {
  expect(session()).toContain('{Number(question.poemId.slice(1))}番\n');
  expect(session()).not.toContain('text={`進み');
  expect(home()).not.toContain('進み ${restorable');
});
test('073-3: フィードバックは乗算のまま答え欄の外に置く', () => {
  expect(styles()).toContain('.feedback-mark img, .perfect-mark img { mix-blend-mode: multiply; }');
  expect(styles()).toContain('.answer-retained .feedback-mark { grid-column: 2;');
});
test('073-4a: 初回設定のDOM順は学年、統計説明、OK', () => {
  const value = home();
  const grade = value.indexOf('<GradePicker value={pendingGrade}');
  const notice = value.indexOf('<StatsNotice');
  const confirm = value.indexOf('>OK</button>');
  expect(grade).toBeGreaterThanOrEqual(0);
  expect(notice).toBeGreaterThanOrEqual(0);
  expect(confirm).toBeGreaterThanOrEqual(0);
  expect(grade).toBeLessThan(notice);
  expect(notice).toBeLessThan(confirm);
});
test('073-4b: 学年の初期範囲は4区分を持つ', () => {
  const value = home();
  for (const fragment of ['中一: { from: 1, to: 20 }', '中二: { from: 21, to: 60 }', '中三: { from: 61, to: 100 }']) expect(value).toContain(fragment);
});
test('073-5: standaloneの表示判定はJSだけにある', () => {
  expect(styles()).not.toContain('display-mode: standalone');
  expect(home()).toContain('isStandaloneLaunch');
});
test('073-6: 中断文は文節で折り返せる', () => expect(styles()).toContain('word-break: auto-phrase'));
test('073-7: ホームに100首収録を出さない', () => expect(home()).not.toContain('100首収録'));
test('073-8: 復元カードは回目やセット目を名乗らない', () => {
  const value = home();
  expect(value).not.toContain('回目');
  expect(value).not.toContain('セット目');
  expect(value).toContain('次は {restorable.session.from + restorable.plan.chunkIndex * CHUNK_CARD_COUNT}番');
});
test('073-9: ホームのまとまり説明は全◯回や交互にを使わない', () => {
  const value = home();
  expect(value).not.toMatch(/全\$?\{?plannedChunkCount\}?回/);
  expect(value).not.toContain('交互に');
  expect(value).toContain('両方を出します');
});
