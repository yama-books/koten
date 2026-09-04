import { appConfig } from '@koten/shared/app-config';
import type { UserSettings } from '@koten/shared/domain/event';
import { useMemo, useState } from 'preact/hooks';
import { buildFeedback, beginQuestion, reveal, submitAnswer, submitSelfGrade, useHint, advance, progressLabel, failSave, type FlowState } from '../../domain/flow.ts';
import { buildEvent } from '../../domain/record.ts';
import type { OutcomeKind } from '../../domain/result.ts';
import { toQuestion, type PublishedQuestion } from '../../data/question-schema.ts';
import type { Poem } from '../../data/schema.ts';
import type { EntryId } from '../../domain/entry.ts';
import type { ApplicationPort } from '../adapters/indexeddb-port.ts';
import { AnswerFeedback } from '../components/AnswerFeedback.tsx';
import { ReadingToggle } from '../components/ReadingToggle.tsx';
import { WritingModeToggle } from '../components/WritingModeToggle.tsx';
import type { AnswerMode } from './RangePicker.tsx';

type Props = { questions: readonly PublishedQuestion[]; poems?: readonly Poem[]; entry?: EntryId; answerMode?: AnswerMode; sessionId: string; port: ApplicationPort; settings: UserSettings; onSettings: (settings: UserSettings) => void; onBack?: () => void; onComplete: (outcomes: readonly Readonly<{ poemId: string; kind: Exclude<OutcomeKind, 'viewed'> }>[]) => void };
const today = () => new Date().toISOString().slice(0, 10);
const blankPattern = /＿+/;

function questionKuIndex(question: PublishedQuestion, poem: Poem): number {
  const named = question.questionId.match(/ku([1-5])$/)?.[1];
  if (named) return Number(named) - 1;
  return poem.ku.findIndex((line) => line.includes(question.answer));
}

function PromptLine({ line, answer, hidden, revealed }: { line: string; answer: string; hidden: boolean; revealed: boolean }) {
  if (!hidden) return <span class="question-line">{line}</span>;
  const at = answer ? line.indexOf(answer) : -1;
  const before = at >= 0 ? line.slice(0, at) : '';
  const after = at >= 0 ? line.slice(at + answer.length) : line;
  return <span class="question-line">{before}<span class={`blank-slot${revealed ? ' blank-slot--filled' : ''}`}>{revealed ? answer : <span class="sr-only">空欄</span>}</span>{after}</span>;
}

export function Session({ questions, poems = [], entry = 'learn', answerMode = 'screen', sessionId, port, settings, onSettings, onBack = () => {}, onComplete }: Props) {
  const first = questions[0];
  const initial = useMemo<FlowState>(() => ({ phase: 'prompt', questionIndex: 0, questionCount: questions.length, cardNo: Number(first.poemId.slice(1)), cardIndex: 0, cardCount: new Set(questions.map((question) => question.poemId)).size, hintUsed: false, submitted: null, judgement: null, saveFailure: null }), [first, questions]);
  const [flow, setFlow] = useState(() => beginQuestion(initial, toQuestion(first), settings.reading));
  const [input, setInput] = useState('');
  const [paperOpen, setPaperOpen] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [outcomes, setOutcomes] = useState<readonly Readonly<{ poemId: string; kind: Exclude<OutcomeKind, 'viewed'> }>[] >([]);
  const question = questions[Math.min(flow.questionIndex, questions.length - 1)];
  if (!question || flow.phase === 'complete') return <main class="session"><h1>今回の範囲を確認しました</h1><button type="button" onClick={() => onComplete(outcomes)}>結果を見る</button></main>;
  const displayFlow = flow.questionIndex === 0 ? flow : { ...flow, cardNo: Number(question.poemId.slice(1)) };
  const poem = poems.find((candidate) => candidate.cardNo === Number(question.poemId.slice(1)));
  const reading = entry === 'exam' ? 'no-ruby' : settings.reading;
  const answerForReading = reading === 'historical' ? question.answerHistorical ?? question.answer : reading === 'modern' ? question.answerModern ?? question.answer : question.answer;
  const revealed = displayFlow.phase === 'revealed' || paperOpen;
  async function persistSettings(next: UserSettings) { onSettings(next); await port.saveSettings(next); if (next.reading !== 'no-ruby') setFlow((state) => useHint(state)); }
  async function saveAnswered(answered: FlowState, method: 'free-input' | 'paper-handwriting') {
    const saving = answered.phase === 'save-failed' ? { ...answered, phase: 'answered' as const, saveFailure: null } : answered;
    setFlow(saving);
    const event = buildEvent({ eventId: crypto.randomUUID(), product: 'hyakunin', poemId: question.poemId, questionId: question.questionId, sessionId, itemKey: `${question.poemId}:${question.skill}`, kind: 'answer', method, hintUsed: saving.hintUsed, judgement: saving.judgement ?? 'incorrect', currentScore: 0, sameSessionRepeat: false, localDate: today(), appVersion: appConfig.appVersion, dataVersion: appConfig.dataVersion });
    const result = await port.appendEvent(event);
    if (!('reason' in result)) setOutcomes((items) => [...items, { poemId: question.poemId, kind: answered.judgement! }]);
    setFlow((state) => 'reason' in result ? failSave(state, result) : reveal(state, result));
  }
  async function submit() {
    const answered = displayFlow.phase === 'save-failed' ? displayFlow : submitAnswer(displayFlow, toQuestion(question), input, { readingStatus: 'confirmed' });
    await saveAnswered(answered, 'free-input');
  }
  async function gradePaper(judgement: 'correct' | 'partial' | 'incorrect') {
    setPaperOpen(false);
    await saveAnswered(submitSelfGrade(displayFlow, judgement), 'paper-handwriting');
  }
  function next() {
    const advanced = advance(displayFlow);
    const nextQuestion = questions[advanced.questionIndex];
    setFlow(advanced.phase === 'prompt' && nextQuestion ? beginQuestion(advanced, toQuestion(nextQuestion), entry === 'exam' ? 'no-ruby' : settings.reading) : advanced);
    setInput('');
    setPaperOpen(false);
  }
  function keyDown(event: KeyboardEvent) { if (event.key === 'Enter' && !event.isComposing && displayFlow.phase === 'revealed') { event.preventDefault(); next(); } }
  const feedback = displayFlow.judgement ? buildFeedback({ historical: question.answerHistorical, kanji: question.answer }, displayFlow.judgement) : null;
  const kuIndex = poem ? questionKuIndex(question, poem) : -1;
  const displayKu = poem ? (reading === 'no-ruby' ? poem.ku : poem.reading[reading].ku) : null;
  const hasBlank = blankPattern.test(question.prompt);
  const fallback = question.prompt.split(blankPattern);
  return <main class="session" onKeyDown={keyDown}><header class="nav-edge"><button class="back-link" type="button" onClick={() => setConfirmExit(true)}>戻る</button><span class="wordmark">{entry === 'exam' ? '本番のように解く' : '練習する'}</span><span class="progress" aria-live="polite">{entry === 'exam' ? `${displayFlow.questionIndex + 1}問目/${displayFlow.questionCount}` : progressLabel(displayFlow)}</span></header>
    <section class="session-controls">{entry !== 'exam' && <ReadingToggle value={settings.reading} onChange={(nextReading) => persistSettings({ ...settings, reading: nextReading })} />}<WritingModeToggle value={settings.writing} onChange={(writing) => persistSettings({ ...settings, writing })} /></section>
    <article class={`question-text question-text--${settings.writing}`}>{entry !== 'exam' && <span class="question-number" aria-label={`${displayFlow.cardNo}番`}>{displayFlow.cardNo}</span>}<h1 class="sr-only">穴埋め問題</h1>{displayKu ? <div class="question-poem" lang="ja">{displayKu.map((line, index) => <PromptLine key={`${question.questionId}-${index}`} line={line} answer={index === kuIndex ? answerForReading : ''} hidden={index === kuIndex} revealed={revealed} />)}</div> : <div class="question-poem question-poem--fallback"><span>{fallback[0]}</span>{hasBlank && <span class={`blank-slot${revealed ? ' blank-slot--filled' : ''}`}>{revealed ? answerForReading : <span class="sr-only">空欄</span>}</span>}{hasBlank && <span>{fallback[1] ?? ''}</span>}</div>}</article>
    {(displayFlow.phase === 'prompt' || displayFlow.phase === 'save-failed') && answerMode === 'screen' && <section class="answer-controls"><label>答え<input aria-describedby="answer-help" value={input} onInput={(event) => setInput(event.currentTarget.value)} placeholder="答えを入力" /></label><p id="answer-help">歴史的仮名遣いまたは漢字で入力します。</p><button class="primary" type="button" disabled={input.trim() === ''} onClick={submit}>{displayFlow.phase === 'save-failed' ? 'もう一度保存する' : '答え合わせ'}</button></section>}
    {displayFlow.phase === 'prompt' && answerMode === 'paper' && !paperOpen && <button class="primary" type="button" onClick={() => setPaperOpen(true)}>答えを確認する</button>}
    {displayFlow.phase === 'prompt' && answerMode === 'paper' && paperOpen && <section class="self-grade" aria-label="自己採点"><p>書いた答えを選んでください。</p><button type="button" onClick={() => gradePaper('correct')}>漢字・歴史的仮名遣いで書けた</button><button type="button" onClick={() => gradePaper('partial')}>現代仮名遣いで書けた</button><button type="button" onClick={() => gradePaper('incorrect')}>書けなかった</button></section>}
    {displayFlow.phase === 'save-failed' && <p class="review-note" aria-live="assertive">保存失敗。答えは残っています。もう一度お試しください。</p>}
    {displayFlow.phase === 'revealed' && <section><AnswerFeedback feedback={feedback!} /><button class="primary" type="button" onClick={next}>次へ</button></section>}
    {confirmExit && <section class="interrupt-dialog" role="dialog" aria-modal="true" aria-labelledby="interrupt-title"><h2 id="interrupt-title">練習を中断しますか？</h2><p>入力途中の答えは保存されません。ここまでの記録は残ります。</p><div><button class="primary" type="button" onClick={() => setConfirmExit(false)}>練習を続ける</button><button type="button" onClick={onBack}>トップへ戻る</button></div></section>}
  </main>;
}
