import test from 'node:test';
import assert from 'node:assert/strict';
import { appCheckPlan } from '../../../packages/shared/src/sync/app-check.ts';
import { appConfig } from '../../../packages/shared/src/app-config.ts';

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
