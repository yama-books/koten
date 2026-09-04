import { execFileSync } from 'node:child_process';

const output = execFileSync('git', ['-c', 'core.quotepath=false', 'ls-files', '--eol'], { encoding: 'utf8' });
const lines = output.split(/\r?\n/).filter((line) => line.length > 0);
const violations: string[] = [];

for (const line of lines) {
  const match = line.match(/^i\/(\S+)\s+w\/(\S+)\s+[^\t]*\t(.+)$/);
  if (!match) {
    violations.push(`${line}: 行を解釈できない`);
    continue;
  }
  const [, indexEol, worktreeEol, file] = match;
  if (indexEol === 'lf' && (worktreeEol === 'crlf' || worktreeEol === 'mixed')) violations.push(file);
}

const minimumScanned = 400;
if (lines.length < minimumScanned) {
  violations.push(`検査対象が不足しています（走査 ${lines.length} 件、必要 ${minimumScanned} 件以上）`);
}

console.log(`check:eol: 走査 ${lines.length} 件、違反 ${violations.length} 件`);
for (const violation of violations) console.error(violation);
if (violations.length > 0) process.exitCode = 1;
