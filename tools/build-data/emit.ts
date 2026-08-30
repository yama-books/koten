import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stable(item)]));
  return value;
}
export const serialize = (value: unknown) => `${JSON.stringify(stable(value), null, 2)}\n`;
export function outputFiles(directory: string, data: Record<string, unknown>) {
  return Object.entries(data).map(([name, value]) => ({ file: path.join(directory, `${name}.json`), content: serialize(value) }));
}
export function emit(directory: string, data: Record<string, unknown>) {
  mkdirSync(directory, { recursive: true });
  for (const { file, content } of outputFiles(directory, data)) writeFileSync(file, content, 'utf8');
}
