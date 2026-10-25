import test from 'node:test';
import assert from 'node:assert/strict';
import { appPoints, hyakuninPoints } from '../../../packages/shared/src/sync/points-projection.ts';
import { pointsState, type PointsState } from '../../../packages/shared/src/sync/points-state.ts';
import { computePoints } from '../../../packages/shared/src/domain/points/compute.ts';
import { event } from '../mastery/fixtures.ts';
import { readAppRecords, recordKey, syncApp, type AppRecord } from '../../../packages/shared/src/sync/app-engine.ts';
import { makePairingCode } from '../../../packages/shared/src/sync/crypto.ts';

const baseline = (id: string, points = 0): AppRecord => ({ id, type: 'baseline', value: { points, total: points ? 1 : 0, slots: {} } });
const answer = (id: string, points: number): AppRecord => ({ id, type: 'answer', value: { id, at: '2026-10-25T00:00:00Z', delta: { points }, recent: '', quizEvents: [] } });
const learning = (id: string, setId = 'set', correct = true): AppRecord => ({ id, type: 'learning', value: { id, at: '2026-10-25T00:00:00Z', mode: 'reading', outcome: correct ? 'correct' : 'incorrect', setId } });
const decipher = (id: string): AppRecord => ({ id, type: 'decipher', value: { id, at: '2026-10-25T00:00:00Z', setId: 'decipher-set', correct: true, phraseId: 'p', reading: 'あ', glyphs: [] } });

test('group points: unchanged hyakunin calculation; duplicated JSON/device IDs counted once', () => {
  const events = [event({ eventId: 'a' }), event({ eventId: 'b' })];
  assert.equal(hyakuninPoints([...events, ...events]).points, computePoints(events).total);
  assert.throws(() => hyakuninPoints([events[0], { ...events[0], outcome: 'incorrect' }]));
  assert.equal(hyakuninPoints([]).points, null);
});
test('group points: vintage five-answer sets, incomplete sets, decipher and duplicate imports match native rules', () => {
  const records = Array.from({ length: 5 }, (_, i) => learning('l' + i, 'set', i !== 4));
  assert.equal(appPoints('vintage-kana', records.slice(0, 4)).points, 0);
  assert.equal(appPoints('vintage-kana', [...records, ...records, learning('partial', 'incomplete')]).points, 41);
  const decoded = Array.from({ length: 5 }, (_, i) => decipher('d' + i));
  assert.equal(appPoints('vintage-kana', [...records, ...decoded]).points, 91);
  assert.equal(appPoints('vintage-kana', []).points, null);
});
test('group points: one primary legacy baseline plus unique increments; independent old totals remain uncounted', () => {
  const records = [baseline('old', 80), baseline('empty'), answer('a', 14), answer('b', 7)];
  assert.equal(appPoints('conj', [...records, ...records]).points, 101);
  assert.deepEqual(appPoints('conj', [...records, baseline('backup', 200)]), { points: null, note: '旧累計の基準を確認してください' });
  assert.equal(appPoints('conj', [baseline('empty')]).points, 0);
  assert.throws(() => appPoints('conj', [baseline('old', 80), baseline('old', 100)]));
});
test('group points: concurrent/offline records converge read-only and wrong app/group ciphertext is rejected', async () => {
  const code = makePairingCode(), data = new Map<string, string>();
  const remote = { async list() { return [...data].map(([id, enc]) => ({ id, enc })); }, async put(id: string, enc: string) { data.set(id, enc); } };
  const device = (records: AppRecord[]) => ({ async read() { return records; }, async merge() { /* projection test retains each independent local source */ } });
  const a = device([baseline('old', 80), answer('a', 14)]), b = device([baseline('old', 80), answer('b', 7)]);
  await assert.rejects(syncApp('conj', code, a, { ...remote, async put() { throw Error('offline'); } }));
  await Promise.all([syncApp('conj', code, a, remote), syncApp('conj', code, b, remote)]);
  for (let i = 0; i < 2; i++) {
    const snapshot = await readAppRecords('conj', code, remote);
    assert.equal(appPoints('conj', snapshot).points, 101);
    assert.equal(data.size, 3, 'reading does not publish an aggregate or alter the immutable set');
  }
  await assert.rejects(readAppRecords('conj', makePairingCode(), remote));
  await assert.rejects(readAppRecords('vintage-kana', code, remote));
  const bad = { ...remote, async list() { const first = (await remote.list())[0]!; return [{ ...first, id: await recordKey(answer('other', 1)) }]; } };
  await assert.rejects(readAppRecords('conj', code, bad));
});
test('group points: offline values are marked previous; failed/absent apps stay unknown; local changes keep their native points', async () => {
  let own = 10, fail = false, state!: PointsState;
  const controller = pointsState('hyakunin', async () => own, async (_code, app) => { if (fail) throw Error(); return { points: app === 'conj' ? 20 : null }; }, s => { state = s; });
  controller.select('group-a'); await controller.refresh();
  assert.equal(state.entries.conj?.points, 20); assert.equal(state.entries['vintage-kana']?.points, null);
  own = 15; await controller.refresh(false);
  assert.equal(state.entries.hyakunin?.points, 15); assert.equal(state.entries.conj?.stale, true);
  fail = true; await controller.refresh(); assert.equal(state.entries.conj?.points, 20); assert.equal(state.entries.conj?.stale, true);
  controller.stop(); assert.equal(state.enabled, false); assert.deepEqual(state.entries, {});
});
test('group points: stop/switch discards delayed replies and clears the old group cache immediately', async () => {
  let release!: () => void, state!: PointsState;
  const wait = new Promise<void>(resolve => { release = resolve; });
  const controller = pointsState('conj', async () => 3, async () => { await wait; return { points: 90 }; }, s => { state = s; });
  controller.select('group-a'); const old = controller.refresh();
  await Promise.resolve(); controller.select('group-b'); assert.deepEqual(state.entries, {});
  release(); await old; assert.deepEqual(state.entries, {});
  await controller.refresh(false); assert.equal(state.entries.hyakunin?.points, null); assert.equal(state.entries.conj?.points, 3);
  controller.stop(); await controller.refresh(); assert.deepEqual(state.entries, {});
});
