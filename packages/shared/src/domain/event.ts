import type { ProductId } from '../app-config.ts';
import { appConfig } from '../app-config.ts';

export type EventKind = 'view' | 'self-rate' | 'answer';
export type EventMethod = 'view' | 'self-x' | 'self-tri' | 'self-o' | 'choice' | 'kanji-to-kana' | 'free-input' | 'paper-handwriting';
export type EventOutcome = 'correct' | 'incorrect' | 'skipped' | 'viewed';

export type Event = {
  eventId: string;
  product: ProductId;
  poemId: string;
  questionId?: string;
  sessionId: string;
  itemKey: string;
  kind: EventKind;
  method: EventMethod;
  outcome: EventOutcome;
  hintUsed: boolean;
  effectiveMethod: EventMethod;
  delta: number;
  analysisKeys?: string[];
  localDate: string;
  sameSessionRepeat: boolean;
  appVersion: string;
  dataVersion: number;
  masteryRulesVersion: number;
  /**
   * 答えた問題の難度の段（発注084）。作者問は `null`。
   *
   * **省略可にしてあるのは保存の都合である。** 2026-09-15 より前に保存されたイベントは
   * この欄を持たない。**それらが段3 なのは推測ではなく事実**である——段3 しか配っていなかった。
   * 必須にすると `isEvent` が古いイベントを弾き、**授業中の生徒の履歴が消える。**
   *
   * **作る側では必須である**（`BuildEventInput`）。書き忘れは型が止める。
   */
  rung?: number | null;
  /**
   * 手で難度を上げて挑んだか（発注086・D-17）。**省略可**——2026-09-15 より前の保存は
   * 持たない＝自動で配られたものである。必須にすると `isEvent` が古いイベントを弾き、
   * **授業中の生徒の履歴が消える。**
   *
   * **印が付いた正解は、次回の自動の位置（`openRung`）に数えない**（`rungProgress`）。
   * 一度試しただけの段が定位置になると、段を飛ばせてしまう。**制覇には数える。**
   *
   * **作る側では `rungRecordFor` が段と一緒に作る。** 段だけを書き写す経路を残さない。
   */
  raised?: boolean;
};

export function isProductId(value: unknown): value is ProductId {
  return typeof value === 'string' && Object.hasOwn(appConfig.products, value);
}

/** Validates persisted data received at a storage boundary, not just TypeScript callers. */
export function isEvent(value: unknown): value is Event {
  if (typeof value !== 'object' || value === null) return false;
  const event = value as Partial<Event>;
  return typeof event.eventId === 'string'
    && typeof event.sessionId === 'string'
    && typeof event.itemKey === 'string'
    && isProductId(event.product);
}

export type Session = {
  sessionId: string;
  product: ProductId;
  from: number;
  to: number;
  entry: 'quick' | 'view' | 'learn' | 'author' | 'review' | 'exam';
  order: 'number' | 'random';
  seed?: string;
  startedOn: string;
  completed: boolean;
  questionCount: number;
};

export type Report = {
  reportId: string;
  product: ProductId;
  poemId?: string;
  questionId?: string;
  kind: 'text' | 'reading' | 'author' | 'candidate' | 'display' | 'other';
  comment?: string;
  createdOn: string;
  status: 'local' | 'queued' | 'sent' | 'resolved';
};

export type UserSettings = {
  key: 'user';
  reading: 'no-ruby' | 'historical' | 'modern';
  writing: 'vertical' | 'horizontal';
  order: 'number' | 'random';
  soundEnabled: boolean;
  grade?: string;
  noticeConfirmed: boolean;
  /**
   * 統計を送らない選択（発注061 裁定2）。**未設定は「送ってよい」**——
   * 既存利用者の保存を書き換えずに済ませるため。止めた人だけが `true` を持つ。
   * **書き出しには含めない。** 端末ごとの選択であり、`noticeConfirmed` と同じ扱いにする。
   */
  statsOptOut?: boolean;
  deviceId?: string;
  /** 端末内だけに保存する同期の合言葉。書き出しと遠隔設定には含めない。 */
  syncCode?: string;
  syncEnabled?: boolean;
  /** 初回参加時に既存記録を送信待ちへ積んだ同期先。 */
  syncSeededFor?: string;
  /**
   * 同期グループを作った端末の名前（任意）。**参加する側が「どの端末と繋がるか」を確かめるためだけに使う。**
   * 既定は UA からの大雑把な推測で、利用者が直せる。統計には含めない。
   */
  syncDeviceName?: string;
};

export type OutboxItem = {
  outboxId: string;
  kind: 'stats' | 'report';
  payload: Record<string, unknown>;
  createdOn: string;
};
