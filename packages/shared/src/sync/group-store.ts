import { isPairingCode } from './pairing.ts';
import { normalizeCode } from './crypto.ts';

export const GROUP_KEY = 'koten:shared-group:v1';
export type GroupStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export function savedGroup(storage: GroupStore): string | null {
  const raw = storage.getItem(GROUP_KEY);
  if (raw === null) return null;
  const value = JSON.parse(raw);
  if (value?.version !== 1 || !isPairingCode(value.code)) throw new Error('共有グループの設定を確認してください。');
  return normalizeCode(value.code);
}
/** Persist only after explicit confirmation. A scanner never calls this. */
export function saveGroup(storage: GroupStore, code: string, expected: string | null): void {
  if (!isPairingCode(code)) throw new Error('共有コードの形式が違います。');
  const current = savedGroup(storage);
  if (current !== expected && current !== normalizeCode(code)) throw new Error('別の画面で共有グループが変更されました。もう一度確認してください。');
  storage.setItem(GROUP_KEY, JSON.stringify({ version: 1, code: normalizeCode(code) }));
}
