import { useEffect, useState } from 'preact/hooks';
import { isStandalone } from '../../sync/install-handoff.ts';

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
export function SyncInstallGuide({ code }: { code: string }) {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const receive = (event: Event) => { event.preventDefault(); setPrompt(event as InstallEvent); };
    window.addEventListener('beforeinstallprompt', receive);
    return () => window.removeEventListener('beforeinstallprompt', receive);
  }, []);
  if (isStandalone()) return null;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  return <section class="install-guide install-guide--first" aria-label="同期後のホーム画面への追加">
    <div><h3>記録を引き継いでホーム画面に追加</h3>
      <p>{ios ? 'ブラウザの共有ボタンから「ホーム画面に追加」を選んでください。' : 'ブラウザのメニューから「ホーム画面に追加」または「アプリをインストール」を選んでください。'}</p>
      <p>同期が完了してから追加してください。追加したアイコンから開くと、同じ同期先から記録を読み込みます。</p>
      <details><summary>追加後に記録が表示されない場合</summary><p>追加したアプリの「端末間同期」で、次の共有コードを入力して参加してください。通信できる状態で記録の読み込みをお待ちください。</p><p>共有コード <code>{code}</code></p><button type="button" onClick={() => { if (!navigator.clipboard?.writeText) { setMessage('共有コードを選択してコピーしてください。'); return; } void navigator.clipboard.writeText(code).then(() => setMessage('共有コードをコピーしました。'), () => setMessage('共有コードを選択してコピーしてください。')); }}>引き継ぎ用コードをコピー</button></details>
      {message && <p role="status">{message}</p>}
    </div>
    {prompt && <button type="button" onClick={() => { const current = prompt; setPrompt(null); void current.prompt().catch(() => setMessage('ブラウザのメニューから追加してください。')); }}>ホーム画面に追加する</button>}
  </section>;
}
