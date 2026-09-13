import assert from 'node:assert/strict';
import { toolPresent, toolTest } from './guard.ts';
import { encodeStatsFields } from '../../../packages/shared/src/telemetry/transport.ts';
import { payload } from '../telemetry/fixtures.ts';

const { decodeFields } = toolPresent ? await import('../../../tools/stats-report/decode.ts') : { decodeFields: null as never };

/**
 * **fixture を手書きしない。** 送信側の `encodeStatsFields()` をそのまま呼んで作る。
 * 手で書くと、送る形が変わったときに fixture だけ古いまま緑を出し続ける。
 *
 * `payload()` の数は項目ごとに違う値が入っている。**同じ値や 0 ばかりだと、
 * 項目を取り違える復号でも往復が通る。**
 */
toolTest('復号: 送信側が作った形を復号すると元へ戻る', () => {
  const original = payload();
  const decoded = decodeFields(encodeStatsFields(original));
  // `expiresAt` だけは送信時に時刻形式へ広げている。戻り値もその形のままが正しい。
  assert.deepEqual(decoded, { ...original, expiresAt: '2027-10-08T00:00:00.000Z' });
});

toolTest('復号: integerValue は文字列で来るが数として返る', () => {
  const decoded = decodeFields(encodeStatsFields(payload())) as { pageViews: unknown; buttonCounts: Record<string, unknown> };
  // 文字列のまま足すと "3" + "4" が "34" になり、合計だけが静かに壊れる。
  assert.equal(typeof decoded.pageViews, 'number');
  assert.equal(typeof decoded.buttonCounts.start, 'number');
});

toolTest('復号: 値を持たない arrayValue は空の配列になる', () => {
  // Firestore は空配列を `{ arrayValue: {} }` で返す。`values` が無い。
  assert.deepEqual(decodeFields({ masteryDistribution: { arrayValue: {} } }), { masteryDistribution: [] });
});

toolTest('復号: 知らない形の値は黙って捨てず、どの項目かを言って止まる', () => {
  assert.throws(
    () => decodeFields({ なにか: { geoPointValue: { latitude: 1, longitude: 2 } } }),
    /なにか/,
  );
});
