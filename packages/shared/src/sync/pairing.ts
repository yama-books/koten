import { normalizeCode } from './crypto.ts';

const CODE = /^[abcdefghjkmnpqrstuvwxyz23456789]{16}$/;

export function isPairingCode(value: string): boolean {
  return CODE.test(normalizeCode(value));
}

export function pairingPayload(code: string, baseUrl: string): string {
  const normalized = normalizeCode(code);
  if (!isPairingCode(normalized)) throw new Error('Invalid pairing code');
  const url = new URL(baseUrl);
  url.search = '';
  url.hash = '';
  url.searchParams.set('join', normalized);
  url.searchParams.set('r', String(Date.now()));
  return url.href;
}

export function parsePairingPayload(value: string, baseUrl: string): string | null {
  try {
    const source = new URL(value);
    const expected = new URL(baseUrl);
    const apps = /^(.*\/)(?:100|vintage-kana|conj)(?:\/|\/index\.html|\/detail\.html)$/;
    const sourceApp = apps.exec(source.pathname), expectedApp = apps.exec(expected.pathname);
    if (source.origin !== expected.origin || (source.pathname !== expected.pathname && (!sourceApp || !expectedApp || sourceApp[1] !== expectedApp[1]))) return null;
    if (source.searchParams.getAll('join').length !== 1) return null;
    const normalized = normalizeCode(source.searchParams.get('join') ?? '');
    return isPairingCode(normalized) ? normalized : null;
  } catch { return null; }
}
