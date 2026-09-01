import { render } from 'preact';
import { ErrorBoundary } from '@koten/shared/error-boundary';
import { useState } from 'preact/hooks';
import '../../shared/src/styles/tokens.css';
import { Home } from './ui/screens/Home.tsx';
import { RangePicker } from './ui/screens/RangePicker.tsx';
import { Session } from './ui/screens/Session.tsx';
import { createIndexedDbPort } from './ui/adapters/indexeddb-port.ts';
import type { ApplicationPort } from './ui/adapters/indexeddb-port.ts';
import { createSession } from './domain/session.ts';
import { createSeed } from './domain/order.ts';
import { planQuestions, type EntryId } from './domain/entry.ts';
import type { PublishedQuestion } from './data/question-schema.ts';
import type { UserSettings } from '@koten/shared/domain/event';
import './styles.css';

const defaultPort = createIndexedDbPort();
const defaults: UserSettings = { key: 'user', reading: 'no-ruby', writing: 'vertical', order: 'number', soundEnabled: false, noticeConfirmed: false };

type Selection = {
  entry: EntryId;
  range: { from: number; to: number };
  questions: PublishedQuestion[];
  planned?: PublishedQuestion[];
  sessionId?: string;
};

export function App({ port = defaultPort }: { port?: ApplicationPort } = {}) {
  const [screen, setScreen] = useState<'home' | 'picker' | 'session'>('home');
  const [selected, setSelected] = useState<Selection | null>(null);
  const [settings, setSettings] = useState(defaults);
  if (screen === 'picker' && selected) return <RangePicker entry={selected.entry} range={selected.range} order={settings.order} onBack={() => setScreen('home')} onStart={(range, order) => {
    const seed = createSeed(Math.random);
    const planned = planQuestions(selected.entry, selected.questions, Array.from({ length: range.to - range.from + 1 }, (_, index) => range.from + index), seed, order);
    const sessionId = crypto.randomUUID();
    void port.saveSession(createSession({ sessionId, range, entry: selected.entry, order, seed, startedOn: new Date().toISOString().slice(0, 10), questionCount: planned.length }));
    setSelected({ ...selected, range, planned, sessionId });
    setSettings({ ...settings, order });
    setScreen('session');
  }} />;
  if (screen === 'session' && selected?.planned && selected.sessionId) return <Session questions={selected.planned} sessionId={selected.sessionId} port={port} settings={settings} onSettings={setSettings} onComplete={() => setScreen('home')} />;
  return <Home port={port} onPickEntry={(entry, range, questions) => { setSelected({ entry, range, questions }); setScreen('picker'); }} />;
}

const mount = document.getElementById('app');
if (mount) render(<ErrorBoundary><App /></ErrorBoundary>, mount);
