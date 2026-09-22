import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { UserSettings } from '@koten/shared/domain/event';
import { decryptField, houseIdFor, isCiphertext, makePairingCode, normalizeCode } from '@koten/shared/sync/crypto';
import { readSettings } from '@koten/shared/sync/client';
import { isPairingCode, pairingPayload, parsePairingPayload } from '@koten/shared/sync/pairing';
import { guessDeviceName, normalizeDeviceName } from '@koten/shared/sync/device-name';
import { validPreferences, type SyncStatus } from '../../sync/runtime.ts';

type Props = {
  settings: UserSettings;
  status: SyncStatus | 'off';
  onChange: (settings: UserSettings) => Promise<boolean>;
  onBack: () => void;
  backLabel?: string;
};

const statusText: Record<SyncStatus | 'off', string> = {
  off: '端末間同期はオフです', connecting: '接続しています', connected: '端末間同期が有効です',
  offline: 'オフラインです。接続が戻ると再試行します', error: '同期できません。接続を確認してください',
};

export function SyncSettings({ settings, status, onChange, onBack, backLabel = 'ホームへ戻る' }: Props) {
  const [input, setInput] = useState('');
  const [candidate, setCandidate] = useState<string | null>(null);
  // 参加先を作った端末の呼び名。確認の文で「どの端末と繋がるか」を示す。
  const [candidateName, setCandidateName] = useState<string | undefined>(undefined);
  // **既定は UA からの当て推量。** 機種名は取れないので、利用者が直せる初期値として出す。
  const [deviceName, setDeviceName] = useState(() => settings.syncDeviceName ?? guessDeviceName(navigator.userAgent));
  const [checking, setChecking] = useState(false);
  const [verified, setVerified] = useState(false);
  const [message, setMessage] = useState('');
  const [scanning, setScanning] = useState(false);
  const [stopConfirm, setStopConfirm] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number>(0);
  const verifyRef = useRef(0);
  const cameraRequestRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);
  const code = settings.syncEnabled ? settings.syncCode : undefined;
  const inviteUrl = useMemo(() => code ? pairingPayload(code, window.location.href) : '', [code]);

  useEffect(() => {
    const raw = new URL(window.location.href).searchParams.get('join');
    if (!raw) return;
    const parsed = parsePairingPayload(window.location.href, window.location.href);
    if (parsed) void verify(parsed);
    else setMessage('招待リンクを確認できませんでした。');
    // 招待リンクは初回表示時だけ受け取る。
  }, []);

  useEffect(() => {
    if (!inviteUrl || !qrRef.current) return;
    let active = true;
    void import('qrcode').then(({ default: QRCode }) => {
      if (active && qrRef.current) return QRCode.toCanvas(qrRef.current, inviteUrl, { errorCorrectionLevel: 'M', margin: 4, width: 288 });
    }).catch(() => { if (active) setMessage('QR を作れませんでした。招待リンクをコピーしてください。'); });
    return () => { active = false; };
  }, [inviteUrl]);

  function stopCamera() {
    cameraRequestRef.current += 1;
    window.cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  }
  useEffect(() => () => stopCamera(), []);

  async function verify(nextCode: string) {
    const requestId = ++verifyRef.current;
    setCandidate(nextCode);
    setVerified(false);
    setChecking(true);
    setMessage('同期先を確認しています…');
    try {
      const payload = await readSettings(await houseIdFor(nextCode));
      if (requestId !== verifyRef.current) return;
      const enc = payload && typeof payload === 'object' ? (payload as { enc?: unknown }).enc : null;
      if (!isCiphertext(enc)) { setMessage('この共有コードの同期先はまだ作られていません。作成側の接続を確認してください。'); return; }
      const decoded = await decryptField('settings', nextCode, enc);
      if (!validPreferences(decoded)) { setMessage('共有コードを確認できませんでした。'); return; }
      if (requestId !== verifyRef.current) return;
      // 作った端末の呼び名。**無ければ共有コードの末尾で示す**——以前からの手がかりを失わない。
      setCandidateName((decoded as { syncDeviceName?: unknown }).syncDeviceName as string | undefined);
      setVerified(true);
      setMessage('同期先を確認できました。参加する場合は下のボタンで確定してください。');
    } catch {
      setMessage('同期先を確認できませんでした。通信状態と共有コードを確認してください。');
    } finally { if (requestId === verifyRef.current) setChecking(false); }
  }

  async function beginNew() {
    const nextCode = makePairingCode();
    if (!await onChange({ ...settings, syncCode: nextCode, syncEnabled: true, syncSeededFor: undefined, syncDeviceName: normalizeDeviceName(deviceName) })) {
      setMessage('同期設定を保存できませんでした。');
    }
  }

  async function join() {
    if (!candidate || !verified) return;
    if (!await onChange({ ...settings, syncCode: candidate, syncEnabled: true, syncSeededFor: undefined })) {
      setMessage('同期設定を保存できませんでした。'); return;
    }
    setCandidate(null);
    setVerified(false);
    const url = new URL(window.location.href);
    url.searchParams.delete('join');
    url.searchParams.delete('r');
    window.history.replaceState(null, '', url.href);
    setMessage('同期を始めました。');
  }

  async function readImageData(data: ImageData) {
    const { default: jsQR } = await import('jsqr');
    const result = jsQR(data.data, data.width, data.height, { inversionAttempts: 'dontInvert' });
    if (!result) return false;
    const parsed = parsePairingPayload(result.data, window.location.href);
    if (!parsed) { stopCamera(); setMessage('このアプリの同期用 QR ではありません。'); return true; }
    stopCamera();
    void verify(parsed);
    return true;
  }

  async function scanFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!streamRef.current || !video || !canvas) return;
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      const width = Math.min(video.videoWidth, 960);
      if (width > 0) {
        canvas.width = width;
        canvas.height = Math.round(width * video.videoHeight / video.videoWidth);
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (context) {
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          if (await readImageData(context.getImageData(0, 0, canvas.width, canvas.height))) return;
        }
      }
    }
    frameRef.current = window.requestAnimationFrame(() => { void scanFrame().catch(() => { stopCamera(); setMessage('QR を読み取れませんでした。招待リンクか画像を使ってください。'); }); });
  }

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) { setMessage('このブラウザではカメラを使えません。招待リンクか画像を使ってください。'); return; }
    try {
      const requestId = ++cameraRequestRef.current;
      setScanning(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } });
      if (requestId !== cameraRequestRef.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) { stopCamera(); return; }
      video.srcObject = stream;
      await video.play();
      void scanFrame().catch(() => { stopCamera(); setMessage('QR を読み取れませんでした。招待リンクか画像を使ってください。'); });
    } catch { stopCamera(); setMessage('カメラを開けませんでした。招待リンクか画像を使ってください。'); }
  }

  async function readFile(file: File | undefined) {
    if (!file) return;
    try {
      const image = await createImageBitmap(file);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const scale = Math.min(1, 1600 / image.width);
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context?.drawImage(image, 0, 0, canvas.width, canvas.height);
      image.close();
      if (!context || !await readImageData(context.getImageData(0, 0, canvas.width, canvas.height))) setMessage('画像から QR を読み取れませんでした。');
    } catch { setMessage('画像を読み込めませんでした。'); }
  }

  return <main class="sync-settings">
    <header class="nav-edge"><h1>端末間同期</h1><button type="button" onClick={onBack}>{backLabel}</button></header>
    <div class="sync-overview"><p class={`sync-status ${status === 'connected' ? 'sync-status--active' : ''}`} role="status" aria-live="polite"><span class="sync-status__dot" aria-hidden="true" />{statusText[status]}</p><p>複数の端末で記録を共有できるようにします。<br />QR と<span class="sync-nowrap">招待リンク</span>には<span class="sync-nowrap">共有コード</span>が含まれるため、<span class="sync-nowrap">取り扱いに注意</span>してください。</p></div>
    {message && <p class="sync-notice" role="status" aria-live="polite">{message}</p>}
    {code ? <div class="sync-flow">
      <section class="sync-panel sync-step"><div class="sync-step__heading"><span class="sync-step__number" aria-hidden="true">1</span><h2>この端末の QR</h2></div><p>共有する端末で読み取ってください。</p><div class="sync-qr"><canvas ref={qrRef} aria-label="同期用の QR" role="img" /></div>
        <details class="sync-alternative"><summary>リンク・共有コードを使う</summary><label>招待リンク<input readOnly value={inviteUrl} onFocus={(event) => event.currentTarget.select()} /></label><button type="button" onClick={() => { if (!navigator.clipboard?.writeText) { setMessage('リンクを選択してコピーしてください。'); return; } void navigator.clipboard.writeText(inviteUrl).then(() => setMessage('招待リンクをコピーしました。'), () => setMessage('コピーできませんでした。リンクを選択してコピーしてください。')); }}>リンクをコピー</button><p>共有コード <code>{code}</code></p></details>
      </section>
      <section class="sync-panel sync-step"><div class="sync-step__heading"><span class="sync-step__number" aria-hidden="true">2</span><h2>共有する端末でQRを読み取る</h2></div><p>読み取り後に「確認して参加する」を押せば完了です。</p></section>
      <section class="sync-stop">{stopConfirm ? <div class="sync-actions"><p>同期を停止します。この端末の記録は残ります。</p><button type="button" onClick={() => { void onChange({ ...settings, syncEnabled: false, syncCode: undefined, syncSeededFor: undefined }).then((ok) => { if (ok) { setStopConfirm(false); setMessage('同期を停止しました。'); } }); }}>停止する</button><button type="button" onClick={() => setStopConfirm(false)}>戻る</button></div> : <button type="button" onClick={() => setStopConfirm(true)}>同期を停止</button>}</section>
    </div> : <div class="sync-flow">
      <section class="sync-panel sync-choice"><div class="sync-step__heading"><span class="sync-step__number" aria-hidden="true">1</span><h2>この端末で QR を作る</h2></div><p>共有する端末で読み取って設定します。</p><label class="sync-device-name">端末名（任意・共有先端末からの確認用）<input value={deviceName} maxLength={24} autoComplete="off" onInput={(event) => setDeviceName(event.currentTarget.value)} /></label><button class="primary" type="button" onClick={() => { void beginNew(); }}>新しい同期グループを作る</button></section>
      <section class="sync-panel sync-choice"><div class="sync-step__heading"><span class="sync-step__number" aria-hidden="true">2</span><h2>別の端末のQRを読み取る</h2></div><div class="sync-actions"><button type="button" onClick={() => { if (scanning) stopCamera(); else void startCamera(); }}>{scanning ? 'カメラを閉じる' : 'カメラを開く'}</button><label class="sync-file">画像を選ぶ<input type="file" accept="image/*" onChange={(event) => { void readFile(event.currentTarget.files?.[0]); event.currentTarget.value = ''; }} /></label></div><video ref={videoRef} hidden={!scanning} muted playsInline aria-label="同期用 QR の読み取り" /><canvas ref={canvasRef} hidden /><label>招待リンク・共有コード<input class="sync-join-input" value={input} onInput={(event) => setInput(event.currentTarget.value)} autoComplete="off" /></label><button type="button" disabled={checking || !input.trim()} onClick={() => { const parsed = parsePairingPayload(input, window.location.href) ?? (isPairingCode(input) ? normalizeCode(input) : null); if (parsed) void verify(parsed); else setMessage('招待リンクまたは共有コードの形式を確認してください。'); }}>同期先を確認</button>
        {candidate && <div class="sync-confirm"><h3>参加の確認</h3><p>この端末の記録を<span class="sync-nowrap">同期グループ</span>と共有します。<br />{candidateName ? <>同期グループを作成した端末: <span class="sync-nowrap">{candidateName}</span></> : <span class="sync-nowrap">共有コードの末尾: {candidate.slice(-4)}</span>}</p><button type="button" disabled={!verified || checking} onClick={() => { void join(); }}>確認して参加する</button><button type="button" onClick={() => { setCandidate(null); setVerified(false); setMessage('参加を取り消しました。'); }}>取り消す</button></div>}
      </section>
    </div>}
    <p class="sync-license">QR ライブラリ: <a href={`${import.meta.env.BASE_URL}licenses/qrcode-LICENSE.txt`}>qrcode (MIT)</a>・<a href={`${import.meta.env.BASE_URL}licenses/jsqr-LICENSE.txt`}>jsQR (Apache 2.0)</a></p>
  </main>;
}
