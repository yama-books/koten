export const RECOMMEND_RULES_VERSION = 1 as const;

/** APP_SPEC §8.2「復習期限」の表: 赤1日・黄3日・青7日・緑14日の初期試験候補。 */
export const REVIEW_INTERVAL_DAYS = { red: 1, yellow: 3, blue: 7, green: 14 } as const;

/**
 * APP_SPEC §8.2 段2「直近3日以内」の設計係数。
 * 裁定 D-19（2026-08-31・親担当）: 「直近 3 日以内」とは今日との暦日差が 3 以下、
 * すなわち今日・1日前・2日前・3日前を含み、4日前を含まない。境界は試験 A-5 が固定する。
 */
export const RECENT_TROUBLE_DAYS = 3 as const;

/**
 * 段0「解いているのに、まちがいが多い」の設計係数（依頼者・2026-09-22）。
 *
 * **取り組み量の下限を置く理由**——2 回解いて 1 回まちがえただけの歌を
 * 「まちがいが多い」と呼ぶと、始めたばかりの歌がすべて先頭に並ぶ。
 * **率の下限を置く理由**——たまたま 1 回外しただけの歌を最優先にしない。
 *
 * 数え方: 思い出す方式の解答を 1 回と数える。まちがいは「誤答」と「わからない(×)」。
 * 「△」は**分母には入れるが、まちがいには数えない**——部分的に言えている。
 */
export const HIGH_ERROR_MIN_ATTEMPTS = 4 as const;
export const HIGH_ERROR_RATE = 0.4 as const;
