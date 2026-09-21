import { render } from 'preact';
import { ErrorBoundary } from '@koten/shared/error-boundary';
import { useEffect, useState } from 'preact/hooks';
import '../../shared/src/styles/tokens.css';
import { Home } from './ui/screens/Home.tsx';
import { RangePicker } from './ui/screens/RangePicker.tsx';
import { Session } from './ui/screens/Session.tsx';
import { Result } from './ui/screens/Result.tsx';
import { History } from './ui/screens/History.tsx';
import { SyncSettings } from './ui/screens/SyncSettings.tsx';
import { startSync, type SyncStatus } from './sync/runtime.ts';
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
import { answeredFrom, rangeAutoRung, planQuestions, progressFrom, type EntryId, type RungAdjust, type RungProgress } from './domain/entry.ts';
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
  /**
   * 歌ごとの段の進み具合（発注086）。**出題画面へも渡す**——記録に残す段と
   * 「手で上げた」印をここから作る。読み直すと記録を二度読むことになる。
   */
  progress?: RungProgress;
  /** 段の天井の判定に使う項目別得点（2026-09-15）。**進み具合と同じものを出題画面へも渡す。** */
  masteryScores?: Readonly<Record<string, number>>;
  /** 再確認へ入る前の入口。「同じ範囲をもう一度」を再確認の全問題出題へ戻さないために持つ。 */
  origin?: Readonly<{ entry: EntryId; answerMode: AnswerMode }>;
};

export function App({ port = defaultPort }: { port?: ApplicationPort } = {}) {
  const [screen, setScreen] = useState<'home' | 'sync' | 'picker' | 'session' | 'review-error' | 'result-loading' | 'result' | 'history-loading' | 'history'>(new URL(window.location.href).searchParams.has('join') ? 'sync' : 'home');
  const [selected, setSelected] = useState<Selection | null>(null);
  // **設定の出所は保存領域ひとつである。** ここで既定値を持つと、`Home` が読み込んだ設定を
  // 知らないまま `Session` へ配り、出題中の設定変更が古い値ごと保存領域へ書き戻される
  // （発注074 工程1：学年と「確認済み」の印が消える）。読み込みは `Home` から受け取る。
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | 'off'>('off');
  const [result, setResult] = useState<SessionResult | null>(null);
  const [history, setHistory] = useState<HistorySummary | null>(null);
  const [historyInitialTab, setHistoryInitialTab] = useState<'一覧' | 'データ管理'>('一覧');
  const [syncReturn, setSyncReturn] = useState<'home' | 'history'>('home');
  const [saveFailure, setSaveFailure] = useState(false);

  // 統計は「終わった日」だけを送る。起動時に1度だけ試み、失敗は送信待ちへ回す。
  // **画面には何も出さない**——通信の失敗で学習を妨げない（APP_SPEC §11）。
  // 順序が要る。**先に古い日を読んで送り、そのあと今日の分を数え始める**——
  // 逆にすると、まだ送っていない前日の数を今日として数え直してしまう。
  useEffect(() => {
    void flushStats(port).then(() => port.countUi?.('pageViews', new Date().toISOString().slice(0, 10)));
  }, [port]);

  useEffect(() => {
    if (!appConfig.features.sync || !settings?.syncEnabled || !settings.syncCode) {
      setSyncStatus('off');
      // 同期していない端末では送信待ちを溜めない。保存の口は同期の有無を知らないまま 1 件積むためである。
      // `settings` が null の間は「同期しているか」がまだ分からないので捨てない。
      if (settings) void port.clearSyncQueue?.();
      return;
    }
    return startSync(settings, port, setSettings, setSyncStatus);
    // `settings === null` も依存に要る。`syncEnabled` を持たない設定では
    // 読み込み前後でどちらも undefined になり、読み終えたことを依存の変化として拾えない。
  }, [port, settings === null, settings?.syncEnabled, settings?.syncCode]);

  async function saveSyncSettings(next: UserSettings): Promise<boolean> {
    const saved = await port.saveSettings(next);
    if ('reason' in saved) return false;
    setSettings(next);
    return true;
  }

  // 記録は取り込みと削除で変わる。集計を 1 か所に置き、開くときと読み直すときで同じ形を使う。
  const historyPoemIds = Array.from({ length: 100 }, (_, index) => `p${String(index + 1).padStart(3, '0')}`);
  // **目録も渡す。** 完全制覇は段8 の制覇で決まり、段はイベントではなく問題が持つ。
  // 記録を開いたときに受け取った目録を覚えておく——読み直しでも同じものを使う。
  const [catalogue, setCatalogue] = useState<PublishedQuestion[]>([]);
  // **歌も覚えておく。** 一覧に初句を出すのに要る。目録と同じ理由で、
  // 開いたときに受け取ったものを読み直しでも使う。
  const [historyPoems, setHistoryPoems] = useState<Poem[]>([]);
  useEffect(() => {
    if (screen !== 'history') return;
    const update = () => { void port.listEvents().then((events) => setHistory(summarizeHistory({ events, poemIds: historyPoemIds, questions: catalogue, poems: historyPoems }))); };
    window.addEventListener('koten:remote-records', update);
    return () => window.removeEventListener('koten:remote-records', update);
  }, [screen, port, catalogue, historyPoems]);
  const summarize = (events: Awaited<ReturnType<typeof port.listEvents>>, questions: PublishedQuestion[] = catalogue, poems: Poem[] = historyPoems) => summarizeHistory({ events, poemIds: historyPoemIds, questions, poems });
  /** 記録が変わったあとの読み直し。画面は切り替えない。 */
  function reloadHistory() {
    void port.listEvents().then((events) => setHistory(summarize(events)));
  }

  /**
   * 出題方式は習熟度で決まる（発注081）。**得点は呼び出し側が渡す。**
   * ここで読み直すと、開始のたびに記録を二度読み、画面の切り替えが 1 拍遅れる。
   * どちらの入口も既にイベントを読んでいるので、その場で計算した値をそのまま渡す。
   */
  function startPlanned(input: { session: LearningSession; cardNumbers: readonly number[]; questions: PublishedQuestion[]; poems: Poem[]; answerMode?: AnswerMode; includeAuthors?: boolean; masteryScores: Readonly<Record<string, number>>; progress?: RungProgress; rungAdjust?: RungAdjust; answered?: ReadonlySet<string> }) {
    const planned = planQuestions(input.session.entry, input.questions, input.cardNumbers, input.session.seed ?? '', input.session.order, input.includeAuthors, input.masteryScores, input.progress, input.rungAdjust, input.answered);
    setSelected((current) => current ? { ...current, entry: input.session.entry, range: { from: input.session.from, to: input.session.to }, questions: input.questions, poems: input.poems, answerMode: input.answerMode ?? current.answerMode, planned, session: input.session, progress: input.progress, masteryScores: input.masteryScores } : { entry: input.session.entry, range: { from: input.session.from, to: input.session.to }, questions: input.questions, poems: input.poems, answerMode: input.answerMode ?? 'screen', planned, session: input.session, progress: input.progress, masteryScores: input.masteryScores });
    setScreen('session');
  }

  function newSession(input: { entry: EntryId; range: { from: number; to: number }; order: UserSettings['order']; seed: string; cardNumbers: readonly number[]; questions: PublishedQuestion[]; includeAuthors?: boolean; masteryScores: Readonly<Record<string, number>>; progress?: RungProgress; rungAdjust?: RungAdjust; answered?: ReadonlySet<string> }) {
    const questionCount = planQuestions(input.entry, input.questions, input.cardNumbers, input.seed, input.order, input.includeAuthors, input.masteryScores, input.progress, input.rungAdjust, input.answered).length;
    return createSession({ sessionId: crypto.randomUUID(), range: input.range, entry: input.entry, order: input.order, seed: input.seed, startedOn: new Date().toISOString().slice(0, 10), questionCount });
  }

  /**
   * **その回かぎりの手動調整（`rungAdjust`）は引数で受ける**（発注086・§4.2）。
   * 設定へ書き込まない——書き込むと次に始めたときも下がったままになり、
   * すでに天井へ達した段を延々と練習することになる（加算が 0 のまま）。
   */
  async function startNew(entry: EntryId, range: { from: number; to: number }, order: UserSettings['order'], questions: PublishedQuestion[], poems: Poem[], answerMode: AnswerMode, includeAuthors = true, rungAdjust: RungAdjust = 0) {
    const events = await port.listEvents();
    const plan = planResume(range, events);
    const seed = createSeed(Math.random);
    // **同じ得点を問題数の計算と計画の両方へ渡す。** 別々に取ると内訳と「全何問」が食い違う。
    const masteryScores = computeMastery(events).scores;
    // **同じ進み具合を問題数の計算と計画の両方へ渡す。** 別々に取ると内訳と「全何問」が食い違う。
    const progress = progressFrom(events, questions);
    /*
     * **同じ段の中をまんべんなく回す**（依頼者・2026-09-15）。制覇＝その段を全部一度は正解する、
     * なので同じ句ばかり出ると段が上がらない。**問題数の計算と計画へ同じものを渡す。**
     *
     * **復元（`onResume`）へは渡さない。** 復元は保存した種から同じ並びを作り直す経路であり、
     * 解いた数で選び方が変わると、中断前と違う問題が出る。
     */
    const answered = answeredFrom(events);
    const session = newSession({ entry, range, order, seed, cardNumbers: plan.cardNumbers, questions, includeAuthors, masteryScores, progress, rungAdjust, answered });
    void port.saveSession(session);
    startPlanned({ session, cardNumbers: plan.cardNumbers, questions, poems, answerMode, includeAuthors, masteryScores, progress, rungAdjust, answered });
  }

  function startReview(questionIds: readonly string[]) {
    if (!selected) return;
    const planned = planReviewQuestions(selected.questions, questionIds);
    if (!planned) { setScreen('review-error'); return; }
    const session = createSession({ sessionId: crypto.randomUUID(), range: selected.range, entry: 'review', order: selected.session?.order ?? settings?.order ?? 'number', seed: createSeed(Math.random), startedOn: new Date().toISOString().slice(0, 10), questionCount: planned.length });
    setSelected({ ...selected, entry: 'review', answerMode: 'screen', planned, session, origin: selected.origin ?? { entry: selected.entry, answerMode: selected.answerMode } });
    setScreen('session');
  }

  /**
   * 範囲選択の画面に出す自動の位置（発注086）。**読めるまで渡さない**——
   * 既定値で描くと、記録を読む前に「いまは段3」と言ってしまい、それが嘘になる。
   */
  // **画面には出さない**（依頼者・2026-09-15）。段は歌ごとに決まるので、範囲に 1 つの段を
  // 名乗ると実際の出題と食い違う。ボタンを押せるかどうかの判定にだけ使う。
  const [pickerAutoRung, setPickerAutoRung] = useState<number | undefined>(undefined);
  function openPicker(entry: EntryId, range: { from: number; to: number }, questions: PublishedQuestion[], poems: Poem[]) {
    setSelected({ entry, range, questions, poems, answerMode: 'screen' });
    setPickerAutoRung(undefined);
    setScreen('picker');
    void port.listEvents().then((events) => setPickerAutoRung(rangeAutoRung(range, progressFrom(events, questions), computeMastery(events).scores)));
  }

  function openHistory(questions: PublishedQuestion[], poems: Poem[], initialTab: '一覧' | 'データ管理') {
    port.countUi?.('history', new Date().toISOString().slice(0, 10));
    setHistoryInitialTab(initialTab);
    setCatalogue(questions);
    setHistoryPoems(poems);
    setScreen('history-loading');
    void port.listEvents().then((events) => { setHistory(summarize(events, questions, poems)); setScreen('history'); });
  }
  const homeScreen = () => <Home port={port} onSettings={setSettings} syncedSettings={settings} onOpenSync={() => { setSyncReturn('home'); setScreen('sync'); }} onQuickStart={(range, questions, poems) => { setSettings((current) => current ? { ...current, reading: 'no-ruby' } : current); void startNew('quick', range, 'number', questions, poems, 'screen'); }} onPickEntry={(entry, range, questions, poems) => openPicker(entry, range, questions, poems ?? [])} onResume={(session, cardNumbers, questions, poems, masteryScores, progress) => startPlanned({ session, cardNumbers, questions, poems, answerMode: 'screen', masteryScores, progress })} onOpenHistory={(questions, poems) => openHistory(questions, poems, '一覧')} />;
  // 設定を読むのはホームである。**読み込みが済むまで他の画面へ渡さない**——
  // 既定値のまま渡すと、そこからの保存が保存済みの学年を消す（発注074 工程1）。
  if (!settings) return homeScreen();
  if (screen === 'sync') return <SyncSettings settings={settings} status={syncStatus} onChange={saveSyncSettings} backLabel={syncReturn === 'history' ? 'データ管理へ戻る' : 'ホームへ戻る'} onBack={() => setScreen(syncReturn === 'history' && history ? 'history' : 'home')} />;
  if (screen === 'picker' && selected) return <RangePicker entry={selected.entry} range={selected.range} order={settings.order} autoRung={pickerAutoRung} onBack={() => setScreen('home')} onStart={(range, order, answerMode, includeAuthors, rungAdjust) => {
    void startNew(selected.entry, range, order, selected.questions, selected.poems, answerMode, includeAuthors, rungAdjust);
    setSettings({ ...settings, order });
  }} />;
  if (screen === 'session' && selected?.planned && selected.session) {
    const session = selected.session;
    return <Session questions={selected.planned} progress={selected.progress} masteryScores={selected.masteryScores} poems={selected.poems} entry={selected.entry} answerMode={selected.answerMode} sessionId={session.sessionId} port={port} settings={settings} onSettings={setSettings} onBack={() => setScreen('home')} onComplete={async (outcomes) => {
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
  if (screen === 'history' && history) return <History summary={history} onHome={() => setScreen('home')} port={port} onChanged={reloadHistory} initialTab={historyInitialTab} onOpenSync={appConfig.features.sync ? () => { setHistoryInitialTab('データ管理'); setSyncReturn('history'); setScreen('sync'); } : undefined} syncEnabled={settings.syncEnabled} />;
  if (screen === 'result' && result && selected) {
    // 結果に残った問題でも、壊れた穴埋めは再確認画面を作れない。押すと必ず失敗する
    // 導線を出さず、作者問題は既存の選択式 UI で再確認へ通す（発注074 工程16）。
    const retryQuestionIds = result.retryQuestionIds.filter((questionId) => planReviewQuestions(selected.questions, [questionId]) !== null);
    return <><>{saveFailure && <p class="result-save-failure" role="alert">保存に失敗しました。結果は表示しています。</p>}</><Result result={{ ...result, retryQuestionIds }} poems={selected.poems} onRetryWeak={startReview} onRetrySame={() => {
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
