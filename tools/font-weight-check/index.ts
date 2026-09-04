import { createServer, type Server } from 'node:net';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type Face = { family: string; weight: string };
type Violation = Face & { role: string; text: string };
type Product = { name: string; port: number; basePath: string; pages: (page: any) => Promise<void> };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const css = await readFile(path.join(root, 'packages/shared/src/styles/fonts.css'), 'utf8');
const available = new Set(parseFaces(css).map((face) => key(face)));
const knownFamilies = new Set(parseFaces(css).map((face) => face.family));
const violations: Violation[] = [];
// 現在の 4 画面・53 要素を下回らないよう、画面とテキスト要素の両方を固定する。
const minimumPagesScanned = 4;
const minimumElementsScanned = 30;
let pagesScanned = 0;
let elementsScanned = 0;
const requested = new Set<string>();
let playwright: any;

try {
  playwright = await import('playwright');
} catch {
  fail('Playwright を読み込めません。');
}

const products: Product[] = [
  {
    name: 'hyakunin', port: 4174, basePath: '/100/',
    async pages(page) {
      await page.goto('http://localhost:4174/100/?from=57&to=57', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('button.primary');
      await scan(page, 'hyakunin:範囲選択');
      // 閲覧画面（.poem-sheet）へ入るのは choose('view') だけである。台帳を承認した 2026-09-04 以降、
      // 「とりあえず始める」は開始前の確認画面へ行く。overflow-check と同じ修正である。
      await page.getByRole('button', { name: '見るだけ' }).click();
      await page.waitForSelector('.poem-sheet--vertical');
      await scan(page, 'hyakunin:歌の表示（縦書き）');
      await page.getByLabel('横書き').check();
      await page.waitForSelector('.poem-sheet--horizontal');
      await scan(page, 'hyakunin:歌の表示（横書き）');
    },
  },
  {
    name: 'kanazukai', port: 4175, basePath: '/kana/',
    async pages(page) {
      await page.goto('http://localhost:4175/kana/', { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('main.home');
      await scan(page, 'kanazukai:準備画面');
    },
  },
];

for (const product of products) await assertPortFree(product.port);
const servers = products.map(startPreview);
try {
  for (const product of products) await waitForServer(`http://localhost:${product.port}${product.basePath}`);
  const browser = await playwright.chromium.launch({ headless: true });
  try {
    for (const product of products) {
      const page = await (await browser.newContext()).newPage();
      await product.pages(page);
      await page.context().close();
    }
  } finally { await browser.close(); }
} catch (error) {
  const details = error instanceof Error ? [error.message, error.stack].filter(Boolean).join('\n') : '';
  fail(`検査は完走していません。${details ? ` ${sanitizeOutput(details)}` : ''}`);
} finally {
  for (const server of servers) server.kill();
}

console.log(`check:font-weight: 走査画面 ${pagesScanned} 件、テキスト要素 ${elementsScanned} 件`);
if (pagesScanned < minimumPagesScanned || elementsScanned < minimumElementsScanned) {
  fail(`検査対象が不足しています（画面 ${pagesScanned}/${minimumPagesScanned} 件、テキスト要素 ${elementsScanned}/${minimumElementsScanned} 件）`);
}
console.log(`check:font-weight: 要求された組 ${[...requested].sort().join(', ') || 'なし'}`);
console.log(`check:font-weight: 違反 ${violations.length} 件`);
for (const item of violations) console.log(`${item.family} ${item.weight} | ${item.role} | ${item.text}`);
if (violations.length) process.exitCode = 1;

async function scan(page: any, pageRole: string): Promise<void> {
  const elements = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('body *')]
    .filter((element) => (element.textContent ?? '').trim().length > 0 && [...element.children].every((child) => !child.textContent?.trim()))
    .map((element) => {
      const style = getComputedStyle(element);
      return { family: style.fontFamily.split(',')[0].trim().replace(/["']/g, ''), weight: style.fontWeight, role: `${element.tagName.toLowerCase()}${element.className ? `.${String(element.className).split(' ')[0]}` : ''}`, text: (element.textContent ?? '').trim().slice(0, 10) };
    }));
  pagesScanned += 1;
  elementsScanned += elements.length;
  for (const element of elements) {
    if (!knownFamilies.has(element.family)) continue;
    const face = { family: element.family, weight: element.weight };
    requested.add(key(face));
    if (!available.has(key(face))) violations.push({ ...face, role: `${pageRole}/${element.role}`, text: element.text });
  }
}

function parseFaces(input: string): Face[] {
  return [...input.matchAll(/@font-face\s*\{([\s\S]*?)\}/g)].flatMap((match) => {
    const family = match[1].match(/font-family:\s*['"]?([^;'"\n]+)['"]?\s*;/)?.[1].trim();
    const weight = match[1].match(/font-weight:\s*(\d+)\s*;/)?.[1];
    return family && weight ? [{ family, weight }] : [];
  });
}
function key(face: Face): string { return `${face.family} ${face.weight}`; }
function startPreview(product: Product) {
  const viteBin = fileURLToPath(new URL('../../node_modules/vite/bin/vite.js', import.meta.url));
  return spawn(process.execPath, [viteBin, 'preview', '--port', String(product.port), '--strictPort'], { cwd: path.join(root, 'packages', product.name), stdio: 'ignore', windowsHide: true });
}
async function assertPortFree(port: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const server: Server = createServer();
    server.once('error', () => reject(new Error(`ポート ${port} は使用中です`)));
    server.listen(port, 'localhost', () => server.close(() => resolve()));
  });
}
async function waitForServer(url: string): Promise<void> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try { if ((await fetch(url)).ok) return; } catch { /* starting */ }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('preview サーバが30秒以内に応答しませんでした');
}
function sanitizeOutput(value: string): string {
  const rootPattern = root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[\\/]/g, '[\\\\/]');
  return value.replace(new RegExp(rootPattern, 'gi'), '.');
}
function fail(message: string): never { console.error(`check:font-weight: ${message}`); process.exit(1); }
