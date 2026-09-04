import { render } from 'preact';
import { ErrorBoundary } from '@koten/shared/error-boundary';
import { useState } from 'preact/hooks';
import '../../shared/src/styles/tokens.css';
import { Home } from './ui/screens/Home.tsx';
import { RangePicker } from './ui/screens/RangePicker.tsx';
import { Session } from './ui/screens/Session.tsx';
import { Result } from './ui/screens/Result.tsx';
import { History } from './ui/screens/History.tsx';
import { createIndexedDbPort } from './ui/adapters/indexeddb-port.ts';
import type { ApplicationPort } from './ui/adapters/indexeddb-port.ts';
import { completeSession, createSession } from './domain/session.ts';
import { planResume } from './domain/resume.ts';
import { summarizeSession, type SessionResult } from './domain/result.ts';
import { summarizeHistory, type HistorySummary } from './domain/history.ts';
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
  const [screen, setScreen] = useState<'home' | 'picker' | 'session' | 'result-loading' | 'result' | 'history-loading' | 'history'>('home');
  const [selected, setSelected] = useState<Selection | null>(null);
  const [settings, setSettings] = useState(defaults);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [history, setHistory] = useState<HistorySummary | null>(null);
  const [saveFailure, setSaveFailure] = useState(false);

  function startPlanned(input: { session: LearningSession; cardNumbers: readonly number[]; questions: PublishedQuestion[] }) {
    const planned = planQuestions(input.session.entry, input.questions, input.cardNumbers, input.session.seed ?? '', input.session.order);
    setSelected((current) => current ? { ...current, range: { from: input.session.from, to: input.session.to }, questions: input.questions, planned, session: input.session } : { entry: input.session.entry, range: { from: input.session.from, to: input.session.to }, questions: input.questions, planned, session: input.session });
    setScreen('session');
  }

  function newSession(input: { entry: EntryId; range: { from: number; to: number }; order: UserSettings['order']; seed: string; cardNumbers: readonly number[]; questions: PublishedQuestion[] }) {
    const questionCount = planQuestions(input.entry, input.questions, input.cardNumbers, input.seed, input.order).length;
    return createSession({ sessionId: crypto.randomUUID(), range: input.range, entry: input.entry, order: input.order, seed: input.seed, startedOn: new Date().toISOString().slice(0, 10), questionCount });
  }

  async function startNew(entry: EntryId, range: { from: number; to: number }, order: UserSettings['order'], questions: PublishedQuestion[]) {
    const plan = planResume(range, await port.listEvents());
    const seed = createSeed(Math.random);
    const session = newSession({ entry, range, order, seed, cardNumbers: plan.cardNumbers, questions });
    void port.saveSession(session);
    startPlanned({ session, cardNumbers: plan.cardNumbers, questions });
  }

  if (screen === 'picker' && selected) return <RangePicker entry={selected.entry} range={selected.range} order={settings.order} onBack={() => setScreen('home')} onStart={(range, order) => {
    void startNew(selected.entry, range, order, selected.questions);
    setSettings({ ...settings, order });
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
  if (screen === 'history-loading') return <main class="loading" aria-live="polite">記録を読み込んでいます。</main>;
  if (screen === 'history' && history) return <History summary={history} onHome={() => setScreen('home')} />;
  if (screen === 'result' && result && selected) return <><>{saveFailure && <p class="result-save-failure" role="alert">保存に失敗しました。結果は表示しています。</p>}</><Result result={result} onRetryWeak={(cards) => {
    const seed = createSeed(Math.random);
    const session = newSession({ entry: 'review', range: selected.range, order: selected.session?.order ?? settings.order, seed, cardNumbers: cards, questions: selected.questions });
    void port.saveSession(session);
    startPlanned({ session, cardNumbers: cards, questions: selected.questions });
  }} onRetrySame={() => {
    void startNew(selected.entry, selected.range, settings.order, selected.questions);
  }} onHome={() => setScreen('home')} /></>;
  return <Home port={port} onPickEntry={(entry, range, questions) => { setSelected({ entry, range, questions }); setScreen('picker'); }} onResume={(session, cardNumbers, questions) => startPlanned({ session, cardNumbers, questions })} onOpenHistory={() => { setScreen('history-loading'); void port.listEvents().then((events) => { setHistory(summarizeHistory({ events, poemIds: Array.from({ length: 100 }, (_, index) => `p${String(index + 1).padStart(3, '0')}`) })); setScreen('history'); }); }} />;
}

const mount = document.getElementById('app');
if (mount) render(<ErrorBoundary><App /></ErrorBoundary>, mount);
