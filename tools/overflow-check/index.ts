import { spawn } from 'node:child_process';
import { createServer, type Server } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type ReadingMode = 'none' | 'historical' | 'modern';
type Finding = { cardNo: number; reading: ReadingMode; width: number; key: string; observed: unknown };
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const port = Number(process.env.OVERFLOW_CHECK_PORT ?? 4173);
// vite preview は localhost に束縛される。Windows では ::1 のみのため 127.0.0.1 では応答しない。
const baseUrl = process.env.OVERFLOW_CHECK_URL ?? `http://localhost:${port}/100/`;
const widths = [320, 375, 414, 768];
const readings: ReadingMode[] = ['none', 'historical', 'modern'];
const findings: Finding[] = [];
// ホームの操作面を、文字 100% と 200% の両方で測る（WCAG 1.4.4）。
type ReflowFinding = { width: number; zoom: number; key: string; observed: unknown };
const zoomLevels = [1, 2];
const reflowFindings: ReflowFinding[] = [];
const expectedReflowCases = widths.length * zoomLevels.length;
let reflowCases = 0;
type ExamReflowFinding = { width: number; zoom: number; key: string; observed: unknown };
const examReflowFindings: ExamReflowFinding[] = [];
const expectedExamReflowCases = widths.length * zoomLevels.length;
let examReflowCases = 0;
// 発注057 で増えた表示——開示後に残る入力欄と、△ の仮名遣い補足——を同じ幅・拡大率で測る。
type NewDisplayFinding = { width: number; zoom: number; key: string; observed: unknown };
const newDisplayFindings: NewDisplayFinding[] = [];
const expectedNewDisplayCases = widths.length * zoomLevels.length * 2;
let newDisplayCases = 0;
let aborted = false;
// 100 首 × 3 表示 × 4 幅は設計上固定で、過不足とも検査不全である。
const expectedCases = 1200;
let scannedCases = 0;

let playwright: any;
try {
  // @ts-expect-error Playwright is an optional inspection dependency until installed.
  playwright = await import('playwright');
}
catch {
  console.error('check:overflow: Playwright を読み込めません。playwright の導入後に実行してください。');
  process.exit(1);
}

try {
  await assertPortFree(port);
} catch (error) {
  console.error(`check:overflow: 環境異常: ${error instanceof Error ? error.message : 'ポートを確認できません'}`);
  process.exit(1);
}

// Windows では .cmd を直接 spawn すると EINVAL になるため、vite の JS 入口を Node で直接起動する。
const viteBin = fileURLToPath(new URL('../../node_modules/vite/bin/vite.js', import.meta.url));
const server = spawn(process.execPath, [
  viteBin, 'preview', '--port', String(port), '--strictPort',
], {
  cwd: fileURLToPath(new URL('../../packages/hyakunin', import.meta.url)),
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});
let serverLog = '';
server.stdout.on('data', (chunk) => { serverLog += chunk; });
server.stderr.on('data', (chunk) => { serverLog += chunk; });

try {
  await waitForServer(`${baseUrl}?from=1&to=1`);
  const browser = await playwright.chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(120_000);
    for (let cardNo = 1; cardNo <= 100; cardNo += 1) {
      for (const width of widths) {
        await page.setViewportSize({ width, height: 800 });
        await page.goto(`${baseUrl}?from=${cardNo}&to=${cardNo}`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('button.primary');
        await page.evaluate(() => window.localStorage.setItem('hyakunin:orientation', 'vertical'));
        // 閲覧画面（`.poem-sheet`）へ入るのは `choose('view')` だけである。
        // 「とりあえず始める」は出題が 1 問でもあれば開始前の確認画面へ行くので、
        // 台帳を承認した 2026-09-04 以降このボタンでは閲覧画面に到達しない。
        await page.getByRole('button', { name: '歌を確認する' }).click();
        await page.waitForSelector('.poem-sheet--vertical');
        for (const reading of readings) {
          const targetLabel = reading === 'none' ? '読みを確認する' : reading === 'historical' ? '現代仮名遣いで見る' : '原文に戻す';
          for (let attempt = 0; attempt < 3 && await page.locator('button.reading-toggle').textContent() !== targetLabel; attempt += 1) await page.locator('button.reading-toggle').click();
          if (await page.locator('button.reading-toggle').textContent() !== targetLabel) throw new Error(`読み表示を ${reading} に切り替えられません`);
          const measured = await page.evaluate(() => {
            const spans = [...document.querySelectorAll<HTMLElement>('.poem__half span')];
            const poem = document.querySelector<HTMLElement>('.poem');
            const author = document.querySelector<HTMLElement>('.author');
            const poemRect = poem?.getBoundingClientRect();
            const authorRect = author?.getBoundingClientRect();
            const overlap = poemRect && authorRect
              ? poemRect.left < authorRect.right && poemRect.right > authorRect.left
                && poemRect.top < authorRect.bottom && poemRect.bottom > authorRect.top : false;
            return {
              writingModes: spans.map((span) => getComputedStyle(span).writingMode),
              lefts: spans.map((span) => span.getBoundingClientRect().left),
              taller: spans.map((span) => ({ text: span.textContent ?? '', width: span.getBoundingClientRect().width, height: span.getBoundingClientRect().height })),
              rectCounts: spans.map((span) => span.getClientRects().length),
              clipped: [poem, author, ...spans].filter(Boolean).map((element) => ({
                scrollWidth: element!.scrollWidth, clientWidth: element!.clientWidth,
                scrollHeight: element!.scrollHeight, clientHeight: element!.clientHeight,
              })),
              pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
              authorOverlap: overlap,
            };
          });
          const add = (key: string, observed: unknown) => findings.push({ cardNo, reading, width, key, observed });
          scannedCases += 1;
          if (measured.writingModes.some((mode) => mode !== 'vertical-rl')) add('verticalWritingMode', measured.writingModes);
          if (measured.lefts.length !== 5) add('columnCount', measured.lefts.length);
          if (measured.lefts.some((left, i, values) => i > 0 && left >= values[i - 1])) add('columnOrder', measured.lefts);
          if (measured.taller.some((item) => [...item.text].length >= 2 && item.height <= item.width)) add('tallerThanWide', measured.taller);
          if (measured.rectCounts.some((count) => count !== 1)) add('noIntraLineWrap', measured.rectCounts);
          if (measured.clipped.some((item) => item.scrollWidth > item.clientWidth + 1 || item.scrollHeight > item.clientHeight + 1)) add('noClipping', measured.clipped);
          if (measured.pageOverflow > 1) add('noPageOverflow', measured.pageOverflow);
          if (measured.authorOverlap) add('noAuthorOverlap', measured.authorOverlap);
        }
      }
    }
    // WCAG 1.4.4 / APP_SPEC §15 項目 11: 文字を 200% にしても器を超えない。
    // 上の 1200 件は閲覧画面の歌だけを見ており、ホームの操作面は 1 度も測っていなかった。
    for (const width of widths) {
      for (const zoom of zoomLevels) {
        await page.setViewportSize({ width, height: 800 });
        await page.goto(`${baseUrl}?from=1&to=100`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('.entry-actions button');
        const measured = await page.evaluate((rootFontSize) => {
          document.documentElement.style.fontSize = rootFontSize;
          const details = document.querySelector<HTMLDetailsElement>('.known-limits');
          if (details) details.open = true;
          document.documentElement.getBoundingClientRect();
          const clipped = [...document.querySelectorAll<HTMLElement>('main *')]
            .filter((element) => element.scrollWidth > element.clientWidth + 1)
            .map((element) => element.className || element.tagName);
          const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
          document.documentElement.style.fontSize = '';
          if (details) details.open = false;
          return { clipped, overflow, hasLimitations: Boolean(details) };
        }, `${16 * zoom}px`);
        reflowCases += 1;
        // 制約の一覧が無いと、開いた状態を測ったつもりで何も測っていない。
        if (!measured.hasLimitations) reflowFindings.push({ width, zoom, key: 'knownLimitationsPresent', observed: false });
        if (measured.overflow > 1) reflowFindings.push({ width, zoom, key: 'noPageOverflow', observed: measured.overflow });
        if (measured.clipped.length) reflowFindings.push({ width, zoom, key: 'noClipping', observed: measured.clipped.slice(0, 4) });
      }
    }
    for (const width of widths) {
      for (const zoom of zoomLevels) {
        await page.setViewportSize({ width, height: 800 });
        await page.goto(`${baseUrl}?from=1&to=10`, { waitUntil: 'domcontentloaded' });
        await page.getByRole('button', { name: '学習方法を選ぶ' }).click();
        await page.getByRole('button', { name: '本番のように解く' }).click();
        await page.waitForSelector('.range-picker');
        await page.getByRole('button', { name: 'この範囲で始める' }).click();
        for (let question = 0; question < 10; question += 1) {
          const input = page.locator('input[placeholder]');
          await input.fill('あ');
          await page.getByRole('button', { name: '答え合わせ' }).click();
        }
        await page.waitForSelector('.grade-list > li');
        const measured = await page.evaluate((rootFontSize) => {
          document.documentElement.style.fontSize = rootFontSize;
          document.documentElement.getBoundingClientRect();
          const elements = [...document.querySelectorAll<HTMLElement>('main *')];
          const clipped = elements.filter((element) => element.scrollWidth > element.clientWidth + 1
            || (element.matches('.grade-list') && element.style.minWidth !== ''))
            .map((element) => element.className || element.tagName);
          const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
          const rows = document.querySelectorAll('.grade-list > li').length;
          document.documentElement.style.fontSize = '';
          return { clipped, overflow, rows, measuredElements: elements.length, heading: document.querySelector('h1')?.textContent };
        }, `${16 * zoom}px`);
        if (measured.heading !== '採点する') examReflowFindings.push({ width, zoom, key: 'gradeScreenReached', observed: measured.heading });
        if (measured.rows !== 10) examReflowFindings.push({ width, zoom, key: 'gradeRowCount', observed: measured.rows });
        if (measured.measuredElements === 0) examReflowFindings.push({ width, zoom, key: 'measuredElements', observed: measured.measuredElements });
        if (measured.overflow > 1) examReflowFindings.push({ width, zoom, key: 'noPageOverflow', observed: measured.overflow });
        if (measured.clipped.length) examReflowFindings.push({ width, zoom, key: 'noClipping', observed: measured.clipped.slice(0, 4) });
        examReflowCases += 1;
        console.log(`check:overflow: 本番採点一覧 ${width}px 文字${zoom * 100}% 予定10行 実測${measured.rows}行 要素${measured.measuredElements}件 違反 ${examReflowFindings.filter((finding) => finding.width === width && finding.zoom === zoom).length}件`);
      }
    }
    // 発注057 R3: 練習の開示後は原入力が readOnly で残る。要素が出ていなければ測れていない。
    for (const width of widths) {
      for (const zoom of zoomLevels) {
        await page.setViewportSize({ width, height: 800 });
        // 1番だけに絞る。掛詞の一言を持つのは 1 番の句 2 で、この範囲なら 5 句すべてが出る。
        // 種によってどの句が先に来るかは変わるので、一言が出るまで進める。出なければ下で違反にする。
        await page.goto(`${baseUrl}?from=1&to=1`, { waitUntil: 'domcontentloaded' });
        await page.getByRole('button', { name: '学習方法を選ぶ' }).click();
        await page.getByRole('button', { name: '練習する' }).click();
        await page.waitForSelector('.range-picker');
        await page.getByRole('button', { name: 'この範囲で始める' }).click();
        for (let attempt = 0; attempt < 5; attempt += 1) {
          await page.locator('input[placeholder]').fill('あいうえおかきくけこ');
          await page.getByRole('button', { name: '答え合わせ' }).click();
          await page.waitForSelector('.answer-retained input');
          if (await page.locator('.question-note').count() > 0) break;
          if (attempt < 4) await page.getByRole('button', { name: '次へ' }).click();
        }
        const measured = await page.evaluate((rootFontSize) => {
          document.documentElement.style.fontSize = rootFontSize;
          document.documentElement.getBoundingClientRect();
          const retained = document.querySelector<HTMLInputElement>('.answer-retained input');
          // 057 が足した表示だけを見る。session 画面の既存要素（nav-edge・縦書きの器・sr-only）は本発注の変更外で、
          // ここで拾うと 057 の緑と無関係な既存条件が混ざる。
          const scope = [...document.querySelectorAll<HTMLElement>('.answer-retained, .answer-feedback, .kana-supplement, .question-note')];
          // input は値が幅を超えると自分の中を横スクロールする。R3 は「readonly の通常 input を使う」と定めており、
          // これは器の切れではない。器そのものの幅は下の retainedWidthRatio で別に測る。
          const elements = scope.flatMap((element) => [element, ...element.querySelectorAll<HTMLElement>('*')])
            .filter((element) => !element.classList.contains('sr-only') && element.tagName !== 'INPUT');
          const clipped = elements.filter((element) => element.scrollWidth > element.clientWidth + 1).map((element) => element.className || element.tagName);
          const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
          document.documentElement.style.fontSize = '';
          const label = retained?.closest<HTMLElement>('.answer-retained');
          const retainedWidthRatio = retained && label && label.clientWidth > 0 ? retained.clientWidth / label.clientWidth : 0;
          return { clipped, overflow, measuredElements: elements.length, retainedWidthRatio, retainedValue: retained?.value ?? null, retainedReadOnly: retained?.readOnly ?? null, feedback: Boolean(document.querySelector('.answer-feedback')), note: document.querySelector('.question-note')?.textContent ?? null };
        }, `${16 * zoom}px`);
        newDisplayCases += 1;
        if (measured.retainedValue !== 'あいうえおかきくけこ') newDisplayFindings.push({ width, zoom, key: 'retainedInputPresent', observed: measured.retainedValue });
        if (measured.retainedReadOnly !== true) newDisplayFindings.push({ width, zoom, key: 'retainedInputReadOnly', observed: measured.retainedReadOnly });
        if (!measured.feedback) newDisplayFindings.push({ width, zoom, key: 'feedbackPresent', observed: false });
        // 一言が出ていなければ、その行を 1 度も測っていない。緑は証拠にならない。
        if (!measured.note?.includes('掛詞')) newDisplayFindings.push({ width, zoom, key: 'questionNoteMeasured', observed: measured.note });
        if (measured.measuredElements === 0) newDisplayFindings.push({ width, zoom, key: 'measuredElements', observed: 0 });
        // 器いっぱいに置かれていること。狭い器へ縮むと、残した入力の見える範囲が減る。
        if (measured.retainedWidthRatio < 0.9) newDisplayFindings.push({ width, zoom, key: 'retainedInputFillsRow', observed: measured.retainedWidthRatio });
        if (measured.overflow > 1) newDisplayFindings.push({ width, zoom, key: 'noPageOverflow', observed: measured.overflow });
        if (measured.clipped.length) newDisplayFindings.push({ width, zoom, key: 'noClipping', observed: measured.clipped.slice(0, 4) });
      }
    }
    // 発注057 R4: 紙の採点で △ を選んだ行の補足を測る。選ばなければ補足は DOM に無く、緑は証拠にならない。
    for (const width of widths) {
      for (const zoom of zoomLevels) {
        await page.setViewportSize({ width, height: 800 });
        await page.goto(`${baseUrl}?from=1&to=10`, { waitUntil: 'domcontentloaded' });
        await page.getByRole('button', { name: '学習方法を選ぶ' }).click();
        await page.getByRole('button', { name: '本番のように解く' }).click();
        await page.waitForSelector('.range-picker');
        await page.getByRole('button', { name: '紙に書く' }).click();
        await page.getByRole('button', { name: 'この範囲で始める' }).click();
        for (let question = 0; question < 10; question += 1) await page.getByRole('button', { name: '次へ' }).click();
        await page.waitForSelector('.grade-list > li');
        await page.locator('.grade-list > li').first().getByRole('button', { name: '△' }).click();
        const measured = await page.evaluate((rootFontSize) => {
          document.documentElement.style.fontSize = rootFontSize;
          document.documentElement.getBoundingClientRect();
          const first = document.querySelector<HTMLElement>('.grade-list > li');
          const elements = [...document.querySelectorAll<HTMLElement>('.grade-list, .grade-list *, .kana-supplement')].filter((element) => !element.classList.contains('sr-only'));
          const clipped = elements.filter((element) => element.scrollWidth > element.clientWidth + 1).map((element) => element.className || element.tagName);
          const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
          const supplements = first?.querySelectorAll('.kana-supplement').length ?? 0;
          const noteCount = [...document.querySelectorAll<HTMLElement>('main p')].filter((element) => element.textContent === '△は現代仮名遣いで書けた場合です。').length;
          document.documentElement.style.fontSize = '';
          return { clipped, overflow, measuredElements: elements.length, supplements, noteCount, historical: first?.textContent?.includes('歴史的仮名遣い：') ?? false };
        }, `${16 * zoom}px`);
        newDisplayCases += 1;
        if (measured.noteCount !== 1) newDisplayFindings.push({ width, zoom, key: 'paperPartialNoteOnce', observed: measured.noteCount });
        if (!measured.historical) newDisplayFindings.push({ width, zoom, key: 'paperPartialSupplement', observed: measured.supplements });
        if (measured.measuredElements === 0) newDisplayFindings.push({ width, zoom, key: 'measuredElements', observed: 0 });
        if (measured.overflow > 1) newDisplayFindings.push({ width, zoom, key: 'noPageOverflow', observed: measured.overflow });
        if (measured.clipped.length) newDisplayFindings.push({ width, zoom, key: 'noClipping', observed: measured.clipped.slice(0, 4) });
      }
    }
    await context.close();
  } finally { await browser.close(); }
} catch (error) {
  aborted = true;
  const details = error instanceof Error ? [error.message, error.stack].filter(Boolean).join('\n') : '';
  console.error(`check:overflow: 検査を起動できません。事前に npm run build を実行してください。${details ? ` ${sanitizeOutput(details)}` : ''}`);
  if (serverLog.trim()) console.error('check:overflow: preview サーバの出力: ' + sanitizeOutput(serverLog.trim().slice(-600)));
  process.exitCode = 1;
} finally { server.kill(); }

if (aborted) {
  console.error('check:overflow: 検査は完走していません。合否を判定できません。');
  process.exit(1);
}

if (scannedCases !== expectedCases) {
  console.error(`check:overflow: 検査対象が不足または過剰です（走査 ${scannedCases} 件、必要 ${expectedCases} 件ちょうど）`);
  process.exit(1);
}

if (reflowCases !== expectedReflowCases) {
  console.error(`check:overflow: 拡大時の走査が不足または過剰です（走査 ${reflowCases} 件、必要 ${expectedReflowCases} 件ちょうど）`);
  process.exit(1);
}

if (examReflowCases !== expectedExamReflowCases) {
  console.error(`check:overflow: 本番採点一覧の走査が不足または過剰です（走査 ${examReflowCases} 件、必要 ${expectedExamReflowCases} 件ちょうど）`);
  process.exit(1);
}

console.log(`check:overflow: 拡大時の走査 ${reflowCases} 件（幅 ${widths.join('/')} × 文字 ${zoomLevels.map((z) => `${z * 100}%`).join('/')}）、違反 ${reflowFindings.length} 件`);
for (const finding of reflowFindings) console.log(`${finding.width}px 文字${finding.zoom * 100}% ${finding.key}: ${JSON.stringify(finding.observed)}`);
if (reflowFindings.length) process.exitCode = 1;

if (newDisplayCases !== expectedNewDisplayCases) {
  console.error(`check:overflow: 057の新しい表示の走査が不足または過剰です（走査 ${newDisplayCases} 件、必要 ${expectedNewDisplayCases} 件ちょうど）`);
  process.exit(1);
}

console.log(`check:overflow: 057の新しい表示の走査 ${newDisplayCases} 件（幅 ${widths.join('/')} × 文字 ${zoomLevels.map((z) => `${z * 100}%`).join('/')} × 開示/紙△）、違反 ${newDisplayFindings.length} 件`);
for (const finding of newDisplayFindings) console.log(`${finding.width}px 文字${finding.zoom * 100}% ${finding.key}: ${JSON.stringify(finding.observed)}`);
if (newDisplayFindings.length) process.exitCode = 1;

console.log(`check:overflow: 本番採点一覧の走査 ${examReflowCases} 件（幅 ${widths.join('/')} × 文字 ${zoomLevels.map((z) => `${z * 100}%`).join('/')}）、違反 ${examReflowFindings.length} 件`);
for (const finding of examReflowFindings) console.log(`${finding.width}px 文字${finding.zoom * 100}% ${finding.key}: ${JSON.stringify(finding.observed)}`);
if (examReflowFindings.length) process.exitCode = 1;

const failedCases = new Set(findings.map((f) => `${f.cardNo}/${f.reading}/${f.width}`)).size;
console.log(`check:overflow: 合計 ${expectedCases} 件、合格 ${expectedCases - failedCases} 件、不合格 ${failedCases} 件（違反 ${findings.length} 件）`);
for (const finding of findings.slice(0, 50)) console.log(`${finding.cardNo}番 ${finding.reading} ${finding.width}px ${finding.key}: ${JSON.stringify(finding.observed)}`);
if (findings.length > 50) console.log(`check:overflow: 残り ${findings.length - 50} 件`);
if (!findings.length && expectedCases > 0) console.log('check:overflow: 全件合格');
if (findings.length) process.exitCode = 1;

async function waitForServer(url: string): Promise<void> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try { if ((await fetch(url)).ok) return; } catch { /* preview server is starting */ }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('vite preview が30秒以内に応答しませんでした');
}

async function assertPortFree(candidate: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const probe: Server = createServer();
    probe.once('error', () => reject(new Error(`ポート ${candidate} は使用中です`)));
    probe.listen(candidate, 'localhost', () => probe.close(() => resolve()));
  });
}

function sanitizeOutput(value: string): string {
  const rootPattern = root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[\\/]/g, '[\\\\/]');
  return value.replace(new RegExp(rootPattern, 'gi'), '.');
}
