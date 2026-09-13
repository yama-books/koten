import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sendStats, type HttpSend } from '../../../packages/hyakunin/src/telemetry/stats-sender.ts';
import { getAppCheckToken } from '../../../packages/hyakunin/src/telemetry/app-check.ts';
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
const ok = () => [{ status: 200, text: '{}' }];
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

test('送信: 許されていれば書き込みを1回だけ行い、Authorization を送らない', async () => {
  const { send, sent } = recorder(ok());
  assert.equal(await sendStats({ payload: payload(), allowed: true, send, getToken: noAppCheck }), 'sent');
  assert.equal(sent.length, 1);
  assert.ok(sent[0]!.url.includes('firestore.googleapis.com'), '書き込み先が Firestore でない');
  assert.equal(sent[0]!.headers.Authorization, undefined);
});

test('送信: 同じ日を二度送っても重複にならない', async () => {
  // Firestore の 409（既にある）は成功として扱う。再送で日が二重に増えない。
  const { send } = recorder([{ status: 409, text: '' }]);
  assert.equal(await sendStats({ payload: payload(), allowed: true, send, getToken: noAppCheck }), 'sent');
});

test('送信: 書き込みが拒否されたら再送へ回す', async () => {
  const { send, sent } = recorder([{ status: 403, text: '' }]);
  assert.equal(await sendStats({ payload: payload(), allowed: true, send, getToken: noAppCheck }), 'retry');
  assert.equal(sent.length, 1);
});

test('送信: 圏外でも例外を投げない', async () => {
  // 通信の失敗で学習の画面を壊さない（§11）。
  const send: HttpSend = async () => { throw new Error('offline'); };
  assert.equal(await sendStats({ payload: payload(), allowed: true, send, getToken: noAppCheck }), 'retry');
});

test('送信: 作成要求が拒否されたら再送へ回す', async () => {
  const { send } = recorder([{ status: 401, text: '' }]);
  assert.equal(await sendStats({ payload: payload(), allowed: true, send, getToken: noAppCheck }), 'retry');
});

test('送信: App Check が取れたときだけ作成要求へヘッダを付ける', async () => {
  const withToken = recorder(ok());
  assert.equal(await sendStats({ payload: payload(), allowed: true, send: withToken.send, getToken: async () => 'app-check-token' }), 'sent');
  assert.equal(withToken.sent[0]!.headers['X-Firebase-AppCheck'], 'app-check-token');

  const withoutToken = recorder(ok());
  assert.equal(await sendStats({ payload: payload(), allowed: true, send: withoutToken.send, getToken: noAppCheck }), 'sent');
  assert.equal('X-Firebase-AppCheck' in withoutToken.sent[0]!.headers, false);
});

test('送信: App Check 取得が失敗しても作成要求を続ける', async () => {
  const { send, sent } = recorder(ok());
  assert.equal(await sendStats({ payload: payload(), allowed: true, send, getToken: noAppCheck }), 'sent');
  assert.equal(sent.length, 1);
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

/**
 * `document` の無い node では `loadRecaptchaEnterprise()` が即 `null` を返す。
 * **そのまま「読み込まない」を確かめても、門を消しても緑のままになる。**
 * 偽の `window`/`document` を置いて、**読み込みが起きれば必ず観測できる状態**にしてから見る。
 */
function fakeBrowser(): { scripts: string[]; restore: () => void } {
  const scripts: string[] = [];
  const globals = globalThis as unknown as Record<string, unknown>;
  const had = { window: 'window' in globals, document: 'document' in globals };
  const before = { window: globals.window, document: globals.document };
  globals.window = {};
  globals.document = {
    createElement: () => ({ src: '', async: false, onload: null, onerror: null }),
    head: {
      append(script: { src: string; onerror?: (() => void) | null }) {
        scripts.push(script.src);
        // **必ず決着させる。** 呼ばないと読み込みの Promise が解決せず、
        // 門を外したときの破壊試験が「赤」ではなく「終わらない」になる。
        script.onerror?.();
      },
    },
  };
  return {
    scripts,
    restore: () => {
      if (had.window) globals.window = before.window; else delete globals.window;
      if (had.document) globals.document = before.document; else delete globals.document;
    },
  };
}

/**
 * 走査対象の実在（陽性対照）。**この試験が緑でない限り、下の「0件」は何の証拠でもない。**
 * `fakeBrowser()` が reCAPTCHA の読み込みを本当に捕まえることを、先に確かめる。
 */
test('送信: 偽の document は reCAPTCHA の読み込みを実際に捕まえる', { timeout: 5000 }, async () => {
  const browser = fakeBrowser();
  try {
    assert.equal(await getAppCheckToken(), null, '読み込みに失敗したら null（送信は止めない）');
    assert.equal(browser.scripts.length, 1, '偽の document がスクリプトを捕まえていない');
    assert.match(browser.scripts[0]!, /^https:\/\/www\.google\.com\/recaptcha\/enterprise\.js\?render=/);
  } finally {
    browser.restore();
  }
});

/**
 * 2026-09-13 の裁定（案2）の釘。**`getToken` を渡さず、既定の配線そのものを通す。**
 * 部品が呼ばれないことではなく、**Google への読み込みが1件も出ないこと**で見る。
 * `appConfig.appCheckEnabled` を真へ戻したら、この1件だけが赤くなる。
 */
test('送信: App Check が無効な間、既定の経路は reCAPTCHA を読み込まない', { timeout: 5000 }, async () => {
  const browser = fakeBrowser();
  try {
    const { send, sent } = recorder(ok());
    assert.equal(await sendStats({ payload: payload(), allowed: true, send }), 'sent');
    assert.equal(sent.length, 1, '統計そのものは止めない');
    assert.equal('X-Firebase-AppCheck' in sent[0]!.headers, false, 'トークンを取っていないのにヘッダが付いている');
    assert.deepEqual(browser.scripts, [], 'reCAPTCHA を読み込んでいる');
  } finally {
    browser.restore();
  }
});
