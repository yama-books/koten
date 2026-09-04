import type { OutboxItem } from '../domain/event.ts';
import type { StatsPayload } from './registry.ts';

export const OUTBOX_RETENTION_DAYS = 30;

function calendarDay(value: string): number {
  const [year, month, day] = value.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

export function selectOutbox(items: OutboxItem[], today: string): { send: OutboxItem[]; drop: OutboxItem[] } {
  const todayDay = calendarDay(today);
  const send: OutboxItem[] = [];
  const drop: OutboxItem[] = [];
  for (const item of items) {
    if ((todayDay - calendarDay(item.createdOn)) / 86_400_000 > OUTBOX_RETENTION_DAYS) drop.push(item);
    else send.push(item);
  }
  return { send, drop };
}

export function statsDocumentId(payload: StatsPayload): string {
  return `${payload.clientNumber}_${payload.localDate}_${payload.product}`;
}
