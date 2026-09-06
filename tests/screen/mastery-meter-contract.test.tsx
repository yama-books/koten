import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';

const root = process.cwd();
const componentPath = join(root, 'packages/shared/src/ui/components/MasteryMeter.tsx');
const stylesPath = join(root, 'packages/hyakunin/src/styles.css');

test('習熟度バーは結果・履歴・出題中の3画面で同じ共有部品を使う', () => {
  const component = readFileSync(componentPath, 'utf8');
  expect(component).toContain('mastery-meter mastery-meter--${color}');
  for (const screen of ['Result.tsx', 'History.tsx', 'Session.tsx']) {
    const source = readFileSync(join(root, 'packages/hyakunin/src/ui/screens', screen), 'utf8');
    expect(source).toContain('@koten/shared/mastery-meter');
    expect(source).toContain('<MasteryMeter');
  }
});

test('共有の習熟度バーは設計トークンの枠と角丸を持つ', () => {
  const styles = readFileSync(stylesPath, 'utf8');
  const meterRule = styles.match(/\.mastery-meter \[role="meter"\] \{([^}]*)\}/)?.[1] ?? '';
  expect(meterRule).toContain('border: var(--rule-thin) solid var(--color-rule)');
  expect(meterRule).toContain('border-radius: var(--radius-sm)');
});
