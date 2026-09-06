/**
 * 日次の画面カウンタ。**台帳から導けない3つだけ**を数える（発注061 §1b）。
 *
 * 解答数・ヒント・開始・報告・入口・問題種別・習熟度は、すべてイベント／回／報告から導出できる。
 * それらをここで数え直すと、画面の記録と統計が食い違ったときに
 * どちらが正しいか誰にも分からなくなる。**この3つ以外を足さないこと。**
 */
export type UiCounterKey = 'pageViews' | 'reveal' | 'history';

export type DailyCounters = Readonly<{
  localDate: string;
  pageViews: number;
  reveal: number;
  history: number;
}>;

export function emptyCounters(localDate: string): DailyCounters {
  return { localDate, pageViews: 0, reveal: 0, history: 0 };
}

/**
 * 1 つ数える。**日付が変わっていれば作り直す**——前日の数を今日の分として送らないためである。
 * 保存が空・壊れている場合も作り直す。数えられないより、その日の分から数え直す方がよい。
 */
export function bumpCounter(current: unknown, localDate: string, key: UiCounterKey): DailyCounters {
  const base = isDailyCounters(current) && current.localDate === localDate ? current : emptyCounters(localDate);
  return { ...base, [key]: base[key] + 1 };
}

/** 保存から読んだ値をそのまま信じない。形が違えばその日の空として扱う。 */
export function readCounters(current: unknown, localDate: string): DailyCounters {
  return isDailyCounters(current) && current.localDate === localDate ? current : emptyCounters(localDate);
}

const isCount = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0;

export function isDailyCounters(value: unknown): value is DailyCounters {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.localDate === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(candidate.localDate)
    && isCount(candidate.pageViews)
    && isCount(candidate.reveal)
    && isCount(candidate.history);
}
