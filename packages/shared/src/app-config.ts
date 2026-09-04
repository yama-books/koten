export const appConfig = {
  projectName: '古典学習帳', publisher: 'koten contributors', repositoryUrl: '', appVersion: '0.1.0', dataVersion: 1, masteryRulesVersion: 1,
  officialReleaseDate: null as string | null, firebaseEnabled: false, isOfficial: false,
  firebase: { apiKey: 'AIzaSyCDOo2YfCxkTWAGpPotCzabWtpJN_kK0Ko', authDomain: 'koten-fde43.firebaseapp.com', projectId: 'koten-fde43', appId: '1:324835470506:web:b81389fcaa9bbfe49834d3', messagingSenderId: '324835470506', storageBucket: 'koten-fde43.firebasestorage.app' },
  appCheckSiteKey: '6LfypaYtAAAAAOpjJ_83HMURnkXIH_iJ9kuwEl0O',
  features: { auxiliaryVerbs: false, sync: false, karuta: false, versus: false, modernTranslation: false },
  products: {
    hyakunin: { unitName: 'hyakunin', basePath: '/hyakunin/', displayName: '百人一首練習帳' },
    kanazukai: { unitName: 'kanazukai', basePath: '/kanazukai/', displayName: '歴史的仮名遣い確認ツール' },
  },
} as const;
export type ProductId = keyof typeof appConfig.products;
