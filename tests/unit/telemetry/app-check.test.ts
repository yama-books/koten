import test from 'node:test';
import assert from 'node:assert/strict';
import { getAppCheckToken } from '../../../packages/hyakunin/src/telemetry/app-check.ts';

/**
 * 2026-09-21 の統合後、統計送信は **App Check のトークンを自分では作らない。**
 * 同期と同じ `@koten/shared/app-check` から受け取るだけである。
 * ここで見るのは「受け取ったものをそのまま返す」ことと「失敗しても送信を止めない」ことの2つ。
 * 自前の reCAPTCHA 読み込みが戻ってきていないことは `tests/unit/app-check.test.ts` の A-7 が見る。
 */
test('App Check: 共有の App Check から受け取ったトークンをそのまま返す', async () => {
  assert.equal(await getAppCheckToken({ token: async () => 'app-check-token' }), 'app-check-token');
});

test('App Check: 取得不能は null にして送信を止めない', async () => {
  assert.equal(await getAppCheckToken({ token: async () => null }), null);
  assert.equal(await getAppCheckToken({ token: async () => { throw new Error('offline'); } }), null, '例外を投げ返すと、統計送信が丸ごと落ちる');
});
