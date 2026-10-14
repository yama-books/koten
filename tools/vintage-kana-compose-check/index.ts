// 変体仮名メーカーの変換結果の検査（シンプル版の変換演出、くわしい版の「書いてみる」）。
// 使い方:
//   node --experimental-strip-types tools/vintage-kana-compose-check/index.ts [--webkit]
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit, type Browser, type Page } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const appDir = path.join(root, 'vintage-kana');
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
const errors: string[] = [];
const results: string[] = [];

const isHentaigana = (s: string) => { const cp = s.codePointAt(0)!; return cp >= 0x1b000 && cp <= 0x1b11f; };
const DAKUTEN = '゙', HANDAKUTEN = '゚';

async function openPage(file: string) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', e => errors.push(file + ': ' + e.message));
  await page.addInitScript(() => localStorage.setItem('vintage-kana:install-notice-dismissed', '1'));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, route => route.abort());
  await page.goto(base + file);
  return page;
}

// シンプル版：変換して結果の判（スタンプ）を読む。skip=false なら演出を最後まで見る。
async function convert(page: Page, text: string, mode: 'forward' | 'reverse', skip: boolean) {
  await page.evaluate(([value, m]) => {
    const input = document.getElementById('input') as HTMLTextAreaElement;
    input.value = value;
    (document.querySelector(`input[name="conversionMode"][value="${m}"]`) as HTMLInputElement).checked = true;
    (document.activeElement as HTMLElement | null)?.blur();
  }, [text, mode]);
  await page.locator('#convert').click();
  if (skip) {
    await page.waitForFunction(() => document.getElementById('stage')?.classList.contains('active'), null, { timeout: 15000 });
    await page.waitForTimeout(400);
    await page.locator('#skip').click();
  }
  await page.waitForFunction(() => !(document.getElementById('resultActions') as HTMLElement).hidden, null, { timeout: 60000 });
  const stamps = await page.evaluate(() => [...document.querySelectorAll('#stampboard .stamp')].map(el => el.textContent || ''));
  await page.locator('#playAgain').click();
  return stamps;
}

// 1. シンプル版：濁点・半濁点・小書き・ん も含めて、すべて変体仮名になる。
{
  const page = await openPage('index.html');
  await page.waitForFunction('variantPool!==null', null, { timeout: 15000 });
  assert.equal(await page.locator('a.more').textContent(), 'くわしく');
  const src = 'うそからでたまことしゃしんぱん';
  const units = [...src].length;
  const check = (stamps: string[], label: string) => {
    assert.equal(stamps.length, units, `${label}: one stamp per kana ${JSON.stringify(stamps)}`);
    stamps.forEach((s, i) => assert.ok(isHentaigana(s), `${label}: stamp ${i} ${JSON.stringify(s)} is hentaigana`));
    assert.ok(stamps[4].endsWith(DAKUTEN) && [...stamps[4]].length === 2, `${label}: で keeps dakuten`);
    assert.ok(stamps[13].endsWith(HANDAKUTEN), `${label}: ぱ keeps handakuten`);
    assert.ok(!stamps[10].endsWith(DAKUTEN) && [...stamps[10]].length === 1, `${label}: ゃ becomes a full-size kana`);
  };
  // 演出あり（最後まで）
  const first = await convert(page, src, 'forward', false);
  check(first, 'animated');
  // もう1回：同じ仮名でも前回と別の字体になる（候補が2つ以上ある仮名）。
  const second = await convert(page, src, 'forward', true);
  check(second, 'again');
  const multi = await page.evaluate(() => Object.fromEntries('うそからでたまことしゃん'.split('').map(ch => {
    const { base } = splitKanaUnit(ch);
    return [ch, variantsFor(base).length];
  })));
  [...src].forEach((ch, i) => {
    if ((multi[ch] || 0) > 1 && src.indexOf(ch) === i) assert.notEqual(second[i], first[i], `again: ${ch} changes glyph`);
  });
  // 逆変換：変体仮名（濁点つき）を普通のひらがなに戻す。
  const back = await convert(page, second.join(''), 'reverse', true);
  assert.equal(back.join(''), 'うそからでたまことしやしんぱん');
  results.push(`simple: ${first.join('')} → again ${second.join('')} → reverse ${back.join('')}`);
  await page.close();
}

// 2. くわしい版「書いてみる」。
{
  const page = await openPage('detail.html');
  await page.waitForFunction('GLYPHS.length>0');
  const setText = (value: string) => page.evaluate(v => {
    const s = document.getElementById('sourceText') as HTMLTextAreaElement;
    s.value = v; s.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
  const preview = () => page.evaluate(() => [...document.querySelectorAll('#preview .pvCell')].map(el => el.textContent || ''));

  // おまかせ：最初から普通のひらがなは出ない（ん・濁点・小書きも）。
  const src = 'うそからでたまことしゃしんぱん';
  await setText(src);
  const auto = await preview();
  auto.forEach((s, i) => assert.ok(isHentaigana(s), `detail auto: cell ${i} ${JSON.stringify(s)} is hentaigana`));

  // もう一度：毎回別の字になり、頻度の低い字体も選ばれる。
  await setText('る');
  const ruChoices = await page.evaluate(() => glyphChoicesFor(composeInfo('る')).map(g => g.character));
  const seen = new Set<string>();
  let prev = (await preview())[0];
  for (let i = 0; i < 120; i++) {
    await page.locator('#rerollCompose').click();
    const now = (await preview())[0];
    assert.notEqual(now, prev, 'reroll picks a different glyph');
    seen.add(now); prev = now;
  }
  assert.equal(seen.size, ruChoices.length, `reroll reaches every る glyph (${seen.size}/${ruChoices.length})`);

  // 自分で選ぶ：普通のひらがなも選べる。
  await setText('かかか');
  await page.locator('[data-compose-mode="manual"]').click();
  await page.locator('.composeRow .standardChoice').first().click();
  assert.deepEqual(await preview(), ['か', 'か', 'か'], 'manual: plain kana selectable for all');
  const firstGlyph = page.locator('.composeRow .glyphChoice:not(.standardChoice)').first();
  const glyphText = (await firstGlyph.locator('.g').textContent())!;
  await firstGlyph.click();
  assert.deepEqual(await preview(), [glyphText, glyphText, glyphText]);

  // 一字ずつ設定する：同じ字でも位置ごとに選べる（現代の仮名も）。
  await page.locator('#perCharToggle').click();
  assert.equal(await page.locator('#perCharToggle').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('.composeRow').count(), 3);
  assert.deepEqual(await page.locator('.composePos').allTextContents(), ['1字目', '2字目', '3字目']);
  await page.locator('.composeRow').nth(1).locator('.standardChoice').click();
  const third = page.locator('.composeRow').nth(2).locator('.glyphChoice:not(.standardChoice)').nth(1);
  const thirdText = (await third.locator('.g').textContent())!;
  await third.click();
  assert.deepEqual(await preview(), [glyphText, 'か', thirdText], 'per-char selections');
  assert.equal(await page.locator('.composeRow').nth(1).locator('.standardChoice.active').count(), 1);
  // 解除すると一括の選択に戻る。
  await page.locator('#perCharToggle').click();
  assert.equal(await page.locator('.composeRow').count(), 1);
  assert.deepEqual(await preview(), [glyphText, glyphText, glyphText], 'per-char off restores batch');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  assert.equal(overflow, false, 'no horizontal overflow');
  results.push(`detail: auto ${auto.join('')}; reroll る ${seen.size}/${ruChoices.length} glyphs; per-char ${glyphText}か${thirdText}`);
  await page.close();
}

assert.deepEqual(errors, []);
await browser.close();
server.close();
console.log(`check:vintage-kana-compose (${engine})`);
for (const line of results) console.log('  ' + line);
