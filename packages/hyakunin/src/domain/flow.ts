import type { UserSettings } from '@koten/shared/domain/event';
import { judge, type Judgement, type JudgementContext, type Question } from './question.ts';
import type { SaveFailure, SaveReceipt } from './ports.ts';

export type FlowPhase = 'prompt' | 'answered' | 'revealed' | 'save-failed' | 'complete';
export type SubmittedAnswer = Readonly<{ input: string; context: JudgementContext }>;
export type FlowState = Readonly<{
  phase: FlowPhase;
  questionIndex: number;
  questionCount: number;
  cardNo: number;
  cardIndex: number;
  cardCount: number;
  hintUsed: boolean;
  submitted: SubmittedAnswer | null;
  judgement: Judgement | null;
  saveFailure: SaveFailure | null;
}>;

/**
 * D-26 が部分正解のときに必ず返せと定める 2 つの表記。
 * `Question` は判定に要る面しか持たず歴史的仮名遣いを運ばないため、呼び出し側が明示的に渡す。
 * `acceptedAnswers` から推測してはならない——生成器は `[漢字, 歴史的読み]` の順で作るので先頭は漢字である。
 */
export type AnswerForms = Readonly<{ historical: string; kanji: string }>;

export type Feedback = Readonly<{
  mark: 'maru' | 'check' | 'none';
  historical: string;
  kanji: string;
  mastery: string;
}>;

export function beginQuestion(state: FlowState, _question: Question, readingMode: UserSettings['reading']): FlowState {
  return {
    ...state,
    phase: 'prompt',
    hintUsed: readingMode !== 'no-ruby',
    submitted: null,
    judgement: null,
    saveFailure: null,
  };
}

export function useHint(state: FlowState): FlowState {
  return { ...state, hintUsed: true };
}

export function submitAnswer(state: FlowState, question: Question, input: string, context: JudgementContext): FlowState {
  if (state.phase !== 'prompt') return state;
  return { ...state, phase: 'answered', submitted: { input, context }, judgement: judge(question, input, context) };
}

export function reveal(state: FlowState, receipt: SaveReceipt): FlowState {
  void receipt;
  if (state.phase !== 'answered') return state;
  return { ...state, phase: 'revealed', saveFailure: null };
}

export function failSave(state: FlowState, failure: SaveFailure): FlowState {
  if (state.phase !== 'answered') return state;
  return { ...state, phase: 'save-failed', saveFailure: failure };
}

export function advance(state: FlowState): FlowState {
  if (state.phase !== 'revealed') return state;
  const nextIndex = state.questionIndex + 1;
  if (nextIndex >= state.questionCount) return { ...state, phase: 'complete', questionIndex: nextIndex };
  return { ...state, phase: 'prompt', questionIndex: nextIndex, hintUsed: false, submitted: null, judgement: null, saveFailure: null };
}

export function submitSelfGrade(state: FlowState, judgement: Judgement): FlowState {
  if (state.phase !== 'prompt') return state;
  return { ...state, phase: 'answered', submitted: { input: '', context: { readingStatus: 'confirmed' } }, judgement };
}

export function progressLabel(state: FlowState): string {
  return `${state.cardNo}番・${state.questionIndex + 1}問目/${state.questionCount}`;
}

export function buildFeedback(forms: AnswerForms, judgement: Judgement): Feedback {
  if (judgement === 'partial') {
    return {
      mark: 'none',
      historical: `歴史的仮名遣い: ${forms.historical}`,
      kanji: `漢字: ${forms.kanji}`,
      mastery: '',
    };
  }
  if (judgement === 'correct') return { mark: 'maru', historical: '', kanji: '', mastery: '' };
  return { mark: 'check', historical: '', kanji: '', mastery: '要確認' };
}
