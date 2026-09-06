import test from 'node:test';
import assert from 'node:assert/strict';
import { getAppCheckToken } from '../../../packages/hyakunin/src/telemetry/app-check.ts';

const enterprise = (token = 'recaptcha-token') => ({
  ready(callback: () => void) { callback(); },
  async execute() { return token; },
});

test('App Check: Enterprise の応答を REST で交換する', async () => {
  let request: { url: string; init: RequestInit } | null = null;
  const token = await getAppCheckToken({
    load: async () => enterprise(),
    exchange: async (url, init) => {
      request = { url, init };
      return { ok: true, async json() { return { token: 'app-check-token' }; } };
    },
  });
  assert.equal(token, 'app-check-token');
  assert.match(request!.url, /firebaseappcheck\.googleapis\.com\/v1\/projects\/324835470506\/apps\/1:324835470506:web:b81389fcaa9bbfe49834d3:exchangeRecaptchaEnterpriseToken\?key=/);
  assert.deepEqual(JSON.parse(String(request!.init.body)), { recaptchaEnterpriseToken: 'recaptcha-token', limitedUse: false });
});

test('App Check: 読み込み・交換の失敗は null にして送信を止めない', async () => {
  assert.equal(await getAppCheckToken({ load: async () => null }), null);
  assert.equal(await getAppCheckToken({ load: async () => enterprise(), exchange: async () => { throw new Error('offline'); } }), null);
});
