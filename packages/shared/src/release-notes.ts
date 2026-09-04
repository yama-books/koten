import { appConfig } from './app-config.ts';

/**
 * 憲章 §10 の項目 7（README・仕様・使い方・画面文言が一致する）と項目 8（既知の制約を
 * 「完全対応」などの表現で隠していない）。
 *
 * 制約は README と画面の両方に出る。**二重に書くと必ずずれる**ので、文言はここだけに置き、
 * `tests/unit/readme-claims.test.ts` が「この各行が README に現れること」を検査する。
 * 直すときは、まず README を直してからここを合わせる（README のほうが文脈を持つ）。
 */
export const KNOWN_LIMITATIONS = [
  '匿名の利用統計は送信しません',
  '報告した内容は送信されません',
  '穴埋めは「句」単位だけです',
  '読みの異同がある 10 首は、人の校正が済んでいません',
  '縦書きの改行位置は、まだ人が校正していません',
  '作者の別名・有職読みの正答範囲は、まだ人が校正していません',
  '実機記録は、まだ取っていません',
] as const;

export const releaseStage = appConfig.isOfficial ? 'official' : 'test';

/** 画面に出す一行。**テスト公開であることを名乗らないのは、隠していることになる。** */
export const releaseStageLabel = releaseStage === 'official'
  ? `版 ${appConfig.appVersion}`
  : `テスト公開版 ${appConfig.appVersion}・正式公開ではありません`;
