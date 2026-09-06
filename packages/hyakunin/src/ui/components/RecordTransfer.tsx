import { useState } from "preact/hooks";
import type { ImportPlan } from "@koten/shared/storage/import";
import type { ResetCounts } from "@koten/shared/storage/reset";
import type { ApplicationPort } from "../adapters/indexeddb-port.ts";

/** `onChanged` は記録が変わったことを親へ知らせる。取り込みも削除も一覧を古くするため。 */
type Props = { port: ApplicationPort; onChanged?: () => void };
type Stage =
  | { kind: "idle" }
  | { kind: "exported"; name: string; sessions: number; events: number }
  | { kind: "previewing"; plan: ImportPlan }
  | { kind: "imported"; added: number; duplicates: number }
  | { kind: "confirming-delete"; counts: ResetCounts }
  | { kind: "deleted"; total: number }
  | { kind: "failed"; message: string };

const fileName = (today: string) => `百人一首練習帳_記録_${today}.json`;

/**
 * 記録の持ち出しと取り込み。APP_SPEC §9 に従い、**取り込みは 2 段階**にする——
 * まず件数を見せ、押されて初めて書く。下見の段階では 1 件も書かない。
 */
export function RecordTransfer({ port, onChanged }: Props) {
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [busy, setBusy] = useState(false);
  // 口が無いポート（簡易ポート・試験のダブル）では機能ごと出さない。
  if (!port.exportRecords || !port.previewImport || !port.commitImport || !port.previewDelete || !port.commitDelete) return null;

  async function runExport() {
    setBusy(true);
    const today = new Date().toISOString().slice(0, 10);
    const result = await port.exportRecords!(today);
    setBusy(false);
    if (!result) {
      setStage({ kind: "failed", message: "記録を読み出せませんでした。" });
      return;
    }
    const name = fileName(today);
    // 端末へ渡す唯一の経路。Blob を作って自分でクリックする。
    const url = URL.createObjectURL(new Blob([result.text], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStage({ kind: "exported", name, sessions: result.summary.counts.sessions, events: result.summary.counts.events });
  }

  async function chooseFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    setBusy(true);
    const outcome = await port.previewImport!(await file.text());
    setBusy(false);
    setStage(outcome.ok ? { kind: "previewing", plan: outcome.plan } : { kind: "failed", message: outcome.message });
  }

  async function commit(plan: ImportPlan) {
    setBusy(true);
    const result = await port.commitImport!(plan);
    setBusy(false);
    if (!result) {
      setStage({ kind: "failed", message: "取り込みを保存できませんでした。記録はそのままです。" });
      return;
    }
    setStage({
      kind: "imported",
      added: result.sessions.added + result.events.added + result.reports.added,
      duplicates: result.sessions.duplicates + result.events.duplicates + result.reports.duplicates,
    });
    onChanged?.();
  }

  async function askDelete() {
    setBusy(true);
    const counts = await port.previewDelete!();
    setBusy(false);
    if (!counts) {
      setStage({ kind: "failed", message: "記録を読み出せませんでした。" });
      return;
    }
    setStage({ kind: "confirming-delete", counts });
  }

  async function runDelete(counts: ResetCounts) {
    setBusy(true);
    const removed = await port.commitDelete!(counts);
    setBusy(false);
    if (!removed) {
      setStage({ kind: "failed", message: "削除できませんでした。記録はそのままです。" });
      return;
    }
    setStage({ kind: "deleted", total: removed.sessions + removed.events + removed.reports });
    onChanged?.();
  }

  return (
    <section class="record-transfer" aria-labelledby="transfer-heading">
      <h2 id="transfer-heading">記録の持ち出し</h2>
      <p class="transfer-help">
        機種変更やバックアップのために、記録をファイルへ書き出せます。読み込むと、同じ記録は重ねずにひとつにまとめます。
      </p>
      <div class="transfer-actions">
        <button type="button" disabled={busy} onClick={() => void runExport()}>
          記録を書き出す
        </button>
        <label class="transfer-file">
          記録を読み込む
          <input class="sr-only" type="file" accept="application/json,.json" disabled={busy} onChange={(event) => void chooseFile(event as unknown as Event)} />
        </label>
      </div>

      {stage.kind === "exported" && (
        <p class="transfer-note" role="status">
          {stage.name} を書き出しました（回 {stage.sessions} 件・解答 {stage.events} 件）。
        </p>
      )}

      {stage.kind === "previewing" && (
        <div class="transfer-preview" role="group" aria-label="読み込む内容の確認">
          <p>
            読み込む内容：回 {stage.plan.preview.counts.sessions} 件・解答 {stage.plan.preview.counts.events} 件・報告 {stage.plan.preview.counts.reports} 件
          </p>
          <p class="transfer-help">対象：{stage.plan.preview.products.join("、")}／書き出し版 {stage.plan.preview.schemaVersion}</p>
          <p class="transfer-help">いまの記録は消えません。同じものは重ねません。</p>
          <div class="transfer-actions">
            <button class="primary" type="button" disabled={busy} onClick={() => void commit(stage.plan)}>
              この内容で読み込む
            </button>
            <button type="button" disabled={busy} onClick={() => setStage({ kind: "idle" })}>
              やめる
            </button>
          </div>
        </div>
      )}

      {stage.kind === "imported" && (
        <p class="transfer-note" role="status">
          読み込みました。{stage.added}件を追加し、{stage.duplicates}件は同じ記録なので重ねませんでした。
        </p>
      )}

      <h2 class="transfer-danger-heading">記録を消す</h2>
      <p class="transfer-help">
        この端末の百人一首の記録を消します。<strong>元には戻せません。</strong>
        設定（読み方・縦書き）は残ります。ほかのアプリの記録は消えません。
      </p>
      <div class="transfer-actions">
        <button type="button" disabled={busy} onClick={() => void askDelete()}>
          記録を消す
        </button>
      </div>

      {stage.kind === "confirming-delete" && (
        <div class="transfer-preview transfer-danger" role="group" aria-label="削除の確認">
          <p>
            消える記録：回 {stage.counts.sessions} 件・解答 {stage.counts.events} 件・報告 {stage.counts.reports} 件
          </p>
          <p class="transfer-help">元には戻せません。残しておきたいときは、先に「記録を書き出す」を押してください。</p>
          <div class="transfer-actions">
            <button type="button" disabled={busy} onClick={() => void runDelete(stage.counts)}>
              消す
            </button>
            <button class="primary" type="button" disabled={busy} onClick={() => setStage({ kind: "idle" })}>
              やめる
            </button>
          </div>
        </div>
      )}

      {stage.kind === "deleted" && (
        <p class="transfer-note" role="status">
          {stage.total}件の記録を消しました。
        </p>
      )}

      {stage.kind === "failed" && (
        <p class="transfer-note" role="alert">
          {stage.message}
        </p>
      )}
    </section>
  );
}
