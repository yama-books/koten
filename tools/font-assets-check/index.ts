import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const packages = ['hyakunin', 'kanazukai'] as const;
const fontsCssPath = path.join(root, 'packages', 'shared', 'src', 'styles', 'fonts.css');

export type FontFaceSource = { family: string; weight: string; file: string };
export type SourceRecord = { file: string; url: string; sha256: string; bytes: number };

/** Extract local /fonts/... URLs from the repository's @font-face declarations. */
export function parseFontSources(css: string): FontFaceSource[] {
  const result: FontFaceSource[] = [];
  for (const match of css.matchAll(/@font-face\s*\{([\s\S]*?)\}/g)) {
    const face = match[1];
    const family = face.match(/font-family\s*:\s*['"]([^'"]+)['"]/i)?.[1] ?? '';
    const weight = face.match(/font-weight\s*:\s*([^;\s]+)/i)?.[1] ?? '';
    for (const source of face.matchAll(/url\(\s*['"]?([^)'"\s]+)['"]?\s*\)/gi)) {
      const url = source[1];
      if (url.startsWith('/fonts/')) result.push({ family, weight, file: url.slice('/fonts/'.length) });
    }
  }
  return result;
}

export function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export function matchesRecord(bytes: Buffer, record: Pick<SourceRecord, 'sha256' | 'bytes'>): boolean {
  return bytes.length === record.bytes && sha256(bytes) === record.sha256;
}

export function compareFileMaps(left: Map<string, string>, right: Map<string, string>): string[] {
  const paths = new Set([...left.keys(), ...right.keys()]);
  return [...paths].sort().filter((file) => left.get(file) !== right.get(file));
}

export function hasOflFile(files: Iterable<string>): boolean {
  return [...files].some((file) => path.basename(file).toLowerCase() === 'ofl.txt');
}

function fontsDir(packageName: string): string { return path.join(root, 'packages', packageName, 'public', 'fonts'); }

function filesUnder(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const item = path.join(directory, entry);
    return statSync(item).isDirectory() ? filesUnder(item) : [item];
  });
}

function relativeFiles(packageName: string): string[] {
  return filesUnder(fontsDir(packageName))
    .map((file) => path.relative(fontsDir(packageName), file).replaceAll(path.sep, '/'))
    .filter((file) => file !== 'SOURCES.json');
}

function loadRecords(packageName: string): SourceRecord[] {
  const parsed = JSON.parse(readFileSync(path.join(fontsDir(packageName), 'SOURCES.json'), 'utf8')) as { files: SourceRecord[] };
  if (!Array.isArray(parsed.files)) throw new Error(`${packageName}: SOURCES.json の files が配列ではありません`);
  return parsed.files;
}

function run(): number {
  const css = readFileSync(fontsCssPath, 'utf8');
  const sources = parseFontSources(css);
  const records = new Map<string, SourceRecord[]>();
  const actual = new Map<string, string[]>();
  const violations = new Map<string, string[]>();
  for (const kind of ['css-missing', 'unrecorded', 'missing-record', 'metadata', 'package-mismatch', 'license'] as const) violations.set(kind, []);
  const add = (kind: string, packageName: string, file: string) => violations.get(kind)?.push(`${kind} ${packageName} ${file}`);

  for (const packageName of packages) {
    const packageRecords = loadRecords(packageName);
    records.set(packageName, packageRecords);
    const files = relativeFiles(packageName);
    actual.set(packageName, files);
    const recordMap = new Map(packageRecords.map((record) => [record.file, record]));
    for (const source of sources) {
      if (!source.file || !statSafe(path.join(fontsDir(packageName), source.file))) add('css-missing', packageName, source.file || '(解析不能)');
    }
    for (const file of files) if (!recordMap.has(file)) add('unrecorded', packageName, file);
    for (const record of packageRecords) {
      const full = path.join(fontsDir(packageName), record.file);
      if (!statSafe(full)) { add('missing-record', packageName, record.file); continue; }
      const bytes = readFileSync(full);
      if (!matchesRecord(bytes, record)) add('metadata', packageName, record.file);
    }
    const families = new Set(files.map((file) => file.split('/')[0]).filter(Boolean));
    for (const family of families) {
      const familyFiles = files.filter((file) => file.startsWith(`${family}/`));
      if (!hasOflFile(familyFiles)) add('license', packageName, `${family}/OFL.txt`);
      else if (!recordMap.has(`${family}/OFL.txt`)) add('license', packageName, `${family}/OFL.txt`);
    }
  }

  const left = new Map(relativeFiles(packages[0]).map((file) => [file, sha256(readFileSync(path.join(fontsDir(packages[0]), file)))]));
  const right = new Map(relativeFiles(packages[1]).map((file) => [file, sha256(readFileSync(path.join(fontsDir(packages[1]), file)))]));
  for (const file of compareFileMaps(left, right)) add('package-mismatch', 'hyakunin↔kanazukai', file);

  const counts = [...violations.entries()].map(([kind, items]) => `${kind}=${items.length}`).join(' ');
  const fileCount = [...actual.values()].reduce((sum, files) => sum + files.length, 0);
  const recordCount = [...records.values()].reduce((sum, items) => sum + items.length, 0);
  console.log(`font-assets: 検査ファイル ${fileCount} 件、記録 ${recordCount} 件、${counts}`);
  for (const items of violations.values()) for (const item of items) console.error(item);
  console.log(`font-assets: ${[...violations.values()].every((items) => items.length === 0) ? '合格' : '不合格'}`);
  return [...violations.values()].some((items) => items.length > 0) ? 1 : 0;
}

function statSafe(file: string): boolean { try { return statSync(file).isFile(); } catch { return false; } }

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = run();
  } catch (error) {
    console.error(`font-assets: 検査を完走できませんでした: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
