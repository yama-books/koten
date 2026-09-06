import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Event, Report, Session } from '../../packages/shared/src/domain/event.ts';
import { canSendStats, finishedDay, STATS_COLLECTION_ENABLED, summarizeDailyStats } from '../../packages/hyakunin/src/domain/stats.ts';
import { expiresAtFrom, STATS_RETENTION_DAYS } from '../../packages/shared/src/telemetry/aggregate.ts';

const TODAY = '2026-09-06';
const OTHER_DAY = '2026-09-05';

let seq = 0;
const event = (overrides: Partial<Event> = {}): Event => ({
  eventId: `e${(seq += 1)}`, product: 'hyakunin', poemId: 'p001', questionId: 'p001-blank-ku2', sessionId: `s${seq}`,
  itemKey: 'p001:text', kind: 'answer', method: 'free-input', outcome: 'correct', hintUsed: false,
  effectiveMethod: 'free-input', delta: 9, localDate: TODAY, sameSessionRepeat: false,
  appVersion: 'test', dataVersion: 1, masteryRulesVersion: 1, ...overrides,
}) as Event;
const session = (overrides: Partial<Session> = {}): Session => ({
  sessionId: `s${(seq += 1)}`, product: 'hyakunin', from: 1, to: 10, entry: 'learn', order: 'number',
  seed: 'x', startedOn: TODAY, completed: true, questionCount: 10, ...overrides,
}) as Session;
const report = (overrides: Partial<Report> = {}): Report => ({
  reportId: `r${(seq += 1)}`, product: 'hyakunin', poemId: 'p001', kind: 'other', createdOn: TODAY, status: 'local', ...overrides,
}) as Report;

const summarize = (overrides: Partial<Parameters<typeof summarizeDailyStats>[0]> = {}) =>
  summarizeDailyStats({ localDate: TODAY, events: [], sessions: [], reports: [], poemIds: ['p001', 'p002', 'p003', 'p004'], ...overrides });

test('統計: 別の日の記録を混ぜない', () => {
  const facts = summarize({
    events: [event(), event({ localDate: OTHER_DAY })],
    sessions: [session(), session({ startedOn: OTHER_DAY })],
    reports: [report(), report({ createdOn: OTHER_DAY })],
  });
  assert.equal(facts.attemptCount, 1);
  assert.equal(facts.starts, 1);
  assert.equal(facts.reports, 1);
});

test('統計: 別の製品の記録を混ぜない', () => {
  const facts = summarize({ events: [event(), event({ product: 'kanazukai' })], sessions: [session({ product: 'kanazukai' })] });
  assert.equal(facts.attemptCount, 1);
  assert.equal(facts.starts, 0);
});

test('統計: ヒントと入口と種別を台帳から数える', () => {
  const facts = summarize({
    events: [event(), event({ hintUsed: true }), event({ itemKey: 'p001:author' })],
    sessions: [session({ entry: 'learn' }), session({ entry: 'exam' })],
  });
  assert.equal(facts.answers, 3);
  assert.equal(facts.hints, 1);
  assert.equal(facts.entryCounts.learn, 1);
  assert.equal(facts.entryCounts.exam, 1);
  assert.equal(facts.entryCounts.author, 0);
  assert.equal(facts.entryCounts.review, 0);
  assert.deepEqual(facts.questionTypeCounts, { blank: 2, author: 1 });
});

test('統計: 作者入口も他の入口を変えずに数える', () => {
  const facts = summarize({ sessions: [session({ entry: 'author' }), session({ entry: 'learn' })] });
  assert.equal(facts.entryCounts.author, 1);
  assert.equal(facts.entryCounts.learn, 1);
  assert.equal(facts.entryCounts.exam, 0);
});

test('統計: 種別は itemKey で分け、問題IDの綴りに影響されない', () => {
  // 問題IDの命名を変えても数が 0 に化けないこと。
  const facts = summarize({ events: [event({ questionId: 'まったく別の綴り', itemKey: 'p001:author' })] });
  assert.deepEqual(facts.questionTypeCounts, { blank: 0, author: 1 });
});

test('統計: 習熟度は当日ではなく現在値', () => {
  // 昨日の学習も習熟度には効く。当日で絞ると、学習した翌日に 0 が送られてしまう。
  const facts = summarize({ events: [event({ localDate: OTHER_DAY })] });
  assert.equal(facts.attemptCount, 0);
  assert.ok(Math.max(...facts.masteryPercents) > 0, '前日の学習が習熟度へ効いていない');
});

test('統計: 未着手の首も母数に数える', () => {
  const facts = summarize({ events: [event()] });
  assert.equal(facts.masteryPercents.length, 4);
  assert.equal(facts.masteryPercents.filter((percent) => percent === 0).length, 3);
});

test('統計: 閲覧イベントは解答として数えない', () => {
  const facts = summarize({ events: [event({ kind: 'view', outcome: 'viewed', method: 'view', effectiveMethod: 'view' })] });
  assert.equal(facts.attemptCount, 0);
  assert.equal(facts.answers, 0);
});

/**
 * 送信側は識別子を持たない（§11／W-14）。畳む前の識別子がアプリ側に留まることを、
 * 型ではなく**実物のソース**で確かめる。telemetry 側の静的検査と対になる。
 */
test('統計: 送信側へ渡す形に識別子が無い', () => {
  const source = readFileSync(join(process.cwd(), 'packages/shared/src/telemetry/aggregate.ts'), 'utf8');
  for (const word of ['poemId', 'questionId', 'sessionId', 'eventId']) {
    assert.equal(source.includes(word), false, `送信側に ${word} が現れている`);
  }
  // 走査対象が空でないことを確かめる（空ファイルを grep しても何も見つからない）。
  assert.ok(source.includes('buildStatsPayload'), '走査したソースが空か別物である');
});

const settings = (overrides: Record<string, unknown> = {}) => ({
  key: 'user', reading: 'no-ruby', writing: 'vertical', order: 'number', soundEnabled: false,
  noticeConfirmed: true, ...overrides,
}) as never;

test('送信の門: 案内を確認し、止めていないときだけ送る', () => {
  assert.equal(canSendStats(settings()), true);
  assert.equal(canSendStats(settings({ statsOptOut: true })), false);
  assert.equal(canSendStats(settings({ noticeConfirmed: false })), false);
  assert.equal(canSendStats(settings({ noticeConfirmed: false, statsOptOut: true })), false);
});

test('送信の門: 設定を読めなければ送らない', () => {
  // 保存が壊れた端末から黙って出て行かないこと。迷ったら送らない側へ倒す。
  assert.equal(canSendStats(null), false);
});

test('送信の門: 未設定は「送ってよい」', () => {
  // 既存利用者の保存を書き換えずに済ませるための既定。止めた人だけが true を持つ。
  assert.equal(canSendStats(settings({ statsOptOut: undefined })), true);
});

test('保持期間: 1年で期限を出す', () => {
  assert.equal(STATS_RETENTION_DAYS, 365);
  assert.equal(expiresAtFrom('2026-09-06'), '2027-09-06');
  // 閏日をまたぐ場合。2028 は閏年なので 2月29日 を1日数える。
  assert.equal(expiresAtFrom('2027-09-06'), '2028-09-05');
  assert.equal(expiresAtFrom('2026-12-31'), '2027-12-31');
});

test('送る日: 今日はまだ終わっていないので送らない', () => {
  // 途中の数を送ると、1日が二重に数えられるか、欠けた数が確定してしまう。
  assert.equal(finishedDay({ localDate: TODAY, pageViews: 3, reveal: 1, history: 0 }, TODAY), null);
});

test('送る日: 前日の分は送る対象になる', () => {
  const stored = { localDate: OTHER_DAY, pageViews: 3, reveal: 1, history: 2 };
  assert.deepEqual(finishedDay(stored, TODAY), stored);
});

test('送る日: 保存が無い・壊れていれば対象なし', () => {
  for (const broken of [null, undefined, 'x', {}, { localDate: OTHER_DAY, pageViews: -1, reveal: 0, history: 0 }]) {
    assert.equal(finishedDay(broken, TODAY), null, `壊れた保存を送る対象にした: ${JSON.stringify(broken)}`);
  }
});

test('収集の切り替えは1か所', () => {
  assert.equal(STATS_COLLECTION_ENABLED, true);
});

/**
 * 利用番号は同じ端末で使い続ける（§11）。**毎回作り直すと日ごとに別人として数えられ、
 * 反復利用も匿名利用番号数も測れない。** ソースで、保存を読む枝と書き戻す枝の両方が在ることを見る。
 */
test('利用番号: 保存を読み、無ければ書き戻す', () => {
  const source = readFileSync(join(process.cwd(), 'packages/hyakunin/src/main.tsx'), 'utf8');
  assert.ok(source.includes('keepClientNumber'), '利用番号を保つ関数が無い');
  const body = source.slice(source.indexOf('async function keepClientNumber'), source.indexOf('* 終わった日の統計を送る'));
  assert.ok(body.includes('settings.deviceId'), '保存された番号を読んでいない');
  assert.ok(body.includes('isClientNumber'), '保存された番号の形を確かめていない');
  assert.ok(body.includes('saveSettings'), '作った番号を書き戻していない');
  // 走査対象が空でないこと。
  assert.ok(body.length > 100, '走査した本体が空か別物である');
});
