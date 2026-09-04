import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../../packages/hyakunin/src/ui/screens/Home.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../../packages/hyakunin/src/styles.css', import.meta.url), 'utf8');

test('範囲を選び直す操作は閲覧状態だけを終了し、現在の範囲を保持する', () => {
  const handler = home.match(/function returnToRangeSelection\(\) \{(?<body>[\s\S]*?)\n  \}/)?.groups?.body;

  assert.ok(handler, '範囲へ戻る専用の操作を持つ');
  assert.match(handler, /setViewing\(false\)/);
  assert.doesNotMatch(handler, /set(?:From|To|ActiveRange|CurrentCardNo)\(/);
  assert.match(home, /onClick=\{returnToRangeSelection\}>範囲を選び直す</);
});

test('縦書き表示は各句を個別の縦書き列として配置する', () => {
  assert.match(styles, /\.poem-sheet--vertical \.poem__half span\s*\{[\s\S]*writing-mode:\s*vertical-rl/);
  assert.match(styles, /\.poem-sheet--vertical \.poem\s*\{[\s\S]*direction:\s*rtl/);
  assert.doesNotMatch(styles, /\.poem-sheet--vertical \.poem\s*\{[\s\S]*height:\s*18rem/);
});
