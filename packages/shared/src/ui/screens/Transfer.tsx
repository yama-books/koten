import { useState } from 'preact/hooks';
import { appConfig } from '../../app-config.ts';
import { createExport, serializeExport, summarizeExport, type ExportDocument } from '../../storage/export.ts';
import { applyImport, parseImport, type ImportPlan } from '../../storage/import.ts';
import { makeResetConfirmation, previewReset, resetRecords, type ResetCounts, type ResetScope } from '../../storage/reset.ts';

const importLimit = 100_000;
type Props = { database: IDBDatabase; exportedAt: string };
const blankCounts: ResetCounts = { sessions: 0, events: 0, reports: 0, outbox: 0 };

export function Transfer({ database, exportedAt }: Props) {
  const [exportData, setExportData] = useState<ExportDocument>();
  const [paste, setPaste] = useState('');
  const [plan, setPlan] = useState<ImportPlan>();
  const [message, setMessage] = useState('');
  const [scope, setScope] = useState<ResetScope>('all');
  const [resetCounts, setResetCounts] = useState<ResetCounts>(blankCounts);

  async function prepareExport() {
    const result = await createExport(database, exportedAt);
    if (!result.ok) { setMessage('書き出しを準備できませんでした。'); return; }
    setExportData(result.value); setMessage('書き出しの内容を確認してください。');
  }
  function reviewImport(text: string) {
    const result = parseImport(text, importLimit);
    if (!result.ok) { setPlan(undefined); setMessage(result.message); return; }
    setPlan(result.value); setMessage('取り込み内容を確認してください。');
  }
  async function confirmImport() {
    if (!plan) return;
    const result = await applyImport(database, plan);
    setMessage(result.ok ? '記録を統合しました。' : '統合に失敗しました。取り込み前の状態へ戻しました。');
    if (result.ok) setPlan(undefined);
  }
  async function prepareReset() {
    const result = await previewReset(database, scope);
    if (!result.ok) { setMessage('初期化の対象を確認できませんでした。'); return; }
    setResetCounts(result.value); setMessage('削除する記録を確認してください。');
  }
  async function confirmReset() {
    const result = await resetRecords(database, makeResetConfirmation(scope, resetCounts));
    setMessage(result.ok ? '選択した記録を初期化しました。' : '初期化できませんでした。');
  }
  async function readFile(event: Event) {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (file) reviewImport(await file.text());
  }
  const summary = exportData && summarizeExport(exportData);
  const productNames = plan?.preview.products.map((product) => appConfig.products[product as keyof typeof appConfig.products]?.displayName ?? product).join('、');
  return <main class="transfer-screen">
    <h1>データの移動と初期化</h1>
    <p role="status">{message}</p>
    <section aria-labelledby="export-heading"><h2 id="export-heading">書き出し</h2>
      <button type="button" onClick={prepareExport}>書き出し内容を準備</button>
      {summary && <><p>回: {summary.counts.sessions}件／履歴: {summary.counts.events}件／報告: {summary.counts.reports}件（約{summary.characters}文字）</p>
        <a download={`koten-${exportedAt}.json`} href={`data:application/json;charset=utf-8,${encodeURIComponent(serializeExport(exportData!))}`}>JSONファイルを保存</a>
        <label>貼り付け用JSON<textarea readOnly value={serializeExport(exportData)} /></label></>}
    </section>
    <section aria-labelledby="import-heading"><h2 id="import-heading">取り込み</h2>
      <label>JSONファイル<input type="file" accept="application/json,.json" onChange={readFile} /></label>
      <label>JSONを貼り付け<textarea value={paste} onInput={(event) => setPaste((event.currentTarget as HTMLTextAreaElement).value)} /></label>
      <button type="button" onClick={() => reviewImport(paste)}>内容を確認</button>
      {plan && <div role="alert"><p>版: {plan.preview.schemaVersion}／回: {plan.preview.counts.sessions}件／履歴: {plan.preview.counts.events}件／報告: {plan.preview.counts.reports}件</p><p>対象: {productNames || '記録なし'}</p><button type="button" onClick={confirmImport}>確認して統合</button></div>}
    </section>
    <section aria-labelledby="reset-heading"><h2 id="reset-heading">初期化</h2>
      <label>対象<select value={scope} onChange={(event) => setScope((event.currentTarget as HTMLSelectElement).value as ResetScope)}><option value="all">両方の製品</option><option value="hyakunin">百人一首練習帳</option><option value="kanazukai">歴史的仮名遣い確認ツール</option></select></label>
      <button type="button" onClick={prepareReset}>削除する内容を確認</button>
      {message === '削除する記録を確認してください。' && <div role="alert"><p>回: {resetCounts.sessions}件／履歴: {resetCounts.events}件／報告: {resetCounts.reports}件</p><p>送信待ちの報告 {resetCounts.outbox} 件も削除されます。</p><button type="button" onClick={confirmReset}>確認して初期化</button></div>}
    </section>
  </main>;
}
