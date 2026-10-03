// 変体仮名の記録画面（グラフ表示と登場アニメーション）を実ブラウザで確かめる。
// 学習記録は検査の中で作る決定的なもので、利用者の記録や教材データは書き換えない。
//   node --experimental-strip-types tools/vintage-kana-record-check/index.ts [--webkit]
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit, type Browser, type Page } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const appDir = path.join(root, 'vintage-kana');
const html = readFileSync(path.join(appDir, 'detail.html'), 'utf8');
const KANA_ORDER: string[] = [...html.match(/const KANA_ORDER=\[\.\.\."([^"]+)"\]/)![1]];
const master = JSON.parse(readFileSync(path.join(appDir, 'data/ui-glyph-master.json'), 'utf8'));
type Glyph = { kana: string; glyph_id: string; character: string; jibo: string };
const glyphs: Glyph[] = master.glyphs.slice().sort((a: Glyph, b: Glyph) =>
  KANA_ORDER.indexOf(a.kana) - KANA_ORDER.indexOf(b.kana) || a.glyph_id.localeCompare(b.glyph_id));

type LearningEvent = Record<string, string>;
function event(n: number, g: Glyph, correct: boolean, day: number, method = 'choice'): LearningEvent {
  const at = new Date(Date.UTC(2026, 8, 1 + day, 3, 0, n % 60));
  return {
    id: 'check-' + String(n).padStart(5, '0'), at: at.toISOString(), localDate: at.toISOString().slice(0, 10),
    setId: 'check-set-' + Math.floor(n / 5), mode: n % 3 ? 'reading' : 'jibo', masteryMethod: method,
    outcome: correct ? 'correct' : 'incorrect', glyph: g.character, glyphId: g.glyph_id, kana: g.kana, jibo: g.jibo,
  };
}
// あ〜ら行の一部だけを解いた記録。や行・わ行は未着手、さ行・ま行は正答率が低い。
function partialRecord(): LearningEvent[] {
  const plan: Record<string, [number, number]> = { あ: [8, 1], い: [6, 1], う: [5, 2], か: [6, 2], き: [7, 1], さ: [5, 3], し: [4, 3], た: [4, 1], な: [9, 0], に: [8, 0], は: [6, 2], ま: [4, 3], ら: [3, 1] };
  const out: LearningEvent[] = [];
  let n = 0;
  for (const [kana, [count, wrong]] of Object.entries(plan)) {
    for (const g of glyphs.filter(x => x.kana === kana).slice(0, 2)) {
      for (let i = 0; i < count; i++) out.push(event(n++, g, i >= wrong, Math.floor(n / 6), i % 2 ? 'free-input' : 'choice'));
    }
  }
  return out;
}
// 全字形を解き、どれも直近5回が正解：全体の習熟度は100%。古い誤答は直近5回の外にある。
function allCorrectRecord(lastWrong = false): LearningEvent[] {
  const out: LearningEvent[] = [];
  let n = 0;
  glyphs.forEach((g, gi) => {
    out.push(event(n++, g, false, 0));
    for (let i = 0; i < 5; i++) out.push(event(n++, g, !(lastWrong && gi === 0 && i === 4), 1 + i));
  });
  return out;
}
// 直近5回で数えた「正答率×取り組み範囲」（端数切り捨て）。画面の値と独立に計算する。
function expectedOverall(events: LearningEvent[]): number {
  const known = new Set(glyphs.map(g => g.character));
  const by = new Map<string, LearningEvent[]>();
  for (const e of events) if (known.has(e.glyph)) by.set(e.glyph, [...(by.get(e.glyph) ?? []), e]);
  let num = 0;
  for (const list of by.values()) {
    const recent = list.slice().sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id)).slice(-5);
    num += recent.filter(e => e.outcome === 'correct').length * (60 / recent.length);
  }
  return Math.floor(num * 100 / (60 * glyphs.length));
}

const types: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.webmanifest': 'application/manifest+json' };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    if (!url.pathname.startsWith('/vintage-kana/') || req.method !== 'GET') { res.writeHead(404).end(); return; }
    let file = path.resolve(appDir, '.' + decodeURIComponent(url.pathname.slice('/vintage-kana'.length)));
    if (!file.startsWith(appDir + path.sep) && file !== appDir) { res.writeHead(404).end(); return; }
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    res.setHeader('content-type', (types[path.extname(file)] || 'application/octet-stream') + '; charset=utf-8');
    res.end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${(server.address() as any).port}/vintage-kana/`;
const engine = process.argv.includes('--webkit') ? 'webkit' : 'chromium';
const browser: Browser = await (engine === 'webkit' ? webkit : chromium).launch({ headless: true });

type Snapshot = { numbers: string[]; rings: string[]; ringCount: number; untouched: string[]; weak: string[]; overall: string; fillP: string };
async function openRecord(page: Page, events: LearningEvent[]) {
  await page.addInitScript(([key, value]) => { localStorage.setItem(key, value); }, ['vintage-kana:learning-events:v1', JSON.stringify(events)]);
  // 外部の Web フォントは検査に使わない（オフラインでも同じ結果になるように）。
  await page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
  await page.goto(base + 'detail.html');
  await page.waitForFunction('GLYPHS.length>0');
  await page.evaluate(() => {
    [...document.querySelectorAll<HTMLElement>('.tab')].find(b => b.textContent!.trim() === '習得する')!.click();
    document.querySelector<HTMLElement>('[data-quiz-screen="record"]')!.click();
  });
}
const snapshot = (page: Page): Promise<Snapshot> => page.evaluate(() => ({
  numbers: ['recordPoints', 'recordSets', 'recordAttempts', 'recordCorrect', 'recordMasteryValue'].map(id => document.getElementById(id)!.textContent!),
  rings: [...document.querySelectorAll('.ringMeter')].map(el => el.textContent + '|' + (el as HTMLElement).style.getPropertyValue('--p') + '|' + el.getAttribute('aria-label')),
  ringCount: document.querySelectorAll('#rowMastery .ringMeter').length,
  untouched: [...document.querySelectorAll('.recordRowGroup.isUntouched .recordRow__label')].map(el => el.textContent!),
  weak: [...document.querySelectorAll('.recordRowGroup.isWeak .recordRow__label')].map(el => el.textContent!),
  overall: document.getElementById('recordMasteryValue')!.textContent!,
  fillP: (document.getElementById('recordMasteryFill') as HTMLElement).style.getPropertyValue('--p'),
}));
// アニメーションが終わるまで待つ（カードがすべて出て、動いているアニメーションがない）。
async function settle(page: Page) {
  await page.waitForFunction(() => [...document.querySelectorAll('#quizRecord .recordGlide')].every(el => el.classList.contains('isIn'))
    && document.getAnimations().every(a => !(a instanceof CSSAnimation) || a.playState !== 'running'), undefined, { timeout: 8000 });
  await page.waitForTimeout(150);
}
const horizontalOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

const results: string[] = [];
const errors: string[] = [];
const partial = partialRecord();

// 1. 値：全体の習熟度の定義（直近5回×範囲、切り捨て、100%の条件）。
for (const [label, events, expected] of [
  ['partial', partial, expectedOverall(partial)],
  ['all-correct', allCorrectRecord(), 100],
  ['last-wrong', allCorrectRecord(true), 99],
  ['empty', [], 0],
] as const) {
  assert.equal(expectedOverall(events as LearningEvent[]), expected, label + ' expected');
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await openRecord(page, events as LearningEvent[]);
  const s = await snapshot(page);
  assert.equal(s.overall, String(expected), label + ' overall');
  assert.equal(s.fillP, String(expected), label + ' fill');
  results.push(`overall ${label}: ${s.overall}%`);
  await page.close();
}

// 2. 各画面幅：横スクロールなし、描画前後で値が一致、未着手・弱い行、字形カードが列幅に収まる。
const reference = await (async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await openRecord(page, partial);
  const s = await snapshot(page);
  await page.close();
  return s;
})();
assert.equal(reference.ringCount, 10);
assert.deepEqual(reference.untouched, ['や行', 'わ行']);
assert.ok(reference.weak.length >= 1 && reference.weak.length <= 3, 'weak rows: ' + reference.weak);
assert.ok(reference.rings.filter(r => r.startsWith('未|')).length === 2);
for (const [w, h] of [[320, 640], [340, 700], [360, 640], [375, 812], [390, 844], [721, 900], [820, 1180], [1180, 820], [1440, 900]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', e => errors.push(`${w}x${h}: ${e.message}`));
  await openRecord(page, partial);
  const early = await snapshot(page);
  // 描き始める前（または途中）は数字が 0 から数え上がる。輪・ラベルの値そのものは最初から最終値。
  assert.deepEqual(early.rings, reference.rings, `${w}: rings before drawing`);
  let maxOverflow = 0;
  for (const t of [60, 250, 500]) { await page.waitForTimeout(t); maxOverflow = Math.max(maxOverflow, await horizontalOverflow(page)); }
  if (w < 768) {
    // スマホ：画面に入ったカードだけが出る。最後まで送って残りを出す。
    for (let y = 0; y < 12; y++) { await page.mouse.wheel(0, h * 0.6); await page.waitForTimeout(120); maxOverflow = Math.max(maxOverflow, await horizontalOverflow(page)); }
  }
  await settle(page);
  maxOverflow = Math.max(maxOverflow, await horizontalOverflow(page));
  const done = await snapshot(page);
  assert.deepEqual(done, reference, `${w}: final values`);
  assert.equal(maxOverflow, 0, `${w}: horizontal overflow`);
  const drawn = await page.evaluate(() => {
    const draw = [...document.querySelectorAll('#rowMastery .ringMeter')].map(el => getComputedStyle(el).getPropertyValue('--record-draw').trim());
    const fill = getComputedStyle(document.getElementById('recordMasteryFill')!).transform;
    const glide = [...document.querySelectorAll('#quizRecord .recordGlide')].map(el => getComputedStyle(el).opacity);
    return { draw: [...new Set(draw)], fill, glide: [...new Set(glide)] };
  });
  assert.deepEqual(drawn.draw, ['1'], `${w}: rings fully drawn`);
  assert.ok(drawn.fill === 'none' || drawn.fill === 'matrix(1, 0, 0, 1, 0, 0)', `${w}: bar fully grown ${drawn.fill}`);
  assert.deepEqual(drawn.glide, ['1'], `${w}: cards visible`);
  // 行の輪は円のまま（楕円に潰れない）で、カードの中に収まる。
  const shapes = await page.evaluate(() => [...document.querySelectorAll('.recordRowGroup')].map(card => {
    const c = card.getBoundingClientRect(), r = card.querySelector('.ringMeter')!.getBoundingClientRect();
    return { round: Math.abs(r.width - r.height) < 1, inside: r.top >= c.top && r.bottom <= c.bottom + 0.5 && r.left >= c.left && r.right <= c.right + 0.5, size: Math.round(r.width) };
  }));
  assert.ok(shapes.every(x => x.round && x.inside), `${w}: row rings round and inside ${JSON.stringify(shapes)}`);
  // あ行を開くと字形の輪を描き、カードは列幅に収まって重ならない。
  const open = await page.evaluate(async () => {
    const row = document.querySelector<HTMLDetailsElement>('.recordRowGroup')!;
    row.querySelector('summary')!.click();
    await new Promise(r => setTimeout(r, 50));
    const grid = row.querySelector('.rowGlyphMastery')!;
    const cards = [...grid.querySelectorAll<HTMLElement>('.glyphMasteryCard')];
    const rects = cards.map(c => c.getBoundingClientRect());
    const overlap = rects.some((r, i) => rects.some((o, j) => j !== i && r.left < o.right - 0.5 && o.left < r.right - 0.5 && r.top < o.bottom - 0.5 && o.top < r.bottom - 0.5));
    return { drawing: grid.classList.contains('isDrawing'), overlap, inside: rects.every(r => r.right <= row.getBoundingClientRect().right + 0.5), untouched: cards.filter(c => c.classList.contains('isUntouched')).length, total: cards.length };
  });
  assert.ok(open.drawing, `${w}: glyph rings drawing on open`);
  assert.ok(!open.overlap && open.inside, `${w}: glyph cards fit ${JSON.stringify(open)}`);
  await settle(page);
  assert.equal(await horizontalOverflow(page), 0, `${w}: overflow after open`);
  // 字形カードを押すと、その字の情報が出る（bindGlyphInfoCards）。
  const info = await page.evaluate(() => {
    const card = document.querySelector<HTMLElement>('.recordRowGroup[open] .glyphMasteryCard')!;
    card.click();
    const dialog = document.getElementById('glyphInfoDialog') as HTMLDialogElement;
    const ok = dialog.open && document.getElementById('glyphInfoGlyph')!.textContent === card.dataset.character;
    dialog.close();
    return ok;
  });
  assert.ok(info, `${w}: glyph info dialog`);
  results.push(`${w}x${h}: overflow ${maxOverflow}, rings ${done.ringCount} (${shapes[0].size}px), glyph cards ${open.total} (未 ${open.untouched})`);
  await page.close();
}

// 3. スマホ（360×640）：見えていないカードは待機し、スクロールで一度だけ出る。
{
  const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
  await openRecord(page, partial);
  await page.waitForTimeout(1500);
  const before = await page.evaluate(() => [...document.querySelectorAll('#quizRecord .recordGlide')].map(el => el.classList.contains('isIn')));
  assert.ok(before.some(v => !v), 'mobile: offscreen cards wait');
  for (let y = 0; y < 12; y++) { await page.mouse.wheel(0, 400); await page.waitForTimeout(120); }
  await settle(page);
  const after = await page.evaluate(() => [...document.querySelectorAll('#quizRecord .recordGlide')].every(el => el.classList.contains('isIn')));
  assert.ok(after, 'mobile: all cards shown after scrolling');
  results.push(`360x640 lazy: waiting ${before.filter(v => !v).length} cards before scroll`);
  await page.close();
}

// 4. reduced motion：開いた時点ですべて最終状態。
{
  const page = await browser.newPage({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' });
  await openRecord(page, partial);
  const state = await page.evaluate(() => ({
    numbers: ['recordPoints', 'recordSets', 'recordAttempts', 'recordCorrect', 'recordMasteryValue'].map(id => document.getElementById(id)!.textContent),
    opacity: [...new Set([...document.querySelectorAll('#quizRecord .recordGlide')].map(el => getComputedStyle(el).opacity))],
    draw: [...new Set([...document.querySelectorAll('.ringMeter')].map(el => getComputedStyle(el).getPropertyValue('--record-draw').trim()))],
    running: document.getAnimations().filter(a => a instanceof CSSAnimation && a.playState === 'running').length,
  }));
  assert.deepEqual(state.numbers, reference.numbers);
  assert.deepEqual(state.opacity, ['1']);
  assert.deepEqual(state.draw, ['1']);
  assert.equal(state.running, 0);
  results.push('reduced motion: final state at open');
  await page.close();
}

await browser.close();
server.close();
assert.deepEqual(errors, []);
console.log(`check:vintage-kana-record (${engine})\n` + results.map(r => '  ' + r).join('\n'));
