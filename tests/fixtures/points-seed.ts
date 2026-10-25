// Synthetic demo-emulator fixture. Never included in application builds.
import { createGroup, appRemote, groupCapability } from '../../packages/shared/src/sync/group-client.ts';
import { recordKey, type AppRecord } from '../../packages/shared/src/sync/app-engine.ts';
import { encryptField, makePairingCode, houseIdFor } from '../../packages/shared/src/sync/crypto.ts';
import { authorizeHousehold, createRecord, putSettings } from '../../packages/shared/src/sync/client.ts';
import { encodeRecord } from '../../packages/shared/src/sync/codec.ts';
import { computePoints } from '../../packages/shared/src/domain/points/compute.ts';
import { event } from '../unit/mastery/fixtures.ts';

async function seed(legacy = false) {
  const code = makePairingCode(), house = await houseIdFor(code);
  if (legacy) await putSettings(house, { enc: await encryptField('settings', code, { reading: 'no-ruby', writing: 'vertical', order: 'number', soundEnabled: false }) });
  await createGroup(code, legacy);
  if (!legacy) authorizeHousehold(house, await groupCapability(code));
  const e = event({ eventId: crypto.randomUUID() });
  const encoded = await encodeRecord('events', code, e);
  if (await createRecord(house, 'events', encoded.id, encoded.payload) === 'error') throw Error('seed failed');
  for (const app of ['conj', 'vintage-kana'] as const) {
    const remote = await appRemote(code, app);
    const records: AppRecord[] = app === 'conj'
      ? [{ id: 'primary', type: 'baseline', value: { points: 80, total: 1, slots: {} } }, { id: 'answer-a', type: 'answer', value: { id: 'answer-a', at: '2026-10-25T00:00:00Z', delta: { points: 14 }, recent: '', quizEvents: [] } }]
      : Array.from({ length: 5 }, (_, i) => ({ id: 'reading-' + i, type: 'learning', value: { id: 'reading-' + i, at: '2026-10-25T00:00:00Z', setId: 'set', mode: 'reading', outcome: i === 4 ? 'incorrect' : 'correct' } }));
    for (const r of records) { const id = await recordKey(r); await remote.put(id, await encryptField(`app:${app}:${id}`, code, r)); }
  }
  return { code, total: computePoints([e]).total + 94 + 41 };
}
(window as unknown as { seedPoints: typeof seed }).seedPoints = seed;
