export const STATS_KEYS = [
  'clientNumber', 'localDate', 'product', 'grade', 'pageViews', 'buttonCounts',
  'entryCounts', 'questionTypeCounts', 'attemptCount', 'masteryAvg', 'masteryMax',
  'masteryDistribution', 'isOfficial', 'appVersion', 'dataVersion',
  'masteryRulesVersion', 'expiresAt',
] as const;

export const BUTTON_KEYS = ['start', 'answer', 'hint', 'reveal', 'history', 'report'] as const;
export const ENTRY_KEYS = ['quick', 'view', 'learn', 'review', 'exam', 'author'] as const;
const LEGACY_ENTRY_KEYS = ['quick', 'view', 'learn', 'review', 'exam'] as const;
export const QUESTION_TYPE_KEYS = ['blank', 'author'] as const;
export const MASTERY_BUCKET_COUNT = 5;

type CountMap<Key extends string> = Record<Key, number>;

export type StatsPayload = {
  clientNumber: string;
  localDate: string;
  product: 'hyakunin' | 'kanazukai';
  grade: string;
  pageViews: number;
  buttonCounts: CountMap<(typeof BUTTON_KEYS)[number]>;
  entryCounts: CountMap<(typeof ENTRY_KEYS)[number]>;
  questionTypeCounts: CountMap<(typeof QUESTION_TYPE_KEYS)[number]>;
  attemptCount: number;
  masteryAvg: number;
  masteryMax: number;
  masteryDistribution: number[];
  isOfficial: boolean;
  appVersion: string;
  dataVersion: number;
  masteryRulesVersion: number;
  expiresAt: string;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const clientNumberPattern = /^[a-z0-9]{20}$/;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnly(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every((key) => keys.includes(key));
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isCountMap(value: unknown, keys: readonly string[]): boolean {
  return isObject(value) && hasOnly(value, keys) && Object.values(value).every(isNonNegativeInteger);
}

export function isStatsPayload(value: unknown): value is StatsPayload {
  if (!isObject(value) || !hasOnly(value, STATS_KEYS)) return false;

  return typeof value.clientNumber === 'string' && clientNumberPattern.test(value.clientNumber)
    && typeof value.localDate === 'string' && datePattern.test(value.localDate)
    && (value.product === 'hyakunin' || value.product === 'kanazukai')
    && typeof value.grade === 'string'
    && isNonNegativeInteger(value.pageViews)
    && isCountMap(value.buttonCounts, BUTTON_KEYS)
    // 規則の移行期間は公開済みの5キー版も受ける。新規生成は常に6キー版である。
    && (isCountMap(value.entryCounts, ENTRY_KEYS) || isCountMap(value.entryCounts, LEGACY_ENTRY_KEYS))
    && isCountMap(value.questionTypeCounts, QUESTION_TYPE_KEYS)
    && isNonNegativeInteger(value.attemptCount)
    && typeof value.masteryAvg === 'number' && value.masteryAvg >= 0 && value.masteryAvg <= 100
    && typeof value.masteryMax === 'number' && value.masteryMax >= 0 && value.masteryMax <= 100
    && Array.isArray(value.masteryDistribution)
    && value.masteryDistribution.length === MASTERY_BUCKET_COUNT
    && value.masteryDistribution.every(isNonNegativeInteger)
    && typeof value.isOfficial === 'boolean'
    && typeof value.appVersion === 'string'
    && isNonNegativeInteger(value.dataVersion)
    && isNonNegativeInteger(value.masteryRulesVersion)
    && typeof value.expiresAt === 'string' && datePattern.test(value.expiresAt);
}
