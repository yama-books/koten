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
const widths = [320, 375, 414, 768, 1024, 1440];
const readings: ReadingMode[] = ['none', 'historical', 'modern'];
const findings: Finding[] = [];
// ホームの操作面を、文字 100% と 200% の両方で測る（WCAG 1.4.4）。
type ReflowFinding = { width: number; zoom: number; key: string; observed: unknown };
const zoomLevels = [1, 2];
const reflowFindings: ReflowFinding[] = [];
const expectedReflowCases = widths.length * zoomLevels.length;
let reflowCases = 0;
// 発注068: 初回設定のダイアログはホーム本体と別の優先表示であり、開いた状態を名指しで測る。
type OnboardingReflowFinding = { width: number; zoom: number; key: string; observed: unknown };
const onboardingReflowFindings: OnboardingReflowFinding[] = [];
const expectedOnboardingReflowCases = widths.length * zoomLevels.length;
let onboardingReflowCases = 0;
type ExamReflowFinding = { width: number; zoom: number; key: string; observed: unknown };
const examReflowFindings: ExamReflowFinding[] = [];
const expectedExamReflowCases = widths.length * zoomLevels.length;
let examReflowCases = 0;
// 発注063: 本番の範囲選択に追加した作者問題設定は、範囲・解答方法と同じ画面で測る。
type RangePickerReflowFinding = { width: number; zoom: number; key: string; observed: unknown };
const rangePickerReflowFindings: RangePickerReflowFinding[] = [];
const expectedRangePickerReflowCases = widths.length * zoomLevels.length * 2;
let rangePickerReflowCases = 0;
// 発注057 で増えた表示——開示後に残る入力欄と、△ の仮名遣い補足——を同じ幅・拡大率で測る。
type NewDisplayFinding = { width: number; zoom: number; key: string; observed: unknown };
const newDisplayFindings: NewDisplayFinding[] = [];
const expectedNewDisplayCases = widths.length * zoomLevels.length * 2;
let newDisplayCases = 0;
// 発注059: 出題中のヘッダと操作面を、幅4通り・文字2通りで測る。
type SessionReflowFinding = { width: number; zoom: number; key: string; observed: unknown };
const sessionReflowFindings: SessionReflowFinding[] = [];
const expectedSessionReflowCases = widths.length * zoomLevels.length;
let sessionReflowCases = 0;
// 発注062: 穴埋め専用だった出題画面に、作者の固定順選択肢を追加した。
// 別DOMなので、同じ幅・文字倍率で実際に作者入口へ遷移して測る。
type AuthorReflowFinding = { width: number; zoom: number; key: string; observed: unknown };
const authorReflowFindings: AuthorReflowFinding[] = [];
const expectedAuthorReflowCases = widths.length * zoomLevels.length;
let authorReflowCases = 0;
// 発注066: 復元カードは20首以下と21首以上で文言構成が異なる。両方を実際に中断して測る。
type RestoreReflowFinding = { width: number; zoom: number; rangeEnd: number; key: string; observed: unknown };
const restoreReflowFindings: RestoreReflowFinding[] = [];
const expectedRestoreReflowCases = widths.length * zoomLevels.length * 2;
let restoreReflowCases = 0;
let aborted = false;
// 100 首 × 3 表示 × 6 幅は設計上固定で、過不足とも検査不全である。
const expectedCases = 1800;
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
        // 初回設定は公開画面で意図して出る。走査はその後の閲覧画面を測るので、
        // 新しいブラウザ文脈では最初の一度だけ学年を選んで先へ進める。
        await page.waitForTimeout(100);
        if (await page.locator('.onboarding').count()) {
          await page.getByRole('button', { name: '中一', exact: true }).click();
          await page.getByRole('button', { name: 'OK', exact: true }).click();
        }
        await page.waitForSelector('button.primary');
        await page.evaluate(() => window.localStorage.setItem('hyakunin:orientation', 'vertical'));
        // 閲覧画面（`.poem-sheet`）へ入るのは `choose('view')` だけである。
        // 「とりあえず始める」は出題が 1 問でもあれば開始前の確認画面へ行くので、
        // 台帳を承認した 2026-09-04 以降このボタンでは閲覧画面に到達しない。
        await page.getByRole('button', { name: '歌を確認する', exact: true }).click();
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
            const sheetRect = document.querySelector<HTMLElement>('.poem-sheet--vertical')?.getBoundingClientRect();
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
              sheetCenterOffset: sheetRect ? Math.abs((sheetRect.left + sheetRect.width / 2) - window.innerWidth / 2) : null,
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
          if (width >= 1024 && (measured.sheetCenterOffset === null || measured.sheetCenterOffset > 1)) add('verticalSheetCentered', measured.sheetCenterOffset);
        }
      }
    }
    // WCAG 1.4.4 / APP_SPEC §15 項目 11: 文字を 200% にしても器を超えない。
    // 上の 1800 件は閲覧画面の歌だけを見ており、ホームの操作面は 1 度も測っていなかった。
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
    // 発注068: ダイアログが実際に出ている初回状態を別コンテキストで測る。
    for (const width of widths) {
      for (const zoom of zoomLevels) {
        const onboardingContext = await browser.newContext();
        const onboardingPage = await onboardingContext.newPage();
        try {
          await onboardingPage.setViewportSize({ width, height: 800 });
          await onboardingPage.goto(`${baseUrl}?from=1&to=100`, { waitUntil: 'domcontentloaded' });
          await onboardingPage.waitForSelector('.onboarding__dialog');
          const measured = await onboardingPage.evaluate((rootFontSize) => {
            document.documentElement.style.fontSize = rootFontSize;
            document.documentElement.getBoundingClientRect();
            const dialog = document.querySelector<HTMLElement>('.onboarding__dialog');
            const scope = dialog ? [dialog, ...dialog.querySelectorAll<HTMLElement>('*')] : [];
            const clipped = scope.filter((element) => !element.classList.contains('sr-only') && (element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1))
              .map((element) => element.className || element.tagName);
            const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
            const confirm = dialog?.querySelector<HTMLButtonElement>('.stats-notice__confirm');
            document.documentElement.style.fontSize = '';
            return { dialog: Boolean(dialog), clipped, overflow, confirmDisabled: confirm?.disabled ?? null };
          }, `${16 * zoom}px`);
          onboardingReflowCases += 1;
          if (!measured.dialog) onboardingReflowFindings.push({ width, zoom, key: 'dialogPresent', observed: false });
          if (measured.confirmDisabled !== true) onboardingReflowFindings.push({ width, zoom, key: 'confirmRequiresGrade', observed: measured.confirmDisabled });
          if (measured.overflow > 1) onboardingReflowFindings.push({ width, zoom, key: 'noPageOverflow', observed: measured.overflow });
          if (measured.clipped.length) onboardingReflowFindings.push({ width, zoom, key: 'noClipping', observed: measured.clipped.slice(0, 4) });
        } finally {
          await onboardingContext.close();
        }
      }
    }
    // 発注066: 復元カードは、実際に入口から回を始めて保存済みの中断状態を作らなければ現れない。
    // 範囲20首と21首を別コンテキストにして、前の中断状態を混ぜない。
    for (const rangeEnd of [20, 21]) {
      for (const width of widths) {
        for (const zoom of zoomLevels) {
          const restoreContext = await browser.newContext();
          const restorePage = await restoreContext.newPage();
          try {
            await restorePage.setViewportSize({ width, height: 800 });
            await restorePage.goto(`${baseUrl}?from=1&to=${rangeEnd}`, { waitUntil: 'domcontentloaded' });
            await restorePage.waitForSelector('.entry-actions button');
            // 復元カードだけを測るため、画面と同じ IndexedDB の sessions ストアへ未完了回を入れる。
            // 出題を始める操作経路は他の走査群で既に測っており、ここで繰り返すと保存完了との
            // 競合で「カードが存在しない」だけを測ることになる。
            await restorePage.evaluate(async (end) => {
              await new Promise<void>((resolve, reject) => {
                const request = indexedDB.open('koten', 1);
                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                  const transaction = request.result.transaction('sessions', 'readwrite');
                  transaction.objectStore('sessions').put({
                    sessionId: `overflow-restore-${end}`,
                    product: 'hyakunin',
                    from: 1,
                    to: end,
                    entry: 'learn',
                    order: 'number',
                    startedOn: '2026-09-06',
                    completed: false,
                    questionCount: 10,
                  });
                  transaction.oncomplete = () => { request.result.close(); resolve(); };
                  transaction.onerror = () => reject(transaction.error);
                };
              });
            }, rangeEnd);
            await restorePage.goto(`${baseUrl}?from=1&to=${rangeEnd}`, { waitUntil: 'domcontentloaded' });
            await restorePage.waitForSelector('.restore-offer', { timeout: 10_000 });
            const measured = await restorePage.evaluate((rootFontSize) => {
              document.documentElement.style.fontSize = rootFontSize;
              document.documentElement.getBoundingClientRect();
              const offer = document.querySelector<HTMLElement>('.restore-offer');
              // カード本体は内容に合わせて縦へ伸びる。scrollHeight を本体自身で比べると
              // 通常の段組みまで「縦に切れた」と誤判定するので、実際に見える子だけを測る。
              const scope = offer ? [...offer.querySelectorAll<HTMLElement>('*')] : [];
              const clipped = scope.filter((element) => !element.classList.contains('sr-only') && (element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1))
                .map((element) => element.className || element.tagName);
              const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
              const meter = offer?.querySelector<HTMLElement>('[role="meter"]');
              document.documentElement.style.fontSize = '';
              return { offer: Boolean(offer), clipped, overflow, meter: meter?.getAttribute('aria-valuenow') ?? null };
            }, `${16 * zoom}px`);
            restoreReflowCases += 1;
            if (!measured.offer) restoreReflowFindings.push({ width, zoom, rangeEnd, key: 'restoreOfferPresent', observed: false });
            if (measured.meter !== '0') restoreReflowFindings.push({ width, zoom, rangeEnd, key: 'restoreMeterStartsAtZero', observed: measured.meter });
            if (measured.overflow > 1) restoreReflowFindings.push({ width, zoom, rangeEnd, key: 'noPageOverflow', observed: measured.overflow });
            if (measured.clipped.length) restoreReflowFindings.push({ width, zoom, rangeEnd, key: 'noClipping', observed: measured.clipped.slice(0, 4) });
          } finally {
            await restoreContext.close();
          }
        }
      }
    }
    // 本番の設定面はホームとも出題面とも別DOMである。範囲変更は閉じた状態と開いた状態の両方を測る。
    for (const width of widths) {
      for (const zoom of zoomLevels) {
        await page.setViewportSize({ width, height: 800 });
        await page.goto(`${baseUrl}?from=1&to=10`, { waitUntil: 'domcontentloaded' });
        await page.getByRole('button', { name: '学習方法を選ぶ' }).click();
        await page.getByRole('button', { name: '本番', exact: true }).click();
        await page.waitForSelector('.range-picker');
        const measured = await page.evaluate((rootFontSize) => {
          document.documentElement.style.fontSize = rootFontSize;
          document.documentElement.getBoundingClientRect();
          const scope = [...document.querySelectorAll<HTMLElement>('.range-picker, .range-picker *')]
            .filter((element) => !element.classList.contains('sr-only'));
          const clipped = scope
            .filter((element) => element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1)
            .map((element) => element.className || element.tagName);
          const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
          const authorButtons = [...document.querySelectorAll<HTMLButtonElement>('.range-picker .answer-mode button')];
          const authorYes = authorButtons.find((button) => button.textContent === 'あり');
          const visibleRangeInputs = document.querySelectorAll<HTMLInputElement>('.range-picker input[type="number"]').length;
          document.documentElement.style.fontSize = '';
          return { clipped, overflow, authorSettingPresent: Boolean(authorYes), authorSettingChecked: authorYes?.getAttribute('aria-pressed') === 'true', visibleRangeInputs };
        }, `${16 * zoom}px`);
        rangePickerReflowCases += 1;
        if (!measured.authorSettingPresent) rangePickerReflowFindings.push({ width, zoom, key: 'authorSettingPresent', observed: false });
        if (!measured.authorSettingChecked) rangePickerReflowFindings.push({ width, zoom, key: 'authorSettingDefault', observed: false });
        if (measured.visibleRangeInputs !== 0) rangePickerReflowFindings.push({ width, zoom, key: 'rangeInputsClosed', observed: measured.visibleRangeInputs });
        if (measured.overflow > 1) rangePickerReflowFindings.push({ width, zoom, key: 'noPageOverflow', observed: measured.overflow });
        if (measured.clipped.length) rangePickerReflowFindings.push({ width, zoom, key: 'noClipping', observed: measured.clipped.slice(0, 4) });
        await page.getByRole('button', { name: '変更する' }).click();
        const opened = await page.evaluate((rootFontSize) => {
          document.documentElement.style.fontSize = rootFontSize;
          document.documentElement.getBoundingClientRect();
          const scope = [...document.querySelectorAll<HTMLElement>('.range-picker, .range-picker *')].filter((element) => !element.classList.contains('sr-only'));
          const clipped = scope.filter((element) => element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1).map((element) => element.className || element.tagName);
          const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
          const visibleRangeInputs = document.querySelectorAll<HTMLInputElement>('.range-picker input[type="number"]').length;
          document.documentElement.style.fontSize = '';
          return { clipped, overflow, visibleRangeInputs };
        }, `${16 * zoom}px`);
        rangePickerReflowCases += 1;
        if (opened.visibleRangeInputs !== 2) rangePickerReflowFindings.push({ width, zoom, key: 'rangeInputsOpened', observed: opened.visibleRangeInputs });
        if (opened.overflow > 1) rangePickerReflowFindings.push({ width, zoom, key: 'openedNoPageOverflow', observed: opened.overflow });
        if (opened.clipped.length) rangePickerReflowFindings.push({ width, zoom, key: 'openedNoClipping', observed: opened.clipped.slice(0, 4) });
        console.log(`check:overflow: 本番の範囲選択 ${width}px 文字${zoom * 100}% 違反 ${rangePickerReflowFindings.filter((finding) => finding.width === width && finding.zoom === zoom).length}件`);
      }
    }
    // 発注059 F-2: session はホームや採点画面と別の DOM なので、必ず出題まで遷移して測る。
    // .sr-only は視覚的に隠すため1pxへ縮める要素であり、器の切れではない。
    // .question-text--vertical は縦書きの列を横にたどるための横スクロール領域で、下の名指し対象には含めない。
    for (const width of widths) {
      for (const zoom of zoomLevels) {
        await page.setViewportSize({ width, height: 800 });
        await page.goto(`${baseUrl}?from=1&to=1`, { waitUntil: 'domcontentloaded' });
        await page.getByRole('button', { name: '学習方法を選ぶ' }).click();
        await page.getByRole('button', { name: '歌本文', exact: true }).click();
        await page.waitForSelector('.range-picker');
        await page.getByRole('button', { name: 'この範囲で始める' }).click();
        await page.waitForSelector('.session-controls');
        const measured = await page.evaluate((rootFontSize) => {
          document.documentElement.style.fontSize = rootFontSize;
          document.documentElement.getBoundingClientRect();
          const targets = [
            ['nav-edge', document.querySelector<HTMLElement>('.session .nav-edge')],
            ['back-link', document.querySelector<HTMLElement>('.session .back-link')],
            ['wordmark', document.querySelector<HTMLElement>('.session .wordmark')],
            ['session-controls', document.querySelector<HTMLElement>('.session-controls')],
          ] as const;
          // 文字拡大時の Chromium は flex 境界で最大2pxの整数丸め差を返す。
          // 2px超は内容が隠れるため違反にする。ここは session の名指し対象だけの許容である。
          const clipped = targets.filter(([, element]) => !element || element.scrollWidth > element.clientWidth + 2 || element.scrollHeight > element.clientHeight + 2)
            .map(([name, element]) => ({ name, width: element?.clientWidth ?? null, scrollWidth: element?.scrollWidth ?? null, height: element?.clientHeight ?? null, scrollHeight: element?.scrollHeight ?? null }));
          const verticalQuestion = document.querySelector<HTMLElement>('.question-text--vertical');
          const questionRect = verticalQuestion?.getBoundingClientRect();
          const verticalScrollIsAvailable = Boolean(verticalQuestion && getComputedStyle(verticalQuestion).overflowX !== 'visible');
          const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
          document.documentElement.style.fontSize = '';
          return { clipped, overflow, verticalQuestionPresent: Boolean(verticalQuestion), verticalScrollIsAvailable, verticalQuestionCenterOffset: questionRect ? Math.abs((questionRect.left + questionRect.width / 2) - window.innerWidth / 2) : null };
        }, `${16 * zoom}px`);
        await page.getByRole('button', { name: '横書きにする' }).click();
        const horizontalNumberOverlap = await page.evaluate(() => {
          const number = document.querySelector<HTMLElement>('.question-number');
          const firstLine = document.querySelector<HTMLElement>('.question-text--horizontal .question-line');
          if (!number || !firstLine) return null;
          const numberRect = number.getBoundingClientRect();
          const lineRect = firstLine.getBoundingClientRect();
          return numberRect.left < lineRect.right && numberRect.right > lineRect.left
            && numberRect.top < lineRect.bottom && numberRect.bottom > lineRect.top;
        });
        await page.getByRole('button', { name: '縦書きにする' }).click();
        sessionReflowCases += 1;
        if (!measured.verticalQuestionPresent) sessionReflowFindings.push({ width, zoom, key: 'verticalQuestionPresent', observed: false });
        if (!measured.verticalScrollIsAvailable) sessionReflowFindings.push({ width, zoom, key: 'verticalQuestionScrollAvailable', observed: false });
        if (width >= 1024 && (measured.verticalQuestionCenterOffset === null || measured.verticalQuestionCenterOffset > 1)) sessionReflowFindings.push({ width, zoom, key: 'verticalQuestionCentered', observed: measured.verticalQuestionCenterOffset });
        if (horizontalNumberOverlap !== false) sessionReflowFindings.push({ width, zoom, key: 'horizontalNumberDoesNotOverlapFirstLine', observed: horizontalNumberOverlap });
        if (measured.overflow > 1) sessionReflowFindings.push({ width, zoom, key: 'noPageOverflow', observed: measured.overflow });
        if (measured.clipped.length) sessionReflowFindings.push({ width, zoom, key: 'noClipping', observed: measured.clipped });
        console.log(`check:overflow: 出題画面 ${width}px 文字${zoom * 100}% 違反 ${sessionReflowFindings.filter((finding) => finding.width === width && finding.zoom === zoom).length}件`);
      }
    }
    for (const width of widths) {
      for (const zoom of zoomLevels) {
        await page.setViewportSize({ width, height: 800 });
        await page.goto(`${baseUrl}?from=1&to=10`, { waitUntil: 'domcontentloaded' });
        await page.getByRole('button', { name: '学習方法を選ぶ' }).click();
        await page.getByRole('button', { name: '本番', exact: true }).click();
        await page.waitForSelector('.range-picker');
        await page.getByRole('button', { name: 'この範囲で始める' }).click();
        // 発注062以降、本番は穴埋めと作者が混ざる。**作者問題に入力欄は無い**ので、
        // 出ている方へ答える。どちらも出ていなければ黙って進めず、下の行数の門で落とす。
        for (let question = 0; question < 10; question += 1) {
          // 問が切り替わる一瞬、どちらの操作部も居ない。**出るまで待ってから**どちらかを選ぶ。
          // 待たずに数えると、その一瞬に「どちらも無い」と判断して途中で降りてしまう。
          await page.waitForSelector('input[placeholder], .answer-choices button', { timeout: 15000 });
          if (await page.locator('input[placeholder]').count() > 0) {
            await page.locator('input[placeholder]').fill('あ');
            await page.getByRole('button', { name: '答え合わせ' }).click();
          } else {
            await page.locator('.answer-choices button').first().click();
          }
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
        await page.getByRole('button', { name: '歌本文', exact: true }).click();
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
          // 3画像すべてを同じ部品のCSSで読む。開示中に表示される正解/要確認に加え、結果専用の花丸も
          // DOMへ一時的に置くことで、未表示の状態を「測った」と誤認しない。
          const blendProbe = document.createElement('div');
          blendProbe.innerHTML = '<span class="feedback-mark feedback-mark--correct"><img></span><span class="feedback-mark feedback-mark--incorrect"><img></span><span class="perfect-mark"><img></span>';
          document.body.append(blendProbe);
          const marks = [...blendProbe.querySelectorAll<HTMLElement>('img')];
          const blendModes = marks.map((mark) => getComputedStyle(mark).mixBlendMode);
          blendProbe.remove();
          const retainedMark = document.querySelector<HTMLElement>('.answer-retained .feedback-mark');
          const retainedRect = retained?.getBoundingClientRect();
          const markRect = retainedMark?.getBoundingClientRect();
          return { clipped, overflow, measuredElements: elements.length, retainedWidthRatio, retainedValue: retained?.value ?? null, retainedReadOnly: retained?.readOnly ?? null, feedback: Boolean(document.querySelector('.answer-feedback')), note: document.querySelector('.question-note')?.textContent ?? null, blendModes, retainedMarkPresent: Boolean(retainedMark), retainedMarkOverlaps: Boolean(retainedRect && markRect && markRect.right > retainedRect.left && markRect.left < retainedRect.right && markRect.bottom > retainedRect.top && markRect.top < retainedRect.bottom), retainedMarkPointerEvents: retainedMark ? getComputedStyle(retainedMark).pointerEvents : null };
        }, `${16 * zoom}px`);
        newDisplayCases += 1;
        if (measured.retainedValue !== 'あいうえおかきくけこ') newDisplayFindings.push({ width, zoom, key: 'retainedInputPresent', observed: measured.retainedValue });
        if (measured.retainedReadOnly !== true) newDisplayFindings.push({ width, zoom, key: 'retainedInputReadOnly', observed: measured.retainedReadOnly });
        if (!measured.feedback) newDisplayFindings.push({ width, zoom, key: 'feedbackPresent', observed: false });
        if (measured.blendModes.length === 0 || measured.blendModes.some((mode) => mode !== 'multiply')) newDisplayFindings.push({ width, zoom, key: 'feedbackImagesMultiply', observed: measured.blendModes });
        if (!measured.retainedMarkPresent || measured.retainedMarkOverlaps) newDisplayFindings.push({ width, zoom, key: 'retainedMarkDoesNotCoverAnswer', observed: { present: measured.retainedMarkPresent, overlaps: measured.retainedMarkOverlaps } });
        if (measured.retainedMarkPointerEvents !== 'none') newDisplayFindings.push({ width, zoom, key: 'retainedMarkPointerEvents', observed: measured.retainedMarkPointerEvents });
        // 一言が出ていなければ、その行を 1 度も測っていない。緑は証拠にならない。
        if (!measured.note?.includes('掛詞')) newDisplayFindings.push({ width, zoom, key: 'questionNoteMeasured', observed: measured.note });
        if (measured.measuredElements === 0) newDisplayFindings.push({ width, zoom, key: 'measuredElements', observed: 0 });
        // 器いっぱいに置かれていること。狭い器へ縮むと、残した入力の見える範囲が減る。
        if (measured.retainedWidthRatio < 0.7) newDisplayFindings.push({ width, zoom, key: 'retainedInputFillsRow', observed: measured.retainedWidthRatio });
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
        await page.getByRole('button', { name: '本番', exact: true }).click();
        await page.waitForSelector('.range-picker');
        await page.getByRole('button', { name: '紙に書く' }).click();
        await page.getByRole('button', { name: 'この範囲で始める' }).click();
        for (let question = 0; question < 10; question += 1) await page.getByRole('button', { name: '次へ' }).click();
        await page.waitForSelector('.grade-list > li');
        // 発注065 工程4以降、**歴史的仮名遣いと現代仮名遣いが同じ語の行には△が無い。**
        // 1行目を無条件に押すと、その行が該当したときに止まる。**△のある行を探して押す。**
        // 1行も無ければ測る対象が存在しないので、下で違反として扱う（黙って緑にしない）。
        const triangle = page.locator('.grade-list > li button', { hasText: /^△$/ }).first();
        const hasTriangle = await triangle.count() > 0;
        if (hasTriangle) await triangle.click();
        const measured = await page.evaluate((rootFontSize) => {
          document.documentElement.style.fontSize = rootFontSize;
          document.documentElement.getBoundingClientRect();
          const selected = document.querySelector<HTMLElement>('.grade-list > li:has(button[aria-pressed="true"])');
          const elements = [...document.querySelectorAll<HTMLElement>('.grade-list, .grade-list *, .kana-supplement')].filter((element) => !element.classList.contains('sr-only'));
          const clipped = elements.filter((element) => element.scrollWidth > element.clientWidth + 1).map((element) => element.className || element.tagName);
          const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
          const supplements = selected?.querySelectorAll('.kana-supplement').length ?? 0;
          const noteCount = [...document.querySelectorAll<HTMLElement>('main p')].filter((element) => element.textContent === '△は現代仮名遣いで書けた場合です。').length;
          document.documentElement.style.fontSize = '';
          return { clipped, overflow, measuredElements: elements.length, supplements, noteCount, correct: selected?.textContent?.includes('正解：') ?? false };
        }, `${16 * zoom}px`);
        newDisplayCases += 1;
        if (measured.noteCount !== 1) newDisplayFindings.push({ width, zoom, key: 'paperPartialNoteOnce', observed: measured.noteCount });
        // 2026-09-06: 表示を「正解：漢字（歴史的仮名遣い）」＋「△現代（現代仮名遣い）」へ改めた。
        // 旧文言 `歴史的仮名遣い：` を探していたため、補足は出ているのに違反として出ていた。
        // **補足の実在（supplements）と正解行の両方**を見る。片方だけだと、空の行でも通る。
        // △のある行が1つも無ければ、この群は何も測っていない。走査対象の実在を先に見る。
        if (!hasTriangle) newDisplayFindings.push({ width, zoom, key: 'paperTriangleRowExists', observed: false });
        if (!measured.correct) newDisplayFindings.push({ width, zoom, key: 'paperCorrectLine', observed: measured.correct });
        if (measured.supplements < 1) newDisplayFindings.push({ width, zoom, key: 'paperSupplementPresent', observed: measured.supplements });
        if (measured.measuredElements === 0) newDisplayFindings.push({ width, zoom, key: 'measuredElements', observed: 0 });
        if (measured.overflow > 1) newDisplayFindings.push({ width, zoom, key: 'noPageOverflow', observed: measured.overflow });
        if (measured.clipped.length) newDisplayFindings.push({ width, zoom, key: 'noClipping', observed: measured.clipped.slice(0, 4) });
      }
    }
    for (const width of widths) {
      for (const zoom of zoomLevels) {
        await page.setViewportSize({ width, height: 800 });
        await page.goto(`${baseUrl}?from=1&to=1`, { waitUntil: 'domcontentloaded' });
        await page.getByRole('button', { name: '学習方法を選ぶ' }).click();
        await page.getByRole('button', { name: '作者', exact: true }).click();
        await page.waitForSelector('.range-picker');
        await page.getByRole('button', { name: 'この範囲で始める' }).click();
        await page.waitForSelector('.answer-choices');
        const measured = await page.evaluate((rootFontSize) => {
          document.documentElement.style.fontSize = rootFontSize;
          document.documentElement.getBoundingClientRect();
          const choices = [...document.querySelectorAll<HTMLElement>('.answer-choices button')];
          const scope = [...document.querySelectorAll<HTMLElement>('.question-text--author, .answer-choices, .answer-choices *')]
            .filter((element) => !element.classList.contains('sr-only'));
          const clipped = scope.filter((element) => !element.classList.contains('answer-choices') && !element.classList.contains('question-text--vertical') && (element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1))
            .map((element) => element.className || element.tagName);
          const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
          document.documentElement.style.fontSize = '';
          const authorLines = [...document.querySelectorAll<HTMLElement>('.question-poem--author .question-line')];
          const choiceLefts = choices.map((choice) => choice.getBoundingClientRect().left);
          const questionRect = document.querySelector<HTMLElement>('.question-text--vertical')?.getBoundingClientRect();
          const controlsRect = document.querySelector<HTMLElement>('.question-text--vertical + .answer-controls')?.getBoundingClientRect();
          return { choices: choices.length, clipped, overflow, authorPrompt: Boolean(document.querySelector('.question-poem--author')), authorLines: authorLines.length, authorWriting: authorLines.map((line) => getComputedStyle(line).writingMode), choiceWriting: choices.map((choice) => getComputedStyle(choice).writingMode), choiceLefts, questionCenterOffset: questionRect ? Math.abs((questionRect.left + questionRect.width / 2) - window.innerWidth / 2) : null, controlsCenterOffset: controlsRect ? Math.abs((controlsRect.left + controlsRect.width / 2) - window.innerWidth / 2) : null };
        }, `${16 * zoom}px`);
        await page.getByRole('button', { name: '横書きにする' }).click();
        const horizontalAuthorWriting = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.question-poem--author .question-line')].map((line) => getComputedStyle(line).writingMode));
        await page.getByRole('button', { name: '縦書きにする' }).click();
        authorReflowCases += 1;
        if (measured.choices < 4 || measured.choices > 5) authorReflowFindings.push({ width, zoom, key: 'choiceCount', observed: measured.choices });
        if (!measured.authorPrompt) authorReflowFindings.push({ width, zoom, key: 'authorPromptPresent', observed: false });
        if (measured.authorLines !== 5) authorReflowFindings.push({ width, zoom, key: 'authorFiveLines', observed: measured.authorLines });
        if (measured.authorWriting.some((mode) => mode !== 'vertical-rl')) authorReflowFindings.push({ width, zoom, key: 'authorVerticalWriting', observed: measured.authorWriting });
        if (horizontalAuthorWriting.some((mode) => mode !== 'horizontal-tb')) authorReflowFindings.push({ width, zoom, key: 'authorHorizontalWriting', observed: horizontalAuthorWriting });
        if (measured.choiceWriting.some((mode) => mode !== 'vertical-rl')) authorReflowFindings.push({ width, zoom, key: 'choiceVerticalWriting', observed: measured.choiceWriting });
        if (measured.choiceLefts.some((left, index) => index > 0 && left >= measured.choiceLefts[index - 1])) authorReflowFindings.push({ width, zoom, key: 'choiceRightToLeft', observed: measured.choiceLefts });
        if (width >= 1024 && (measured.questionCenterOffset === null || measured.questionCenterOffset > 1)) authorReflowFindings.push({ width, zoom, key: 'authorQuestionCentered', observed: measured.questionCenterOffset });
        if (width >= 1024 && (measured.controlsCenterOffset === null || measured.controlsCenterOffset > 1)) authorReflowFindings.push({ width, zoom, key: 'authorControlsCentered', observed: measured.controlsCenterOffset });
        if (measured.overflow > 1) authorReflowFindings.push({ width, zoom, key: 'noPageOverflow', observed: measured.overflow });
        if (measured.clipped.length) authorReflowFindings.push({ width, zoom, key: 'noClipping', observed: measured.clipped.slice(0, 4) });
        console.log(`check:overflow: 作者問題 ${width}px 文字${zoom * 100}% 選択肢${measured.choices}件 違反 ${authorReflowFindings.filter((finding) => finding.width === width && finding.zoom === zoom).length}件`);
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

if (onboardingReflowCases !== expectedOnboardingReflowCases) {
  console.error(`check:overflow: 初回設定ダイアログの走査が不足または過剰です（走査 ${onboardingReflowCases} 件、必要 ${expectedOnboardingReflowCases} 件ちょうど）`);
  process.exit(1);
}

console.log(`check:overflow: 初回設定ダイアログの走査 ${onboardingReflowCases} 件（幅 ${widths.join('/')} × 文字 ${zoomLevels.map((z) => `${z * 100}%`).join('/')}）、違反 ${onboardingReflowFindings.length} 件`);
for (const finding of onboardingReflowFindings) console.log(`${finding.width}px 文字${finding.zoom * 100}% ${finding.key}: ${JSON.stringify(finding.observed)}`);
if (onboardingReflowFindings.length) process.exitCode = 1;

if (examReflowCases !== expectedExamReflowCases) {
  console.error(`check:overflow: 本番採点一覧の走査が不足または過剰です（走査 ${examReflowCases} 件、必要 ${expectedExamReflowCases} 件ちょうど）`);
  process.exit(1);
}

if (rangePickerReflowCases !== expectedRangePickerReflowCases) {
  console.error(`check:overflow: 本番の範囲選択の走査が不足または過剰です（走査 ${rangePickerReflowCases} 件、必要 ${expectedRangePickerReflowCases} 件ちょうど）`);
  process.exit(1);
}

console.log(`check:overflow: 拡大時の走査 ${reflowCases} 件（幅 ${widths.join('/')} × 文字 ${zoomLevels.map((z) => `${z * 100}%`).join('/')}）、違反 ${reflowFindings.length} 件`);
for (const finding of reflowFindings) console.log(`${finding.width}px 文字${finding.zoom * 100}% ${finding.key}: ${JSON.stringify(finding.observed)}`);
if (reflowFindings.length) process.exitCode = 1;

if (newDisplayCases !== expectedNewDisplayCases) {
  console.error(`check:overflow: 057の新しい表示の走査が不足または過剰です（走査 ${newDisplayCases} 件、必要 ${expectedNewDisplayCases} 件ちょうど）`);
  process.exit(1);
}

if (sessionReflowCases !== expectedSessionReflowCases) {
  console.error(`check:overflow: 出題画面の走査が不足または過剰です（走査 ${sessionReflowCases} 件、必要 ${expectedSessionReflowCases} 件ちょうど）`);
  process.exit(1);
}

if (authorReflowCases !== expectedAuthorReflowCases) {
  console.error(`check:overflow: 作者問題の走査が不足または過剰です（走査 ${authorReflowCases} 件、必要 ${expectedAuthorReflowCases} 件ちょうど）`);
  process.exit(1);
}

if (restoreReflowCases !== expectedRestoreReflowCases) {
  console.error(`check:overflow: 復元カードの走査が不足または過剰です（走査 ${restoreReflowCases} 件、必要 ${expectedRestoreReflowCases} 件ちょうど）`);
  process.exit(1);
}

console.log(`check:overflow: 出題画面の走査 ${sessionReflowCases} 件（幅 ${widths.join('/')} × 文字 ${zoomLevels.map((z) => `${z * 100}%`).join('/')}）、違反 ${sessionReflowFindings.length} 件`);
for (const finding of sessionReflowFindings) console.log(`${finding.width}px 文字${finding.zoom * 100}% ${finding.key}: ${JSON.stringify(finding.observed)}`);
if (sessionReflowFindings.length) process.exitCode = 1;

console.log(`check:overflow: 作者問題の走査 ${authorReflowCases} 件（幅 ${widths.join('/')} × 文字 ${zoomLevels.map((z) => `${z * 100}%`).join('/')}）、違反 ${authorReflowFindings.length} 件`);
for (const finding of authorReflowFindings) console.log(`${finding.width}px 文字${finding.zoom * 100}% ${finding.key}: ${JSON.stringify(finding.observed)}`);
if (authorReflowFindings.length) process.exitCode = 1;

console.log(`check:overflow: 復元カードの走査 ${restoreReflowCases} 件（20/21首 × 幅 ${widths.join('/')} × 文字 ${zoomLevels.map((z) => `${z * 100}%`).join('/')}）、違反 ${restoreReflowFindings.length} 件`);
for (const finding of restoreReflowFindings) console.log(`${finding.rangeEnd}首 ${finding.width}px 文字${finding.zoom * 100}% ${finding.key}: ${JSON.stringify(finding.observed)}`);
if (restoreReflowFindings.length) process.exitCode = 1;

console.log(`check:overflow: 057の新しい表示の走査 ${newDisplayCases} 件（幅 ${widths.join('/')} × 文字 ${zoomLevels.map((z) => `${z * 100}%`).join('/')} × 開示/紙△）、違反 ${newDisplayFindings.length} 件`);
for (const finding of newDisplayFindings) console.log(`${finding.width}px 文字${finding.zoom * 100}% ${finding.key}: ${JSON.stringify(finding.observed)}`);
if (newDisplayFindings.length) process.exitCode = 1;

console.log(`check:overflow: 本番採点一覧の走査 ${examReflowCases} 件（幅 ${widths.join('/')} × 文字 ${zoomLevels.map((z) => `${z * 100}%`).join('/')}）、違反 ${examReflowFindings.length} 件`);
for (const finding of examReflowFindings) console.log(`${finding.width}px 文字${finding.zoom * 100}% ${finding.key}: ${JSON.stringify(finding.observed)}`);
if (examReflowFindings.length) process.exitCode = 1;

console.log(`check:overflow: 本番の範囲選択の走査 ${rangePickerReflowCases} 件（幅 ${widths.join('/')} × 文字 ${zoomLevels.map((z) => `${z * 100}%`).join('/')}）、違反 ${rangePickerReflowFindings.length} 件`);
for (const finding of rangePickerReflowFindings) console.log(`${finding.width}px 文字${finding.zoom * 100}% ${finding.key}: ${JSON.stringify(finding.observed)}`);
if (rangePickerReflowFindings.length) process.exitCode = 1;

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
