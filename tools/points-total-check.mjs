/* Focused total/record UI check. Synthetic demo Auth+Firestore only; no invitations
 * or group paths are logged or captured in screenshots. Build apps with
 * VITE_APP007_EMULATOR=1, then run under firebase emulators:exec. */
import http from 'node:http';
import path from 'node:path';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { build } from 'vite';
import { chromium, webkit } from 'playwright';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (!process.env.FIRESTORE_EMULATOR_HOST) throw Error('Run under the demo Auth+Firestore emulators.');
await build({ root, configFile: false, define: { 'import.meta.env.VITE_APP007_EMULATOR': '"1"' }, build: { outDir: '.cache/points-seed', lib: { entry: 'tests/fixtures/points-seed.ts', formats: ['iife'], name: 'SyntheticPoints', fileName: () => 'seed.js' } } });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const server = http.createServer(async (req, res) => {
  try {
    let name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (name === '/seed.html') { res.setHeader('content-type', 'text/html'); res.end('<!doctype html><script src="/.cache/points-seed/seed.js"></script>'); return; }
    if (name.startsWith('/100/')) name = '/packages/hyakunin/dist/' + name.slice(5);
    if (name.endsWith('/')) name += 'index.html';
    const target = path.resolve(root, '.' + name); if (!target.startsWith(root + path.sep)) throw Error();
    res.setHeader('content-type', mime[path.extname(target)] || 'application/octet-stream'); res.end(await readFile(target));
  } catch { res.statusCode = 404; res.end(); }
});
await new Promise(resolve => server.listen(4209, '127.0.0.1', resolve));
const base = 'http://127.0.0.1:4209', engine = process.argv.includes('--webkit') ? 'WebKit' : 'Chromium';
const browser = await (engine === 'WebKit' ? webkit : chromium).launch();
const contexts = []; let stage = 'seed', checks = 0;
async function context() {
  const c = await browser.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' }); contexts.push(c);
  await c.route('**/*', r => ['127.0.0.1', 'localhost'].includes(new URL(r.request().url()).hostname) ? r.continue() : r.abort());
  return c;
}
const values = p => p.locator('[data-koten-points]').evaluate(e => ({ total: Number(e.querySelector('[data-points-total]')?.textContent.replaceAll(',', '')), entries: [...e.querySelectorAll('[data-points-app]')].map(d => Number(d.textContent.match(/^[\d,]+/)?.[0].replaceAll(',', ''))) }));
async function waitTotal(page, total) {
  await page.waitForFunction(n => document.querySelector('[data-points-total]')?.textContent === String(n), total, { timeout: 30000 });
  const v = await values(page); assert.equal(v.total, total); assert.equal(v.entries.reduce((a, b) => a + b, 0), total); checks++;
}
try {
  const c = await context(), seedPage = await c.newPage(); await seedPage.goto(base + '/seed.html');
  const seed = await seedPage.evaluate(() => window.seedPoints());
  for (const app of ['conj', 'vintage-kana', 'hyakunin']) {
    stage = 'record ' + app;
    const c = await context(), p = await c.newPage();
    const url = app === 'hyakunin' ? '/100/?join=' + seed.code : app === 'conj' ? '/conj/?join=' + seed.code : '/vintage-kana/detail.html?join=' + seed.code;
    await p.goto(base + url);
    await p.getByRole('button', { name: '確認して参加する', exact: true }).click();
    if (app === 'hyakunin') {
      await p.waitForFunction(() => !!document.querySelector('.sync-status--active'), {}, { timeout: 30000 });
      await p.getByRole('button', { name: '記録を見る', exact: true }).click();
    } else {
      await p.waitForFunction(() => document.querySelector('.koten-sync-status')?.textContent.startsWith('端末間同期が有効です'), {}, { timeout: 30000 });
      await p.locator('.koten-sync-dialog').getByRole('button', { name: '設定へ戻る', exact: true }).click();
      if (app === 'conj') await p.locator('#openRecord').click();
      else await p.locator('#masteryRingAction').click();
    }
    await waitTotal(p, seed.total);
    for (const width of [320, 375, 414, 768]) {
      await p.setViewportSize({ width, height: 812 });
      assert.ok(await p.locator('[data-koten-points]').evaluate(e => e.scrollWidth <= e.clientWidth + 1)); checks++;
    }
    await p.setViewportSize({ width: 375, height: 812 });
    await mkdir(path.join(root, '.cache/qa-points'), { recursive: true });
    // Only the record widget: no QR, invitation or group code is in frame.
    await p.locator('[data-koten-points]').screenshot({ path: path.join(root, '.cache/qa-points', app + '-' + engine + '.png') });
    await c.setOffline(true);
    await p.waitForFunction(() => document.querySelector('[data-koten-points]')?.textContent.includes('前回取得'));
    assert.equal((await values(p)).total, seed.total); checks++;
    await c.setOffline(false); await p.evaluate(() => window.dispatchEvent(new Event('focus'))); await waitTotal(p, seed.total);
    if (app !== 'hyakunin') {
      await p.evaluate(async app => {
        const api = app === 'conj' ? window.ConjRecordTransfer : window.VintageKanaRecordTransfer;
        const archive = api.exportRecord(localStorage);
        for (let i = 0; i < 2; i++) await api.commitImport(localStorage, await api.previewImport(localStorage, archive));
        window.dispatchEvent(new Event('koten:record-saved'));
      }, app);
      await waitTotal(p, seed.total);
      await p.evaluate(app => { localStorage.removeItem('koten:sync-app:' + app + ':v1'); window.dispatchEvent(new StorageEvent('storage', { key: 'koten:sync-app:' + app + ':v1' })); }, app);
      await p.waitForFunction(() => document.querySelector('[data-koten-points]').hidden);
      assert.equal(await p.locator('[data-points-total]').count(), 0); checks++;
    }
    await c.close();
  }
  stage = 'legacy invitation read';
  const legacy = await seedPage.evaluate(() => window.seedPoints(true));
  const legacyContext = await context(), p = await legacyContext.newPage();
  await p.goto(base + '/conj/?join=' + legacy.code);
  await p.getByRole('button', { name: '確認して参加する', exact: true }).click();
  await waitTotal(p, legacy.total);
  console.log(`points-total browser: PASS ${checks} checks; ${engine}; synthetic emulator, no physical-device claim`);
} catch (error) {
  // Do not print browser expressions, URLs, stored values or invitations.
  console.error(`points-total browser: FAIL at ${stage}: ${String(error.message).split('\n')[0].replace(/[a-zA-Z0-9_-]{16,}/g, '[redacted]')}`); process.exitCode = 1;
} finally { for (const c of contexts) await c.close().catch(() => {}); await browser.close(); await new Promise(resolve => server.close(resolve)); }
