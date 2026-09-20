import { execFileSync } from 'node:child_process';

const output = execFileSync('git', ['-c', 'core.quotepath=false', 'ls-files', '--eol'], { encoding: 'utf8' });
const lines = output.split(/\r?\n/).filter((line) => line.length > 0);
const violations: string[] = [];

for (const line of lines) {
  const match = line.match(/^i\/(\S+)\s+w\/(\S+)\s+([^\t]*)\t(.+)$/);
  if (!match) {
    violations.push(`${line}: 行を解釈できない`);
    continue;
  }
  const [, indexEol, worktreeEol, attributes, file] = match;
  // `.gitattributes` が `eol=crlf` と決めているものは対象外にする。
  // cmd.exe と PowerShell は LF のスクリプトで誤動作することがあるため、
  // `*.bat` `*.cmd` `*.ps1` だけは作業ツリーを CRLF に保つと決めてある。
  // その3種は index が lf・作業ツリーが crlf になるのが**正しい姿**であり、
  // ここで弾くと規約どおりのファイルが必ず違反になる。
  // 2026-09-21 に最初の `.ps1` を足すまで、この穴は一度も踏まれていなかった。
  if (attributes.includes('eol=crlf')) continue;
  if (indexEol === 'lf' && (worktreeEol === 'crlf' || worktreeEol === 'mixed')) violations.push(file);
}

const minimumScanned = 400;
if (lines.length < minimumScanned) {
  violations.push(`検査対象が不足しています（走査 ${lines.length} 件、必要 ${minimumScanned} 件以上）`);
}

console.log(`check:eol: 走査 ${lines.length} 件、違反 ${violations.length} 件`);
for (const violation of violations) console.error(violation);
if (violations.length > 0) process.exitCode = 1;
