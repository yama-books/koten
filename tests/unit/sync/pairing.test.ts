import test from 'node:test';
import assert from 'node:assert/strict';
import { isPairingCode, pairingPayload, parsePairingPayload } from '../../../packages/shared/src/sync/pairing.ts';

const code = 'abcdefghjkmnpqrs';
const base = 'https://example.test/koten/100/?from=1';

test('招待 QR は同じページの URL と合言葉を持つ', () => {
  const invite = pairingPayload(code, base);
  const parsed = new URL(invite);
  assert.equal(parsed.origin, 'https://example.test');
  assert.equal(parsed.pathname, '/koten/100/');
  assert.equal(parsed.searchParams.get('join'), code);
  assert.equal(parsePairingPayload(invite, base), code);
});

test('別サイトと別ページの QR では参加できない', () => {
  assert.equal(parsePairingPayload(`https://evil.test/koten/100/?join=${code}`, base), null);
  assert.equal(parsePairingPayload(`https://example.test/other/?join=${code}`, base), null);
  assert.equal(parsePairingPayload(code, base), null);
});

test('合言葉は16文字の許可文字だけを受け取る', () => {
  assert.equal(isPairingCode(code), true);
  assert.equal(isPairingCode('  ＡＢＣＤＥＦＧＨＪＫＭＮＰＱＲＳ  '), true);
  assert.equal(isPairingCode('aaaaaaaaaaaaaaa0'), false);
  assert.equal(isPairingCode('short'), false);
});
