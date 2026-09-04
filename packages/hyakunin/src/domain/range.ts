export interface CardRange {
  from: number;
  to: number;
  hadInvalidQuery: boolean;
}

function parseCardNo(value: string | null): number | null {
  if (value === null) return null;
  if (!/^\d+$/.test(value)) return Number.NaN;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 100 ? parsed : Number.NaN;
}

export function parseRange(search: string): CardRange {
  const params = new URLSearchParams(search);
  const rawFrom = parseCardNo(params.get('from'));
  const rawTo = parseCardNo(params.get('to'));

  if (Number.isNaN(rawFrom) || Number.isNaN(rawTo)) return { from: 1, to: 100, hadInvalidQuery: true };
  if (rawFrom === null && rawTo === null) return { from: 1, to: 100, hadInvalidQuery: false };

  const from = rawFrom ?? 1;
  const to = rawTo ?? from;
  return { from: Math.min(from, to), to: Math.max(from, to), hadInvalidQuery: false };
}

export function normalizeRange(from: number, to: number): Omit<CardRange, 'hadInvalidQuery'> {
  const safeFrom = Number.isInteger(from) && from >= 1 && from <= 100 ? from : 1;
  const safeTo = Number.isInteger(to) && to >= 1 && to <= 100 ? to : 100;
  return { from: Math.min(safeFrom, safeTo), to: Math.max(safeFrom, safeTo) };
}

const MAX_CHUNK_SIZE = 20;

export function splitIntoChunks(range: Pick<CardRange, 'from' | 'to'>): number[][] {
  const cardNumbers = Array.from({ length: range.to - range.from + 1 }, (_, index) => range.from + index);
  const chunks: number[][] = [];
  for (let index = 0; index < cardNumbers.length; index += MAX_CHUNK_SIZE) {
    chunks.push(cardNumbers.slice(index, index + MAX_CHUNK_SIZE));
  }
  return chunks;
}

export function chunkProgress(
  range: Pick<CardRange, 'from' | 'to'>,
  chunkIndex: number,
  confirmed: Set<number>,
): { remainingInRange: number; chunkIndex: number; chunkCount: number } {
  const chunks = splitIntoChunks(range);
  const remainingInRange = chunks.flat().filter((cardNo) => !confirmed.has(cardNo)).length;
  return { remainingInRange, chunkIndex, chunkCount: chunks.length };
}

export function nextChunkIndex(range: Pick<CardRange, 'from' | 'to'>, confirmed: Set<number>): number {
  const chunks = splitIntoChunks(range);
  let selectedIndex = 0;
  let mostUnconfirmed = -1;

  chunks.forEach((chunk, index) => {
    const unconfirmed = chunk.filter((cardNo) => !confirmed.has(cardNo)).length;
    if (unconfirmed > mostUnconfirmed) {
      selectedIndex = index;
      mostUnconfirmed = unconfirmed;
    }
  });

  return selectedIndex;
}
