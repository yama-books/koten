export type MasteryColor = 'gray' | 'red' | 'yellow' | 'blue' | 'green';

export type MasteryDisplay = Readonly<{
  percent: number;
  color: MasteryColor;
  description: string;
}>;

/** Applies the approved five color boundaries while retaining a text equivalent. */
export function masteryDisplay(score: number): MasteryDisplay {
  const percent = Math.max(0, Math.min(100, Math.trunc(score)));
  const color: MasteryColor = percent === 0
    ? 'gray'
    : percent < 30
      ? 'red'
      : percent < 60
        ? 'yellow'
        : percent < 85
          ? 'blue'
          : 'green';
  return { percent, color, description: `習熟度 ${percent}%` };
}
