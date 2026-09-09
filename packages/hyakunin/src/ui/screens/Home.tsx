import { appConfig } from "@koten/shared/app-config";
import { MasteryMeter } from "@koten/shared/mastery-meter";
import type { Session, UserSettings } from "@koten/shared/domain/event";
import { loadJson } from "@koten/shared/data/load";
import { ErrorScreen } from "@koten/shared/error-screen";
import { GradePicker } from "@koten/shared/grade-picker";
import { StatsNotice } from "@koten/shared/stats-notice";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import { parsePoems, type Poem } from "../../data/schema.ts";
import {
  parseQuestions,
  type PublishedQuestion,
} from "../../data/question-schema.ts";
import {
  CHUNK_CARD_COUNT,
  ENTRY_LABELS,
  ENTRY_RULES,
  isEntryAvailable,
  type EntryId,
} from "../../domain/entry.ts";
import { buildViewEvent } from "../../domain/record.ts";
import { STATS_COLLECTION_ENABLED } from "../../domain/stats.ts";
import { normalizeRange, parseRange, splitIntoChunks } from "../../domain/range.ts";
import { planResume, type ResumePlan } from "../../domain/resume.ts";
import { computeMastery } from "@koten/shared/domain/mastery/compute";
import { resolveActiveRange } from "../../domain/session.ts";
import { createMemoryPort } from "../../domain/ports.ts";
import type { ApplicationPort } from "../adapters/indexeddb-port.ts";
import { initialSettings, loadUserSettings } from "../settings.ts";
import { ReadingToggle } from "../components/ReadingToggle.tsx";
import { WritingModeToggle } from "../components/WritingModeToggle.tsx";

type Props = {
  port?: ApplicationPort;
  onPickEntry?: (
    entry: EntryId,
    range: { from: number; to: number },
    questions: PublishedQuestion[],
    poems: Poem[],
  ) => void;
  onQuickStart?: (
    range: { from: number; to: number },
    questions: PublishedQuestion[],
    poems: Poem[],
  ) => void;
  onResume?: (
    session: Session,
    cardNumbers: readonly number[],
    questions: PublishedQuestion[],
    poems: Poem[],
    /** 作者問題の方式を決める項目別得点（発注081）。再開の計画と同じイベントから作る。 */
    masteryScores: Readonly<Record<string, number>>,
  ) => void;
  onOpenHistory?: () => void;
  /** 読み込んだ設定と、書き換えた設定を上へ渡す。**設定の出所は保存領域ひとつである。** */
  onSettings?: (settings: UserSettings) => void;
  poems?: Poem[];
  questions?: PublishedQuestion[];
};
/** 再開に要るものは1つの状態にまとめる。**得点だけ別に読むと、計画と方式が別の時点を指す。** */
type Restorable = { session: Session; plan: ResumePlan; masteryScores: Readonly<Record<string, number>> };
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
const installNoticeKey = "hyakunin:install-notice-dismissed";
const gradeRanges: Readonly<Record<string, { from: number; to: number }>> = {
  中一: { from: 1, to: 20 },
  中二: { from: 21, to: 60 },
  中三: { from: 61, to: 100 },
};

function isStandaloneLaunch() {
  return window.matchMedia?.("(display-mode: standalone)").matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function installNoticeWasDismissed() {
  try {
    return window.localStorage.getItem(installNoticeKey) === "true";
  } catch {
    return false;
  }
}

function rememberInstallNoticeDismissal() {
  try {
    window.localStorage.setItem(installNoticeKey, "true");
  } catch {
    // プライベートブラウズなどで保存できなくても、案内そのものは使える。
  }
}
// 統計を実際に送信する導線ができるまで、同意と学年選択は表示しない。
// 部品・設定値は、その導線を実装するときに同じ契約のまま再利用する。
// 収集の切り替えは `domain/stats.ts` の1か所から引く。ここに真偽を直書きしない。
const statsCollectionEnabled = STATS_COLLECTION_ENABLED;
// 読み込み先は静的な文字列で書くこと。テンプレートリテラルにすると、バンドラが
// data/generated/ を丸ごと走査して全ファイルを公開成果物へ出力する（HANDOFF §8 の F-4）。
const poemsUrl = new URL("../../data/generated/poems.json", import.meta.url);
const blankQuestionsUrl = new URL(
  "../../data/generated/questions.blank.json",
  import.meta.url,
);
const authorQuestionsUrl = new URL(
  "../../data/generated/questions.author.json",
  import.meta.url,
);
const memoryPort = {
  ...createMemoryPort(),
  saveLocalReport: async () => true,
} as ApplicationPort;

export function Home({
  port,
  onPickEntry,
  onQuickStart,
  onResume,
  onOpenHistory,
  onSettings,
  poems: suppliedPoems,
  questions: suppliedQuestions,
}: Props) {
  const activePort = port ?? memoryPort;
  const initialRange = parseRange(window.location.search);
  const [poems, setPoems] = useState<Poem[] | null>(suppliedPoems ?? null);
  const [questions, setQuestions] = useState<PublishedQuestion[]>(
    suppliedQuestions ?? [],
  );
  const [failed, setFailed] = useState(false);
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [activeRange, setActiveRange] = useState({
    from: initialRange.from,
    to: initialRange.to,
  });
  const [current, setCurrent] = useState(initialRange.from);
  const [viewing, setViewing] = useState(false);
  const [authorPractice, setAuthorPractice] = useState(false);
  const [authorOpen, setAuthorOpen] = useState(false);
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [viewSessionId] = useState(() => crypto.randomUUID());
  const [settings, setSettings] = useState<UserSettings>(initialSettings);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [pendingGrade, setPendingGrade] = useState<string | undefined>();
  const [restorable, setRestorable] = useState<Restorable | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [standalone] = useState(isStandaloneLaunch);
  const [installDismissed, setInstallDismissed] = useState(installNoticeWasDismissed);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  // 読み込みは起動時の 1 度だけ走る。受け手を deps に入れて読み直させない。
  const onSettingsRef = useRef(onSettings);
  onSettingsRef.current = onSettings;

  useEffect(() => {
    const receiveInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", receiveInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", receiveInstallPrompt);
  }, []);

  useEffect(() => {
    if (suppliedPoems) return;
    let active = true;
    loadJson(poemsUrl, parsePoems)
      .then((loaded) => {
        if (active) setPoems(loaded);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    Promise.all([
      loadJson(blankQuestionsUrl, parseQuestions),
      loadJson(authorQuestionsUrl, parseQuestions),
    ])
      .then(([blanks, authors]) => {
        if (active) setQuestions([...blanks, ...authors]);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [suppliedPoems]);

  useLayoutEffect(() => {
    document.title = appConfig.products.hyakunin.displayName;
    void loadUserSettings(activePort).then((loaded) => {
      setSettings(loaded);
      setPendingGrade(loaded.grade);
      setSettingsLoaded(true);
      onSettingsRef.current?.(loaded);
    });
    Promise.all([activePort.loadLastSession(), activePort.listEvents()]).then(
      ([session, events]) => {
        if (session !== null)
          setRestorable({
            session,
            plan: planResume(resolveActiveRange(session, initialRange), events),
            masteryScores: computeMastery(events).scores,
          });
      },
    );
  }, [activePort]);

  // 「全◯回」は 20 首ずつの分割数。選んでいる範囲から先に出しておく。
  const plannedChunkCount = useMemo(
    () => splitIntoChunks(normalizeRange(from, to)).length,
    [from, to],
  );
  const selected = useMemo(
    () =>
      poems?.filter(
        (poem) =>
          poem.cardNo >= activeRange.from && poem.cardNo <= activeRange.to,
      ) ?? [],
    [poems, activeRange],
  );
  const index = Math.max(
    0,
    selected.findIndex((poem) => poem.cardNo === current),
  );
  const poem = selected[index];
  // 再確認は厳密な問題ID列を保存しないため途中から再開できない（発注057 R2）。
  // 誘いを出してから断るより、最初から出さない。ここが唯一の関門である。
  const shouldOfferRestore =
    restorable !== null &&
    restorable.session.entry !== "review" &&
    !restorable.session.completed &&
    restorable.plan.remainingInRange > 0 &&
    restoring;
  // iPadOS 13 以降の Safari は Macintosh を名乗る。UA だけ見ると iPad へ Android 向けの文面が出る。
  const installForIos = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  const dismissInstallNotice = () => {
    rememberInstallNoticeDismissal();
    setInstallDismissed(true);
  };
  const showInstallPrompt = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    dismissInstallNotice();
  };
  const persist = async (next: UserSettings) => {
    setSettings(next);
    onSettingsRef.current?.(next);
    await activePort.saveSettings(next);
  };
  useEffect(() => {
    if (!viewing || !poem) return;
    void activePort.appendEvent(
      buildViewEvent({
        eventId: crypto.randomUUID(),
        product: "hyakunin",
        poemId: `p${String(poem.cardNo).padStart(3, "0")}`,
        sessionId: viewSessionId,
        itemKey: `p${String(poem.cardNo).padStart(3, "0")}:text`,
        kind: "view",
        hintUsed: false,
        localDate: new Date().toISOString().slice(0, 10),
        sameSessionRepeat: false,
        appVersion: appConfig.appVersion,
        dataVersion: appConfig.dataVersion,
      }),
    );
  }, [activePort, poem, viewSessionId, viewing]);
  function confirmNotice() {
    if (pendingGrade === undefined) return;
    void persist({ ...settings, grade: pendingGrade, noticeConfirmed: true });
  }
  function selectPendingGrade(grade: string | undefined) {
    setPendingGrade(grade);
    // **URL で範囲を指定して来た人の範囲は動かさない**（依頼者指示・2026-09-07）。
    // 学年の既定で上書きすると、配った番号付きURLがその場で意味を失う。
    if (initialRange.explicit) return;
    const range = gradeRanges[grade ?? ""] ?? { from: 1, to: 100 };
    setFrom(range.from);
    setTo(range.to);
  }
  function returnToRangeSelection() {
    setViewing(false);
  }
  function startView(authors = false) {
    setAuthorPractice(authors);
    setAuthorOpen(false);
    const range = normalizeRange(from, to);
    setFrom(range.from);
    setTo(range.to);
    setActiveRange(range);
    setCurrent(range.from);
    setViewing(true);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}?${new URLSearchParams({ from: String(range.from), to: String(range.to) })}`,
    );
  }
  function choose(entry: EntryId) {
    if (entry === "view") {
      startView();
      return;
    }
    onPickEntry?.(entry, normalizeRange(from, to), questions, poems ?? []);
  }
  if (failed)
    return (
      <ErrorScreen>
        100首のデータを読み込めませんでした。ページを再読み込みしてください。
      </ErrorScreen>
    );
  if (!poems)
    return (
      <main class="loading" aria-busy="true">
        <p>100首を読み込んでいます…</p>
      </main>
    );
  if (viewing && poem) {
    const ku =
      settings.reading === "no-ruby"
        ? poem.ku
        : poem.reading[settings.reading].ku;
    const authorReading =
      settings.reading === "no-ruby"
        ? null
        : poem.reading[settings.reading].author;
    return (
      <main class="viewer">
        <header class="nav-edge">
          <span class="wordmark">
            {authorPractice ? "作者名を確認する" : "歌を確認する"}
          </span>
          <span class="progress" aria-live="polite">
            <span class="poem-number">{poem.cardNo}番</span>
          </span>
          <button type="button" onClick={returnToRangeSelection}>範囲を選び直す</button>
        </header>
        <section class="reading-controls">
          <ReadingToggle
            value={settings.reading}
            onChange={(reading) => persist({ ...settings, reading })}
          />
          <WritingModeToggle
            value={settings.writing}
            onChange={(writing) => persist({ ...settings, writing })}
          />
        </section>
        <article
          class={`poem-sheet poem-sheet--${settings.writing}`}
          aria-labelledby="poem-title"
        >
          <h1 id="poem-title" class="sr-only">
            {poem.cardNo}
            {!authorPractice && ` ${poem.author.canonical}`}
          </h1>
          <div class="poem" lang="ja">
            <div
              class="poem__half"
              aria-label={`上の句 ${ku.slice(0, 3).join(" ")}`}
            >
              {ku.slice(0, 3).map((line) => (
                <span key={line}>{line}</span>
              ))}
            </div>
            <div
              class="poem__half"
              aria-label={`下の句 ${ku.slice(3).join(" ")}`}
            >
              {ku.slice(3).map((line) => (
                <span key={line}>{line}</span>
              ))}
            </div>
          </div>
          <div class="author">
            {!authorPractice || authorOpen ? (
              <>
                <strong>{poem.author.canonical}</strong>
                {authorReading && <span>{authorReading}</span>}
              </>
            ) : (
              <button type="button" onClick={() => setAuthorOpen(true)}>
                作者名を見る
              </button>
            )}
          </div>
        </article>
        <nav class="pager" aria-label="歌を移動">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => {
              setCurrent(selected[index - 1].cardNo);
              setAuthorOpen(false);
            }}
          >
            前の歌
          </button>
          <button
            type="button"
            disabled={index === selected.length - 1}
            onClick={() => {
              setCurrent(selected[index + 1].cardNo);
              setAuthorOpen(false);
            }}
          >
            次の歌
          </button>
        </nav>
      </main>
    );
  }
  const showStatsOnboarding =
    statsCollectionEnabled && settingsLoaded && !settings.noticeConfirmed;
  return (
    <main class="home">
      <header class="nav-edge">
        <h1 class="wordmark">{appConfig.products.hyakunin.displayName}</h1>
      </header>
      {showStatsOnboarding && (
        <div class="onboarding" role="region" aria-label="初回設定">
          <div class="onboarding__dialog" role="dialog" aria-modal="true" aria-labelledby="grade-picker-title">
            <GradePicker value={pendingGrade} onChange={selectPendingGrade} />
            <StatsNotice />
            <button class="stats-notice__confirm" type="button" disabled={pendingGrade === undefined} onClick={confirmNotice}>OK</button>
          </div>
        </div>
      )}
      {initialRange.hadInvalidQuery && (
        <p class="review-note" role="status">
          範囲を読み込めなかったため、全範囲を表示しています。
        </p>
      )}
      {shouldOfferRestore && (
        <section class="review-note restore-offer">
          <h2 class="restore-title">
            前回の「{ENTRY_LABELS[restorable.session.entry]}」の続きがあります
          </h2>
          {restorable.plan.chunkCount === 1 ? (
            <p>
              範囲 {restorable.session.from}番〜{restorable.session.to}番・あと
              {restorable.plan.remainingInRange}首
            </p>
          ) : (
            <>
              <p>
                範囲 {restorable.session.from}番〜{restorable.session.to}番（{CHUNK_CARD_COUNT}首ずつ・全{restorable.plan.chunkCount}セット）
              </p>
              <p class="restore-next-chunk">
                次は {restorable.session.from + restorable.plan.chunkIndex * CHUNK_CARD_COUNT}番〜{Math.min(restorable.session.to, restorable.session.from + (restorable.plan.chunkIndex + 1) * CHUNK_CARD_COUNT - 1)}番（{restorable.plan.chunkFullyConfirmed ? 0 : restorable.plan.cardNumbers.length}首）
              </p>
            </>
          )}
          <MasteryMeter
            label="範囲全体"
            meterLabel="範囲全体の進み具合"
            text={`${restorable.session.to - restorable.session.from + 1 - restorable.plan.remainingInRange}首/${restorable.session.to - restorable.session.from + 1}首`}
            percent={Math.round(((restorable.session.to - restorable.session.from + 1 - restorable.plan.remainingInRange) / (restorable.session.to - restorable.session.from + 1)) * 100)}
            color="blue"
          />
          <div class="restore-actions">
            <button
              type="button"
              onClick={() => {
                onResume?.(
                  restorable.session,
                  restorable.plan.cardNumbers,
                  questions,
                  poems,
                  restorable.masteryScores,
                );
                setRestoring(false);
              }}
            >
              続きから始める
            </button>
            <button type="button" onClick={() => setRestoring(false)}>
              最初から選び直す
            </button>
          </div>
        </section>
      )}
      <section class="range-panel">
        <h2>範囲</h2>
        <div class="range-fields">
          <label>
            <input
              aria-label="最初の番"
              type="number"
              min="1"
              max="100"
              value={from}
              onInput={(event) => setFrom(Number(event.currentTarget.value))}
            />
            <span aria-hidden="true">番</span>
          </label>
          <span aria-hidden="true">〜</span>
          <label>
            <input
              aria-label="最後の番"
              type="number"
              min="1"
              max="100"
              value={to}
              onInput={(event) => setTo(Number(event.currentTarget.value))}
            />
            <span aria-hidden="true">番</span>
          </label>
        </div>
        <div class="entry-introduction">
          <p class="entry-help">
            「とりあえず始める」では、穴埋めと作者の問題の両方を出します。1回の学習は
            {ENTRY_RULES.quick.questionCount}問です。
          </p>
          {plannedChunkCount > 1 && (
            <p class="entry-help">
              {normalizeRange(from, to).from}〜{normalizeRange(from, to).to}番だと
              {CHUNK_CARD_COUNT}首ずつの{plannedChunkCount}つのまとまりに分かれます。
            </p>
          )}
        </div>
        <div class="entry-actions">
          <button
            class="primary entry-start"
            type="button"
            disabled={!isEntryAvailable("learn", questions.length)}
            aria-disabled={!isEntryAvailable("learn", questions.length)}
            onClick={() =>
              onQuickStart?.(normalizeRange(from, to), questions, poems)
            }
          >
            とりあえず始める
          </button>
        </div>
        <button
          class="entry-method-toggle"
          type="button"
          aria-expanded={practiceOpen}
          onClick={() => setPracticeOpen((open) => !open)}
        >
          学習方法を選ぶ
        </button>
        {practiceOpen && (
          <div class="practice-choices" aria-label="学習方法">
            <div class="practice-choice">
              <button type="button" onClick={() => choose("learn")}>
                {ENTRY_LABELS.learn}
              </button>
              <p>穴埋めで確認</p>
            </div>
            <div class="practice-choice">
              <button type="button" onClick={() => choose("author")}>
                {ENTRY_LABELS.author}
              </button>
              <p>歌と作者を結びつける</p>
            </div>
            <div class="practice-choice">
              <button type="button" onClick={() => choose("exam")}>
                {ENTRY_LABELS.exam}
              </button>
              <p>試験のように解いて採点</p>
            </div>
          </div>
        )}
        <div class="entry-secondary" aria-label="確認して学ぶ">
          <button type="button" onClick={() => choose("view")}>
            歌を確認する
          </button>
          <button type="button" onClick={() => startView(true)}>
            作者名を確認する
          </button>
        </div>
        {questions.length === 0 && (
          <p role="status">
            問題はまだ準備中です。いまは「歌を確認する」を使えます。
          </p>
        )}
      </section>
      <button type="button" onClick={onOpenHistory}>
        これまでの記録
      </button>
      <footer class="foot-line">
        {!showStatsOnboarding && !standalone && !installDismissed && (
          <section class="install-guide install-guide--first" aria-label="ホーム画面への追加">
            <strong>ホーム画面への追加をおすすめします</strong>
            <p>ブラウザだと、LINE内のブラウザなど別の入り口から開いたときなどに、データが引き継がれません。ホーム画面に追加すると、普通のアプリのように使用できます。</p>
            <details class="install-guide__steps"><summary>追加のしかた</summary><p>{installForIos ? "Safariの共有ボタンから「ホーム画面に追加」を選んでください。" : installPrompt ? "追加ボタンを選んで、ホーム画面に追加してください。" : "ブラウザのメニューから「ホーム画面に追加」を選んでください。"}</p></details>
            <div class="install-guide__actions">
              {installPrompt && <button type="button" onClick={showInstallPrompt}>ホーム画面に追加する</button>}
              <button class="install-guide__dismiss" type="button" onClick={dismissInstallNotice}>閉じる</button>
            </div>
          </section>
        )}
        {!showStatsOnboarding && !standalone && installDismissed && (
          <p class="install-guide install-guide--returning">ホーム画面に追加するには、ブラウザのメニューを開いてください。</p>
        )}
        {/* 版は名乗る。テスト公開の断り書きと既知の制約は README と変更履歴が持つ（発注074 工程3）。 */}
        <p class="app-version">{appConfig.appVersion}</p>
      </footer>
    </main>
  );
}
