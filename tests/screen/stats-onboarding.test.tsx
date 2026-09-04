import { render, type ComponentChildren } from 'preact';
import { act } from 'preact/test-utils';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, expect, test } from 'vitest';
import { GradePicker, PRIMARY_GRADES, SECONDARY_GRADES } from '../../packages/shared/src/ui/components/GradePicker.tsx';
import { StatsNotice, STATS_NOTICE_TEXT } from '../../packages/shared/src/ui/components/StatsNotice.tsx';
import { createMemoryPort } from '../../packages/hyakunin/src/domain/ports.ts';
import { Home } from '../../packages/hyakunin/src/ui/screens/Home.tsx';

let root: HTMLDivElement | undefined;
const settings = { key: 'user', reading: 'no-ruby', writing: 'vertical', order: 'number', soundEnabled: false, noticeConfirmed: false } as const;

function collectSources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? collectSources(join(directory, entry.name)) : entry.name.endsWith('.tsx') || entry.name.endsWith('.ts') ? [join(directory, entry.name)] : []);
}

function collectFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? collectFiles(join(directory, entry.name)) : [join(directory, entry.name)]);
}

function mount(view: ComponentChildren) {
  root = document.createElement('div');
  document.body.append(root);
  render(view, root);
  return root;
}

async function mountHome(noticeConfirmed = false) {
  const port = createMemoryPort();
  await port.saveSettings({ ...settings, noticeConfirmed });
  root = document.createElement('div');
  document.body.append(root);
  await act(async () => {
    render(<Home port={{ ...port, saveLocalReport: async () => true }} poems={[] as never[]} questions={[]} />, root!);
    await Promise.resolve();
    await Promise.resolve();
  });
  return { root, port };
}

function clickButton(container: HTMLElement, label: string) {
  const button = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent === label);
  expect(button).toBeTruthy();
  button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

afterEach(() => {
  if (root) {
    render(null, root);
    root.remove();
    root = undefined;
  }
});

test('N-1: 統計案内の確定文は APP_SPEC §11 の引用と完全一致する', () => {
  const source = readFileSync(join(process.cwd(), 'docs/APP_SPEC.md'), 'utf8');
  const sectionStart = source.indexOf('## 11.');
  const nextSection = source.indexOf('\n## ', sectionStart + 1);
  const section = source.slice(sectionStart, nextSection === -1 ? undefined : nextSection);
  const confirmedText = section?.match(/^> (.+)$/m)?.[1];
  expect(confirmedText).toBeTruthy();
  expect(STATS_NOTICE_TEXT).toBe(confirmedText);
});

test('N-2: 統計案内の操作要素は確認だけでオプトアウト UI がない', () => {
  const view = mount(<StatsNotice onConfirm={() => {}} />);
  expect(view.querySelectorAll('button, input, select, textarea')).toHaveLength(1);
  expect(view.querySelector('button')?.textContent).toBe('確認する');
  expect(view.querySelector('input[type="checkbox"]')).toBeNull();
});

test('N-3: 第一段の学年は指定された4区分と順序に固定される', () => {
  expect(PRIMARY_GRADES).toEqual(['中一', '中二', '中三', 'その他']);
});

test('N-4: 第二段の学年は指定された5区分と順序に固定される', () => {
  expect(SECONDARY_GRADES).toEqual(['小学生', '高一', '高二', '高三', '大人']);
});

test('N-5: 第二段はその他で現れ中一では現れない', async () => {
  const view = mount(<GradePicker onChange={() => {}} />);
  expect(view.textContent).not.toContain('小学生');
  await act(() => { clickButton(view, '中一'); });
  expect(view.textContent).not.toContain('小学生');
  await act(() => { clickButton(view, 'その他'); });
  expect(view.textContent).toContain('小学生');
});

test('N-6: 学年未選択の確認後も grade を作らず先へ進める', async () => {
  const mounted = await mountHome();
  await act(async () => { clickButton(mounted.root, '確認する'); await Promise.resolve(); });
  const saved = await mounted.port.loadSettings();
  expect(saved?.grade).toBeUndefined();
  expect(Object.hasOwn(saved!, 'grade')).toBe(false);
  expect(mounted.root.querySelector('[aria-label="初回設定"]')).toBeNull();
});

test('N-7: 確認すると noticeConfirmed true を設定へ保存する', async () => {
  const mounted = await mountHome();
  await act(async () => { clickButton(mounted.root, '確認する'); await Promise.resolve(); });
  expect((await mounted.port.loadSettings())?.noticeConfirmed).toBe(true);
});

test('N-8: 選んだ学年を UserSettings.grade へ保存する', async () => {
  const mounted = await mountHome();
  await act(() => { clickButton(mounted.root, '中二'); });
  await act(async () => { clickButton(mounted.root, '確認する'); await Promise.resolve(); });
  expect((await mounted.port.loadSettings())?.grade).toBe('中二');
});

test('N-9: 案内は noticeConfirmed false だけで表示を決める', async () => {
  let mounted = await mountHome(true);
  expect(mounted.root.querySelector('[aria-label="初回設定"]')).toBeNull();
  render(null, mounted.root);
  mounted.root.remove();
  root = undefined;
  mounted = await mountHome(false);
  expect(mounted.root.querySelector('[aria-label="初回設定"]')).not.toBeNull();
});

test('N-10: 禁止語検査の走査対象は非空で新しい共有 UI も含む', () => {
  const noPressureSource = readFileSync(join(process.cwd(), 'tests/screen/no-pressure.test.tsx'), 'utf8');
  expect(noPressureSource).toContain("join(process.cwd(), 'packages/shared/src/ui')");
  const uiRootsForN10 = [join(process.cwd(), 'packages/hyakunin/src/ui'), join(process.cwd(), 'packages/shared/src/ui')];
  const files = uiRootsForN10.flatMap(collectSources);
  expect(files.length).toBeGreaterThan(0);
  expect(files.some((file) => file.endsWith('StatsNotice.tsx'))).toBe(true);
  expect(files.some((file) => file.endsWith('GradePicker.tsx'))).toBe(true);
});

test('N-11: 新しい共有 UI は通信と直接ストレージと時刻を参照しない', () => {
  const files = ['StatsNotice.tsx', 'GradePicker.tsx'].map((name) => readFileSync(join(process.cwd(), 'packages/shared/src/ui/components', name), 'utf8'));
  for (const source of files) for (const forbidden of ['fetch(', 'XMLHttpRequest', 'sendBeacon', 'localStorage', 'Date.now']) expect(source).not.toContain(forbidden);
});

test('N-12: telemetry 配下は学年区分の具体値を持たない', () => {
  const root = join(process.cwd(), 'packages/shared/src/telemetry');
  const files = collectFiles(root);
  expect(files.length).toBeGreaterThan(0);
  const source = files.map((file) => readFileSync(file, 'utf8')).join('\n');
  for (const grade of [...PRIMARY_GRADES, ...SECONDARY_GRADES]) expect(source).not.toContain(grade);
});

test('N-13: 統計案内の確定文を持つ packages 配下の原本は StatsNotice 1件だけ', () => {
  const packagesRoot = join(process.cwd(), 'packages');
  const files = collectFiles(packagesRoot).filter((file) => /\.(?:ts|tsx|json)$/.test(file) && !/[\\/](?:dist|node_modules)[\\/]/.test(file));
  expect(files.length).toBeGreaterThan(0);
  const matches = files.filter((file) => readFileSync(file, 'utf8').includes(STATS_NOTICE_TEXT));
  expect(matches).toHaveLength(1);
  expect(matches[0].endsWith('StatsNotice.tsx')).toBe(true);
});

test('N-14: 統計案内と学年選択は StatsPayload を組み立てない', () => {
  const files = ['StatsNotice.tsx', 'GradePicker.tsx'].map((name) => readFileSync(join(process.cwd(), 'packages/shared/src/ui/components', name), 'utf8'));
  for (const source of files) expect(source).not.toContain('StatsPayload');
});
