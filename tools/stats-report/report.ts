import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { summarize, type StatsDocument } from './aggregate.ts';
import { renderReport } from './render.ts';

/**
 * 入口②。`stats-report/raw.json` を読んで HTML にするだけ。**通信も鍵も要らない。**
 * 集計と描画は純粋関数なので、正しさは `tests/unit/stats-report/` で押さえてある。
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const outputDirectory = path.join(root, 'stats-report');
const source = path.join(outputDirectory, 'raw.json');
const target = path.join(outputDirectory, 'report.html');

if (!existsSync(source)) {
  console.error(`stats:report: ${path.relative(root, source)} がありません。先に npm run stats:fetch を実行してください。`);
  process.exit(1);
}

const raw = JSON.parse(readFileSync(source, 'utf8')) as { fetchedAt?: unknown; documents?: StatsDocument[] };
const fetchedAt = typeof raw.fetchedAt === 'string' ? raw.fetchedAt : '（取得日時が記録されていません）';
const summary = summarize(raw.documents ?? []);

writeFileSync(target, renderReport({ summary, fetchedAt }), 'utf8');

for (const warning of summary.warnings) console.warn(`stats:report: ${warning}`);
console.log(`stats:report: 文書 ${summary.documentCount} 件・端末 ${summary.deviceCount} 台を ${path.relative(root, target)} に書きました。`);
