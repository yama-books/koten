export const appConfig = {
  projectName: '古典学習帳', publisher: 'koten contributors', repositoryUrl: 'https://github.com/yama-books/koten', appVersion: '0.2.0', dataVersion: 1, masteryRulesVersion: 1,
  officialReleaseDate: null as string | null, firebaseEnabled: false, isOfficial: false,
  firebase: { apiKey: 'AIzaSyCDOo2YfCxkTWAGpPotCzabWtpJN_kK0Ko', authDomain: 'koten-fde43.firebaseapp.com', projectId: 'koten-fde43', appId: '1:324835470506:web:b81389fcaa9bbfe49834d3', messagingSenderId: '324835470506', storageBucket: 'koten-fde43.firebasestorage.app' },
  appCheckSiteKey: '6LfypaYtAAAAAOpjJ_83HMURnkXIH_iJ9kuwEl0O',
  // App Check のトークンを取りに行くか。**偽の間は reCAPTCHA を1度も読み込まない。**
  // 2026-09-13 の裁定（案2）: Firestore の施行（enforce）が入るまで取得そのものを止める。
  // 施行が無いと規則はトークンを見ない（`firestore.rules` に `request.app` が無い）ので、
  // 取っても偽造は防げず、右下のバッジと Google への往復だけが残るためである。
  // **真へ戻す順序**: 登録ドメインの確認 → 規則へ `request.app != null` → 施行 → ここを真。
  appCheckEnabled: false as boolean,
  features: { auxiliaryVerbs: false, sync: false, karuta: false, versus: false, modernTranslation: false },
  // `unitName` は `packages/<名前>` の置き場、`basePath` は公開される URL の段である。
  // 2026-09-04 に公開段だけを /100/ /kana/ へ改めたので、両者は意図的に食い違っている。
  products: {
    hyakunin: { unitName: 'hyakunin', basePath: '/100/', displayName: '百人一首練習帳' },
    kanazukai: { unitName: 'kanazukai', basePath: '/kana/', displayName: '歴史的仮名遣い確認ツール' },
  },
} as const;
export type ProductId = keyof typeof appConfig.products;
