/** Keeps source spelling intact: iteration marks are already expanded in the primary data. */
export function normalizeText(value: string) {
  return value.normalize('NFC').replace(/　/g, ' ').replace(/[ｰー]/g, 'ー').trim();
}
export function normalizeRow(row: string[]) { return row.map(normalizeText); }
