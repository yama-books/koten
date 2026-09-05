import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseVariants, readingReviewCardNumbers } from '../../tools/build-data/parse-variants.ts';

/**
 * 異同確認表の写しであって、本番の `百人一首_読み_異同確認.md` そのものではない。
 * 本番を fixture に使うと、正当な資料更新がこの試験を赤にする。
 */
const header = '| # | 項目 | PDF／現行転記 | 公開資料の異同 | 判定・採用推奨 | 根拠 |\n|---:|---|---|---|---|---|\n';
function fixture(rows: string): string {
  const directory = mkdtempSync(join(tmpdir(), 'koten-variants-'));
  const file = join(directory, 'variants.md');
  writeFileSync(file, `# 見出し\n\n${header}${rows}`, 'utf8');
  return file;
}

test('読みの未確定は、判定欄が保留と書いている行だけで決まる', () => {
  const file = fixture([
    '| 13 | 初句・読み | つくばねの | 各資料も同じ | 読みは「つくばねの」で確定。現行転記を維持。 | https://example.invalid/13 |',
    '| 32 | 初句・読み | 山川に | 別表現がある | 保留。追加資料を待って決める。 | https://example.invalid/32 |',
    '| 46 | 作者名 | 曾禰好忠 | 曽根好忠 | PDFの表記を維持。 | https://example.invalid/46 |',
  ].join('\n'));
  const variants = parseVariants(file);

  // 走査対象が実在することを先に確かめる。読みの行が0件なら、下の否定は何も証明しない。
  assert.equal(variants.filter((variant) => variant.kind === '読み方式').length, 2);
  assert.deepEqual([...readingReviewCardNumbers(variants)], [32]);
});

test('読みの行が無ければ未確定も無い', () => {
  const file = fixture('| 46 | 作者名 | 曾禰好忠 | 曽根好忠 | PDFの表記を維持。 | https://example.invalid/46 |');
  const variants = parseVariants(file);
  assert.equal(variants.filter((variant) => variant.kind === '読み方式').length, 0);
  assert.deepEqual([...readingReviewCardNumbers(variants)], []);
});

test('現行の異同確認表は読みの行を持ち、そのどれも未確定ではない', () => {
  const variants = parseVariants();
  const readingRows = variants.filter((variant) => variant.kind === '読み方式');
  // 13番・32番。判定欄はどちらも決着を書いている（依頼者裁定・2026-09-05）。
  assert.deepEqual(readingRows.map((variant) => variant.cardNo).sort((left, right) => left - right), [13, 32]);
  assert.deepEqual([...readingReviewCardNumbers(variants)], []);
});
