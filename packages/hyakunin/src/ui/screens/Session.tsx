import { appConfig } from '@koten/shared/app-config';
import type { UserSettings } from '@koten/shared/domain/event';
import { useMemo, useState } from 'preact/hooks';
import { buildFeedback, beginQuestion, reveal, submitAnswer, useHint, advance, progressLabel, failSave, type FlowState } from '../../domain/flow.ts';
import { buildEvent } from '../../domain/record.ts';
import type { OutcomeKind } from '../../domain/result.ts';
import { toQuestion, type PublishedQuestion } from '../../data/question-schema.ts';
import type { ApplicationPort } from '../adapters/indexeddb-port.ts';
import { AnswerFeedback } from '../components/AnswerFeedback.tsx';
import { ReadingToggle } from '../components/ReadingToggle.tsx';
import { WritingModeToggle } from '../components/WritingModeToggle.tsx';
import { ReportButton } from '../components/ReportButton.tsx';

type Props = { questions: readonly PublishedQuestion[]; sessionId: string; port: ApplicationPort; settings: UserSettings; onSettings: (settings: UserSettings) => void; onComplete: (outcomes: readonly Readonly<{ poemId: string; kind: Exclude<OutcomeKind, 'viewed'> }>[]) => void };
const today = () => new Date().toISOString().slice(0, 10);

export function Session({ questions, sessionId, port, settings, onSettings, onComplete }: Props) {
  const first = questions[0];
  const initial = useMemo<FlowState>(() => ({ phase: 'prompt', questionIndex: 0, questionCount: questions.length, cardNo: Number(first.poemId.slice(1)), cardIndex: 0, cardCount: new Set(questions.map((question) => question.poemId)).size, hintUsed: false, submitted: null, judgement: null, saveFailure: null }), [first, questions]);
  const [flow, setFlow] = useState(() => beginQuestion(initial, toQuestion(first), settings.reading));
  const [input, setInput] = useState('');
  const [outcomes, setOutcomes] = useState<readonly Readonly<{ poemId: string; kind: Exclude<OutcomeKind, 'viewed'> }>[] >([]);
  const question = questions[Math.min(flow.questionIndex, questions.length - 1)];
  if (!question || flow.phase === 'complete') return <main class="session"><h1>今回の範囲を確認しました</h1><button type="button" onClick={() => onComplete(outcomes)}>結果を見る</button></main>;
  const displayFlow = flow.questionIndex === 0 ? flow : { ...flow, cardNo: Number(question.poemId.slice(1)) };
  async function persistSettings(next: UserSettings) { onSettings(next); await port.saveSettings(next); if (next.reading !== 'no-ruby') setFlow((state) => useHint(state)); }
  async function submit() {
    const answered = submitAnswer(displayFlow, toQuestion(question), input, { readingStatus: 'confirmed' });
    setFlow(answered);
    const event = buildEvent({ eventId: crypto.randomUUID(), product: 'hyakunin', poemId: question.poemId, questionId: question.questionId, sessionId, itemKey: `${question.poemId}:${question.skill}`, kind: 'answer', method: 'free-input', hintUsed: answered.hintUsed, judgement: answered.judgement ?? 'incorrect', currentScore: 0, sameSessionRepeat: false, localDate: today(), appVersion: appConfig.appVersion, dataVersion: appConfig.dataVersion });
    const result = await port.appendEvent(event);
    if (!('reason' in result)) setOutcomes((items) => [...items, { poemId: question.poemId, kind: answered.judgement! }]);
    setFlow((state) => 'reason' in result ? failSave(state, result) : reveal(state, result));
  }
  function next() { const nextFlow = advance(displayFlow); setFlow(nextFlow); setInput(''); }
  function keyDown(event: KeyboardEvent) { if (event.key === 'Enter' && !event.isComposing && displayFlow.phase === 'revealed') { event.preventDefault(); next(); } }
  const feedback = displayFlow.judgement ? buildFeedback({ historical: question.answerHistorical, kanji: question.answer }, displayFlow.judgement) : null;
  return <main class="session" onKeyDown={keyDown}><header class="nav-edge"><span class="wordmark">学習</span><span class="progress" aria-live="polite">{progressLabel(displayFlow)}</span></header>
    <section class="session-controls"><ReadingToggle value={settings.reading} onChange={(reading) => persistSettings({ ...settings, reading })} /><WritingModeToggle value={settings.writing} onChange={(writing) => persistSettings({ ...settings, writing })} /></section>
    <article class={`question-text question-text--${settings.writing}`}><h1>{question.prompt}</h1><p>対象: {question.poemId}</p></article>
    <ReportButton onReport={() => port.saveLocalReport(question.poemId, question.questionId)} />
    {(displayFlow.phase === 'prompt' || displayFlow.phase === 'save-failed') && <section class="answer-controls"><label>答え<input aria-describedby="answer-help" value={input} onInput={(event) => setInput(event.currentTarget.value)} placeholder="答えを入力" /></label><p id="answer-help">歴史的仮名遣いまたは漢字で入力します。</p><button class="primary" type="button" onClick={submit}>{displayFlow.phase === 'save-failed' ? 'もう一度保存する' : '答えを見る'}</button></section>}
    {displayFlow.phase === 'save-failed' && <p class="review-note" aria-live="assertive">保存失敗。答えは残っています。もう一度お試しください。</p>}
    {displayFlow.phase === 'revealed' && <section><AnswerFeedback feedback={feedback!} /><button class="primary" type="button" onClick={next}>次へ</button></section>}
  </main>;
}
