import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    const keys = entries.map(([key]) => key);
    const reviewNames = ['authors', 'readings', 'kugire', 'layout', 'blanks'];
    const reviewStatuses = ['pending', 'approved', 'rejected', 'hold'];
    const order = reviewNames.every((key) => keys.includes(key)) ? reviewNames : reviewStatuses.every((key) => keys.includes(key)) ? reviewStatuses : keys.sort((a, b) => a.localeCompare(b));
    return Object.fromEntries(order.map((key) => [key, stable((value as Record<string, unknown>)[key])]));
  }
  return value;
}
export const serialize = (value: unknown) => `${JSON.stringify(stable(value), null, 2)}\n`;
export function outputFiles(directory: string, data: Record<string, unknown>) {
  const fileNames: Record<string, string> = { layoutHints: 'layout-hints', questionsBlank: 'questions.blank', questionsAuthor: 'questions.author' };
  return Object.entries(data).filter(([name]) => name !== 'review').map(([name, value]) => ({ file: path.join(directory, `${fileNames[name] ?? name}.json`), content: serialize(value) }));
}
export function emit(directory: string, data: Record<string, unknown>) {
  mkdirSync(directory, { recursive: true });
  for (const { file, content } of outputFiles(directory, data)) writeFileSync(file, content, 'utf8');
}
