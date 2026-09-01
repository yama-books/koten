import { render } from 'preact';
import { ErrorBoundary } from '@koten/shared/error-boundary';
import { useState } from 'preact/hooks';
import '../../shared/src/styles/tokens.css';
import { Home } from './ui/screens/Home.tsx';
import { RangePicker } from './ui/screens/RangePicker.tsx';
import { Session } from './ui/screens/Session.tsx';
import { createIndexedDbPort } from './ui/adapters/indexeddb-port.ts';
import { createSession } from './domain/session.ts';
import { createSeed } from './domain/order.ts';
import { planQuestions, type EntryId } from './domain/entry.ts';
import type { PublishedQuestion } from './data/question-schema.ts';
import type { UserSettings } from '@koten/shared/domain/event';
import './styles.css';

const port = createIndexedDbPort();
const defaults: UserSettings = { key: 'user', reading: 'no-ruby', writing: 'vertical', order: 'number', soundEnabled: false, noticeConfirmed: false };

function App() {
  const [screen, setScreen] = useState<'home' | 'picker' | 'session'>('home');
  const [selected, setSelected] = useState<{ entry: EntryId; range: { from: number; to: number }; questions: PublishedQuestion[] } | null>(null);
  const [settings, setSettings] = useState(defaults);
  if (screen === 'picker' && selected) return <RangePicker entry={selected.entry} range={selected.range} order={settings.order} onBack={() => setScreen('home')} onStart={(range, order) => { setSelected({ ...selected, range }); setSettings({ ...settings, order }); setScreen('session'); }} />;
  if (screen === 'session' && selected) {
    const planned = planQuestions(selected.entry, selected.questions, Array.from({ length: selected.range.to - selected.range.from + 1 }, (_, index) => selected.range.from + index), 'session-seed', settings.order);
    const sessionId = crypto.randomUUID();
    void port.saveSession(createSession({ sessionId, range: selected.range, entry: selected.entry, order: settings.order, seed: createSeed(Math.random), startedOn: new Date().toISOString().slice(0, 10), questionCount: planned.length }));
    return <Session questions={planned} sessionId={sessionId} port={port} settings={settings} onSettings={setSettings} onComplete={() => setScreen('home')} />;
  }
  return <Home port={port} onPickEntry={(entry, range, questions) => { setSelected({ entry, range, questions }); setScreen('picker'); }} />;
}

render(<ErrorBoundary><App /></ErrorBoundary>, document.getElementById('app')!);
