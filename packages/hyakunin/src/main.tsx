import { render } from 'preact';
import { ErrorBoundary } from '@koten/shared/error-boundary';
import { useEffect, useState } from 'preact/hooks';
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
import { canSendStats, finishedDay, STATS_COLLECTION_ENABLED, summarizeDailyStats } from './domain/stats.ts';
import { buildStatsPayload, expiresAtFrom } from '@koten/shared/telemetry/aggregate';
import { selectOutbox } from '@koten/shared/telemetry/queue';
import { createClientNumber, isClientNumber } from '@koten/shared/telemetry/client-number';
import { sendStats, createHttpSend } from './telemetry/stats-sender.ts';
import { appConfig } from '@koten/shared/app-config';
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

  // 統計は「終わった日」だけを送る。起動時に1度だけ試み、失敗は送信待ちへ回す。
  // **画面には何も出さない**——通信の失敗で学習を妨げない（APP_SPEC §11）。
  // 順序が要る。**先に古い日を読んで送り、そのあと今日の分を数え始める**——
  // 逆にすると、まだ送っていない前日の数を今日として数え直してしまう。
  useEffect(() => {
    void flushStats(port).then(() => port.countUi?.('pageViews', new Date().toISOString().slice(0, 10)));
  }, [port]);

  // 記録は取り込みと削除で変わる。集計を 1 か所に置き、開くときと読み直すときで同じ形を使う。
  const historyPoemIds = Array.from({ length: 100 }, (_, index) => `p${String(index + 1).padStart(3, '0')}`);
  const summarize = (events: Awaited<ReturnType<typeof port.listEvents>>) => summarizeHistory({ events, poemIds: historyPoemIds });
  /** 記録が変わったあとの読み直し。画面は切り替えない。 */
  function reloadHistory() {
    void port.listEvents().then((events) => setHistory(summarize(events)));
  }

  function startPlanned(input: { session: LearningSession; cardNumbers: readonly number[]; questions: PublishedQuestion[]; poems: Poem[]; answerMode?: AnswerMode; includeAuthors?: boolean }) {
    const planned = planQuestions(input.session.entry, input.questions, input.cardNumbers, input.session.seed ?? '', input.session.order, input.includeAuthors);
    setSelected((current) => current ? { ...current, entry: input.session.entry, range: { from: input.session.from, to: input.session.to }, questions: input.questions, poems: input.poems, answerMode: input.answerMode ?? current.answerMode, planned, session: input.session } : { entry: input.session.entry, range: { from: input.session.from, to: input.session.to }, questions: input.questions, poems: input.poems, answerMode: input.answerMode ?? 'screen', planned, session: input.session });
    setScreen('session');
  }

  function newSession(input: { entry: EntryId; range: { from: number; to: number }; order: UserSettings['order']; seed: string; cardNumbers: readonly number[]; questions: PublishedQuestion[]; includeAuthors?: boolean }) {
    const questionCount = planQuestions(input.entry, input.questions, input.cardNumbers, input.seed, input.order, input.includeAuthors).length;
    return createSession({ sessionId: crypto.randomUUID(), range: input.range, entry: input.entry, order: input.order, seed: input.seed, startedOn: new Date().toISOString().slice(0, 10), questionCount });
  }

  async function startNew(entry: EntryId, range: { from: number; to: number }, order: UserSettings['order'], questions: PublishedQuestion[], poems: Poem[], answerMode: AnswerMode, includeAuthors = true) {
    const plan = planResume(range, await port.listEvents());
    const seed = createSeed(Math.random);
    const session = newSession({ entry, range, order, seed, cardNumbers: plan.cardNumbers, questions, includeAuthors });
    void port.saveSession(session);
    startPlanned({ session, cardNumbers: plan.cardNumbers, questions, poems, answerMode, includeAuthors });
  }

  function startReview(questionIds: readonly string[]) {
    if (!selected) return;
    const planned = planReviewQuestions(selected.questions, questionIds);
    if (!planned) { setScreen('review-error'); return; }
    const session = createSession({ sessionId: crypto.randomUUID(), range: selected.range, entry: 'review', order: selected.session?.order ?? settings.order, seed: createSeed(Math.random), startedOn: new Date().toISOString().slice(0, 10), questionCount: planned.length });
    setSelected({ ...selected, entry: 'review', answerMode: 'screen', planned, session, origin: selected.origin ?? { entry: selected.entry, answerMode: selected.answerMode } });
    setScreen('session');
  }

  if (screen === 'picker' && selected) return <RangePicker entry={selected.entry} range={selected.range} order={settings.order} onBack={() => setScreen('home')} onStart={(range, order, answerMode, includeAuthors) => {
    void startNew(selected.entry, range, order, selected.questions, selected.poems, answerMode, includeAuthors);
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
  if (screen === 'history' && history) return <History summary={history} onHome={() => setScreen('home')} port={port} onChanged={reloadHistory} />;
  if (screen === 'result' && result && selected) return <><>{saveFailure && <p class="result-save-failure" role="alert">保存に失敗しました。結果は表示しています。</p>}</><Result result={result} onRetryWeak={startReview} onRetrySame={() => {
    const origin = selected.origin ?? { entry: selected.entry, answerMode: selected.answerMode };
    void startNew(origin.entry, selected.range, settings.order, selected.questions, selected.poems, origin.answerMode);
  }} onHome={() => setScreen('home')} /></>;
  return <Home port={port} onQuickStart={(range, questions, poems) => { setSettings({ ...settings, reading: 'no-ruby' }); void startNew('quick', range, 'number', questions, poems, 'screen'); }} onPickEntry={(entry, range, questions, poems) => { setSelected({ entry, range, questions, poems, answerMode: 'screen' }); setScreen('picker'); }} onResume={(session, cardNumbers, questions, poems) => startPlanned({ session, cardNumbers, questions, poems, answerMode: 'screen' })} onOpenHistory={() => { port.countUi?.('history', new Date().toISOString().slice(0, 10)); setScreen('history-loading'); void port.listEvents().then((events) => { setHistory(summarize(events)); setScreen('history'); }); }} />;
}

/**
 * 利用番号を**同じ端末で使い続ける**（APP_SPEC §11）。
 * 毎回作り直すと、日ごとに別人として数えられ、**反復利用も匿名利用番号数も測れなくなる。**
 * 保存に無いときだけ作り、そのまま設定へ書き戻す。氏名・端末情報からは作らない。
 */
async function keepClientNumber(port: ApplicationPort, settings: UserSettings | null): Promise<string> {
  if (settings?.deviceId !== undefined && isClientNumber(settings.deviceId)) return settings.deviceId;
  const created = createClientNumber((length) => crypto.getRandomValues(new Uint8Array(length)));
  if (settings !== null) await port.saveSettings({ ...settings, deviceId: created });
  return created;
}

/**
 * 終わった日の統計を送る。**例外を投げない。** 送れなければ送信待ちへ残し、次の起動で再び試す。
 * 保持期間を過ぎた送信待ちは捨てる（`selectOutbox`）。
 */
export async function flushStats(port: ApplicationPort): Promise<void> {
  try {
    if (!STATS_COLLECTION_ENABLED) return;
    if (!canSendStats(await port.loadSettings())) return;
    const today = new Date().toISOString().slice(0, 10);
    const send = createHttpSend();

    const finished = finishedDay(port.rawUiCounters?.(), today);
    if (finished && port.listSessionsAll && port.listReportsAll) {
      const [events, sessions, reports, settings] = await Promise.all([port.listEvents(), port.listSessionsAll(), port.listReportsAll(), port.loadSettings()]);
      const poemIds = Array.from({ length: 100 }, (_, index) => `p${String(index + 1).padStart(3, '0')}`);
      const facts = summarizeDailyStats({ localDate: finished.localDate, events, sessions, reports, poemIds });
      const payload = buildStatsPayload({
        clientNumber: await keepClientNumber(port, settings),
        localDate: finished.localDate, product: 'hyakunin', grade: settings?.grade ?? '',
        counters: finished, appVersion: appConfig.appVersion, dataVersion: appConfig.dataVersion,
        expiresAt: expiresAtFrom(finished.localDate),
      }, facts);
      const result = await sendStats({ payload, allowed: true, send });
      if (result === 'retry' && port.enqueueStats) {
        await port.enqueueStats({ outboxId: crypto.randomUUID(), kind: 'stats', payload: payload as unknown as Record<string, unknown>, createdOn: finished.localDate });
      }
    }

    if (!port.listStats || !port.removeStats) return;
    const { send: pending, drop } = selectOutbox([...(await port.listStats())], today);
    for (const item of drop) await port.removeStats(item.outboxId);
    for (const item of pending) {
      if (item.kind !== 'stats') continue;
      if ((await sendStats({ payload: item.payload, allowed: true, send })) === 'sent') await port.removeStats(item.outboxId);
    }
  } catch {
    // 統計の都合で学習を止めない。
  }
}

const mount = document.getElementById('app');
if (mount) render(<ErrorBoundary><App /></ErrorBoundary>, mount);
