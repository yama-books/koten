import test from 'node:test';
import assert from 'node:assert/strict';
import type { Event, Report, Session } from '../../../packages/shared/src/domain/event.ts';
import { makeResetConfirmation, previewReset, resetRecords } from '../../../packages/shared/src/storage/reset.ts';
import { listEvents } from '../../../packages/shared/src/storage/repo/events.ts';
import { listSessions } from '../../../packages/shared/src/storage/repo/sessions.ts';
import { listReports } from '../../../packages/shared/src/storage/repo/reports.ts';
import { createFakeDatabase } from '../sync/fake-database.ts';

/** **`sessionId` を持たせる。** 本物のイベントは必ず持つ。ここを省くと下の穴が再現しない。 */
const event = (overrides: Partial<Event> = {}): Event => ({
  eventId: 'e1', product: 'hyakunin', poemId: 'p001', sessionId: 's1', itemKey: 'p001:text',
  kind: 'answer', method: 'free-input', outcome: 'correct', hintUsed: false, effectiveMethod: 'free-input',
  delta: 9, localDate: '2026-09-23', sameSessionRepeat: false, appVersion: '0.2.0', dataVersion: 1, masteryRulesVersion: 1,
  ...overrides,
});
const session: Session = { sessionId: 's1', product: 'hyakunin', from: 1, to: 1, entry: 'learn', order: 'number', startedOn: '2026-09-23', completed: true, questionCount: 1 };
const report: Report = { reportId: 'r1', product: 'hyakunin', kind: 'text', createdOn: '2026-09-23', status: 'local' };

function seeded() {
  return createFakeDatabase({
    events: [event(), event({ eventId: 'e2' })],
    sessions: [session],
    reports: [report],
  });
}

/**
 * 2026-09-23 に公開版で踏んだ穴。**イベントが 1 件も消えなかった。**
 * 鍵を記録の欄から順に当てていたため、イベントが持つ `sessionId` が `eventId` より先に当たり、
 * 置き場の鍵（`eventId`）ではない値で削除していた。**「消しました」と出るのに消えない。**
 */
test('reset: 解答（events）を本当に消す', async () => {
  const db = seeded();
  const result = await resetRecords(db, makeResetConfirmation('hyakunin', { sessions: 1, events: 2, reports: 1, outbox: 0 }));
  assert.equal(result.ok, true);
  const remaining = await listEvents(db);
  assert.deepEqual(remaining.ok ? remaining.value : ['not-empty'], [], 'イベントが残っている');
});

test('reset: 回（sessions）と報告（reports）も消す', async () => {
  const db = seeded();
  await resetRecords(db, makeResetConfirmation('hyakunin', { sessions: 1, events: 2, reports: 1, outbox: 0 }));
  const [sessions, reports] = await Promise.all([listSessions(db), listReports(db)]);
  assert.deepEqual(sessions.ok ? sessions.value : ['x'], []);
  assert.deepEqual(reports.ok ? reports.value : ['x'], []);
});

test('reset: ほかの製品の記録は残す', async () => {
  // 百人一首の画面から消すので、仮名遣いの記録まで巻き込まない（2026-09-06 の裁定）。
  const db = createFakeDatabase({ events: [event(), event({ eventId: 'k1', product: 'kanazukai' })] });
  await resetRecords(db, makeResetConfirmation('hyakunin', { sessions: 0, events: 1, reports: 0, outbox: 0 }));
  const remaining = await listEvents(db);
  assert.deepEqual((remaining.ok ? remaining.value : []).map((record) => record.eventId), ['k1']);
});

test('reset: 返すのは「消した件数」で、下見の件数ではない', async () => {
  // **下見の数をそのまま返していたため、1 件も消えていないのに「消しました」と出ていた。**
  const db = seeded();
  const result = await resetRecords(db, makeResetConfirmation('hyakunin', { sessions: 99, events: 99, reports: 99, outbox: 99 }));
  assert.deepEqual(result.ok ? result.value : null, { sessions: 1, events: 2, reports: 1, outbox: 0 });
});

test('reset: 下見は消さない', async () => {
  const db = seeded();
  const counts = await previewReset(db, 'hyakunin');
  assert.deepEqual(counts.ok ? counts.value : null, { sessions: 1, events: 2, reports: 1, outbox: 0 });
  const remaining = await listEvents(db);
  assert.equal(remaining.ok ? remaining.value.length : 0, 2, '下見で消えている');
});
