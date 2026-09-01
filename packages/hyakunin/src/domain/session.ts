import type { Session } from '@koten/shared/domain/event';
import type { OrderMode } from './order.ts';

export type CreateSessionInput = {
  sessionId: string;
  range: { from: number; to: number };
  entry: Session['entry'];
  order: OrderMode;
  seed: string;
  startedOn: string;
  questionCount: number;
};

export function createSession(input: CreateSessionInput): Session {
  return {
    sessionId: input.sessionId,
    product: 'hyakunin',
    from: input.range.from,
    to: input.range.to,
    entry: input.entry,
    order: input.order,
    seed: input.seed,
    startedOn: input.startedOn,
    completed: false,
    questionCount: input.questionCount,
  };
}

export function resolveActiveRange(
  session: Pick<Session, 'from' | 'to' | 'completed'> | null,
  urlRange: { from: number; to: number },
): { from: number; to: number } {
  if (session !== null && !session.completed) return { from: session.from, to: session.to };
  return urlRange;
}

/** Marks a saved learning session as complete without changing its other details. */
export function completeSession(session: Session): Session {
  return { ...session, completed: true };
}
