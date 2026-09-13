/**
 * Firestore REST の Value 形式を素の値へ戻す。
 *
 * **置き場は `tools/` である。** `packages/shared/src/telemetry/` へ入れると
 * X-8/X-9（禁止語の検査対象は名指しの 6 ファイル）の 7 ファイル目になって赤くなる。
 */

/** 知らない形に出会ったら止まる。**黙って捨てると、項目が増えたことに次も気づけない。** */
export class UnknownValueError extends Error {}

function decodeValue(key: string, value: unknown): unknown {
  if (typeof value !== 'object' || value === null) throw new UnknownValueError(`${key}: Value の形をしていない`);
  const shape = value as Record<string, unknown>;

  if ('nullValue' in shape) return null;
  if ('stringValue' in shape) return shape.stringValue;
  if ('booleanValue' in shape) return shape.booleanValue;
  if ('timestampValue' in shape) return shape.timestampValue;
  if ('doubleValue' in shape) return Number(shape.doubleValue);
  // **integerValue は文字列で返る。** `Number()` を外すと合計だけが静かに壊れる。
  if ('integerValue' in shape) return Number(shape.integerValue);
  if ('mapValue' in shape) {
    const map = shape.mapValue as { fields?: Record<string, unknown> };
    return decodeFields(map.fields ?? {}, key);
  }
  if ('arrayValue' in shape) {
    // 空配列は `{ arrayValue: {} }` で返る——`values` が無い。
    const array = shape.arrayValue as { values?: unknown[] };
    return (array.values ?? []).map((item, index) => decodeValue(`${key}[${index}]`, item));
  }
  throw new UnknownValueError(`${key}: 知らない Value の形（${Object.keys(shape).join(', ')}）`);
}

export function decodeFields(fields: Record<string, unknown>, path = ''): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, decodeValue(path === '' ? key : `${path}.${key}`, value)]),
  );
}
