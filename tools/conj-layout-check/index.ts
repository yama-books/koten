/**
 * check:conj-layout — conj（活用ドリル）の語釈帯・差分ルビ・はなまる・表の拡大の不変条件を、実ブラウザで確かめる。
 *
 * conj/HANDOFF.md §29–§32。詳しい手動の計測（スクリーンショット・変更前との比較・全画面）は
 * conj/audit/gloss-layout-impl_2026-09-28/check-layout.cjs に残してある。ここでは CI で毎回守るものだけを見る。
 *
 * - 公開サイトと同じ配置で配信する：/conj/ ← conj/、/100/ ← packages/hyakunin/dist/（conj は Klee One・
 *   Zen Maru Gothic を ../100/ から読み込む）。**`npm run build` の後に実行すること。** Web フォントを
 *   すべて読み込んでから測るので、CI（ubuntu）でも Windows でも同じ字形で測る。
 * - 判定は答えの前後の一致・44px 以上・画面内・交差 0 などの不変条件にし、フォントで変わる絶対値には頼らない。
 *
 * 環境変数：CONJ_LAYOUT_CHECK_PORT（既定 4177）、CONJ_LAYOUT_CONJ_DIR（conj/ の代わりに配信するフォルダ。
 * 検査が落ちることの確認や、変更前の版との比較に使う）。`--no-web-fonts` で /100/ を配信せず、端末の
 * フォールバックフォントで測る（フォントに依存しないことの確認用）。
 */
import { createServer as createHttpServer, type Server as HttpServer } from 'node:http';
import { createServer, type Server } from 'node:net';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chjQuotationsExpected } from './held-data.ts';

// conj/index.html の古典スクリプトの大域変数・関数。page.evaluate の中（ページの大域）でだけ使う。
declare let items: any[];
declare let current: any;
declare let answered: boolean;
declare let answers: Record<string, string>;
declare let selected: unknown;
declare function updateLevelUI(): void;
declare function closeEditor(commit?: boolean): void;
declare function chooseBlankSlots(): void;
declare function render(): void;
declare function grade(revealOnly?: boolean): void;
declare function placePerfectStamp(): Promise<void>;
declare function targetFor(row: string | undefined, index: number): string[] | undefined;
declare function key(row: string | undefined, index: number): string;

type Viewport = { name: string; width: number; height: number; mobile: boolean };
type Item = { id: string; pos: 'adjv' | 'aux' | 'verb' | 'adj' };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const port = Number(process.env.CONJ_LAYOUT_CHECK_PORT ?? 4177);
const conjDir = path.resolve(process.env.CONJ_LAYOUT_CONJ_DIR ?? path.join(root, 'conj'));
const hyakuninDist = path.join(root, 'packages/hyakunin/dist');
const useWebFonts = !process.argv.includes('--no-web-fonts');
// 形容動詞の語釈は表示中の用例に結び付く。しづかなり（adjv-lemma-030）など CHJ の引用を用例にする語は、
// CHJ の引用が無い公開ツリーでは用例も語釈も出ないので、そこでだけ語釈帯の検査を外す（作業リポジトリでは常に検査する）。
const chjExpected = chjQuotationsExpected(conjDir);
const glossSkipped = new Set<string>();
const baseUrl = `http://127.0.0.1:${port}/conj/`;
const started = Date.now();

const viewports: Viewport[] = [
  { name: 'phone375', width: 375, height: 812, mobile: true },
  { name: 'phone360', width: 360, height: 740, mobile: true },
  { name: 'phoneSE375', width: 375, height: 667, mobile: true },
  { name: 'phone360s', width: 360, height: 640, mobile: true },
  { name: 'ipad820', width: 820, height: 1180, mobile: false },
  { name: 'ipad768', width: 768, height: 1024, mobile: false },
  { name: 'pc1440', width: 1440, height: 900, mobile: false },
];
// 形容動詞（ルビあり・「この用例では」あり／なし・2行の語釈・百人一首）、助動詞（意味の強調・接続の行・
// 表の上の見出し）、語釈帯の無い動詞・形容詞。§30・§31 で下端に近かった問題を含める。
const checkedItems: Item[] = [
  { id: 'adjv-lemma-030', pos: 'adjv' },
  { id: 'adjv-lemma-052', pos: 'adjv' },
  { id: 'adjv-lemma-117', pos: 'adjv' },
  { id: 'itadura', pos: 'adjv' },
  { id: 'ru_aux', pos: 'aux' },
  { id: 'beshi_aux', pos: 'aux' },
  { id: 'maji_aux', pos: 'aux' },
  { id: 'mu_aux', pos: 'aux' },
  { id: 'ramu_aux', pos: 'aux' },
  { id: 'meri_aux', pos: 'aux' },
  { id: 'ku', pos: 'verb' },
  { id: 'kanasi', pos: 'adj' },
];
// 高さ 700px 以下のスマホでは、答えの後もボタンが画面内にある（§31）。
const shortPhoneMaxHeight = 700;
// iPad 縦で右の列の語釈が表の拡大を妨げない（§31。べし 1.11 → 1.42）。
const minZoom: Record<string, number> = { 'ipad820 beshi_aux': 1.3 };
// 助動詞の「この用例での意味」の強調は conj/data/aux-example-meanings.json と一致する（§30）。
const emphasisItems = ['beshi_aux', 'mu_aux', 'ramu_aux', 'meri_aux'];
// はなまるが学習用の文字と交差しないことは、形容動詞の全問をこの画面で確かめる（§30）。
const stampSweepViewports = new Set(['phoneSE375', 'ipad820']);
const minimumAdjvItems = 100;
// 12 問 × 7 画面。過不足とも検査不全である。
const expectedCases = viewports.length * checkedItems.length;

const failures: string[] = [];
const notes: string[] = [];
let cases = 0;
let stampSweepCount = 0;
// Enter だけで全問を解く走査（PC。二つの列を持つ表でも空欄を一度ずつ回り、最後の Enter で採点される）。
const keyboardSweepViewports = new Set(['pc1440']);
let keyboardSweepCount = 0;
const check = (ok: boolean, message: string): boolean => { if (!ok) failures.push(message); return ok; };

try { await stat(path.join(conjDir, 'index.html')); } catch {
  fail(`${path.relative(root, conjDir) || '.'} に conj の index.html がありません。`);
}
const auxMeanings = JSON.parse(readFileSync(path.join(conjDir, 'data/aux-example-meanings.json'), 'utf8')) as { records: Array<{ id: string; exampleMeanings: string[]; status: string }> };
const expectedEmphasis = new Map<string, string[]>();
for (const id of emphasisItems) {
  const record = auxMeanings.records.find((entry) => entry.id === id);
  if (!record || record.status !== 'audited' || !record.exampleMeanings.length) fail(`aux-example-meanings.json に監査済みの ${id} がありません（強調の検査が空になる）`);
  expectedEmphasis.set(id, [...record.exampleMeanings].sort());
}

if (useWebFonts) {
  try { await stat(path.join(hyakuninDist, 'index.html')); } catch {
    fail('packages/hyakunin/dist がありません。conj は Web フォントを /100/ から読み込むので、先に npm run build を実行してください（フォールバックフォントで測るなら --no-web-fonts）。');
  }
}

let playwright: any;
try {
  playwright = await import('playwright');
} catch {
  fail('Playwright を読み込めません。playwright の導入後に実行してください。');
}

try {
  await assertPortFree(port);
} catch (error) {
  fail(`環境異常: ${error instanceof Error ? error.message : 'ポートを確認できません'}`);
}

const server = await startStaticServer();
try {
  const browser = await playwright.chromium.launch({ headless: true });
  try {
    for (const viewport of viewports) await checkViewport(browser, viewport);
  } finally { await browser.close(); }
} catch (error) {
  const details = error instanceof Error ? [error.message, error.stack].filter(Boolean).join('\n') : String(error);
  failures.push(`検査は完走していません。${sanitizeOutput(details)}`);
} finally {
  await new Promise<void>((resolve) => server.close(() => resolve()));
}

const seconds = ((Date.now() - started) / 1000).toFixed(1);
if (glossSkipped.size) notes.push(`CHJ の引用が無い（公開ツリー）：用例の無い ${[...glossSkipped].join('・')} の語釈帯の検査を外した`);
for (const note of notes) console.log(`check:conj-layout: ${note}`);
if (cases !== expectedCases) failures.push(`走査が不足または過剰です（${cases} 件、必要 ${expectedCases} 件ちょうど）`);
console.log(`check:conj-layout: 問題×画面 ${cases} 件（${viewports.length} 画面 × ${checkedItems.length} 問）、はなまるの全問走査 ${stampSweepCount} 件、Enter の走査 ${keyboardSweepCount} 件、フォント ${useWebFonts ? 'Web フォント（/100/）' : '端末のフォールバック'}、${seconds} 秒`);
console.log(`check:conj-layout: 違反 ${failures.length} 件`);
for (const message of failures.slice(0, 400)) console.log(`  ${message}`);
if (failures.length > 400) console.log(`  …残り ${failures.length - 400} 件`);
if (failures.length) process.exitCode = 1;
else console.log('check:conj-layout: 全件合格');

async function checkViewport(browser: any, viewport: Viewport): Promise<void> {
  const { name: vp, mobile } = viewport;
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(30_000);
    const pageErrors: string[] = [];
    page.on('pageerror', (error: Error) => pageErrors.push(error.message));
    await page.addInitScript(() => { try { localStorage.setItem('conjInstallNoticeDismissed', 'true'); } catch { /* storage unavailable */ } });
    await page.goto(baseUrl, { waitUntil: 'load' });
    await page.waitForFunction(() => (window as any).__conjAdjvRuntimeStatus !== undefined);
    const runtime = await page.evaluate(() => ({ loaded: (window as any).__conjAdjvRuntimeStatus.loaded, error: (window as any).__conjAdjvRuntimeStatus.error ?? null }));
    if (!runtime.loaded) throw new Error(`${vp}: 形容動詞のデータを読み込めません: ${runtime.error}`);
    const fonts = await loadFonts(page);
    if (vp === viewports[0].name) notes.push(`フォント: ${fonts.summary}`);

    const stripWidths = new Set<number>();
    for (const item of checkedItems) {
      const tag = `${vp} ${item.id}`;
      await show(page, item);
      const before = await measure(page);
      await answerAll(page);
      const after = await measure(page);
      cases += 1;

      // 答えの前後で、見出し・表・ボタン・カードの高さ・拡大率は動かない（§30）。
      for (const key of ['lemmaTop', 'tableTop', 'actionsTop', 'cardHeight'] as const) {
        check(Math.abs(before[key] - after[key]) < 0.5, `${tag}: ${key} が答えの前後で変わった ${before[key].toFixed(1)} → ${after[key].toFixed(1)}`);
      }
      check(before.transform === after.transform, `${tag}: 表の拡大率が答えの前後で変わった ${before.transform} → ${after.transform}`);

      // 差分ルビは答えの後に表示する。
      check(before.rt.every((value) => value === 'hidden') && after.rt.every((value) => value === 'visible'), `${tag}: ルビの表示 ${before.rt.join(',') || 'なし'} → ${after.rt.join(',') || 'なし'}`);
      if (item.id === 'adjv-lemma-030') check(after.rt.length > 0, `${tag}: しづかなり に差分ルビが無い（ルビの検査が空になる）`);

      // 語釈帯：動詞・形容詞には無い。形容動詞・助動詞は出題時から場所を確保して隠し、答えの後に表示する。
      if (item.pos === 'verb' || item.pos === 'adj') {
        check(after.glossHidden, `${tag}: ${item.pos} に語釈帯がある`);
      } else if (!chjExpected && item.pos === 'adjv' && !(await exampleShown(page, item.id))) {
        glossSkipped.add(item.id);
      } else if (check(!after.glossHidden && after.gloss !== null, `${tag}: 語釈帯が無い`)) {
        const gloss = after.gloss!;
        check(before.glossVisibility === 'hidden' && after.glossVisibility === 'visible', `${tag}: 語釈帯の表示 ${before.glossVisibility} → ${after.glossVisibility}`);
        check(gloss.w > 0 && gloss.h > 0, `${tag}: 語釈帯の大きさが 0（${gloss.w.toFixed(1)}×${gloss.h.toFixed(1)}）`);
        if (mobile) {
          check(gloss.t >= after.tableBottom - 1, `${tag}: スマホの語釈帯が表の下に無い（語釈帯の上端 ${gloss.t.toFixed(1)}、表の下端 ${after.tableBottom.toFixed(1)}）`);
          stripWidths.add(Math.round(gloss.w));
        } else {
          check(gloss.l >= after.tableRight - 1 && gloss.t <= after.tableTop + 1, `${tag}: 語釈が表の右の列に無い（語釈 左 ${gloss.l.toFixed(1)} 上 ${gloss.t.toFixed(1)}、表 右 ${after.tableRight.toFixed(1)} 上 ${after.tableTop.toFixed(1)}）`);
          check(gloss.l >= after.card.l && gloss.r <= after.card.r - after.cardPadR + 1, `${tag}: 語釈がカードの内側からはみ出す（右端 ${gloss.r.toFixed(1)} > ${(after.card.r - after.cardPadR).toFixed(1)}）`);
        }
      }

      // 「この用例では」は、形容動詞で用例ごとの注記があり、用例を表示しているときだけ。
      const hasNote = after.glossDt.includes('この用例では');
      if (item.id === 'adjv-lemma-030' && chjExpected) check(hasNote, `${tag}: しづかなり に「この用例では」が無い（${after.glossDt.join('/')}）`);
      if (item.pos === 'aux' || item.id === 'adjv-lemma-117' || item.id === 'itadura') check(!hasNote, `${tag}: 注記の無い問題に「この用例では」がある（${after.glossDt.join('/')}）`);
      if (after.glossDt.length && !after.glossHidden) check(after.glossDt[0] === '意味', `${tag}: 語釈帯の先頭が「意味」でない（${after.glossDt.join('/')}）`);

      // スマホ：行は 44px 以上。高さの低いスマホでも答えの後のボタンは画面内（§31）。
      if (mobile) {
        check(after.minRow >= 43.5, `${tag}: 表の行 ${after.minRow.toFixed(1)}px < 44px`);
        if (viewport.height <= shortPhoneMaxHeight) check(after.actionsBottom <= after.vh + 0.5, `${tag}: 答えの後のボタンが画面外（下端 ${after.actionsBottom.toFixed(1)} > ${after.vh}）`);
      }
      if (minZoom[tag] !== undefined) check(zoomOf(after.transform) >= minZoom[tag], `${tag}: 表の拡大率 ${zoomOf(after.transform)} < ${minZoom[tag]}`);

      // はなまる：最前面・multiply・カードの内側。形容動詞は学習用の文字と交差しない。
      const stamp = after.stamp;
      if (check(stamp !== null, `${tag}: 全問正解ではなまるが出ない`)) {
        check(stamp!.placed && stamp!.visibility === 'visible', `${tag}: はなまるが配置されていない`);
        check(stamp!.z === '20' && stamp!.blend === 'multiply', `${tag}: はなまるの z-index/mix-blend-mode ${stamp!.z}/${stamp!.blend}`);
        check(stamp!.l >= after.card.l && stamp!.r <= after.card.r - 5.5 && stamp!.t >= after.card.t + 3.5 && stamp!.b <= after.card.b, `${tag}: はなまるがカードの外に出る`);
        if (item.pos === 'adjv') check(stamp!.hits === 0, `${tag}: はなまるが学習用の文字と交差する（data-hits=${stamp!.hits}）`);
      }

      // 助動詞の「この用例での意味」の強調。
      const expected = expectedEmphasis.get(item.id);
      if (expected) check(JSON.stringify([...after.glossEm].sort()) === JSON.stringify(expected), `${tag}: 強調 ${after.glossEm.join('+') || 'なし'}、aux-example-meanings.json では ${expected.join('+')}`);
      else if (item.pos !== 'aux') check(after.glossEm.length === 0, `${tag}: 助動詞以外で意味が強調されている（${after.glossEm.join('+')}）`);
    }
    if (mobile) {
      check(stripWidths.size === 1, `${vp}: スマホの語釈帯の幅が問題ごとに違う（${[...stripWidths].join('/')}px）`);
      notes.push(`${vp}: 語釈帯の幅 ${[...stripWidths].join('/')}px`);
    }

    // 用例を隠すと「この用例では」の行は DOM から消える。
    await show(page, { id: 'adjv-lemma-030', pos: 'adjv' }, { exampleOff: true });
    await answerAll(page);
    const off = await measure(page);
    if (chjExpected || await exampleShown(page, 'adjv-lemma-030')) check(off.glossDt.join('/') === '意味', `${vp}: 用例を隠しても語釈帯に ${off.glossDt.join('/')} が出る`);
    await page.evaluate(() => { (document.getElementById('showExample') as HTMLInputElement).checked = true; });

    if (stampSweepViewports.has(vp)) {
      const sweep = await sweepAdjvStamps(page);
      stampSweepCount += sweep.total;
      check(sweep.total >= minimumAdjvItems, `${vp}: 形容動詞が ${sweep.total} 問しかない（${minimumAdjvItems} 問以上のはず）`);
      for (const bad of sweep.bad) failures.push(`${vp} ${bad.id}: はなまる（全問走査）${JSON.stringify(bad)}`);
      notes.push(`${vp}: はなまるの全問走査 形容動詞 ${sweep.total} 問、交差あり ${sweep.bad.filter((entry) => entry.hits > 0).length} 問`);
    }
    if (keyboardSweepViewports.has(vp)) {
      const sweep = await sweepEnterFlow(page);
      keyboardSweepCount += sweep.total;
      check(sweep.total >= 200, `${vp}: Enter の走査が ${sweep.total} 件しかない`);
      for (const bad of sweep.bad.slice(0, 20)) failures.push(`${vp} ${bad}`);
      if (sweep.bad.length > 20) failures.push(`${vp}: Enter の走査 ほか ${sweep.bad.length - 20} 件`);
      notes.push(`${vp}: Enter だけで解く走査 ${sweep.total} 件（全問 × Lv4・Lv7）、不合格 ${sweep.bad.length} 件`);
    }
    if (pageErrors.length) failures.push(`${vp}: ページのエラー ${pageErrors.join(' | ')}`);
  } finally {
    await context.close();
  }
}

/**
 * 全問を Lv4・Lv7 で、キーボードだけで解く。空欄を正答で埋めて Enter を押し続けたとき、
 * すべての空欄を一度ずつ回り（二つの列の間を行き来し続けない）、最後の空欄の Enter で採点され
 * （全問正解）、次の Enter で次の問題へ進むことを確かめる。
 */
async function sweepEnterFlow(page: any): Promise<{ total: number; bad: string[] }> {
  const ids: Array<{ id: string; pos: string }> = await page.evaluate(() => items.map((entry: { id: string; pos: string }) => ({ id: entry.id, pos: entry.pos })));
  const bad: string[] = [];
  let total = 0;
  for (const { id, pos } of ids) {
    for (const level of [4, 7]) {
      total++;
      const setup = await page.evaluate(({ id, pos, level }: { id: string; pos: string; level: number }) => {
        (document.getElementById('pos') as HTMLSelectElement).value = pos;
        updateLevelUI();
        const meter = document.getElementById(pos === 'aux' ? 'auxLevel' : `${pos}Level`) as HTMLInputElement | null;
        if (meter) { meter.value = String(level); meter.dispatchEvent(new Event('input', { bubbles: true })); }
        closeEditor(false);
        current = items.find((entry: { id: string }) => entry.id === id);
        chooseBlankSlots();
        answered = false; answers = {}; selected = null;
        render();
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        focusFirstBlank();
        return { blanks: document.querySelectorAll('.card .katsuyo .editable-answer').length, open: !!selected };
      }, { id, pos, level });
      const visited: string[] = [];
      for (let step = 0; step < setup.blanks + 3; step++) {
        const cell = await page.evaluate(() => selected ? { key: `${selected.row}:${selected.i}`, answer: (targetFor(selected.row, selected.i) || [])[0] || '' } : null);
        if (!cell) break;
        visited.push(cell.key);
        await page.keyboard.type(cell.answer);
        await page.keyboard.press('Enter');
      }
      const last = await page.evaluate(() => ({ answered, editor: !!document.querySelector('.editor input'), perfect: document.getElementById('perfectResult')!.classList.contains('show'), id: current.id }));
      await page.keyboard.press('Enter');
      const next = await page.evaluate(() => ({ answered, id: current.id }));
      const ok = setup.open && visited.length === setup.blanks && new Set(visited).size === setup.blanks
        && last.answered && !last.editor && last.perfect && !next.answered && next.id !== last.id;
      if (!ok) bad.push(`${id} Lv${level}: Enter で解けない（空欄 ${setup.blanks}、回った順 ${visited.join(' ')}、最後の Enter の後 採点=${last.answered} 全問正解=${last.perfect}、次の Enter で次の問題=${next.id !== last.id}）`);
    }
  }
  return { total, bad };
}

/** Web フォントを全部読み込んでから測る（途中で字形が差し替わって、答えの前後の比較が揺れないように）。 */
async function loadFonts(page: any): Promise<{ summary: string }> {
  if (useWebFonts) {
    await page.waitForSelector('#conj-hyakunin-font-faces', { state: 'attached', timeout: 20_000 })
      .catch(() => { throw new Error('conj が /100/ から Web フォントを取り込めませんでした（#conj-hyakunin-font-faces が無い）'); });
  }
  const result = await page.evaluate(async () => {
    const faces = [...(document.fonts as any)] as FontFace[];
    const settled = await Promise.all(faces.map((face) => face.load().then(() => 'loaded', () => 'error')));
    await document.fonts.ready;
    const families = new Set(faces.map((face) => face.family.replace(/["']/g, '')));
    return { total: faces.length, errors: settled.filter((state) => state === 'error').length, families: [...families].sort() };
  });
  if (useWebFonts) {
    if (!result.families.includes('Klee One') || !result.families.includes('Zen Maru Gothic')) throw new Error(`Web フォントの組が足りません: ${result.families.join(', ')}`);
    if (result.errors > 0) throw new Error(`Web フォント ${result.total} 件のうち ${result.errors} 件を読み込めませんでした`);
  }
  return { summary: `${result.families.join(', ') || 'なし'}（@font-face ${result.total} 件、失敗 ${result.errors} 件）` };
}

/** `id` を新しい問題として表示する（助動詞・形容動詞は Lv4）。PC ではアプリが最初の空欄を編集状態にするので閉じる。 */
/** 用例のある問題か（形容動詞の語釈は用例に結び付く）。CHJ の引用が無い公開ツリーでだけ問う。 */
async function exampleShown(page: any, id: string): Promise<boolean> {
  return page.evaluate((itemId: string) => Boolean(items.find((entry: { id: string }) => entry.id === itemId)?.example), id);
}

async function show(page: any, item: Item, options: { exampleOff?: boolean } = {}): Promise<void> {
  const found = await page.evaluate(async ({ id, pos, exampleOff }: { id: string; pos: string; exampleOff: boolean }) => {
    (document.getElementById('pos') as HTMLSelectElement).value = pos;
    updateLevelUI();
    (document.getElementById('showExample') as HTMLInputElement).checked = !exampleOff;
    closeEditor(false);
    current = items.find((entry: { id: string }) => entry.id === id);
    if (!current) return false;
    // 空欄の位置は乱数で決まる。毎回同じ空欄で測る。
    let seed = 7;
    const random = Math.random;
    Math.random = () => ((seed = seed * 16807 % 2147483647) / 2147483647);
    try { chooseBlankSlots(); } finally { Math.random = random; }
    answered = false; answers = {}; selected = null;
    render();
    closeEditor(false);
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    // render() は rAF と 30ms 後に syncStudyHeights() を呼ぶ。両方が済むまで待つ。
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 80)));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return true;
  }, { id: item.id, pos: item.pos, exampleOff: options.exampleOff === true });
  if (!found) throw new Error(`問題 ${item.id} がありません`);
}

/** 空欄をすべて正答で埋めて採点する。 */
async function answerAll(page: any): Promise<void> {
  await page.evaluate(fillAndGrade);
}

/** ページの中で実行する：空欄をすべて正答で埋めて採点し、はなまるの配置と結果の画像を待つ。 */
async function fillAndGrade(): Promise<void> {
  closeEditor(false);
  document.querySelectorAll<HTMLElement>('.katsuyo .editable-answer').forEach((td) => {
    const target = targetFor(td.dataset.row, Number(td.dataset.i));
    answers[key(td.dataset.row, Number(td.dataset.i))] = (target && target[0]) || '';
  });
  grade(false);
  await placePerfectStamp();
  await Promise.all([...document.querySelectorAll<HTMLImageElement>('main.card img')].map((img) => img.complete ? null : new Promise((resolve) => { img.addEventListener('load', resolve, { once: true }); img.addEventListener('error', resolve, { once: true }); })));
  await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 50)));
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

function measure(page: any): Promise<{
  lemmaTop: number; tableTop: number; tableBottom: number; tableRight: number; actionsTop: number; actionsBottom: number; cardHeight: number;
  transform: string; card: Rect; cardPadR: number; gloss: Rect | null; glossHidden: boolean; glossVisibility: string; glossDt: string[]; glossEm: string[];
  rt: string[]; minRow: number; vh: number;
  stamp: (Rect & { z: string; blend: string; hits: number; placed: boolean; visibility: string }) | null;
}> {
  return page.evaluate(() => {
    const q = (selector: string) => document.querySelector(selector) as HTMLElement;
    const rect = (element: Element) => { const box = element.getBoundingClientRect(); return { l: box.left, t: box.top, r: box.right, b: box.bottom, w: box.width, h: box.height }; };
    const card = q('main.card');
    const gloss = q('#gloss');
    const lemma = q('#lemma');
    const stamp = q('#perfectResult');
    const table = rect(q('.card .katsuyo'));
    const actions = rect(q('.card .actions'));
    const stampStyle = getComputedStyle(stamp);
    return {
      lemmaTop: rect(lemma).t, tableTop: table.t, tableBottom: table.b, tableRight: rect(q('#tablePanel')).r,
      actionsTop: actions.t, actionsBottom: actions.b, cardHeight: rect(card).h,
      transform: q('.card .study-layout').style.transform || 'none',
      card: rect(card), cardPadR: parseFloat(getComputedStyle(card).paddingRight),
      gloss: gloss && !gloss.hidden ? rect(gloss) : null, glossHidden: !gloss || gloss.hidden,
      glossVisibility: gloss ? getComputedStyle(gloss).visibility : 'none',
      glossDt: gloss ? [...gloss.querySelectorAll('dt')].map((dt) => dt.textContent ?? '') : [],
      glossEm: gloss ? [...gloss.querySelectorAll('.gloss-em')].map((em) => em.textContent ?? '') : [],
      rt: [...lemma.querySelectorAll('rt')].map((rt) => getComputedStyle(rt).visibility),
      minRow: Math.min(...[...document.querySelectorAll('#formBody > tr')].map((tr) => tr.getBoundingClientRect().height)),
      vh: innerHeight,
      stamp: stamp.classList.contains('show') ? { ...rect(stamp), z: stampStyle.zIndex, blend: stampStyle.mixBlendMode, hits: Number(stamp.dataset.hits), placed: stamp.classList.contains('is-placed'), visibility: stampStyle.visibility } : null,
    };
  });
}
type Rect = { l: number; t: number; r: number; b: number; w: number; h: number };

/** 形容動詞の全問で、全問正解のはなまるが配置され、学習用の文字と交差しない（data-hits = 0）。 */
function sweepAdjvStamps(page: any): Promise<{ total: number; bad: Array<{ id: string; hits: number; placed: boolean; inside: boolean; blend: string; z: string }> }> {
  return page.evaluate(async () => {
    (document.getElementById('pos') as HTMLSelectElement).value = 'adjv';
    updateLevelUI();
    const adjv = items.filter((entry: { pos: string }) => entry.pos === 'adjv');
    const stamp = document.getElementById('perfectResult') as HTMLElement;
    const card = document.querySelector('main.card') as HTMLElement;
    const bad = [];
    for (const item of adjv) {
      closeEditor(false);
      current = item; chooseBlankSlots(); answered = false; answers = {}; selected = null;
      render();
      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 40)));
      closeEditor(false);
      document.querySelectorAll<HTMLElement>('.katsuyo .editable-answer').forEach((td) => {
        const target = targetFor(td.dataset.row, Number(td.dataset.i));
        answers[key(td.dataset.row, Number(td.dataset.i))] = (target && target[0]) || '';
      });
      grade(false);
      await placePerfectStamp();
      const s = stamp.getBoundingClientRect();
      const c = card.getBoundingClientRect();
      const style = getComputedStyle(stamp);
      const result = {
        id: item.id as string, hits: Number(stamp.dataset.hits), placed: stamp.classList.contains('show') && stamp.classList.contains('is-placed'),
        inside: s.left >= c.left && s.right <= c.right - 5.5 && s.top >= c.top + 3.5 && s.bottom <= c.bottom,
        blend: style.mixBlendMode, z: style.zIndex,
      };
      if (result.hits !== 0 || !result.placed || !result.inside || result.blend !== 'multiply' || result.z !== '20') bad.push(result);
    }
    return { total: adjv.length, bad };
  });
}

function zoomOf(transform: string): number {
  const match = /scale\(([\d.]+)\)/.exec(transform);
  return match ? Number(match[1]) : 1;
}

/** 公開サイトと同じ配置（/conj/ と /100/）だけを配信する。それ以外は 404。 */
async function startStaticServer(): Promise<HttpServer> {
  const mounts: Array<[string, string]> = [['/conj/', conjDir]];
  if (useWebFonts) mounts.push(['/100/', hyakuninDist]);
  const types: Record<string, string> = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
    '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8',
  };
  const server = createHttpServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
      const mount = mounts.find(([prefix]) => pathname.startsWith(prefix));
      if (!mount || request.method !== 'GET') { response.writeHead(404).end(); return; }
      const [prefix, dir] = mount;
      let file = path.resolve(dir, `.${path.posix.sep}${pathname.slice(prefix.length)}`);
      if (file !== dir && !file.startsWith(dir + path.sep)) { response.writeHead(404).end(); return; }
      if ((await stat(file).catch(() => null))?.isDirectory()) file = path.join(file, 'index.html');
      const body = await readFile(file);
      response.writeHead(200, { 'content-type': types[path.extname(file).toLowerCase()] ?? 'application/octet-stream', 'cache-control': 'no-cache' });
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', () => resolve()); });
  return server;
}

async function assertPortFree(candidate: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const probe: Server = createServer();
    probe.once('error', () => reject(new Error(`ポート ${candidate} は使用中です`)));
    probe.listen(candidate, '127.0.0.1', () => probe.close(() => resolve()));
  });
}

function sanitizeOutput(value: string): string {
  const rootPattern = root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[\\/]/g, '[\\\\/]');
  return value.replace(new RegExp(rootPattern, 'gi'), '.');
}

function fail(message: string): never {
  console.error(`check:conj-layout: ${message}`);
  process.exit(1);
}
