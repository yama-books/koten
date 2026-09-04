export const RECOMMEND_RULES_VERSION = 1 as const;

/** APP_SPEC §8.2「復習期限」の表: 赤1日・黄3日・青7日・緑14日の初期試験候補。 */
export const REVIEW_INTERVAL_DAYS = { red: 1, yellow: 3, blue: 7, green: 14 } as const;

/**
 * APP_SPEC §8.2 段2「直近3日以内」の設計係数。
 * 裁定 D-19（2026-08-31・親担当）: 「直近 3 日以内」とは今日との暦日差が 3 以下、
 * すなわち今日・1日前・2日前・3日前を含み、4日前を含まない。境界は試験 A-5 が固定する。
 */
export const RECENT_TROUBLE_DAYS = 3 as const;
