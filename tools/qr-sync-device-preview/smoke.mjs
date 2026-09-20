import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import jsQR from 'jsqr';

const base = process.env.QR_DEVICE_URL;
if (!base) throw new Error('QR_DEVICE_URL is required');
async function finishOnboarding(page) {
  await page.getByRole('button', { name: 'とりあえず始める' }).waitFor();
  const dialog = page.locator('.onboarding__dialog');
  if (await dialog.isVisible()) {
    await dialog.getByText('中一', { exact: true }).click();
    await dialog.getByRole('button', { name: 'OK' }).click();
  }
}
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
try {
  const first = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const pageA = await first.newPage();
  await pageA.goto(base, { waitUntil: 'domcontentloaded' });
  await finishOnboarding(pageA);
  for (const width of [320, 390, 1024]) {
    await pageA.setViewportSize({ width, height: 844 });
    const intro = pageA.locator('.sync-intro');
    assert.ok(await intro.isVisible(), `sync intro is missing at ${width}px`);
    const fit = await intro.evaluate((element) => ({ right: element.getBoundingClientRect().right, viewport: document.documentElement.clientWidth }));
    assert.ok(fit.right <= fit.viewport + 0.5, `sync intro exceeds the viewport at ${width}px`);
    const deviceNames = await intro.locator('.sync-intro__device').evaluateAll((elements) => elements.map((element) => element.getClientRects().length));
    assert.deepEqual(deviceNames, [1, 1], `device names wrap within a word at ${width}px`);
  }
  if (process.env.QR_INTRO_SCREENSHOT) await pageA.screenshot({ path: process.env.QR_INTRO_SCREENSHOT });
  await pageA.setViewportSize({ width: 390, height: 844 });
  await pageA.getByRole('button', { name: '試してみる' }).click();
  await pageA.getByRole('button', { name: '新しい同期グループを作る' }).click();
  await pageA.getByText('端末間同期が有効です', { exact: true }).waitFor({ timeout: 30_000 });
  await pageA.waitForFunction(() => document.querySelector('.sync-qr canvas')?.width === 288);
  for (const width of [320, 390]) {
    await pageA.setViewportSize({ width, height: 844 });
    const panel = await pageA.locator('.sync-step').first().boundingBox();
    const frame = await pageA.locator('.sync-qr').boundingBox();
    assert.ok(panel && frame && frame.x >= panel.x - 0.5 && frame.x + frame.width <= panel.x + panel.width + 0.5, `QR frame exceeds its panel at ${width}px`);
  }
  if (process.env.QR_LAYOUT_SCREENSHOT) await pageA.screenshot({ path: process.env.QR_LAYOUT_SCREENSHOT });
  const qr = await pageA.locator('.sync-qr canvas').evaluate((canvas) => {
    const image = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    return { width: canvas.width, height: canvas.height, data: Array.from(image.data) };
  });
  await pageA.getByText('リンク・共有コードを使う').click();
  const invite = await pageA.locator('input[readonly]').inputValue();
  assert.equal(jsQR(Uint8ClampedArray.from(qr.data), qr.width, qr.height)?.data, invite);

  const second = await browser.newContext();
  const pageB = await second.newPage();
  await pageB.goto(invite, { waitUntil: 'domcontentloaded' });
  try {
    await pageB.getByText('同期先を確認できました。参加する場合は下のボタンで確定してください。').waitFor({ timeout: 30_000 });
  } catch (error) {
    process.stderr.write(`Second device at ${pageB.url()}: ${await pageB.locator('body').innerText()}\n`);
    throw error;
  }
  await pageB.getByRole('button', { name: '確認して参加する' }).click();
  await pageB.getByText('端末間同期が有効です', { exact: true }).waitFor({ timeout: 30_000 });

  const eventCount = async (page) => page.evaluate(() => new Promise((resolve, reject) => {
    const opened = indexedDB.open('koten', 2);
    opened.onerror = () => reject(opened.error);
    opened.onsuccess = () => {
      const db = opened.result;
      const request = db.transaction('events', 'readonly').objectStore('events').count();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => { resolve(request.result); db.close(); };
    };
  }));
  await pageA.getByRole('button', { name: 'ホームへ戻る' }).click();
  await pageA.getByRole('button', { name: '歌を確認する' }).click();
  await pageB.waitForFunction(async () => {
    const opened = indexedDB.open('koten', 2);
    return new Promise((resolve) => {
      opened.onsuccess = () => {
        const db = opened.result;
        const count = db.transaction('events').objectStore('events').count();
        count.onsuccess = () => { resolve(count.result > 0); db.close(); };
      };
      opened.onerror = () => resolve(false);
    });
  }, { timeout: 30_000 });
  const before = await eventCount(pageA);
  await pageB.getByRole('button', { name: 'ホームへ戻る' }).click();
  await finishOnboarding(pageB);
  await pageB.getByRole('button', { name: '歌を確認する' }).click();
  await pageA.waitForFunction(async (minimum) => {
    const opened = indexedDB.open('koten', 2);
    return new Promise((resolve) => {
      opened.onsuccess = () => {
        const db = opened.result;
        const count = db.transaction('events').objectStore('events').count();
        count.onsuccess = () => { resolve(count.result > minimum); db.close(); };
      };
      opened.onerror = () => resolve(false);
    });
  }, before, { timeout: 30_000 });
  if (process.env.QR_STOP_SCREENSHOT) {
    await pageA.getByRole('button', { name: '範囲を選び直す' }).click();
    await pageA.getByRole('button', { name: 'これまでの記録' }).click();
    await pageA.getByRole('tab', { name: 'データ管理' }).click();
    await pageA.getByRole('button', { name: '同期の設定を見る' }).click();
    await pageA.getByRole('button', { name: '同期を停止', exact: true }).click();
    await pageA.getByRole('button', { name: '停止する' }).click();
    await pageA.locator('.sync-notice').getByText('同期を停止しました。').waitFor();
    await pageA.screenshot({ path: process.env.QR_STOP_SCREENSHOT });
  }
  process.stdout.write('Two isolated browser contexts joined; records flowed in both directions.\n');
} finally {
  await browser.close();
}
