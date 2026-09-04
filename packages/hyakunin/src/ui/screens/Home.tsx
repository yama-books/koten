import { appConfig } from '@koten/shared/app-config';
import { KNOWN_LIMITATIONS, releaseStageLabel } from '@koten/shared/release-notes';
import type { Session, UserSettings } from '@koten/shared/domain/event';
import { loadJson } from '@koten/shared/data/load';
import { ErrorScreen } from '@koten/shared/error-screen';
import { useEffect, useLayoutEffect, useMemo, useState } from 'preact/hooks';
import { parsePoems, type Poem } from '../../data/schema.ts';
import { parseQuestions, type PublishedQuestion } from '../../data/question-schema.ts';
import { isEntryAvailable, type EntryId } from '../../domain/entry.ts';
import { normalizeRange, parseRange } from '../../domain/range.ts';
import { planResume, type ResumePlan } from '../../domain/resume.ts';
import { resolveActiveRange } from '../../domain/session.ts';
import { createMemoryPort } from '../../domain/ports.ts';
import type { ApplicationPort } from '../adapters/indexeddb-port.ts';
import { ReadingToggle } from '../components/ReadingToggle.tsx';
import { WritingModeToggle } from '../components/WritingModeToggle.tsx';
import { ReportButton } from '../components/ReportButton.tsx';

type Props = {
  port?: ApplicationPort;
  onPickEntry?: (entry: EntryId, range: { from: number; to: number }, questions: PublishedQuestion[]) => void;
  onResume?: (session: Session, cardNumbers: readonly number[], questions: PublishedQuestion[]) => void;
  onOpenHistory?: () => void;
  poems?: Poem[];
  questions?: PublishedQuestion[];
};
type Restorable = { session: Session; plan: ResumePlan };
const defaults: UserSettings = { key: 'user', reading: 'no-ruby', writing: 'vertical', order: 'number', soundEnabled: false, noticeConfirmed: false };
const labels: Record<EntryId, string> = { quick: 'とりあえず始める', view: '見るだけ', learn: 'おぼえる', review: '全体確認', exam: '試験前の確認' };
// 読み込み先は静的な文字列で書くこと。テンプレートリテラルにすると、バンドラが
// data/generated/ を丸ごと走査して全ファイルを公開成果物へ出力する（HANDOFF §8 の F-4）。
const poemsUrl = new URL('../../data/generated/poems.json', import.meta.url);
const blankQuestionsUrl = new URL('../../data/generated/questions.blank.json', import.meta.url);
const authorQuestionsUrl = new URL('../../data/generated/questions.author.json', import.meta.url);
const memoryPort = { ...createMemoryPort(), saveLocalReport: async () => true } as ApplicationPort;

export function Home({ port, onPickEntry, onResume, onOpenHistory, poems: suppliedPoems, questions: suppliedQuestions }: Props) {
  const activePort = port ?? memoryPort;
  const initialRange = parseRange(window.location.search);
  const [poems, setPoems] = useState<Poem[] | null>(suppliedPoems ?? null);
  const [questions, setQuestions] = useState<PublishedQuestion[]>(suppliedQuestions ?? []);
  const [failed, setFailed] = useState(false);
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [activeRange, setActiveRange] = useState({ from: initialRange.from, to: initialRange.to });
  const [current, setCurrent] = useState(initialRange.from);
  const [viewing, setViewing] = useState(false);
  const [settings, setSettings] = useState<UserSettings>(defaults);
  const [restorable, setRestorable] = useState<Restorable | null>(null);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    if (suppliedPoems) return;
    let active = true;
    loadJson(poemsUrl, parsePoems).then((loaded) => { if (active) setPoems(loaded); }).catch(() => { if (active) setFailed(true); });
    Promise.all([loadJson(blankQuestionsUrl, parseQuestions), loadJson(authorQuestionsUrl, parseQuestions)]).then(([blanks, authors]) => { if (active) setQuestions([...blanks, ...authors]); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [suppliedPoems]);

  useLayoutEffect(() => {
    document.title = appConfig.products.hyakunin.displayName;
    activePort.loadSettings().then((saved) => {
      const migrated = saved ?? { ...defaults, writing: window.localStorage?.getItem('hyakunin:orientation') === 'horizontal' ? 'horizontal' : 'vertical' };
      setSettings(migrated);
      if (!saved) { void activePort.saveSettings(migrated); window.localStorage?.removeItem('hyakunin:orientation'); }
    });
    Promise.all([activePort.loadLastSession(), activePort.listEvents()]).then(([session, events]) => {
      if (session !== null) setRestorable({ session, plan: planResume(resolveActiveRange(session, initialRange), events) });
    });
  }, [activePort]);

  const selected = useMemo(() => poems?.filter((poem) => poem.cardNo >= activeRange.from && poem.cardNo <= activeRange.to) ?? [], [poems, activeRange]);
  const index = Math.max(0, selected.findIndex((poem) => poem.cardNo === current));
  const poem = selected[index];
  const shouldOfferRestore = restorable !== null && !restorable.session.completed && restorable.plan.remainingInRange > 0 && restoring;
  const persist = async (next: UserSettings) => { setSettings(next); await activePort.saveSettings(next); };
  function returnToRangeSelection() {
    setViewing(false);
  }
  function startView() {
    const range = normalizeRange(from, to);
    setFrom(range.from); setTo(range.to); setActiveRange(range); setCurrent(range.from); setViewing(true);
    window.history.replaceState(null, '', `${window.location.pathname}?${new URLSearchParams({ from: String(range.from), to: String(range.to) })}`);
  }
  function choose(entry: EntryId) {
    if (entry === 'view') { startView(); return; }
    onPickEntry?.(entry, normalizeRange(from, to), questions);
  }
  if (failed) return <ErrorScreen>100首のデータを読み込めませんでした。ページを再読み込みしてください。</ErrorScreen>;
  if (!poems) return <main class="loading" aria-busy="true"><p>100首を読み込んでいます…</p></main>;
  if (viewing && poem) {
    const ku = settings.reading === 'no-ruby' ? poem.ku : poem.reading[settings.reading].ku;
    const authorReading = settings.reading === 'no-ruby' ? null : poem.reading[settings.reading].author;
    return <main class="viewer"><header class="nav-edge"><span class="wordmark">{appConfig.products.hyakunin.displayName}</span><span class="progress" aria-live="polite">{poem.cardNo}番 · {index + 1}/{selected.length}首</span><button type="button" onClick={returnToRangeSelection}>範囲を選び直す</button></header><section class="reading-controls"><ReadingToggle value={settings.reading} onChange={(reading) => persist({ ...settings, reading })} /><WritingModeToggle value={settings.writing} onChange={(writing) => persist({ ...settings, writing })} /></section><article class={`poem-sheet poem-sheet--${settings.writing}`} aria-labelledby="poem-title"><h1 id="poem-title" class="sr-only">{poem.cardNo}番 {poem.author.canonical}</h1><div class="poem" lang="ja"><div class="poem__half" aria-label={`上の句 ${ku.slice(0, 3).join(' ')}`}>{ku.slice(0, 3).map((line) => <span key={line}>{line}</span>)}</div><div class="poem__half" aria-label={`下の句 ${ku.slice(3).join(' ')}`}>{ku.slice(3).map((line) => <span key={line}>{line}</span>)}</div></div><div class="author"><strong>{poem.author.canonical}</strong>{authorReading && <span>{authorReading}</span>}</div></article>{poem.reading.status === 'review' && <p class="review-note" role="note">この歌の読みには異同の確認記録があります。表示は採用済みの読みです。</p>}<ReportButton onReport={() => activePort.saveLocalReport(`p${String(poem.cardNo).padStart(3, '0')}`)} /><nav class="pager" aria-label="歌を移動"><button type="button" disabled={index === 0} onClick={() => setCurrent(selected[index - 1].cardNo)}>前の歌</button><button type="button" disabled={index === selected.length - 1} onClick={() => setCurrent(selected[index + 1].cardNo)}>次の歌</button></nav></main>;
  }
  return <main class="home"><header class="nav-edge"><span class="wordmark">{appConfig.products.hyakunin.displayName}</span></header><section class="intro"><h1>まず、歌を読む。</h1><p>範囲を選び、見るだけでも、準備ができた問題からでも始められます。</p></section>{initialRange.hadInvalidQuery && <p class="review-note" role="status">範囲を読み込めなかったため、全範囲を表示しています。</p>}{shouldOfferRestore && <section class="review-note restore-offer"><p>前回の学習を復元しますか。</p><p>あと{restorable.plan.remainingInRange}首 · {restorable.plan.chunkIndex + 1}/{restorable.plan.chunkCount}まとまり</p><button type="button" onClick={() => { onResume?.(restorable.session, restorable.plan.cardNumbers, questions); setRestoring(false); }}>復元する</button><button type="button" onClick={() => setRestoring(false)}>復元しない</button></section>}<section class="range-panel"><h2>見る範囲</h2><div class="range-fields"><label>最初の番<input type="number" min="1" max="100" value={from} onInput={(event) => setFrom(Number(event.currentTarget.value))} /></label><span aria-hidden="true">〜</span><label>最後の番<input type="number" min="1" max="100" value={to} onInput={(event) => setTo(Number(event.currentTarget.value))} /></label></div><div class="entry-actions">{(Object.keys(labels) as EntryId[]).map((entry) => <button class={entry === 'quick' ? 'primary' : ''} type="button" disabled={!isEntryAvailable(entry, questions.length)} aria-disabled={!isEntryAvailable(entry, questions.length)} onClick={() => choose(entry)}>{labels[entry]}</button>)}</div>{questions.length === 0 && <p role="status">問題はまだ準備中です。いまは「見るだけ」を使えます。</p>}</section><button type="button" onClick={onOpenHistory}>これまでの記録</button><footer class="foot-line"><p class="release-stage">{releaseStageLabel}</p><details class="known-limits"><summary>この版でまだできないこと</summary><ul>{KNOWN_LIMITATIONS.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul></details><p>{appConfig.publisher} · 100首収録</p></footer></main>;
}
