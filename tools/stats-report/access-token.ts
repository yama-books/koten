import { createSign } from 'node:crypto';

/**
 * サービスアカウント鍵から Google のアクセストークンを得る。
 *
 * **依存を 1 つも増やさない**（`T-18 dependencies は preact だけである`）。
 * JWT bearer の署名は Node 内蔵の `node:crypto` で行う。
 */

/** 読み取りだけ。**書き込みの scope を名乗らない。** */
const SCOPE = 'https://www.googleapis.com/auth/datastore';
const LIFETIME_SECONDS = 3600;

export type ServiceAccount = { clientEmail: string; privateKey: string; tokenUri: string };

/** 欠けている項目を名指しする。「鍵が読めない」だけでは、何を直せばよいか分からない。 */
export function readServiceAccount(value: unknown): ServiceAccount {
  const source = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
  const missing = (['client_email', 'private_key', 'token_uri'] as const).filter((key) => typeof source[key] !== 'string' || source[key] === '');
  if (missing.length > 0) throw new Error(`サービスアカウント鍵に項目がありません: ${missing.join(', ')}`);
  return { clientEmail: String(source.client_email), privateKey: String(source.private_key), tokenUri: String(source.token_uri) };
}

const encode = (value: unknown): string => Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');

/** 署名済みの JWT を組み立てる。**純粋関数である**——ここだけは通信なしで試験できる。 */
export function buildAssertion(account: ServiceAccount, nowSeconds: number): string {
  const header = encode({ alg: 'RS256', typ: 'JWT' });
  const claims = encode({
    iss: account.clientEmail,
    scope: SCOPE,
    aud: account.tokenUri,
    iat: nowSeconds,
    exp: nowSeconds + LIFETIME_SECONDS,
  });
  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${claims}`);
  return `${header}.${claims}.${sign.sign(account.privateKey).toString('base64url')}`;
}

/** 交換する。失敗は**黙って null にしない**——何が起きたかを言って止まる。 */
export async function requestAccessToken(account: ServiceAccount, nowSeconds = Math.floor(Date.now() / 1000)): Promise<string> {
  const response = await fetch(account.tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: buildAssertion(account, nowSeconds),
    }).toString(),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`アクセストークンを取れませんでした（HTTP ${response.status}）: ${text.slice(0, 300)}`);
  const token = (JSON.parse(text) as { access_token?: unknown }).access_token;
  if (typeof token !== 'string' || token === '') throw new Error(`応答に access_token がありません: ${text.slice(0, 300)}`);
  return token;
}
