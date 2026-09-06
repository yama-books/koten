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
import { planReviewQuestions } from './domain/review.ts';
import type { PublishedQuestion } from './data/question-schema.ts';
import type { Poem } from './data/schema.ts';
import type { UserSettings } from '@koten/shared/domain/event';
import type { AnswerMode } from './ui/screens/RangePicker.tsx';
import './styles.css';

const defaultPort = createIndexedDbPort();
const defaults: UserSettings = { key: 'user', reading: 'no-ruby', writing: 'vertical', order: 'number', soundEnabled: false, noticeConfirmed: false };

type Selection = {
  entry: EntryId;
  range: { from: number; to: number };
  questions: PublishedQuestion[];
  poems: Poem[];
  answerMode: AnswerMode;
  planned?: PublishedQuestion[];
  session?: LearningSession;
  /** 再確認へ入る前の入口。「同じ範囲をもう一度」を再確認の全問題出題へ戻さないために持つ。 */
  origin?: Readonly<{ entry: EntryId; answerMode: AnswerMode }>;
};

export function App({ port = defaultPort }: { port?: ApplicationPort } = {}) {
  const [screen, setScreen] = useState<'home' | 'picker' | 'session' | 'review-error' | 'result-loading' | 'result' | 'history-loading' | 'history'>('home');
  const [selected, setSelected] = useState<Selection | null>(null);
  const [settings, setSettings] = useState(defaults);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [history, setHistory] = useState<HistorySummary | null>(null);
  const [saveFailure, setSaveFailure] = useState(false);

  function startPlanned(input: { session: LearningSession; cardNumbers: readonly number[]; questions: PublishedQuestion[]; poems: Poem[]; answerMode?: AnswerMode }) {
    const planned = planQuestions(input.session.entry, input.questions, input.cardNumbers, input.session.seed ?? '', input.session.order);
    setSelected((current) => current ? { ...current, entry: input.session.entry, range: { from: input.session.from, to: input.session.to }, questions: input.questions, poems: input.poems, answerMode: input.answerMode ?? current.answerMode, planned, session: input.session } : { entry: input.session.entry, range: { from: input.session.from, to: input.session.to }, questions: input.questions, poems: input.poems, answerMode: input.answerMode ?? 'screen', planned, session: input.session });
    setScreen('session');
  }

  function newSession(input: { entry: EntryId; range: { from: number; to: number }; order: UserSettings['order']; seed: string; cardNumbers: readonly number[]; questions: PublishedQuestion[] }) {
    const questionCount = planQuestions(input.entry, input.questions, input.cardNumbers, input.seed, input.order).length;
    return createSession({ sessionId: crypto.randomUUID(), range: input.range, entry: input.entry, order: input.order, seed: input.seed, startedOn: new Date().toISOString().slice(0, 10), questionCount });
  }

  async function startNew(entry: EntryId, range: { from: number; to: number }, order: UserSettings['order'], questions: PublishedQuestion[], poems: Poem[], answerMode: AnswerMode) {
    const plan = planResume(range, await port.listEvents());
    const seed = createSeed(Math.random);
    const session = newSession({ entry, range, order, seed, cardNumbers: plan.cardNumbers, questions });
    void port.saveSession(session);
    startPlanned({ session, cardNumbers: plan.cardNumbers, questions, poems, answerMode });
  }

  function startReview(questionIds: readonly string[]) {
    if (!selected) return;
    const planned = planReviewQuestions(selected.questions, questionIds);
    if (!planned) { setScreen('review-error'); return; }
    const session = createSession({ sessionId: crypto.randomUUID(), range: selected.range, entry: 'review', order: selected.session?.order ?? settings.order, seed: createSeed(Math.random), startedOn: new Date().toISOString().slice(0, 10), questionCount: planned.length });
    setSelected({ ...selected, entry: 'review', answerMode: 'screen', planned, session, origin: selected.origin ?? { entry: selected.entry, answerMode: selected.answerMode } });
    setScreen('session');
  }

  if (screen === 'picker' && selected) return <RangePicker entry={selected.entry} range={selected.range} order={settings.order} onBack={() => setScreen('home')} onStart={(range, order, answerMode) => {
    void startNew(selected.entry, range, order, selected.questions, selected.poems, answerMode);
    setSettings({ ...settings, order });
  }} />;
  if (screen === 'session' && selected?.planned && selected.session) {
    const session = selected.session;
    return <Session questions={selected.planned} poems={selected.poems} entry={selected.entry} answerMode={selected.answerMode} sessionId={session.sessionId} port={port} settings={settings} onSettings={setSettings} onBack={() => setScreen('home')} onComplete={async (outcomes) => {
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
  if (screen === 'review-error') return <main class="session"><p role="alert">この問題は表示できません。ホームに戻ってやり直してください。</p><button type="button" onClick={() => setScreen('home')}>ホームへ戻る</button></main>;
  if (screen === 'history-loading') return <main class="loading" aria-live="polite">記録を読み込んでいます。</main>;
  if (screen === 'history' && history) return <History summary={history} onHome={() => setScreen('home')} port={port} />;
  if (screen === 'result' && result && selected) return <><>{saveFailure && <p class="result-save-failure" role="alert">保存に失敗しました。結果は表示しています。</p>}</><Result result={result} onRetryWeak={startReview} onRetrySame={() => {
    const origin = selected.origin ?? { entry: selected.entry, answerMode: selected.answerMode };
    void startNew(origin.entry, selected.range, settings.order, selected.questions, selected.poems, origin.answerMode);
  }} onHome={() => setScreen('home')} /></>;
  return <Home port={port} onQuickStart={(range, questions, poems) => { setSettings({ ...settings, reading: 'no-ruby' }); void startNew('learn', range, 'number', questions, poems, 'screen'); }} onPickEntry={(entry, range, questions, poems) => { setSelected({ entry, range, questions, poems, answerMode: 'screen' }); setScreen('picker'); }} onResume={(session, cardNumbers, questions, poems) => startPlanned({ session, cardNumbers, questions, poems, answerMode: 'screen' })} onOpenHistory={() => { setScreen('history-loading'); void port.listEvents().then((events) => { setHistory(summarizeHistory({ events, poemIds: Array.from({ length: 100 }, (_, index) => `p${String(index + 1).padStart(3, '0')}`) })); setScreen('history'); }); }} />;
}

const mount = document.getElementById('app');
if (mount) render(<ErrorBoundary><App /></ErrorBoundary>, mount);
