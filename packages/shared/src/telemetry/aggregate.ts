import type { ProductId } from '../app-config.ts';
import { MASTERY_RULES_VERSION } from '../domain/mastery/rules.v1.ts';
import type { DailyCounters } from './counters.ts';
import { BUTTON_KEYS, ENTRY_KEYS, MASTERY_BUCKET_COUNT, QUESTION_TYPE_KEYS, type StatsPayload } from './registry.ts';

/**
 * 送り先はテストの側に固定する（発注061 裁定4）。
 * **設定や環境変数で切り替えられるようにしない**——切り替えられる作りにした時点で、
 * 事故で正式側へ入る道ができる。正式公開を名乗る段で、この定数を変える発注を1件起こす。
 */
export const STATS_IS_OFFICIAL = false;

/**
 * 帯の境目。§8 の表示と同じ 0 / 30 / 60 / 85 を使う。
 * 利用者が見ている色と集計が食い違う理由が無い。
 */
export const MASTERY_BUCKET_BOUNDS = [30, 60, 85] as const;

/**
 * 集計済みの数だけ。**この層は識別子を受け取らない。**
 *
 * どの歌をどう間違えたかは §11 が送信を禁じており、`tests/unit/telemetry/static.test.ts` の W-14 が
 * telemetry のソースに識別子の語が現れないことで守っている。台帳からこの数を作るのはアプリ側の仕事で、
 * ここは受け取った数を送信の形へ整えるだけである。**識別子を引数に足さないこと。**
 */
export type StatsFacts = Readonly<{
  attemptCount: number;
  starts: number;
  answers: number;
  hints: number;
  reports: number;
  entryCounts: Readonly<Record<(typeof ENTRY_KEYS)[number], number>>;
  questionTypeCounts: Readonly<Record<(typeof QUESTION_TYPE_KEYS)[number], number>>;
  /** 習熟度の百分率だけを並べたもの。**どの項目のものかは渡さない。** */
  masteryPercents: readonly number[];
}>;

export type StatsMeta = Readonly<{
  clientNumber: string;
  localDate: string;
  product: ProductId;
  /** 4 区分または「答えない」。自由入力を渡さないこと（発注061 裁定3）。 */
  grade: string;
  counters: DailyCounters;
  appVersion: string;
  dataVersion: number;
  /** 保持期限。**呼び出し側が明示する。** */
  expiresAt: string;
}>;

/**
 * 保持期間。**1年**（依頼者裁定・2026-09-06）。
 * §11 は「保持期間を実装・公開説明に一致させる」と定める。**ここが唯一の出どころである**——
 * 画面の説明を変えるときは、この定数と一緒に動かすこと。
 */
export const STATS_RETENTION_DAYS = 365;

/**
 * 保持期限を日付だけで出す。時刻も時間帯も使わない（§11「正確な時刻を保存しない」）。
 * `Date` の日付演算だけを使い、時刻や時間帯を読む関数は呼ばない。
 */
export function expiresAtFrom(localDate: string): string {
  const [year, month, day] = localDate.split('-').map(Number);
  const at = new Date(Date.UTC(year!, month! - 1, day! + STATS_RETENTION_DAYS));
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${at.getUTCFullYear()}-${pad(at.getUTCMonth() + 1)}-${pad(at.getUTCDate())}`;
}

/** 小数の揺れをそのまま送らない。表示と同じく小数第1位まで。 */
const round1 = (value: number) => Math.round(value * 10) / 10;

function bucketOf(percent: number): number {
  if (percent === 0) return 0;
  for (let index = 0; index < MASTERY_BUCKET_BOUNDS.length; index += 1) {
    if (percent < MASTERY_BUCKET_BOUNDS[index]!) return index + 1;
  }
  return MASTERY_BUCKET_BOUNDS.length + 1;
}

/**
 * その日の統計を1件組み立てる。**純関数である**——保存も送信もしない。
 * 数えられるものは台帳から導いて `facts` で渡し、導けない3つだけを `meta.counters` から採る（発注061 §1b）。
 */
export function buildStatsPayload(meta: StatsMeta, facts: StatsFacts): StatsPayload {
  const buttonCounts = Object.fromEntries(BUTTON_KEYS.map((key) => [key, 0])) as StatsPayload['buttonCounts'];
  buttonCounts.start = facts.starts;
  buttonCounts.answer = facts.answers;
  buttonCounts.hint = facts.hints;
  buttonCounts.report = facts.reports;
  buttonCounts.reveal = meta.counters.reveal;
  buttonCounts.history = meta.counters.history;

  const entryCounts = Object.fromEntries(ENTRY_KEYS.map((key) => [key, facts.entryCounts[key] ?? 0])) as StatsPayload['entryCounts'];
  const questionTypeCounts = Object.fromEntries(QUESTION_TYPE_KEYS.map((key) => [key, facts.questionTypeCounts[key] ?? 0])) as StatsPayload['questionTypeCounts'];

  const distribution = Array.from({ length: MASTERY_BUCKET_COUNT }, () => 0);
  for (const percent of facts.masteryPercents) distribution[bucketOf(percent)] += 1;
  const total = facts.masteryPercents.reduce((sum, value) => sum + value, 0);

  return {
    clientNumber: meta.clientNumber,
    localDate: meta.localDate,
    product: meta.product,
    grade: meta.grade,
    pageViews: meta.counters.pageViews,
    buttonCounts,
    entryCounts,
    questionTypeCounts,
    attemptCount: facts.attemptCount,
    masteryAvg: facts.masteryPercents.length === 0 ? 0 : round1(total / facts.masteryPercents.length),
    masteryMax: facts.masteryPercents.length === 0 ? 0 : Math.max(...facts.masteryPercents),
    masteryDistribution: distribution,
    isOfficial: STATS_IS_OFFICIAL,
    appVersion: meta.appVersion,
    dataVersion: meta.dataVersion,
    masteryRulesVersion: MASTERY_RULES_VERSION,
    expiresAt: meta.expiresAt,
  };
}
