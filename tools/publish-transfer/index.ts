/**
 * P12 の複写。`docs/PUBLISH_MANIFEST.md` §5 の許可リストだけを新ツリーへ写す。
 *
 * この道具は**公開しない**（許可リストに載せない）。私的リポジトリの所在を引数で受けるためである。
 * したがって root の `package.json` に script を足さない——足すと
 * `tests/unit/scan-publish-allowlist.test.ts` の「root scripts が呼ぶ tools は許可リストにある」が
 * 正しく赤くなる。直接 node で起動すること。
 *
 *   node --experimental-strip-types tools/publish-transfer/index.ts --out <新ツリー> [--write]
 *
 * 既定は**書かない**。`--write` を明示したときだけ書く（発注031 の書き込み口と同じ規律）。
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readAllowlist } from '../scan-publish/allowlist.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Walks a directory, skipping the things .gitignore keeps out of the repository. */
function filesUnder(directory: string): string[] {
  const skip = new Set(['node_modules', 'dist', '.git']);
  return readdirSync(directory, { withFileTypes: true }).flatMap((item) => {
    if (skip.has(item.name)) return [];
    const full = path.join(directory, item.name);
    return item.isDirectory() ? filesUnder(full) : [full];
  });
}

export function resolveEntry(entry: string): string[] {
  if (entry.endsWith('/**')) {
    const directory = path.join(root, entry.slice(0, -'/**'.length));
    return existsSync(directory) ? filesUnder(directory) : [];
  }
  const star = entry.lastIndexOf('*');
  if (star < 0) {
    const file = path.join(root, entry);
    return existsSync(file) && statSync(file).isFile() ? [file] : [];
  }
  const directory = path.join(root, path.posix.dirname(entry));
  const suffix = path.posix.basename(entry).slice(1);
  if (!existsSync(directory)) return [];
  return readdirSync(directory).filter((name) => name.endsWith(suffix)).map((name) => path.join(directory, name));
}

export function plan() {
  const entries = readAllowlist().sources;
  const empty = entries.filter((entry) => resolveEntry(entry).length === 0);
  const files = [...new Set(entries.flatMap(resolveEntry))].sort();
  return { entries, empty, files };
}

function main(argv: string[]) {
  const out = argv[argv.indexOf('--out') + 1];
  if (!out || out.startsWith('--')) throw new Error('usage: --out <新ツリー> [--write]');
  const { entries, empty, files } = plan();
  console.log(`許可リスト ${entries.length} 項目 → ファイル ${files.length} 件`);
  // An entry that resolves to nothing drops files silently; refuse rather than transfer a partial tree.
  if (empty.length) throw new Error(`実体に解決しない項目がある（複写を中止）: ${empty.join(', ')}`);
  if (!argv.includes('--write')) { console.log('（空試行。--write を付けると書く）'); return { files }; }
  const target = path.resolve(out);
  if (existsSync(target) && readdirSync(target).length > 0) throw new Error(`複写先が空でない: ${target}`);
  rmSync(target, { recursive: true, force: true });
  for (const file of files) {
    const destination = path.join(target, path.relative(root, file));
    mkdirSync(path.dirname(destination), { recursive: true });
    cpSync(file, destination);
  }
  writeFileSync(path.join(target, '.transfer-manifest.txt'), `${files.map((file) => path.relative(root, file).split(path.sep).join('/')).join('\n')}\n`);
  console.log(`複写した: ${target}`);
  return { files };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
}
