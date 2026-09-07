import type { UserSettings } from '@koten/shared/domain/event';
import type { ApplicationPort } from './adapters/indexeddb-port.ts';

/**
 * 保存領域に何も無い端末のためだけの初期値。**画面はこれを保存領域へ書き戻さない。**
 * 画面ごとに同じ形を持って配ると、読み込んでいないほうが保存領域を上書きし、
 * 学年と「確認済み」の印が消える（発注074 工程1）。
 */
export const initialSettings: UserSettings = {
  key: 'user',
  reading: 'no-ruby',
  writing: 'vertical',
  order: 'number',
  soundEnabled: false,
  noticeConfirmed: false,
};

const legacyOrientationKey = 'hyakunin:orientation';

/**
 * 設定の唯一の出所。**保存領域を読み、無いときにだけ初期値を作って保存する。**
 * 保存済みの設定は、ここが知らない項目（`grade`・`statsOptOut`・`deviceId`）ごとそのまま返す。
 */
export async function loadUserSettings(port: Pick<ApplicationPort, 'loadSettings' | 'saveSettings'>): Promise<UserSettings> {
  const saved = await port.loadSettings();
  if (saved) return saved;
  const migrated: UserSettings = {
    ...initialSettings,
    writing: window.localStorage?.getItem(legacyOrientationKey) === 'horizontal' ? 'horizontal' : 'vertical',
  };
  await port.saveSettings(migrated);
  window.localStorage?.removeItem(legacyOrientationKey);
  return migrated;
}
