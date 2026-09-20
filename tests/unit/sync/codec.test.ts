import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeRecord, decodeRecord, recordId } from '../../../packages/shared/src/sync/codec.ts';
import type { Event } from '../../../packages/shared/src/domain/event.ts';

const sampleEvent: Event = {
  eventId: 'evt-1', product: 'hyakunin', poemId: 'p1', sessionId: 's1', itemKey: 'k1',
  kind: 'answer', method: 'choice', outcome: 'correct', hintUsed: false, effectiveMethod: 'choice',
  delta: 3, localDate: '2026-09-20', sameSessionRepeat: false, appVersion: '0.2.0', dataVersion: 1, masteryRulesVersion: 1,
};

test('recordId uses the eventId for events', () => {
  assert.equal(recordId('events', sampleEvent), 'evt-1');
});

test('encodeRecord round-trips through decodeRecord', async () => {
  const code = 'codec-round-trip1';
  const encoded = await encodeRecord('events', code, sampleEvent);
  assert.equal(encoded.id, 'evt-1');
  const decoded = await decodeRecord<Event>('events', code, encoded.id, encoded.payload);
  assert.deepEqual(decoded, sampleEvent);
});

test('decodeRecord returns null for a document with the wrong pairing code', async () => {
  const encoded = await encodeRecord('events', 'code-a-aaaaaaaaaa', sampleEvent);
  const decoded = await decodeRecord('events', 'code-b-bbbbbbbbbb', encoded.id, encoded.payload);
  assert.equal(decoded, null);
});

test('decodeRecord returns null for a malformed payload', async () => {
  const decoded = await decodeRecord('events', 'any-code-value12', 'evt-x', { enc: 'not-ciphertext' });
  assert.equal(decoded, null);
});
