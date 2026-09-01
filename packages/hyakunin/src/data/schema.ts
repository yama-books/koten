export type ReadingStatus = 'confirmed' | 'review';

export interface Poem {
  author: { aliases: string[]; canonical: string; confirmed: boolean };
  cardNo: number;
  dataVersion: number;
  kami: string;
  ku: [string, string, string, string, string];
  poemId: string;
  reading: {
    historical: { author: string; ku: [string, string, string, string, string] };
    modern: { author: string; ku: [string, string, string, string, string] };
    status: ReadingStatus;
  };
  shimo: string;
  sourceRef: string;
  text: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringTuple(value: unknown): value is [string, string, string, string, string] {
  return Array.isArray(value) && value.length === 5 && value.every((item) => typeof item === 'string' && item.length > 0);
}

function isReading(value: unknown): value is Poem['reading']['modern'] {
  return isRecord(value) && typeof value.author === 'string' && isStringTuple(value.ku);
}

function isPoem(value: unknown, expectedCardNo: number): value is Poem {
  if (!isRecord(value) || !isRecord(value.author) || !isRecord(value.reading)) return false;
  return value.cardNo === expectedCardNo
    && value.poemId === `p${String(expectedCardNo).padStart(3, '0')}`
    && value.dataVersion === 1
    && typeof value.kami === 'string'
    && typeof value.shimo === 'string'
    && typeof value.text === 'string'
    && typeof value.sourceRef === 'string'
    && isStringTuple(value.ku)
    && typeof value.author.canonical === 'string'
    && typeof value.author.confirmed === 'boolean'
    && Array.isArray(value.author.aliases)
    && value.author.aliases.every((alias) => typeof alias === 'string')
    && isReading(value.reading.historical)
    && isReading(value.reading.modern)
    && (value.reading.status === 'confirmed' || value.reading.status === 'review');
}

export function parsePoems(value: unknown): Poem[] {
  if (!Array.isArray(value) || value.length !== 100) {
    throw new TypeError('poems must contain exactly 100 records');
  }

  value.forEach((poem, index) => {
    if (!isPoem(poem, index + 1)) throw new TypeError(`invalid poem record at ${index + 1}`);
  });

  return value;
}
