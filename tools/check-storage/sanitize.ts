import { homedir } from 'node:os';

// 検査ツールの出力は CI のログに残る。公開リポジトリではログも公開されるため、
// 利用者名を含む絶対パスを外へ出さない（HANDOFF §3 の 5）。
//
// 伏字化は 2 つの表記を潰す必要がある。
//   1. OS のパス表記     C:\Users\<利用者名>\...  ／  /home/<利用者名>/...
//   2. file:// URL 表記  file:///C:/Users/<利用者名>/AI%E9%96%8B%E7%99%BA/...
// 2 は非 ASCII が百分率符号化されるため、1 の文字列とは一致しない。両方を作る。

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 区切り文字は「エスケープしてから置換」してはならない。`\` が `\\` になった後に
// 1 文字ずつ区切り文字クラスへ置換されると、区切り 2 個を要求する式になって一致しなくなる。
// したがって先に区切りで分割し、各区間だけをエスケープしてから区切りクラスで連結する。
function pathPattern(absolutePath: string): string {
  return absolutePath.split(/[\\/]/).map(escapeRegExp).join('[\\\\/]+');
}

// file:// URL では非 ASCII だけが UTF-8 の百分率符号化になる。区切りとドライブ文字はそのまま。
// `pathToFileURL` を使うと引数が実行中の OS の流儀でないときに cwd 基準で解決されてしまうため使わない。
function percentEncodeNonAscii(value: string): string {
  return value.replace(/[^\x20-\x7E]/g, (character) => encodeURIComponent(character));
}

function variantsOf(absolutePath: string): string[] {
  const encoded = percentEncodeNonAscii(absolutePath);
  return absolutePath === encoded ? [absolutePath] : [absolutePath, encoded];
}

export function makeSanitizer(root: string, home: string = homedir()): (value: string) => string {
  // 置換先が異なるので root と home を分けて持つ。長いほうから当てないと
  // home が先に当たって root の伏字が `~/...` に化ける。
  const rules = [
    ...variantsOf(root).map((variant) => ({ pattern: pathPattern(variant), replacement: '.' })),
    ...variantsOf(home).map((variant) => ({ pattern: pathPattern(variant), replacement: '~' })),
  ].sort((left, right) => right.pattern.length - left.pattern.length);
  return (value: string) => rules.reduce(
    (text, rule) => text.replace(new RegExp(rule.pattern, 'gi'), rule.replacement),
    value,
  );
}
