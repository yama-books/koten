/** 文字列から判定できない文法・語義・語境界は、呼出側が UTF-16 index で明示する。 */
export type ProtectedRange = Readonly<{ start: number; end: number; ruleId?: string }>;

export type RuleContext = Readonly<{
  protectedRanges?: readonly ProtectedRange[];
  h1WordInitialPositions?: readonly number[];
  h1CompoundInitialPositions?: readonly number[];
  h1ParticlePositions?: readonly number[];
  w2ParticlePositions?: readonly number[];
  d1ExceptionRanges?: readonly ProtectedRange[];
  k1Ranges?: readonly ProtectedRange[];
  n1Positions?: readonly number[];
}>;
