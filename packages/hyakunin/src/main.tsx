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
import { computeMastery } from '@koten/shared/domain/mastery/compute';
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
  // **設定の出所は保存領域ひとつである。** ここで既定値を持つと、`Home` が読み込んだ設定を
  // 知らないまま `Session` へ配り、出題中の設定変更が古い値ごと保存領域へ書き戻される
  // （発注074 工程1：学年と「確認済み」の印が消える）。読み込みは `Home` から受け取る。
  const [settings, setSettings] = useState<UserSettings | null>(null);
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

  /**
   * 出題方式は習熟度で決まる（発注081）。**得点は呼び出し側が渡す。**
   * ここで読み直すと、開始のたびに記録を二度読み、画面の切り替えが 1 拍遅れる。
   * どちらの入口も既にイベントを読んでいるので、その場で計算した値をそのまま渡す。
   */
  function startPlanned(input: { session: LearningSession; cardNumbers: readonly number[]; questions: PublishedQuestion[]; poems: Poem[]; answerMode?: AnswerMode; includeAuthors?: boolean; masteryScores: Readonly<Record<string, number>> }) {
    const planned = planQuestions(input.session.entry, input.questions, input.cardNumbers, input.session.seed ?? '', input.session.order, input.includeAuthors, input.masteryScores);
    setSelected((current) => current ? { ...current, entry: input.session.entry, range: { from: input.session.from, to: input.session.to }, questions: input.questions, poems: input.poems, answerMode: input.answerMode ?? current.answerMode, planned, session: input.session } : { entry: input.session.entry, range: { from: input.session.from, to: input.session.to }, questions: input.questions, poems: input.poems, answerMode: input.answerMode ?? 'screen', planned, session: input.session });
    setScreen('session');
  }

  function newSession(input: { entry: EntryId; range: { from: number; to: number }; order: UserSettings['order']; seed: string; cardNumbers: readonly number[]; questions: PublishedQuestion[]; includeAuthors?: boolean; masteryScores: Readonly<Record<string, number>> }) {
    const questionCount = planQuestions(input.entry, input.questions, input.cardNumbers, input.seed, input.order, input.includeAuthors, input.masteryScores).length;
    return createSession({ sessionId: crypto.randomUUID(), range: input.range, entry: input.entry, order: input.order, seed: input.seed, startedOn: new Date().toISOString().slice(0, 10), questionCount });
  }

  async function startNew(entry: EntryId, range: { from: number; to: number }, order: UserSettings['order'], questions: PublishedQuestion[], poems: Poem[], answerMode: AnswerMode, includeAuthors = true) {
    const events = await port.listEvents();
    const plan = planResume(range, events);
    const seed = createSeed(Math.random);
    // **同じ得点を問題数の計算と計画の両方へ渡す。** 別々に取ると内訳と「全何問」が食い違う。
    const masteryScores = computeMastery(events).scores;
    const session = newSession({ entry, range, order, seed, cardNumbers: plan.cardNumbers, questions, includeAuthors, masteryScores });
    void port.saveSession(session);
    startPlanned({ session, cardNumbers: plan.cardNumbers, questions, poems, answerMode, includeAuthors, masteryScores });
  }

  function startReview(questionIds: readonly string[]) {
    if (!selected) return;
    const planned = planReviewQuestions(selected.questions, questionIds);
    if (!planned) { setScreen('review-error'); return; }
    const session = createSession({ sessionId: crypto.randomUUID(), range: selected.range, entry: 'review', order: selected.session?.order ?? settings?.order ?? 'number', seed: createSeed(Math.random), startedOn: new Date().toISOString().slice(0, 10), questionCount: planned.length });
    setSelected({ ...selected, entry: 'review', answerMode: 'screen', planned, session, origin: selected.origin ?? { entry: selected.entry, answerMode: selected.answerMode } });
    setScreen('session');
  }

  const homeScreen = () => <Home port={port} onSettings={setSettings} onQuickStart={(range, questions, poems) => { setSettings((current) => current ? { ...current, reading: 'no-ruby' } : current); void startNew('quick', range, 'number', questions, poems, 'screen'); }} onPickEntry={(entry, range, questions, poems) => { setSelected({ entry, range, questions, poems, answerMode: 'screen' }); setScreen('picker'); }} onResume={(session, cardNumbers, questions, poems, masteryScores) => startPlanned({ session, cardNumbers, questions, poems, answerMode: 'screen', masteryScores })} onOpenHistory={() => { port.countUi?.('history', new Date().toISOString().slice(0, 10)); setScreen('history-loading'); void port.listEvents().then((events) => { setHistory(summarize(events)); setScreen('history'); }); }} />;
  // 設定を読むのはホームである。**読み込みが済むまで他の画面へ渡さない**——
  // 既定値のまま渡すと、そこからの保存が保存済みの学年を消す（発注074 工程1）。
  if (!settings) return homeScreen();
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
  if (screen === 'result' && result && selected) {
    // 結果に残った問題でも、壊れた穴埋めは再確認画面を作れない。押すと必ず失敗する
    // 導線を出さず、作者問題は既存の選択式 UI で再確認へ通す（発注074 工程16）。
    const retryQuestionIds = result.retryQuestionIds.filter((questionId) => planReviewQuestions(selected.questions, [questionId]) !== null);
    return <><>{saveFailure && <p class="result-save-failure" role="alert">保存に失敗しました。結果は表示しています。</p>}</><Result result={{ ...result, retryQuestionIds }} onRetryWeak={startReview} onRetrySame={() => {
    const origin = selected.origin ?? { entry: selected.entry, answerMode: selected.answerMode };
    void startNew(origin.entry, selected.range, settings.order, selected.questions, selected.poems, origin.answerMode);
    }} onHome={() => setScreen('home')} /></>;
  }
  return homeScreen();
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
