import type { UserSettings } from '@koten/shared/domain/event';
import { isPairingCode } from '@koten/shared/sync/pairing';

const cookieName = 'hyakunin_sync_install';
const cookiePath = new URL(import.meta.env.BASE_URL, window.location.origin).pathname;
export function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches === true
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** iOS 17.2以降で追加時にコピーされるcookieに、同期先だけを渡す。記録は同期先から復元する。 */
export function writeInstallHandoff(settings: UserSettings | null) {
  const code = settings?.syncEnabled ? settings.syncCode : undefined;
  document.cookie = `${cookieName}=${code && isPairingCode(code) ? code : ''}; Path=${cookiePath}; Max-Age=${code ? 604800 : 0}; SameSite=Strict${window.location.protocol === 'https:' ? '; Secure' : ''}`;
}

export function readInstallHandoff(): string | null {
  if (!isStandalone()) return null;
  const code = document.cookie.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  return code && isPairingCode(code) ? code : null;
}
