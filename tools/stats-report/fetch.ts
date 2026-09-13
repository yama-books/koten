import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { appConfig } from '../../packages/shared/src/app-config.ts';
import { readServiceAccount, requestAccessToken } from './access-token.ts';
import { decodeFields } from './decode.ts';
import { resolveKeyPath } from './key-path.ts';
import type { StatsDocument } from './aggregate.ts';

/**
 * 入口①。統計を取ってきて `stats-report/raw.json` に落とすだけ。
 *
 * **この file は試験しない**——鍵と通信が要るものを試験へ混ぜると、赤の意味が薄まる。
 * その代わり、**取得以外は全部ここから追い出してある**（`access-token.ts`・`decode.ts`）。
 * 試験しない部分を小さくするのが、試験しない判断の対価である。
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const outputDirectory = path.join(root, 'stats-report');
const COLLECTIONS = ['stats_days_test', 'stats_days_official'] as const;

function fail(message: string): never {
  console.error(`stats:fetch: ${message}`);
  process.exit(1);
}

function loadKey(): ReturnType<typeof readServiceAccount> {
  let keyPath: string | null;
  try {
    keyPath = resolveKeyPath(process.argv, process.env).path;
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
  if (keyPath === null) {
    fail([
      'サービスアカウント鍵（JSON）の場所を渡してください。',
      '',
      '  node --experimental-strip-types tools/stats-report/fetch.ts --key <鍵のパス>',
      '',
      // **環境変数だけにしない。** `VAR=値 コマンド` は bash の書式で、PowerShell では通らない。
      '環境変数 KOTEN_STATS_KEY でも受け取ります（--key のほうが優先）。',
      '鍵の作り方は docs/superpowers/specs/2026-09-13-統計報告ツール-design.md §2 にあります。',
      '役割は「Cloud Datastore 閲覧者」だけで足ります。書き込みの役割は与えないでください。',
    ].join('\n'));
  }
  try {
    return readServiceAccount(JSON.parse(readFileSync(keyPath, 'utf8')));
  } catch (error) {
    fail(`鍵を読めません（${keyPath}）: ${error instanceof Error ? error.message : String(error)}`);
  }
}

type ListResponse = { documents?: Array<{ name?: string; fields?: Record<string, unknown> }>; nextPageToken?: string };

async function listCollection(collection: string, token: string): Promise<StatsDocument[]> {
  const found: StatsDocument[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL(`https://firestore.googleapis.com/v1/projects/${appConfig.firebase.projectId}/databases/(default)/documents/${collection}`);
    url.searchParams.set('pageSize', '300');
    if (pageToken !== undefined) url.searchParams.set('pageToken', pageToken);

    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const text = await response.text();
    if (response.status === 403) {
      fail(`${collection} を読む権限がありません（HTTP 403）。サービスアカウントに「Cloud Datastore 閲覧者」を与えてください。\n${text.slice(0, 300)}`);
    }
    // **0 件と失敗を混ぜない。** 失敗を空として通すと「使われていない」と読み違える。
    if (!response.ok) fail(`${collection} の取得に失敗（HTTP ${response.status}）: ${text.slice(0, 300)}`);

    const page = JSON.parse(text) as ListResponse;
    for (const item of page.documents ?? []) {
      found.push({
        collection,
        id: (item.name ?? '').split('/').pop() ?? '',
        data: decodeFields(item.fields ?? {}),
      });
    }
    pageToken = page.nextPageToken;
  } while (pageToken !== undefined && pageToken !== '');
  return found;
}

const account = loadKey();
const token = await requestAccessToken(account);
const documents: StatsDocument[] = [];
for (const collection of COLLECTIONS) documents.push(...await listCollection(collection, token));

mkdirSync(outputDirectory, { recursive: true });
const file = path.join(outputDirectory, 'raw.json');
// **取得日時を必ず入れる。** 古い報告を今日のものと読み違えないため。
writeFileSync(file, `${JSON.stringify({ fetchedAt: new Date().toISOString(), documents }, null, 2)}\n`, 'utf8');
console.log(`stats:fetch: ${documents.length} 件を ${path.relative(root, file)} に書きました。次は node --experimental-strip-types tools/stats-report/report.ts`);
