import assert from 'node:assert/strict';
import { createVerify, generateKeyPairSync } from 'node:crypto';
import { toolPresent, toolTest } from './guard.ts';

const { buildAssertion, readServiceAccount } = toolPresent ? await import('../../../tools/stats-report/access-token.ts') : { buildAssertion: null as never, readServiceAccount: null as never };

/** 試験のためにその場で作る。**本物の鍵をリポジトリへ置かない。** */
function keyPair(): { privateKey: string; publicKey: string } {
  const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
  return {
    privateKey: pair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    publicKey: pair.publicKey.export({ type: 'spki', format: 'pem' }).toString(),
  };
}

function account(privateKey: string): Record<string, unknown> {
  return { client_email: 'reader@koten-fde43.iam.gserviceaccount.com', private_key: privateKey, token_uri: 'https://oauth2.example/token' };
}

const decodePart = (part: string): unknown => JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));

toolTest('トークン: 主張は RS256 の JWT で、読み取りだけの scope を名乗る', () => {
  const { privateKey } = keyPair();
  const assertion = buildAssertion(readServiceAccount(account(privateKey)), 1_800_000_000);
  const [header, claims] = assertion.split('.');

  assert.deepEqual(decodePart(header!), { alg: 'RS256', typ: 'JWT' });
  assert.deepEqual(decodePart(claims!), {
    iss: 'reader@koten-fde43.iam.gserviceaccount.com',
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.example/token',
    iat: 1_800_000_000,
    exp: 1_800_003_600,
  });
});

toolTest('トークン: 署名はその鍵で検証できる', () => {
  const { privateKey, publicKey } = keyPair();
  const assertion = buildAssertion(readServiceAccount(account(privateKey)), 1_800_000_000);
  const [header, claims, signature] = assertion.split('.');

  const verify = createVerify('RSA-SHA256');
  verify.update(`${header}.${claims}`);
  assert.equal(verify.verify(publicKey, Buffer.from(signature!, 'base64url')), true, '署名が鍵と一致しない');
});

toolTest('トークン: base64url で組み立てる（生の base64 を混ぜない）', () => {
  const { privateKey } = keyPair();
  const assertion = buildAssertion(readServiceAccount(account(privateKey)), 1_800_000_000);
  assert.equal(assertion.split('.').length, 3);
  for (const forbidden of ['+', '/', '=']) {
    assert.equal(assertion.includes(forbidden), false, `base64url でない文字が入っている: ${forbidden}`);
  }
});

toolTest('トークン: 鍵の項目が欠けていたら、何が足りないか言って止まる', () => {
  assert.throws(() => readServiceAccount({ client_email: 'a@b.c' }), /private_key/);
  assert.throws(() => readServiceAccount({ private_key: 'x', token_uri: 'y' }), /client_email/);
});
