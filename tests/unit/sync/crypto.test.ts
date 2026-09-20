import test from 'node:test';
import assert from 'node:assert/strict';
import { makePairingCode, normalizeCode, houseIdFor, encryptField, decryptField, isCiphertext } from '../../../packages/shared/src/sync/crypto.ts';

test('makePairingCode returns 16 characters from the unambiguous alphabet', () => {
  const code = makePairingCode();
  assert.equal(code.length, 16);
  assert.match(code, /^[abcdefghjkmnpqrstuvwxyz23456789]{16}$/);
});

test('normalizeCode trims, lowercases, and strips internal whitespace', () => {
  assert.equal(normalizeCode('  AbC1 23xyz  '), 'abc123xyz');
});

test('houseIdFor is deterministic and differs for different codes', async () => {
  const a = await houseIdFor('same-code-aaaa');
  const b = await houseIdFor('same-code-aaaa');
  const c = await houseIdFor('different-code');
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.match(a, /^[0-9a-f]{64}$/);
});

test('encryptField output is recognized by isCiphertext and round-trips through decryptField', async () => {
  const code = 'roundtrip-code-1';
  const value = { eventId: 'e1', outcome: 'correct', delta: 2.5 };
  const ciphertext = await encryptField('events', code, value);
  assert.ok(isCiphertext(ciphertext));
  const decrypted = await decryptField('events', code, ciphertext);
  assert.deepEqual(decrypted, value);
});

test('decryptField fails when the field name additional-data does not match', async () => {
  const code = 'field-mismatch-1';
  const ciphertext = await encryptField('events', code, { a: 1 });
  await assert.rejects(() => decryptField('sessions', code, ciphertext));
});

test('decryptField fails when the pairing code does not match', async () => {
  const ciphertext = await encryptField('events', 'code-one-aaaaaaa', { a: 1 });
  await assert.rejects(() => decryptField('events', 'code-two-bbbbbbb', ciphertext));
});

test('isCiphertext rejects plain strings and non-strings', () => {
  assert.equal(isCiphertext('hello'), false);
  assert.equal(isCiphertext(42), false);
  assert.equal(isCiphertext(null), false);
});
