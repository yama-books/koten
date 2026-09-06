import { mkdtemp, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { makeSanitizer } from './sanitize.ts';

type ScenarioResult = { name: string; count: number; pass: boolean };

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const port = Number(process.env.STORAGE_CHECK_PORT ?? 4176);
const baseUrl = process.env.STORAGE_CHECK_URL ?? `http://localhost:${port}/100/`;
const viteBin = fileURLToPath(new URL('../../node_modules/vite/bin/vite.js', import.meta.url));
const browserEntry = fileURLToPath(new URL('./browser-entry.ts', import.meta.url));
const browserEntryUrl = `${baseUrl.replace(/\/$/, '')}/@fs${pathToFileURL(browserEntry).pathname}`;
const sanitizeOutput = makeSanitizer(root);
const results: ScenarioResult[] = [];
let aborted = false;
let serverLog = '';
let profileDir: string | undefined;

let playwright: any;
try { playwright = await import('playwright'); }
catch {
  console.error('check:storage: Playwright を読み込めません。');
  process.exit(1);
}

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('check:storage: ポート番号が不正です。');
  process.exit(1);
}
if (!await isPortAvailable(port)) {
  console.error('check:storage: 指定ポートは既に使用されています。');
  process.exit(1);
}

// Windows では .cmd を直接 spawn すると EINVAL になるため、Vite の JS 入口を Node で起動する。
// dev サーバーは browser-entry.ts とその import 先を実行ごとに TypeScript から変換する。
const server = spawn(process.execPath, [viteBin, '--port', String(port), '--strictPort'], {
  cwd: fileURLToPath(new URL('../../packages/hyakunin', import.meta.url)), stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
});
server.stdout.on('data', (chunk) => { serverLog += chunk; });
server.stderr.on('data', (chunk) => { serverLog += chunk; });

// ハングする検査は、失敗する検査より悪い。CI を上限まで占有し、どこで止まったかも残さない。
// 到達したシナリオ名を添えて必ず終わらせる（2026-09-04・H-21）。
const deadlineMs = Number(process.env.STORAGE_CHECK_TIMEOUT_MS ?? 180_000);
const watchdog = setTimeout(() => {
  console.error(`check:storage: ${deadlineMs}ms 以内に完走しませんでした。完了したシナリオ: ${results.map((r) => r.name).join(" / ") || "なし"}`);
  console.error("check:storage: 検査は完走していません。合否を判定できません。");
  try { server.kill(); } catch { /* already gone */ }
  process.exit(1);
}, deadlineMs);

try {
  await waitForServer(baseUrl);
  profileDir = await mkdtemp(join(tmpdir(), 'koten-storage-'));
  const first = await playwright.chromium.launchPersistentContext(profileDir, { headless: true });
  try {
    const page = await first.newPage();
    // 製品画面を開くと、その画面自身も IndexedDB 接続を保持する。検査用モジュールを
    // 文書として開き、検査対象と同じDBを別のアプリ接続が塞がない状態で測る。
    await page.goto(browserEntryUrl, { waitUntil: 'domcontentloaded' });
    await installStorageApi(page);
    const wrote = await page.evaluate(async (event) => {
      const api = (window as any).__kotenStorageCheck;
      const opened = await api.openDatabase();
      if (!opened.ok) return false;
      try { return (await api.appendEvent(opened.value, event)).ok; }
      finally { opened.value.close(); }
    }, eventFor('reload'));
    if (!wrote) throw new Error('初回のイベント記録に失敗しました');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await installStorageApi(page);
    await recordEventCount(page, 'ページ再読み込み', 1);
  } finally { await first.close(); }

  const restarted = await playwright.chromium.launchPersistentContext(profileDir, { headless: true });
  try {
    const page = await restarted.newPage();
    await page.goto(browserEntryUrl, { waitUntil: 'domcontentloaded' });
    await installStorageApi(page);
    await recordEventCount(page, 'ブラウザ文脈再作成', 1);
    await runUpgradeScenario(page);
    await runFallbackScenario(page);
    await runUnknownProductScenario(page);
  } finally { await restarted.close(); }
} catch (error) {
  aborted = true;
  const details = error instanceof Error ? [error.message, error.stack].filter(Boolean).join('\n') : '';
  console.error(`check:storage: 検査を起動できません。${details ? ` ${sanitizeOutput(details)}` : ''}`);
  if (serverLog.trim()) console.error(`check:storage: 開発サーバーの出力: ${sanitizeOutput(serverLog.trim().slice(-600))}`);
} finally {
  clearTimeout(watchdog);
  server.kill();
  if (profileDir) await removeProfile(profileDir);
}

if (aborted || results.length !== 5) {
  console.error('check:storage: 検査は完走していません。合否を判定できません。');
  process.exit(1);
}
for (const result of results) console.log(`check:storage: ${result.name} ${result.pass ? '合格' : '不合格'} 件数 ${result.count}`);
const passed = results.filter((result) => result.pass).length;
console.log(`check:storage: シナリオ ${results.length} 件、合格 ${passed} 件、不合格 ${results.length - passed} 件`);
if (passed !== results.length) process.exitCode = 1;

async function installStorageApi(page: any): Promise<void> {
  await page.evaluate(async (url) => {
    const entry = await import(url);
    (window as any).__kotenStorageCheck = entry.storageCheckApi;
  }, browserEntryUrl);
}

async function recordEventCount(page: any, name: string, minimum: number): Promise<void> {
  const count = await page.evaluate(async () => {
    const api = (window as any).__kotenStorageCheck;
    const opened = await api.openDatabase();
    if (!opened.ok) return 0;
    try {
      const listed = await api.listEvents(opened.value);
      return listed.ok ? listed.value.length : 0;
    } finally { opened.value.close(); }
  });
  results.push({ name, count, pass: count >= minimum });
}

async function runUpgradeScenario(page: any): Promise<void> {
  const count = await page.evaluate(async () => {
    const api = (window as any).__kotenStorageCheck;
    const opened = await api.openDatabase(undefined, { version: api.dbVersion + 1 });
    if (!opened.ok) return 0;
    try {
      const listed = await api.listEvents(opened.value);
      return listed.ok ? listed.value.length : 0;
    } finally { opened.value.close(); }
  });
  results.push({ name: 'DB upgrade', count, pass: count >= 1 });
}

async function runFallbackScenario(page: any): Promise<void> {
  const fallback = await page.evaluate(async () => {
    const answer = { answer: 'kept' };
    try {
      const { writeFallback } = await (window as any).__kotenStorageCheck.loadFallback();
      const storage = { setItem() { throw new DOMException('full', 'QuotaExceededError'); } } as Storage;
      return writeFallback(storage, 'event', answer);
    } catch { return { ok: false, shouldExport: false, value: answer }; }
  });
  results.push({ name: '容量不足', count: fallback.value?.answer === 'kept' ? 1 : 0, pass: fallback.ok === false && fallback.shouldExport === true && fallback.value?.answer === 'kept' });
}

async function runUnknownProductScenario(page: any): Promise<void> {
  const outcome = await page.evaluate(async (event) => {
    const api = (window as any).__kotenStorageCheck;
    const opened = await api.openDatabase(undefined, { version: api.dbVersion + 1 });
    if (!opened.ok) return { rejected: false, before: 0, after: 0 };
    try {
      const before = await api.listEvents(opened.value);
      const appended = await api.appendEvent(opened.value, event);
      const after = await api.listEvents(opened.value);
      return { rejected: appended.ok === false, before: before.ok ? before.value.length : 0, after: after.ok ? after.value.length : 0 };
    } finally { opened.value.close(); }
  }, eventFor('unknown-product', 'unknown-product'));
  results.push({ name: '未知 product の拒否', count: outcome.after, pass: outcome.rejected && outcome.after === outcome.before });
}

function eventFor(eventId: string, product = 'hyakunin') {
  return {
    eventId, product, poemId: 'p001', sessionId: 'session-check', itemKey: 'p001:text', kind: 'answer',
    method: 'free-input', outcome: 'correct', hintUsed: false, effectiveMethod: 'free-input', delta: 9,
    localDate: '2026-08-31', sameSessionRepeat: false, appVersion: '0.1.0', dataVersion: 1, masteryRulesVersion: 1,
  };
}

async function waitForServer(url: string): Promise<void> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try { if ((await fetch(url)).ok) return; } catch { /* development server is starting */ }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('Vite が30秒以内に応答しませんでした');
}

async function isPortAvailable(candidate: number): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = createServer();
    probe.once('error', () => resolve(false));
    probe.listen(candidate, '::1', () => probe.close(() => resolve(true)));
  });
}

async function removeProfile(directory: string): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try { await rm(directory, { recursive: true, force: true, maxRetries: 2, retryDelay: 200 }); return; }
    catch (error) {
      if (attempt === 2) {
        const details = error instanceof Error ? [error.message, error.stack].filter(Boolean).join('\n') : '';
        console.error(`check:storage: 一時ブラウザ領域を削除できませんでした。${details ? ` ${sanitizeOutput(details)}` : ''}`);
      }
      else await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
}
