import test from 'node:test';
import assert from 'node:assert/strict';
import { appCheckPlan } from '../../packages/shared/src/app-check.ts';
import { appConfig } from '../../packages/shared/src/app-config.ts';

test('A-1 端末確認用ビルドでは App Check を起こさない', () => {
  // エミュレータは App Check を見ない。Cloudflare の一時ドメインは起動のたびに変わるため
  // reCAPTCHA の許可ドメインに入れられない。**有効・無効のどちらでも起こさない。**
  assert.equal(appCheckPlan({ devicePreview: true, enabled: true }), 'skip-emulator');
  assert.equal(appCheckPlan({ devicePreview: true, enabled: false }), 'skip-emulator');
});

test('A-2 appCheckEnabled が偽なら起こさない', () => {
  assert.equal(appCheckPlan({ devicePreview: false, enabled: false }), 'skip-disabled');
});

test('A-3 実サーバ向けで appCheckEnabled が真なら起こす', () => {
  assert.equal(appCheckPlan({ devicePreview: false, enabled: true }), 'start');
});

test('A-4 enabled を渡さなければ appConfig の値に従う', () => {
  assert.equal(
    appCheckPlan({ devicePreview: false }),
    appConfig.appCheckEnabled ? 'start' : 'skip-disabled',
  );
});

/**
 * 施行（enforce）を入れる前に満たしていなければならない条件の釘。
 * **規則が `request.app` を見るより先に、利用者の端末がトークンを送っていること。**
 * 逆順にすると、正規の利用者が全員弾かれる。
 */
test('A-5 規則が request.app を要求するなら、App Check は有効でなければならない', async () => {
  const rules = await (await import('node:fs/promises')).readFile('firebase/firestore.rules', 'utf8');
  if (!rules.includes('request.app')) return; // まだ施行前。ここは通す。
  assert.equal(appConfig.appCheckEnabled, true,
    'A-5: 規則が request.app を要求しているのに appCheckEnabled が偽である。正規の利用者が全員弾かれる');
});

import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';

/** `packages` 配下の TypeScript を全部集める。dist と node_modules は見ない。 */
function packageSources(): string[] {
  const files: string[] = [];
  const visit = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) { if (name !== 'dist' && name !== 'node_modules') visit(path); }
      else if (path.endsWith('.ts') || path.endsWith('.tsx')) files.push(path);
    }
  };
  visit(join(process.cwd(), 'packages'));
  return files;
}
const relative = (file: string) => file.replace(process.cwd(), '').split(sep).join('/');

/**
 * **App Check を起こす場所は 1 つだけである**（2026-09-21 の統合）。
 * 以前は同期（Firebase SDK）と統計（自前の reCAPTCHA）の 2 実装があり、
 * 同じサイトキーを違う読み込み方で要求して互いを壊していた。
 * 2 つ目が生えたら、この 1 件が赤くなる。
 */
test('A-6 App Check の初期化は packages 全体で 1 か所だけである', () => {
  const files = packageSources();
  assert.ok(files.length > 0, 'A-6: 走査対象が空');
  const callers = files.filter((file) => readFileSync(file, 'utf8').includes('initializeAppCheck('));
  assert.deepEqual(callers.map(relative), ['/packages/shared/src/app-check.ts']);
});

/**
 * **統計送信は自分で reCAPTCHA を読まない。**
 * 読むと `render=<サイトキー>` になり、(1) 右下にバッジが出る、
 * (2) SDK の `render=explicit` と衝突してトークンが取れなくなる。
 */
test('A-7 reCAPTCHA を自前で読む記述は packages のどこにも無い', () => {
  const files = packageSources();
  assert.ok(files.length > 0, 'A-7: 走査対象が空');
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    assert.equal(source.includes('recaptcha/enterprise.js'), false, `A-7: ${relative(file)} が reCAPTCHA を自分で読んでいる`);
    assert.equal(source.includes('exchangeRecaptcha' + 'EnterpriseToken'), false, `A-7: ${relative(file)} が交換 API を自分で叩いている`);
  }
});
