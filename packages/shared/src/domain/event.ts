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
};

export type OutboxItem = {
  outboxId: string;
  kind: 'stats' | 'report';
  payload: Record<string, unknown>;
  createdOn: string;
};
