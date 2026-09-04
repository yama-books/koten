import type { Event, Session, UserSettings } from '@koten/shared/domain/event';

const receiptBrand: unique symbol = Symbol('save-receipt');
export type SaveReceipt = Readonly<{ [receiptBrand]: true; eventId: string }>;
export type SaveFailure = Readonly<{ reason: 'write-failed'; error?: unknown }>;

export type SessionPort = Readonly<{
  appendEvent(event: Event): Promise<SaveReceipt | SaveFailure>;
  listEvents(): Promise<readonly Event[]>;
  saveSession(session: Session): Promise<SaveReceipt | SaveFailure>;
  loadLastSession(): Promise<Session | null>;
  saveSettings(settings: UserSettings): Promise<SaveReceipt | SaveFailure>;
  loadSettings(): Promise<UserSettings | null>;
}>;

function receipt(eventId: string): SaveReceipt {
  return { [receiptBrand]: true, eventId };
}

export function createMemoryPort(): SessionPort & { readonly events: readonly Event[] } {
  const events: Event[] = [];
  let lastSession: Session | null = null;
  let settings: UserSettings | null = null;
  return {
    events,
    async appendEvent(event) {
      events.push(event);
      return receipt(event.eventId);
    },
    async listEvents() {
      return events;
    },
    async saveSession(session) {
      lastSession = session;
      return receipt(session.sessionId);
    },
    async loadLastSession() {
      return lastSession;
    },
    async saveSettings(nextSettings) {
      settings = nextSettings;
      return receipt(settings.key);
    },
    async loadSettings() {
      return settings;
    },
  };
}
