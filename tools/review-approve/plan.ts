import type { LedgerEntry } from './emit-yaml.ts';

export type Plan = { added: LedgerEntry[]; changed: LedgerEntry[]; unchanged: LedgerEntry[]; entries: LedgerEntry[] };
export type MissingFields = { missing: string[] };
export type BlankCandidate = { cardNo: number; ku: number };
export type Selector = { cards: number[]; ku?: number[] };
export type SetFields = { status?: unknown; confirmationMode?: unknown; confirmedBy?: unknown; confirmedOn?: unknown; batchEvidenceRef?: unknown; proposedBy?: unknown };

const statuses = ['approved', 'rejected', 'hold', 'pending'];
const modes = ['individual', 'batch'];
const proposers = ['human', 'ai'];

function key(entry: LedgerEntry) { return `${entry.cardNo}:${entry.ku ?? ''}`; }
function compare(left: LedgerEntry, right: LedgerEntry) { return Number(left.cardNo) - Number(right.cardNo) || Number(left.ku ?? 0) - Number(right.ku ?? 0); }
function same(left: LedgerEntry, right: LedgerEntry) { return JSON.stringify(left) === JSON.stringify(right); }

function pendingEntry(candidate: BlankCandidate): LedgerEntry {
  return { cardNo: candidate.cardNo, ku: candidate.ku, status: 'pending', confirmationMode: 'individual', batchEvidenceRef: null, proposedBy: 'human', confirmedBy: null, confirmedOn: null, note: null };
}

export function planSeed(name: string, candidates: BlankCandidate[], existing: LedgerEntry[]): Plan {
  if (name !== 'blanks') throw new Error('seed is only supported for blanks');
  const byKey = new Map(existing.map((entry) => [key(entry), entry]));
  const added: LedgerEntry[] = [], unchanged: LedgerEntry[] = [];
  for (const candidate of candidates) {
    const present = byKey.get(`${candidate.cardNo}:${candidate.ku}`);
    if (present) unchanged.push(present); else added.push(pendingEntry(candidate));
  }
  const candidateKeys = new Set(candidates.map((candidate) => `${candidate.cardNo}:${candidate.ku}`));
  const retained = existing.filter((entry) => !candidateKeys.has(key(entry)));
  return { added: added.sort(compare), changed: [], unchanged: unchanged.sort(compare), entries: [...unchanged, ...added, ...retained].sort(compare) };
}

export function planSet(name: string, selector: Selector, fields: SetFields, existing: LedgerEntry[]): Plan | MissingFields {
  const missing: string[] = [];
  if (!statuses.includes(String(fields.status))) missing.push('status');
  if (!modes.includes(String(fields.confirmationMode))) missing.push('confirmationMode');
  if (!proposers.includes(String(fields.proposedBy))) missing.push('proposedBy');
  const needsConfirmation = fields.status !== 'pending';
  if (needsConfirmation && (!fields.confirmedBy || typeof fields.confirmedBy !== 'string')) missing.push('confirmedBy');
  if (needsConfirmation && (!/^\d{4}-\d{2}-\d{2}$/.test(String(fields.confirmedOn)))) missing.push('confirmedOn');
  if (fields.confirmationMode === 'batch' && (!fields.batchEvidenceRef || typeof fields.batchEvidenceRef !== 'string')) missing.push('batchEvidenceRef');
  if (fields.confirmationMode === 'individual' && fields.batchEvidenceRef !== null) missing.push('batchEvidenceRef must be null for individual');
  if (missing.length) return { missing };
  const selected = (entry: LedgerEntry) => selector.cards.includes(Number(entry.cardNo)) && (name !== 'blanks' || !selector.ku || selector.ku.includes(Number(entry.ku)));
  const changed: LedgerEntry[] = [], unchanged: LedgerEntry[] = [];
  const entries = existing.map((entry) => {
    if (!selected(entry)) { unchanged.push(entry); return entry; }
    const next = { ...entry, ...fields } as LedgerEntry;
    if (same(entry, next)) unchanged.push(entry); else changed.push(next);
    return next;
  }).sort(compare);
  return { added: [], changed: changed.sort(compare), unchanged: unchanged.sort(compare), entries };
}

export function describePlan(plan: Plan): string {
  return `追加: ${plan.added.length} 行、変更: ${plan.changed.length} 行、据置: ${plan.unchanged.length} 行`;
}
