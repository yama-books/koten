import { BUTTON_KEYS, ENTRY_KEYS, QUESTION_TYPE_KEYS } from '../../packages/shared/src/telemetry/registry.ts';

export type StatsDocument = { collection: string; id: string; data: Record<string, unknown> };

type CountMap = Record<string, number>;

export type Totals = {
  pageViews: number;
  attemptCount: number;
  buttonCounts: CountMap;
  entryCounts: CountMap;
  questionTypeCounts: CountMap;
};

export type DailyRow = Totals & { localDate: string; deviceCount: number };

export type Summary = {
  period: { from: string; to: string } | null;
  documentCount: number;
  deviceCount: number;
  collections: string[];
  totals: Totals;
  daily: DailyRow[];
  warnings: string[];
};

const COUNT_MAPS = [
  { field: 'buttonCounts', keys: BUTTON_KEYS },
  { field: 'entryCounts', keys: ENTRY_KEYS },
  { field: 'questionTypeCounts', keys: QUESTION_TYPE_KEYS },
] as const;

function zeros(keys: readonly string[]): CountMap {
  return Object.fromEntries(keys.map((key) => [key, 0]));
}

function emptyTotals(): Totals {
  return {
    pageViews: 0,
    attemptCount: 0,
    buttonCounts: zeros(BUTTON_KEYS),
    entryCounts: zeros(ENTRY_KEYS),
    questionTypeCounts: zeros(QUESTION_TYPE_KEYS),
  };
}

function number(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/**
 * 1 件を足し込む。**欠けた項目は 0 として扱う**——`author` 入口は後から足したので
 * 古い文書には無く、欠けを素通しすると `NaN` が伝播して合計が全部消える。
 */
function add(into: Totals, data: Record<string, unknown>): void {
  into.pageViews += number(data.pageViews);
  into.attemptCount += number(data.attemptCount);
  for (const { field, keys } of COUNT_MAPS) {
    const source = (data[field] ?? {}) as Record<string, unknown>;
    for (const key of keys) into[field][key] = (into[field][key] ?? 0) + number(source[key]);
  }
}

/** 知らないキーは合計へ入れず、警告として名指しする。**捨てると次も気づけない。** */
function driftWarnings(documents: readonly StatsDocument[]): string[] {
  const unknown = new Set<string>();
  for (const { data } of documents) {
    for (const { field, keys } of COUNT_MAPS) {
      const source = (data[field] ?? {}) as Record<string, unknown>;
      for (const key of Object.keys(source)) if (!keys.includes(key as never)) unknown.add(`${field}.${key}`);
    }
  }
  return [...unknown].sort().map((key) => `知らない項目が届いている: ${key}（合計へ入れていない）`);
}

export function summarize(documents: readonly StatsDocument[]): Summary {
  const totals = emptyTotals();
  const byDate = new Map<string, { totals: Totals; devices: Set<string> }>();
  const devices = new Set<string>();
  const collections = new Set<string>();

  for (const item of documents) {
    const localDate = String(item.data.localDate ?? '');
    const clientNumber = String(item.data.clientNumber ?? '');
    collections.add(item.collection);
    devices.add(clientNumber);
    add(totals, item.data);
    let day = byDate.get(localDate);
    if (day === undefined) {
      day = { totals: emptyTotals(), devices: new Set() };
      byDate.set(localDate, day);
    }
    day.devices.add(clientNumber);
    add(day.totals, item.data);
  }

  // **昇順に並べ替える。** Firestore は文書 ID 順で返し、日付順ではない。
  const dates = [...byDate.keys()].sort();
  const daily: DailyRow[] = dates.map((localDate) => {
    const day = byDate.get(localDate)!;
    return { localDate, deviceCount: day.devices.size, ...day.totals };
  });

  return {
    period: dates.length === 0 ? null : { from: dates[0]!, to: dates[dates.length - 1]! },
    documentCount: documents.length,
    deviceCount: devices.size,
    collections: [...collections].sort(),
    totals,
    daily,
    warnings: driftWarnings(documents),
  };
}
