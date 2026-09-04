import type { Normalization, Question } from '../domain/question.ts';

export type BlankUnit = 'word' | 'phrase' | 'ku' | null;
export type PublishedQuestion = Readonly<{
  questionId: string;
  poemId: string;
  skill: 'text' | 'author' | 'reading';
  type: 'blank' | 'author';
  blankUnit: BlankUnit;
  prompt: string;
  answer: string;
  answerHistorical: string;
  answerModern: string;
  acceptedAnswers: readonly string[];
  partialAnswers: readonly string[];
  candidates: readonly string[];
  normalization: Normalization;
  sourceRef: string;
  reviewStatus: 'human-confirmed';
  confirmationMode: 'individual' | 'batch';
  confirmedBy: string | null;
  confirmedOn: string | null;
  proposedBy: string;
  batchEvidenceRef: string | null;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStrings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isPublishedQuestion(value: unknown): value is PublishedQuestion {
  if (!isRecord(value)) return false;
  return typeof value.questionId === 'string'
    && typeof value.poemId === 'string'
    && (value.skill === 'text' || value.skill === 'author' || value.skill === 'reading')
    && (value.type === 'blank' || value.type === 'author')
    && (value.blankUnit === 'word' || value.blankUnit === 'phrase' || value.blankUnit === 'ku' || value.blankUnit === null)
    && typeof value.prompt === 'string'
    && typeof value.answer === 'string'
    && typeof value.answerHistorical === 'string'
    && typeof value.answerModern === 'string'
    && isStrings(value.acceptedAnswers)
    && isStrings(value.partialAnswers)
    && isStrings(value.candidates)
    && (value.normalization === 'exact' || value.normalization === 'kana')
    && typeof value.sourceRef === 'string'
    && value.reviewStatus === 'human-confirmed'
    && (value.confirmationMode === 'individual' || value.confirmationMode === 'batch')
    && (typeof value.confirmedBy === 'string' || value.confirmedBy === null)
    && (typeof value.confirmedOn === 'string' || value.confirmedOn === null)
    && typeof value.proposedBy === 'string'
    && (typeof value.batchEvidenceRef === 'string' || value.batchEvidenceRef === null);
}

export function parseQuestions(value: unknown): PublishedQuestion[] {
  if (!Array.isArray(value)) throw new TypeError('questions must be an array');
  value.forEach((question, index) => {
    if (!isPublishedQuestion(question)) throw new TypeError(`invalid question record at ${index}`);
  });
  return value;
}

export function toQuestion(published: PublishedQuestion): Question {
  return {
    questionId: published.questionId,
    answer: published.answer,
    acceptedAnswers: published.acceptedAnswers,
    partialAnswers: published.partialAnswers,
    normalization: published.normalization,
  };
}
