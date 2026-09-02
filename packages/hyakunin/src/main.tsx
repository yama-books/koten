import { render } from 'preact';
import { ErrorBoundary } from '@koten/shared/error-boundary';
import { useState } from 'preact/hooks';
import '../../shared/src/styles/tokens.css';
import { Home } from './ui/screens/Home.tsx';
import { RangePicker } from './ui/screens/RangePicker.tsx';
import { Session } from './ui/screens/Session.tsx';
import { Result } from './ui/screens/Result.tsx';
import { createIndexedDbPort } from './ui/adapters/indexeddb-port.ts';
import type { ApplicationPort } from './ui/adapters/indexeddb-port.ts';
import { completeSession, createSession } from './domain/session.ts';
import { summarizeSession, type SessionResult } from './domain/result.ts';
import type { Session as LearningSession } from '@koten/shared/domain/event';
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
  session?: LearningSession;
};

export function App({ port = defaultPort }: { port?: ApplicationPort } = {}) {
  const [screen, setScreen] = useState<'home' | 'picker' | 'session' | 'result-loading' | 'result'>('home');
  const [selected, setSelected] = useState<Selection | null>(null);
  const [settings, setSettings] = useState(defaults);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [saveFailure, setSaveFailure] = useState(false);
  if (screen === 'picker' && selected) return <RangePicker entry={selected.entry} range={selected.range} order={settings.order} onBack={() => setScreen('home')} onStart={(range, order) => {
    const seed = createSeed(Math.random);
    const planned = planQuestions(selected.entry, selected.questions, Array.from({ length: range.to - range.from + 1 }, (_, index) => range.from + index), seed, order);
    const sessionId = crypto.randomUUID();
    const session = createSession({ sessionId, range, entry: selected.entry, order, seed, startedOn: new Date().toISOString().slice(0, 10), questionCount: planned.length });
    void port.saveSession(session);
    setSelected({ ...selected, range, planned, session });
    setSettings({ ...settings, order });
    setScreen('session');
  }} />;
  if (screen === 'session' && selected?.planned && selected.session) {
    const session = selected.session;
    return <Session questions={selected.planned} sessionId={session.sessionId} port={port} settings={settings} onSettings={setSettings} onComplete={async (outcomes) => {
    setScreen('result-loading');
    const saved = await port.saveSession(completeSession(session));
    setSaveFailure('reason' in saved);
    const allEvents = await port.listEvents();
    const poemIds = Array.from({ length: selected.range.to - selected.range.from + 1 }, (_, index) => `p${String(selected.range.from + index).padStart(3, '0')}`);
    setResult(summarizeSession({ sessionId: session.sessionId, range: selected.range, outcomes, allEvents, poemIds, today: new Date().toISOString().slice(0, 10) }));
    setScreen('result');
    }} />;
  }
  if (screen === 'result-loading') return <main class="loading" aria-live="polite">結果を読み込んでいます。</main>;
  if (screen === 'result' && result && selected) return <><>{saveFailure && <p class="result-save-failure" role="alert">保存に失敗しました。結果は表示しています。</p>}</><Result result={result} onRetryWeak={(cards) => { setSelected({ ...selected, range: { from: Math.min(...cards), to: Math.max(...cards) } }); setScreen('picker'); }} onRetrySame={() => setScreen('picker')} onHome={() => setScreen('home')} /></>;
  return <Home port={port} onPickEntry={(entry, range, questions) => { setSelected({ entry, range, questions }); setScreen('picker'); }} />;
}

const mount = document.getElementById('app');
if (mount) render(<ErrorBoundary><App /></ErrorBoundary>, mount);
