import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sendStats, type HttpSend } from '../../../packages/hyakunin/src/telemetry/stats-sender.ts';
import type { HttpRequestSpec } from '../../../packages/shared/src/telemetry/transport.ts';
import { payload } from './fixtures.ts';

/** 出て行ったリクエストをすべて記録する。件数 0 が「1件も出ていない」の証拠になる。 */
function recorder(responses: Array<{ status: number; text: string }>): { send: HttpSend; sent: HttpRequestSpec[] } {
  const sent: HttpRequestSpec[] = [];
  let index = 0;
  return {
    sent,
    send: async (spec) => {
      sent.push(spec);
      return responses[index++] ?? { status: 500, text: '' };
    },
  };
}
const ok = () => [{ status: 200, text: JSON.stringify({ idToken: 'token-abc' }) }, { status: 200, text: '{}' }];
const noAppCheck = async () => null;

test('送信: 許されていなければ 1 件も出ていかない', async () => {
  const { send, sent } = recorder(ok());
  assert.equal(await sendStats({ payload: payload(), allowed: false, send, getToken: noAppCheck }), 'blocked');
  // 「送信関数を呼んでいない」ではなく「リクエストが 0 件」で見る（発注061 受入条件）。
  assert.equal(sent.length, 0);
});

test('送信: 形の違うものは出さない', async () => {
  const { send, sent } = recorder(ok());
  assert.equal(await sendStats({ payload: { これは: '統計ではない' }, allowed: true, send, getToken: noAppCheck }), 'blocked');
  assert.equal(sent.length, 0);
});

test('送信: 余分な項目を持つものは出さない', async () => {
  // 項目を1つ足したら送れなくなること。裁定3「項目を足すときは裁定を取り直す」の歯止め。
  const { send, sent } = recorder(ok());
  assert.equal(await sendStats({ payload: { ...payload(), 学校名: 'どこか中学校' }, allowed: true, send, getToken: noAppCheck }), 'blocked');
  assert.equal(sent.length, 0);
});

test('送信: 許されていれば匿名認証のあとに1件書き込む', async () => {
  const { send, sent } = recorder(ok());
  assert.equal(await sendStats({ payload: payload(), allowed: true, send, getToken: noAppCheck }), 'sent');
  assert.equal(sent.length, 2);
  assert.ok(sent[0]!.url.includes('accounts:signUp'), '匿名認証を先に行っていない');
  assert.ok(sent[1]!.url.includes('firestore.googleapis.com'), '書き込み先が Firestore でない');
  assert.equal(sent[1]!.headers.Authorization, 'Bearer token-abc');
});

test('送信: 同じ日を二度送っても重複にならない', async () => {
  // Firestore の 409（既にある）は成功として扱う。再送で日が二重に増えない。
  const { send } = recorder([{ status: 200, text: JSON.stringify({ idToken: 't' }) }, { status: 409, text: '' }]);
  assert.equal(await sendStats({ payload: payload(), allowed: true, send, getToken: noAppCheck }), 'sent');
});

test('送信: 認証に失敗したら書き込まない', async () => {
  const { send, sent } = recorder([{ status: 403, text: '' }]);
  assert.equal(await sendStats({ payload: payload(), allowed: true, send, getToken: noAppCheck }), 'retry');
  assert.equal(sent.length, 1, '認証に失敗したのに書き込みへ進んでいる');
});

test('送信: 圏外でも例外を投げない', async () => {
  // 通信の失敗で学習の画面を壊さない（§11）。
  const send: HttpSend = async () => { throw new Error('offline'); };
  assert.equal(await sendStats({ payload: payload(), allowed: true, send, getToken: noAppCheck }), 'retry');
});

test('送信: 応答が壊れていても例外を投げない', async () => {
  const { send } = recorder([{ status: 200, text: 'これはJSONではない' }]);
  assert.equal(await sendStats({ payload: payload(), allowed: true, send, getToken: noAppCheck }), 'retry');
});

test('送信: 書き込みが拒否されたら再送へ回す', async () => {
  const { send } = recorder([{ status: 200, text: JSON.stringify({ idToken: 't' }) }, { status: 401, text: '' }]);
  assert.equal(await sendStats({ payload: payload(), allowed: true, send, getToken: noAppCheck }), 'retry');
});

test('送信: App Check が取れたときだけ作成要求へヘッダを付ける', async () => {
  const withToken = recorder(ok());
  assert.equal(await sendStats({ payload: payload(), allowed: true, send: withToken.send, getToken: async () => 'app-check-token' }), 'sent');
  assert.equal(withToken.sent[1]!.headers['X-Firebase-AppCheck'], 'app-check-token');

  const withoutToken = recorder(ok());
  assert.equal(await sendStats({ payload: payload(), allowed: true, send: withoutToken.send, getToken: noAppCheck }), 'sent');
  assert.equal('X-Firebase-AppCheck' in withoutToken.sent[1]!.headers, false);
});

test('送信: App Check 取得が失敗しても作成要求を続ける', async () => {
  const { send, sent } = recorder(ok());
  assert.equal(await sendStats({ payload: payload(), allowed: true, send, getToken: noAppCheck }), 'sent');
  assert.equal(sent.length, 2);
});

/**
 * 送信を書いたことで既存の釘を外していないこと。**外さずに済む設計を選んだ**ことの確認である。
 */
test('送信: telemetry 側の釘を外していない', () => {
  const transport = readFileSync(join(process.cwd(), 'packages/shared/src/telemetry/transport.ts'), 'utf8');
  for (const word of ['fetch(', 'XMLHttpRequest', 'sendBeacon']) {
    assert.equal(transport.includes(word), false, `transport.ts に ${word} が入った（T-17 と同じ性質）`);
  }
  const sender = readFileSync(join(process.cwd(), 'packages/hyakunin/src/telemetry/stats-sender.ts'), 'utf8');
  assert.ok(sender.includes('fetch('), '送信の出口が実在しない');
  assert.ok(sender.includes('sanitizeStats'), '送る直前の絞り込みが無い');
});
