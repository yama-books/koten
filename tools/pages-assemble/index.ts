/**
 * GitHub Pages に置く独立した静的アプリ（conj / vintage-kana / checkpoint）を `_site/` へ組み立てる。
 *
 *   node --experimental-strip-types tools/pages-assemble/index.ts --out _site
 *
 * **方針：アプリの中身は減らさない。作業文書だけを外す。** 以前は `cp -r` で丸ごと置いていたため、
 * 引き継ぎ・監査・設計の Markdown や監査用スクリプトまで Pages から読めた。
 *
 * - 除外リスト方式にしてある（許可リストではない）。アプリが新しいデータを読むようになっても、
 *   配信から黙って抜けることがない。ここで外すのは「アプリが実行時に読まない」と確かめたものだけで、
 *   tests/unit/pages-assemble.test.ts が、アプリが読むファイルがすべて配信されることを検査する。
 * - 公開許可リスト（publish-allowlist.txt）とは目的が違う。あちらは**ソースとして**公開ツリーへ移すもの、
 *   こちらは**アプリとして**配信するもの。conj の CHJ 引用（adjectival-noun-chj-quotations.json）は
 *   アプリへの掲載が裁定済み（引用）なので配信するが、ソースとしての再配布は未確認なので許可リストには載せない。
 */
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

type StaticApp = {
  /** リポジトリ直下のフォルダ名。Pages でも同じパスに置く。 */
  dir: string;
  /** アプリ直下からの相対パス（`/` 区切り）。末尾 `/` はフォルダごと外す。 */
  exclude: readonly string[];
};

/** どのアプリでも外すもの：作業文書（Markdown）とドットファイル。どのアプリも実行時に .md を読まない。 */
const commonExcludedExtensions: readonly string[] = ['.md'];

export const staticApps: readonly StaticApp[] = [
  {
    dir: 'conj',
    exclude: [
      // 監査用スクリプト・計測結果・モックアップ。アプリは読まない。
      'audit/',
      // 二層データの確認用ページ。本番の index.html とは接続していない。
      'adjv-runtime-smoke.html',
      'conj-quiz-engine.test.mjs',
      // 選定の作業データと Drive 上の資料の所在（フォルダ／ファイル ID）。アプリは読まない。
      'data/adjectival-noun-selection-120.json',
      'data/corpus-status.json',
    ],
  },
  { dir: 'vintage-kana', exclude: [] },
  { dir: 'checkpoint', exclude: [] },
];

function isExcluded(relative: string, app: StaticApp): boolean {
  if (relative.split('/').some((part) => part.startsWith('.'))) return true;
  if (commonExcludedExtensions.includes(path.posix.extname(relative).toLowerCase())) return true;
  return app.exclude.some((rule) => (rule.endsWith('/') ? relative.startsWith(rule) : relative === rule));
}

function walk(directory: string, prefix = ''): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    return entry.isDirectory() ? walk(path.join(directory, entry.name), relative) : [relative];
  });
}

/** アプリ直下からの相対パスで、Pages に置くファイルの一覧（整列済み）。 */
export function pagesFiles(app: StaticApp, repositoryRoot = root): string[] {
  const directory = path.join(repositoryRoot, app.dir);
  // 無いフォルダを黙って飛ばすと、公開サイトからアプリが消えたことに気づけない。
  if (!existsSync(directory)) throw new Error(`${app.dir}/ が無い（Pages から消えてしまう）`);
  return walk(directory).filter((relative) => !isExcluded(relative, app)).sort();
}

export function assemble(outDir: string, apps: readonly StaticApp[] = staticApps, repositoryRoot = root): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const app of apps) {
    const files = pagesFiles(app, repositoryRoot);
    for (const relative of files) {
      const destination = path.join(outDir, app.dir, relative);
      mkdirSync(path.dirname(destination), { recursive: true });
      cpSync(path.join(repositoryRoot, app.dir, relative), destination);
    }
    counts[app.dir] = files.length;
  }
  return counts;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const out = argv[argv.indexOf('--out') + 1];
  if (!argv.includes('--out') || !out || out.startsWith('--')) {
    console.error('usage: --out <_site>');
    process.exitCode = 1;
  } else {
    const counts = assemble(path.resolve(out));
    console.log(`pages-assemble: ${Object.entries(counts).map(([dir, count]) => `${dir} ${count} 件`).join('、')}`);
  }
}
