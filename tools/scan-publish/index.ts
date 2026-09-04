import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readAllowlist } from './allowlist.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { sources: allowedSources, buildExtensions } = readAllowlist();
const allowedEntries = new Set(allowedSources);
const allowedBuildExtensions = new Set(buildExtensions);
const stagingRoots = process.env.PUBLISH_STAGING_DIR
  ? [{ directory: path.resolve(root, process.env.PUBLISH_STAGING_DIR), label: 'staging' }]
  : [
      { directory: path.join(root, 'packages', 'hyakunin', 'dist'), label: 'hyakunin/dist' },
      { directory: path.join(root, 'packages', 'kanazukai', 'dist'), label: 'kanazukai/dist' },
    ];
const violations: string[] = [];
let scanned = 0;
// 2 つの公開単位の dist が揃っていれば 500 件を十分に上回る。
const minimumScanned = 500;

if (allowedBuildExtensions.size === 0) {
  console.error('scan:publish: publish-allowlist.txt の [build-extensions] を読み取れない（設定異常）');
  process.exitCode = 1;
} else {
  for (const staging of stagingRoots) {
    if (!statSafe(staging.directory)) {
      violations.push(`${staging.label}: ビルド成果物ディレクトリが存在しない`);
      continue;
    }
    const packageName = staging.label.split('/')[0];
    if (!allowedEntries.has(`packages/${packageName}/**`)) {
      violations.push(`${staging.label}: 許可リストの packages/${packageName}/** に一致しない`);
      continue;
    }
    for (const file of filesUnder(staging.directory)) {
      scanned += 1;
      const relative = `${staging.label}/${path.relative(staging.directory, file).replaceAll(path.sep, '/')}`;
      if (!allowedBuildExtensions.has(path.extname(file).toLowerCase())) {
        violations.push(`${relative}: 許可されたビルド拡張子に一致しない（allowlist の規則に一致しない）`);
      }
    }
  }
}

function filesUnder(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const item = path.join(directory, entry);
    return statSync(item).isDirectory() ? filesUnder(item) : [item];
  });
}

function statSafe(file: string): boolean {
  try { return statSync(file).isDirectory(); } catch { return false; }
}

if (scanned < minimumScanned) {
  violations.push(`検査対象が不足しています（走査 ${scanned} 件、必要 ${minimumScanned} 件以上）`);
}

console.log(`scan:publish: 走査 ${scanned} 件、違反 ${violations.length} 件`);
if (violations.length) {
  for (const violation of violations) console.error(violation);
  process.exitCode = 1;
}
