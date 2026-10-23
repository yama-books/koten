import { normalizeCode } from './crypto.ts';
import { isPairingCode } from './pairing.ts';

/** Portable QR invitation shared by /100, /vintage-kana and /conj.
 * Does not join a group: the receiving application MUST confirm before joining.
 */
export type KotenApp = '100' | 'vintage-kana' | 'conj';
const APPS: ReadonlySet<string> = new Set(['100', 'vintage-kana', 'conj']);
const RX = /^(.*\/)(100|vintage-kana|conj)(?:\/|\/index\.html|\/detail\.html)$/;
function appLocation(url: URL): { prefix: string; app: KotenApp } | null {
  const match = RX.exec(url.pathname);
  if (!match || !APPS.has(match[2]!)) return null;
  return { prefix: match[1]!, app: match[2]! as KotenApp };
}
export function makePortableInvite(code: string, pageUrl: string): string {
  const normalized = normalizeCode(code);
  if (!isPairingCode(normalized)) throw new Error('Invalid pairing code');
  const url = new URL(pageUrl);
  if (!appLocation(url)) throw new Error('Unsupported app path');
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))
    throw new Error('Insecure origin');
  url.search = '';
  url.hash = '';
  url.searchParams.set('join', normalized);
  return url.href;
}
export function readPortableInvite(payload: string, receivingPageUrl: string):
  { code: string; fromApp: KotenApp } | null {
  try {
    const source = new URL(payload);
    const target = new URL(receivingPageUrl);
    const from = appLocation(source), receiving = appLocation(target);
    if (!from || !receiving) return null;
    if (source.origin !== target.origin || from.prefix !== receiving.prefix) return null;
    if (source.searchParams.getAll('join').length !== 1) return null;
    if (source.protocol !== 'https:' && !(source.protocol === 'http:' && ['localhost','127.0.0.1'].includes(source.hostname))) return null;
    const code = normalizeCode(source.searchParams.get('join') ?? '');
    return isPairingCode(code) ? { code, fromApp: from.app } : null;
  } catch {
    return null;
  }
}
