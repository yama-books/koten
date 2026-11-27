import { buildCatalog } from './core.mjs';

// Diagnostic only. Do not treat mechanically generated prefixes as reviewed kimariji.
export function auditReadings(rows, readingVersion) {
  if (!Array.isArray(rows) || rows.length !== 100) throw new Error('100 poems required for audit');
  const catalog = buildCatalog(rows.map(({ id, no, reading }) => ({ id, no, reading })), { strict: false, readingVersion });
  const expected = { 1: 7, 2: 42, 3: 37, 4: 6, 5: 2, 6: 6 };
  const matchesExpected = Object.keys({ ...expected, ...catalog.histogram }).every(k => expected[k] === catalog.histogram[k]);
  return {
    readingVersion, histogram: catalog.histogram, expected, matchesExpected,
    reviewed: false,
    first: catalog.first.map(g => ({ prefix: g.prefix, count: g.poemIds.length })),
    groups: catalog.groups.map(g => ({ prefix: g.prefix, poemIds: g.poemIds, parentId: g.parentId })),
    poems: catalog.poems.map(p => ({ id: p.id, no: p.no, computedKimariji: p.fixed })),
  };
}
