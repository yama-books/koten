/* Import/export for the vintage-kana learning record. No network operations. */
(function (root) {
  'use strict';
  const KEYS = Object.freeze({
    learning: 'vintage-kana:learning-events:v1',
    decipher: 'vintage-kana:decipher-history:v1',
    level: 'vintage-kana:decipher-level:v1',
  });
  const APP = 'vintage-kana-record';
  const VERSION = 1;
  const MAX_BYTES = 5 * 1024 * 1024;
  const parseArray = (value, label) => {
    if (!Array.isArray(value)) throw new Error(label + ' が配列ではありません。');
    return value;
  };
  const isLearning = (v) => v && typeof v === 'object'
    && typeof v.id === 'string' && v.id.length > 0
    && ['reading', 'jibo'].includes(v.mode)
    && ['correct', 'incorrect'].includes(v.outcome)
    && typeof v.at === 'string';
  const isDecipher = (v) => v && typeof v === 'object'
    && typeof v.id === 'string' && v.id.length > 0
    && typeof v.phraseId === 'string'
    && typeof v.reading === 'string'
    && typeof v.correct === 'boolean'
    && Array.isArray(v.glyphs);
  function validateArray(values, predicate, label) {
    parseArray(values, label);
    if (!values.every(predicate)) throw new Error(label + ' に無効な記録があります。');
    if (new Set(values.map(v => v.id)).size !== values.length)
      throw new Error(label + ' に重複IDがあります。');
    return values;
  }
  function mergeById(local, incoming) {
    const seen = new Set(local.map(v => v.id));
    const output = local.slice();
    for (const record of incoming) {
      if (!seen.has(record.id)) { seen.add(record.id); output.push(record); }
    }
    return output;
  }
  function readJson(storage, key, fallback) {
    const raw = storage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  }
  function current(storage) {
    return {
      learningEvents: validateArray(readJson(storage, KEYS.learning, []), isLearning, '端末内の読み・字母記録'),
      decipherHistory: validateArray(readJson(storage, KEYS.decipher, []), isDecipher, '端末内の解読記録'),
      decipherLevel: level(readJson(storage, KEYS.level, 1)),
    };
  }
  function level(v) {
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1 || n > 5) throw new Error('解読レベルが不正です。');
    return n;
  }
  function exportRecord(storage) {
    return JSON.stringify({
      app: APP, exportVersion: VERSION, exportedAt: new Date().toISOString(),
      ...current(storage),
    }, null, 2);
  }
  function decodeArchive(text) {
    if (typeof text !== 'string' || text.length > MAX_BYTES)
      throw new Error('ファイルが大きすぎます。');
    const data = JSON.parse(text);
    if (!data || data.app !== APP || data.exportVersion !== VERSION)
      throw new Error('変体仮名の記録ファイルではありません。');
    return {
      learningEvents: validateArray(data.learningEvents, isLearning, '読み・字母記録'),
      decipherHistory: validateArray(data.decipherHistory, isDecipher, '解読記録'),
      decipherLevel: level(data.decipherLevel),
    };
  }
  function previewImport(storage, text) {
    const incoming = decodeArchive(text);
    const before = current(storage);
    const after = {
      learningEvents: mergeById(before.learningEvents, incoming.learningEvents),
      decipherHistory: mergeById(before.decipherHistory, incoming.decipherHistory),
      decipherLevel: Math.max(before.decipherLevel, incoming.decipherLevel),
    };
    // The existing decipher engine reads a maximum of 2,000 records. Reject rather
    // than silently truncate or alter historic attempts.
    if (after.decipherHistory.length > 2000)
      throw new Error('解読記録が2000件を超えました。統合方法の確認が必要です。');
    return {
      after,
      addedLearning: after.learningEvents.length - before.learningEvents.length,
      addedDecipher: after.decipherHistory.length - before.decipherHistory.length,
    };
  }
  function commitImport(storage, plan) {
    if (!plan || !plan.after) throw new Error('統合プレビューがありません。');
    const entries = [
      [KEYS.learning, JSON.stringify(plan.after.learningEvents)],
      [KEYS.decipher, JSON.stringify(plan.after.decipherHistory)],
      [KEYS.level, JSON.stringify(plan.after.decipherLevel)],
    ];
    const previous = entries.map(([key]) => [key, storage.getItem(key)]);
    try {
      entries.forEach(([key, value]) => storage.setItem(key, value));
    } catch (error) {
      previous.forEach(([key, value]) => {
        try { if (value === null) storage.removeItem(key); else storage.setItem(key, value); }
        catch { /* keep the original import error */ }
      });
      throw error;
    }
  }
  root.VintageKanaRecordTransfer = Object.freeze({
    KEYS, exportRecord, decodeArchive, previewImport, commitImport, mergeById,
  });
})(typeof window === 'undefined' ? globalThis : window);
