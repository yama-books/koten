import { appConfig } from '@koten/shared/app-config';
import { loadJson } from '@koten/shared/data/load';
import { ErrorScreen } from '@koten/shared/error-screen';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { parsePoems, type Poem } from '../../data/schema.ts';
import { normalizeRange, parseRange } from '../../domain/range.ts';

type ReadingMode = 'none' | 'historical' | 'modern';
type Orientation = 'vertical' | 'horizontal';

const initialRange = parseRange(window.location.search);

function getSavedOrientation(): Orientation {
  return window.localStorage.getItem('hyakunin:orientation') === 'horizontal' ? 'horizontal' : 'vertical';
}

export function Home() {
  const [poems, setPoems] = useState<Poem[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [activeRange, setActiveRange] = useState({ from: initialRange.from, to: initialRange.to });
  const [currentCardNo, setCurrentCardNo] = useState(initialRange.from);
  const [readingMode, setReadingMode] = useState<ReadingMode>('none');
  const [orientation, setOrientation] = useState<Orientation>(getSavedOrientation);
  const [viewing, setViewing] = useState(false);

  useEffect(() => {
    let active = true;
    const url = new URL('../../data/generated/poems.json', import.meta.url);
    loadJson(url, parsePoems)
      .then((loaded) => { if (active) setPoems(loaded); })
      .catch(() => { if (active) setLoadFailed(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    document.title = appConfig.products.hyakunin.displayName;
  }, []);

  const selectedPoems = useMemo(
    () => poems?.filter((poem) => poem.cardNo >= activeRange.from && poem.cardNo <= activeRange.to) ?? [],
    [poems, activeRange],
  );
  const currentIndex = Math.max(0, selectedPoems.findIndex((poem) => poem.cardNo === currentCardNo));
  const poem = selectedPoems[currentIndex];

  function startViewing() {
    const range = normalizeRange(from, to);
    setFrom(range.from);
    setTo(range.to);
    setActiveRange(range);
    setCurrentCardNo(range.from);
    setViewing(true);
    const query = new URLSearchParams({ from: String(range.from), to: String(range.to) });
    window.history.replaceState(null, '', `${window.location.pathname}?${query}`);
  }

  function changeOrientation(next: Orientation) {
    setOrientation(next);
    window.localStorage.setItem('hyakunin:orientation', next);
  }

  function returnToRangeSelection() {
    setViewing(false);
  }

  if (loadFailed) {
    return <ErrorScreen>100首のデータを読み込めませんでした。ページを再読み込みしてください。</ErrorScreen>;
  }

  if (!poems) {
    return <main class="loading" aria-busy="true"><p>100首を読み込んでいます…</p></main>;
  }

  if (viewing && poem) {
    const displayedKu = readingMode === 'none' ? poem.ku : poem.reading[readingMode].ku;
    const authorReading = readingMode === 'none' ? null : poem.reading[readingMode].author;
    return <main class="viewer">
      <header class="nav-edge">
        <span class="wordmark">{appConfig.products.hyakunin.displayName}</span>
        <span class="progress" aria-live="polite">{poem.cardNo}番 · {currentIndex + 1}/{selectedPoems.length}首</span>
        <button class="return-to-range" type="button" onClick={returnToRangeSelection}>範囲を選び直す</button>
      </header>

      <section class="reading-controls" aria-label="表示設定">
        <fieldset>
          <legend>読み</legend>
          <label><input type="radio" name="reading" checked={readingMode === 'none'} onChange={() => setReadingMode('none')} /> ルビなし</label>
          <label><input type="radio" name="reading" checked={readingMode === 'historical'} onChange={() => setReadingMode('historical')} /> 歴史的仮名遣い</label>
          <label><input type="radio" name="reading" checked={readingMode === 'modern'} onChange={() => setReadingMode('modern')} /> 現代仮名遣い</label>
        </fieldset>
        <fieldset>
          <legend>向き</legend>
          <label><input type="radio" name="orientation" checked={orientation === 'vertical'} onChange={() => changeOrientation('vertical')} /> 縦書き</label>
          <label><input type="radio" name="orientation" checked={orientation === 'horizontal'} onChange={() => changeOrientation('horizontal')} /> 横書き</label>
        </fieldset>
      </section>

      <article class={`poem-sheet poem-sheet--${orientation}`} aria-labelledby="poem-title">
        <h1 id="poem-title" class="sr-only">{poem.cardNo}番 {poem.author.canonical}</h1>
        <div class="poem" lang="ja">
          <div class="poem__half" aria-label={`上の句 ${displayedKu.slice(0, 3).join(' ')}`}>{displayedKu.slice(0, 3).map((line) => <span key={line}>{line}</span>)}</div>
          <div class="poem__half" aria-label={`下の句 ${displayedKu.slice(3).join(' ')}`}>{displayedKu.slice(3).map((line) => <span key={line}>{line}</span>)}</div>
        </div>
        <div class="author">
          <strong>{poem.author.canonical}</strong>
          {authorReading && <span>{authorReading}</span>}
        </div>
      </article>

      {poem.reading.status === 'review' && <p class="review-note" role="note">この歌の読みには異同の確認記録があります。表示は採用済みの読みです。</p>}

      <nav class="pager" aria-label="歌を移動">
        <button type="button" disabled={currentIndex === 0} onClick={() => setCurrentCardNo(selectedPoems[currentIndex - 1].cardNo)}>前の歌</button>
        <button type="button" disabled={currentIndex === selectedPoems.length - 1} onClick={() => setCurrentCardNo(selectedPoems[currentIndex + 1].cardNo)}>次の歌</button>
      </nav>
      <footer class="foot-line"><p>実機確認版 · 学習記録と出題はまだ保存しません</p></footer>
    </main>;
  }

  return <main class="home">
    <header class="nav-edge"><span class="wordmark">{appConfig.products.hyakunin.displayName}</span><span>実機確認版</span></header>
    <section class="intro">
      <h1>まず、歌を読む。</h1>
      <p>1〜100番から範囲を選び、本文・作者・二つの読みを確認できます。出題と学習記録は次の段階で追加します。</p>
    </section>
    {initialRange.hadInvalidQuery && <p class="review-note" role="status">範囲を読み込めなかったため、全範囲を表示しています。</p>}
    <section class="range-panel" aria-labelledby="range-title">
      <h2 id="range-title">見る範囲</h2>
      <div class="range-fields">
        <label>最初の番<input type="number" min="1" max="100" value={from} onInput={(event) => setFrom(Number(event.currentTarget.value))} /></label>
        <span aria-hidden="true">〜</span>
        <label>最後の番<input type="number" min="1" max="100" value={to} onInput={(event) => setTo(Number(event.currentTarget.value))} /></label>
      </div>
      <button class="primary" type="button" onClick={startViewing}>とりあえず始める</button>
    </section>
    <footer class="foot-line"><p>{appConfig.publisher} · 100首収録</p></footer>
  </main>;
}
