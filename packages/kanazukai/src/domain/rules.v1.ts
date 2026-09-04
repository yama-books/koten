export const KANAZUKAI_RULES_VERSION = 1 as const;

export type KanazukaiRuleId =
  | 'H1' | 'H1-a' | 'H1-b' | 'H1-c' | 'W1' | 'W2' | 'W2-a' | 'D1'
  | 'D1-a' | 'K1' | 'N1' | 'L1' | 'L2' | 'L3' | 'L4' | 'S1';

export type KanazukaiRule = Readonly<{
  ruleId: KanazukaiRuleId;
  chipLabel: string | null;
  parentRuleId: KanazukaiRuleId | null;
  applicationOrder: number;
}>;

/** 仮名遣い規則_一次データ.md の ruleId・チップ表示・親規則IDをそのまま写した定数。 */
export const KANAZUKAI_RULES: readonly KanazukaiRule[] = [
  { ruleId: 'H1', chipLabel: 'は→わ', parentRuleId: null, applicationOrder: 2 },
  { ruleId: 'H1-a', chipLabel: '語頭はそのまま', parentRuleId: 'H1', applicationOrder: 1 },
  { ruleId: 'H1-b', chipLabel: '複合語はそのまま', parentRuleId: 'H1', applicationOrder: 1 },
  { ruleId: 'H1-c', chipLabel: '助詞は・へ', parentRuleId: 'H1', applicationOrder: 1 },
  { ruleId: 'W1', chipLabel: 'ゐゑ→いえ', parentRuleId: null, applicationOrder: 2 },
  { ruleId: 'W2', chipLabel: 'を→お', parentRuleId: null, applicationOrder: 2 },
  { ruleId: 'W2-a', chipLabel: '助詞を', parentRuleId: 'W2', applicationOrder: 1 },
  { ruleId: 'D1', chipLabel: 'ぢづ→じず', parentRuleId: null, applicationOrder: 2 },
  { ruleId: 'D1-a', chipLabel: 'ぢづ のまま', parentRuleId: 'D1', applicationOrder: 1 },
  { ruleId: 'K1', chipLabel: 'くわ→か', parentRuleId: null, applicationOrder: 2 },
  { ruleId: 'N1', chipLabel: 'む→ん', parentRuleId: null, applicationOrder: 2 },
  { ruleId: 'L1', chipLabel: 'au→ō', parentRuleId: null, applicationOrder: 3 },
  { ruleId: 'L2', chipLabel: 'iu→yū', parentRuleId: null, applicationOrder: 3 },
  { ruleId: 'L3', chipLabel: 'eu→yō', parentRuleId: null, applicationOrder: 3 },
  { ruleId: 'L4', chipLabel: null, parentRuleId: null, applicationOrder: 3 },
  { ruleId: 'S1', chipLabel: '小さく書く', parentRuleId: null, applicationOrder: 4 },
] as const;
