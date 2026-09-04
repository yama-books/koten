export type OrderMode = 'number' | 'random';

export const ORDER_RULES_VERSION = 1 as const;

export function createSeed(randomSource: () => number): string {
  return `${Math.floor(randomSource() * 0x1_0000_0000).toString(36)}-${Math.floor(randomSource() * 0x1_0000_0000).toString(36)}`;
}

function seededRandom(seed: string): () => number {
  let state = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    state ^= seed.charCodeAt(index);
    state = Math.imul(state, 16777619);
  }

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 0x1_0000_0000;
  };
}

export function orderCardNumbers(cardNumbers: number[], mode: OrderMode, seed: string): number[] {
  if (mode === 'number') return [...cardNumbers].sort((left, right) => left - right);

  const ordered = [...cardNumbers];
  const random = seededRandom(seed);
  for (let index = ordered.length - 1; index > 0; index -= 1) {
    const targetIndex = Math.floor(random() * (index + 1));
    [ordered[index], ordered[targetIndex]] = [ordered[targetIndex], ordered[index]];
  }
  return ordered;
}

export function canChangeOrder(state: { questionIndexInChunk: number }): boolean {
  return state.questionIndexInChunk === 0;
}
