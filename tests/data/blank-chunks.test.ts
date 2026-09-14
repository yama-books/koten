import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseBlankChunksYaml, type BlankChunkEntry } from '../../tools/blank-chunks/yaml.ts';
import { paths } from '../../tools/build-data/paths.ts';
import { alignments, mixedForms } from '../../tools/build-data/mixed-forms.ts';

type Poem = { cardNo: number; ku: string[]; reading: { historical: { ku: string[] } } };

const yamlContent = fs.readFileSync(path.join(paths.review, 'blank-chunks.yaml'), 'utf8');
const { entries } = parseBlankChunksYaml(yamlContent);
const poems: Poem[] = JSON.parse(fs.readFileSync(path.join(paths.generated, 'poems.json'), 'utf8'));
const poemsByCardNo = new Map(poems.map((poem) => [poem.cardNo, poem]));
const entryByKey = new Map(entries.map((entry) => [`${entry.cardNo}-${entry.ku}`, entry]));

/** 踊り字（`かさゝぎ`）だけの例外。§8の受入条件4。 */
const ODORIJI_EXEMPT = new Set(['6-1']);
const KANJI = /[一-鿿々]/;
const ODORIJI = /[ゝゞヽヾ]/;

test('blank-chunks.yaml: 500件、cardNo1〜100×ku1〜5を過不足なく覆う', () => {
  assert.equal(entries.length, 500);
  for (let cardNo = 1; cardNo <= 100; cardNo += 1) {
    for (let ku = 1; ku <= 5; ku += 1) assert.ok(entryByKey.has(`${cardNo}-${ku}`), `${cardNo}-${ku} が無い`);
  }
});

test('blank-chunks.yaml: chunksをつなぐと正本表記に一致する', () => {
  for (const entry of entries) {
    const poem = poemsByCardNo.get(entry.cardNo)!;
    assert.equal(entry.chunks.join(''), poem.ku[entry.ku - 1], `${entry.cardNo}番第${entry.ku}句`);
    assert.equal(entry.text, poem.ku[entry.ku - 1], `${entry.cardNo}番第${entry.ku}句`);
  }
});

test('blank-chunks.yaml: readingsをつなぐと歴史的仮名遣いの読みに一致する', () => {
  for (const entry of entries) {
    const poem = poemsByCardNo.get(entry.cardNo)!;
    assert.equal(entry.readings.join(''), poem.reading.historical.ku[entry.ku - 1], `${entry.cardNo}番第${entry.ku}句`);
  }
});

test('blank-chunks.yaml: 全部かなのかたまりは読みと字づらが一致する（踊り字を除く）', () => {
  for (const entry of entries) {
    const key = `${entry.cardNo}-${entry.ku}`;
    entry.chunks.forEach((chunk, index) => {
      const allKana = ![...chunk].some((character) => KANJI.test(character));
      if (!allKana) return;
      if (ODORIJI.test(chunk)) { assert.ok(ODORIJI_EXEMPT.has(key), `${key}: 想定外の踊り字`); return; }
      assert.equal(entry.readings[index], chunk, `${key} の ${index} 番目`);
    });
  }
});

test('blank-chunks.yaml: chunks/readings/candidateの長さが揃っている', () => {
  for (const entry of entries) {
    assert.equal(entry.chunks.length, entry.readings.length, `${entry.cardNo}-${entry.ku}`);
    assert.equal(entry.chunks.length, entry.candidate.length, `${entry.cardNo}-${entry.ku}`);
  }
});

test('blank-chunks.yaml: 読みの割り付けが一意に決まらない11句は裁定表のとおり', () => {
  const table: [number, number, string[]][] = [
    [2, 2, ['なつ', 'きにけらし']],
    [16, 5, ['いま', 'かへりこむ']],
    [21, 1, ['いま', 'こむと']],
    [23, 1, ['つき', 'みれば']],
    [31, 4, ['よしのの', 'さとに']],
    [38, 4, ['ひとの', 'いのちの']],
    [39, 2, ['をのの', 'しのはら']],
    [61, 4, ['けふ', 'ここのへに']],
    [78, 4, ['いくよ', 'ねざめぬ']],
    [85, 2, ['もの', 'おもふ', 'ころは']],
    [87, 4, ['きり', 'たちのぼる']],
  ];
  for (const [cardNo, ku, readings] of table) {
    const entry = entryByKey.get(`${cardNo}-${ku}`)!;
    assert.deepEqual(entry.readings, readings, `${cardNo}番第${ku}句`);
  }
});

/** かたまりごとに独立して中間形を作り、カルテシアン積を取る。境目を越えた誤形は作れない。 */
function mixedFormsAcrossChunks(entry: BlankChunkEntry): string[] {
  const perChunk = entry.chunks.map((text, index) => {
    const reading = entry.readings[index]!;
    const picked = alignments(text, reading)[0] ?? [];
    return mixedForms(text, picked);
  });
  let combos = [''];
  for (const forms of perChunk) combos = combos.flatMap((prefix) => forms.map((form) => prefix + form));
  return combos;
}

test('受入条件7: かたまりの境目を越えた誤形は作れない', () => {
  const cases: [number, number, string[]][] = [
    [2, 2, ['夏つきにけらし', 'な来にけらし']],
    [31, 4, ['よしの里に']],
    [39, 2, ['をの篠原']],
  ];
  for (const [cardNo, ku, forbidden] of cases) {
    const entry = entryByKey.get(`${cardNo}-${ku}`)!;
    const forms = mixedFormsAcrossChunks(entry);
    for (const bad of forbidden) assert.ok(!forms.includes(bad), `${cardNo}番第${ku}句: 誤形 ${bad} が作れてしまう`);
  }
});

/**
 * 2026-09-15・発注085 の検収で見つけた穴。
 *
 * **裁定表に無い句では、「合計は合うが誤った割り付け」が 7 件すべて緑のまま通った**
 * （`門田の=かどたのい ／ 稲葉=なば` で実測）。つなぎ直せば表記も読みも復元するので、
 * 受入条件 2・3 は素通りする。**306 句が無防備だった。**
 *
 * **台帳が正しいのは「生成器が作ったから」であって、試験が確かめているからではなかった。**
 *
 * かたまりの中の**かなは字どおり読みに現れる**。`門田の` は「の」で終わるので、
 * 読みも「の」で終わらなければならない。`alignments()` はその規則で割り付けを数えるので、
 * **1 通りも無ければ、その割り付けは成り立たない。**
 */
test('割り付けの妥当性: どのかたまりも、かなの字が読みと合っている', () => {
  const broken: string[] = [];
  for (const entry of entries) {
    entry.chunks.forEach((chunk, index) => {
      const reading = entry.readings[index]!;
      if (!KANJI.test(chunk)) return; // 全部かなは受入条件4が見ている
      if (ODORIJI.test(chunk)) return; // 踊り字は字づらが対応しない（受入条件4の例外）
      if (alignments(chunk, reading).length === 0) broken.push(`${entry.cardNo}-${entry.ku} ${chunk}=${reading}`);
    });
  }
  // 0 件では検査にならない。漢字を含むかたまりが実在することを先に見る。
  const withKanji = entries.flatMap((entry) => entry.chunks.filter((chunk) => KANJI.test(chunk)));
  assert.ok(withKanji.length > 300, `漢字を含むかたまりが ${withKanji.length} 件では検査にならない`);
  assert.deepEqual(broken, [], `かなの字が読みと合っていない: ${broken.slice(0, 5).join(' / ')}`);
});
