import { useState } from 'preact/hooks';

export function ReportButton({ onReport }: { onReport: () => Promise<boolean> }) {
  const [message, setMessage] = useState('');
  async function report() { setMessage((await onReport()) ? 'この端末に保存しました' : '保存失敗。もう一度お試しください'); }
  return <span class="report-control"><button type="button" onClick={report}>問題を報告</button>{message && <span aria-live="polite">{message}</span>}</span>;
}
