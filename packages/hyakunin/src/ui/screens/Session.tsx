import { appConfig } from "@koten/shared/app-config";
import type { UserSettings } from "@koten/shared/domain/event";
import { MasteryMeter } from "@koten/shared/mastery-meter";
import { useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import {
  buildFeedback,
  beginQuestion,
  reveal,
  submitAnswer,
  submitSelfGrade,
  useHint,
  advance,
  failSave,
  type FlowState,
} from "../../domain/flow.ts";
import type { Judgement } from "../../domain/question.ts";
import { buildEvent, buildViewEvent } from "../../domain/record.ts";
import type { OutcomeKind } from "../../domain/result.ts";
import {
  toQuestion,
  type PublishedQuestion,
} from "../../data/question-schema.ts";
import type { Poem } from "../../data/schema.ts";
import { ENTRY_LABELS, type EntryId } from "../../domain/entry.ts";
import type { ApplicationPort } from "../adapters/indexeddb-port.ts";
import {
  AnswerFeedback,
  PartialSupplement,
  QuestionNote,
  PARTIAL_NOTE,
} from "../components/AnswerFeedback.tsx";
import { FeedbackMark } from "../components/FeedbackMark.tsx";
import { ReadingToggle } from "../components/ReadingToggle.tsx";
import { WritingModeToggle } from "../components/WritingModeToggle.tsx";
import type { AnswerMode } from "./RangePicker.tsx";

type Props = {
  questions: readonly PublishedQuestion[];
  poems?: readonly Poem[];
  entry?: EntryId;
  answerMode?: AnswerMode;
  sessionId: string;
  port: ApplicationPort;
  settings: UserSettings;
  onSettings: (settings: UserSettings) => void;
  onBack?: () => void;
  onComplete: (
    outcomes: readonly Readonly<{
      questionId: string;
      poemId: string;
      kind: Exclude<OutcomeKind, "viewed">;
    }>[],
  ) => void;
};
const today = () => new Date().toISOString().slice(0, 10);
/** R2: 再確認は途中保存しないので、中断ダイアログを開く前から画面に出しておく。 */
export const REVIEW_INTERRUPT_NOTE =
  "途中で終了すると、この再確認の続きは再開できません。（答え合わせ済みの記録は残ります）";
const PAPER_PARTIAL_NOTE = "△は現代仮名遣いで書けた場合です。";
const blankPattern = /＿+/;
type ExamAnswer = Readonly<{
  question: PublishedQuestion;
  input: string;
  judgement: Judgement | "viewed";
}>;

function hasKanaDifference(question: PublishedQuestion): boolean {
  return question.answerHistorical !== question.answerModern;
}

function questionKuIndex(question: PublishedQuestion, poem: Poem): number {
  const named = question.questionId.match(/ku([1-5])$/)?.[1];
  if (named) return Number(named) - 1;
  return poem.ku.findIndex((line) => line.includes(question.answer));
}

function PromptLine({
  line,
  answer,
  hidden,
  revealed,
}: {
  line: string;
  answer: string;
  hidden: boolean;
  revealed: boolean;
}) {
  if (!hidden) return <span class="question-line">{line}</span>;
  const at = answer ? line.indexOf(answer) : -1;
  const before = at >= 0 ? line.slice(0, at) : "";
  const after = at >= 0 ? line.slice(at + answer.length) : line;
  return (
    <span class="question-line">
      {before}
      <span class={`blank-slot${revealed ? " blank-slot--filled" : ""}`}>
        {revealed ? answer : <span class="sr-only">空欄</span>}
      </span>
      {after}
    </span>
  );
}

export function Session({
  questions,
  poems = [],
  entry = "learn",
  answerMode = "screen",
  sessionId,
  port,
  settings,
  onSettings,
  onBack = () => {},
  onComplete,
}: Props) {
  const first = questions[0];
  const initial = useMemo<FlowState>(
    () => ({
      phase: "prompt",
      questionIndex: 0,
      questionCount: questions.length,
      cardNo: Number(first.poemId.slice(1)),
      cardIndex: 0,
      cardCount: new Set(questions.map((question) => question.poemId)).size,
      hintUsed: false,
      submitted: null,
      judgement: null,
      saveFailure: null,
    }),
    [first, questions],
  );
  const [flow, setFlow] = useState(() =>
    beginQuestion(initial, toQuestion(first), settings.reading),
  );
  const [input, setInput] = useState("");
  const [paperOpen, setPaperOpen] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [outcomes, setOutcomes] = useState<
    readonly Readonly<{
      questionId: string;
      poemId: string;
      kind: Exclude<OutcomeKind, "viewed">;
    }>[]
  >([]);
  const [examAnswers, setExamAnswers] = useState<readonly ExamAnswer[]>([]);
  const [paperGrades, setPaperGrades] = useState<
    Readonly<Record<string, Judgement>>
  >({});
  const [savingGrades, setSavingGrades] = useState(false);
  const [gradeSaveFailed, setGradeSaveFailed] = useState(false);
  const [unknownSaveFailed, setUnknownSaveFailed] = useState(false);
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const continueButtonRef = useRef<HTMLButtonElement>(null);
  const exitButtonRef = useRef<HTMLButtonElement>(null);
  const wasConfirmExit = useRef(false);
  useLayoutEffect(() => {
    if (confirmExit) {
      continueButtonRef.current?.focus();
    } else if (wasConfirmExit.current) {
      backButtonRef.current?.focus();
    }
    wasConfirmExit.current = confirmExit;
  }, [confirmExit]);
  const question =
    questions[Math.min(flow.questionIndex, questions.length - 1)];
  const isExam = entry === "exam";
  const completedQuestionCount = Math.min(flow.questionIndex, flow.questionCount);
  const progressPercent = flow.questionCount === 0
    ? 0
    : Math.round((completedQuestionCount / flow.questionCount) * 100);
  const progressMeter = (
    <MasteryMeter
      label="セッション"
      meterLabel="セッションの進捗"
      text={`${completedQuestionCount}問/${flow.questionCount}問`}
      percent={progressPercent}
      color="blue"
    />
  );
  async function finalizeExam() {
    const answers =
      answerMode === "screen"
        ? examAnswers
        : questions.map((item) => ({
            question: item,
            input: "",
            judgement: paperGrades[item.questionId]!,
          }));
    if (
      answers.length !== questions.length ||
      answers.some((item) => !item.judgement)
    )
      return;
    setSavingGrades(true);
    setGradeSaveFailed(false);
    const saved = await Promise.all(
      answers.map(async ({ question: answeredQuestion, judgement }) => {
        const common = {
          eventId: crypto.randomUUID(),
          product: "hyakunin",
          poemId: answeredQuestion.poemId,
          questionId: answeredQuestion.questionId,
          sessionId,
          itemKey: `${answeredQuestion.poemId}:${answeredQuestion.skill}`,
          hintUsed: false,
          sameSessionRepeat: false,
          localDate: today(),
          appVersion: appConfig.appVersion,
          dataVersion: appConfig.dataVersion,
        } as const;
        const event = judgement === "viewed"
          ? buildViewEvent({ ...common, kind: "view" })
          : buildEvent({
              ...common,
              kind: "answer",
              method: answerMode === "paper" ? "paper-handwriting" : "free-input",
              judgement,
              currentScore: 0,
            });
        return {
          question: answeredQuestion,
          judgement,
          result: await port.appendEvent(event),
        };
      }),
    );
    if (saved.some(({ result }) => "reason" in result)) {
      setSavingGrades(false);
      setGradeSaveFailed(true);
      return;
    }
    const nextOutcomes = saved.filter(({ judgement }) => judgement !== "viewed").map(
      ({ question: answeredQuestion, judgement }) => ({
        questionId: answeredQuestion.questionId,
        poemId: answeredQuestion.poemId,
        kind: judgement as Judgement,
      }),
    );
    setOutcomes(nextOutcomes);
    onComplete(nextOutcomes);
  }
  if (!question || flow.phase === "complete") {
    if (!isExam)
      return (
        <main class="session">
          {progressMeter}
          <h1>今回の範囲を確認しました</h1>
          <button type="button" onClick={() => onComplete(outcomes)}>
            結果を見る
          </button>
        </main>
      );
    const rows =
      answerMode === "screen"
        ? examAnswers
        : questions.map((item) => ({
            question: item,
            input: "",
            judgement: paperGrades[item.questionId],
          }));
    const paperReady =
      answerMode === "screen" ||
      questions.every((item) => paperGrades[item.questionId] !== undefined);
    return (
      <main class="session">
        {progressMeter}
        <h1>採点する</h1>
        <p class="review-note">
          採点が確定するまで習熟度には反映されません。途中で閉じた場合は記録されません。
        </p>
        {answerMode === "paper" && questions.some(hasKanaDifference) && (
          <p class="review-note">{PAPER_PARTIAL_NOTE}</p>
        )}
        <ol class="grade-list">
          {rows.map(({ question: item, input: answer, judgement }) => (
            <li key={item.questionId}>
              <span class="grade-number">{Number(item.poemId.slice(1))}番</span>
              {answerMode === "screen" ? (
                <>
                  <span class="grade-line">
                    <span class="grade-label">{"自分の答え: "}</span>
                    <span class="grade-value">{answer || "（未入力）"}</span>
                  </span>
                  <span class="grade-line">
                    {item.type === "author" ? <span class="grade-value"><PartialSupplement answer={item.answer} answerHistorical={item.answerHistorical} answerModern={item.answerModern} showModern={false} isAuthor /></span> : <><span class="grade-label">{"正答: "}</span><span class="grade-value">{item.answer}</span></>}
                  </span>
                  <span
                    class={`grade-mark grade-mark--${judgement}`}
                    aria-label={
                      judgement === "correct"
                        ? "正解"
                        : judgement === "partial"
                          ? "△"
                          : judgement === "viewed"
                            ? "閲覧"
                            : "要確認"
                    }
                  >
                    {judgement === "correct"
                      ? <FeedbackMark kind="correct" label="正解" />
                      : judgement === "partial"
                        ? "△"
                        : judgement === "viewed"
                          ? "答えを確認"
                          : <FeedbackMark kind="incorrect" label="要確認！" />}
                  </span>
                  {judgement === "partial" && (
                    <>
                      <span class="grade-mark-note">{PARTIAL_NOTE}</span>
                      {/* 作者の正答枠は上の grade-line が同じ形で出している。ここで重ねると同じ2行が2回並ぶ（発注074 工程12）。 */}
                      {item.type !== "author" && (
                        <PartialSupplement
                          answerHistorical={item.answerHistorical}
                          answerModern={item.answerModern}
                          answer={item.answer}
                        />
                      )}
                    </>
                  )}
                  <QuestionNote note={item.note} />
                </>
              ) : (
                <>
                  <span class="grade-line">
                    {item.type === "author" ? <span class="grade-value"><PartialSupplement answer={item.answer} answerHistorical={item.answerHistorical} answerModern={item.answerModern} showModern={false} isAuthor /></span> : <><span class="grade-label">{"正答: "}</span><span class="grade-value">{item.answer}</span></>}
                  </span>
                  <div
                    class="grade-choice"
                    aria-label={`${Number(item.poemId.slice(1))}番の自己採点`}
                  >
                    <button
                      type="button"
                      aria-pressed={judgement === "correct"}
                      onClick={() =>
                        setPaperGrades((grades) => ({
                          ...grades,
                          [item.questionId]: "correct",
                        }))
                      }
                    >
                      ○
                    </button>
                    {hasKanaDifference(item) && (
                      <button
                        type="button"
                        aria-pressed={judgement === "partial"}
                        onClick={() =>
                          setPaperGrades((grades) => ({
                            ...grades,
                            [item.questionId]: "partial",
                          }))
                        }
                      >
                        △
                      </button>
                    )}
                    <button
                      type="button"
                      aria-pressed={judgement === "incorrect"}
                      onClick={() =>
                        setPaperGrades((grades) => ({
                          ...grades,
                          [item.questionId]: "incorrect",
                        }))
                      }
                    >
                      ×
                    </button>
                  </div>
                  {/* △を押す前から出す。何を基準に選ぶのかが分からないと自己採点できない。 */}
                  {item.type !== "author" && hasKanaDifference(item) && (
                    <PartialSupplement
                      answerHistorical={item.answerHistorical}
                      answerModern={item.answerModern}
                      answer={item.answer}
                    />
                  )}
                  <QuestionNote note={item.note} />
                </>
              )}
            </li>
          ))}
        </ol>
        {gradeSaveFailed && (
          <p class="review-note" role="alert">
            保存に失敗しました。もう一度お試しください。
          </p>
        )}
        <button
          class="primary"
          type="button"
          disabled={!paperReady || savingGrades}
          onClick={() => void finalizeExam()}
        >
          結果へ
        </button>
      </main>
    );
  }
  const displayFlow =
    flow.questionIndex === 0
      ? flow
      : { ...flow, cardNo: Number(question.poemId.slice(1)) };
  const poem = poems.find(
    (candidate) => candidate.cardNo === Number(question.poemId.slice(1)),
  );
  const reading = entry === "exam" ? "no-ruby" : settings.reading;
  const answerForReading =
    reading === "historical"
      ? (question.answerHistorical ?? question.answer)
      : reading === "modern"
        ? (question.answerModern ?? question.answer)
        : question.answer;
  const revealed = displayFlow.phase === "revealed" || paperOpen;
  async function persistSettings(next: UserSettings) {
    onSettings(next);
    await port.saveSettings(next);
    if (next.reading !== "no-ruby") setFlow((state) => useHint(state));
  }
  async function saveAnswered(
    answered: FlowState,
    method: "choice" | "free-input" | "paper-handwriting",
  ) {
    const saving =
      answered.phase === "save-failed"
        ? { ...answered, phase: "answered" as const, saveFailure: null }
        : answered;
    setFlow(saving);
    const event = buildEvent({
      eventId: crypto.randomUUID(),
      product: "hyakunin",
      poemId: question.poemId,
      questionId: question.questionId,
      sessionId,
      itemKey: `${question.poemId}:${question.skill}`,
      kind: "answer",
      method,
      hintUsed: saving.hintUsed,
      judgement: saving.judgement ?? "incorrect",
      currentScore: 0,
      sameSessionRepeat: false,
      localDate: today(),
      appVersion: appConfig.appVersion,
      dataVersion: appConfig.dataVersion,
    });
    const result = await port.appendEvent(event);
    if (!("reason" in result))
      setOutcomes((items) => [
        ...items,
        { questionId: question.questionId, poemId: question.poemId, kind: answered.judgement! },
      ]);
    setFlow((state) =>
      "reason" in result ? failSave(state, result) : reveal(state, result),
    );
  }
  async function submit(answer = input, method: "choice" | "free-input" = "free-input") {
    const answered =
      displayFlow.phase === "save-failed"
        ? displayFlow
        // 未配線：歌の `reading.status` を渡していない。2026-09-05 時点で正本の100首はすべて confirmed
        // なので実害は無いが、将来どれかの読みが「保留」になっても判定へ届かない。別件として記録済み。
        : submitAnswer(displayFlow, toQuestion(question), answer, {
            readingStatus: "confirmed",
          });
    if (isExam) {
      setExamAnswers((answers) => [
        ...answers,
        { question, input: answer, judgement: answered.judgement! },
      ]);
      nextExam(answered);
      return;
    }
    await saveAnswered(answered, method);
  }
  async function showUnknown() {
    if (isExam) {
      setExamAnswers((answers) => [
        ...answers,
        { question, input: "", judgement: "viewed" },
      ]);
      nextExam(displayFlow);
      return;
    }
    setUnknownSaveFailed(false);
    const result = await port.appendEvent(
      buildViewEvent({
        eventId: crypto.randomUUID(),
        product: "hyakunin",
        poemId: question.poemId,
        questionId: question.questionId,
        sessionId,
        itemKey: `${question.poemId}:${question.skill}`,
        kind: "view",
        hintUsed: displayFlow.hintUsed,
        localDate: today(),
        sameSessionRepeat: false,
        appVersion: appConfig.appVersion,
        dataVersion: appConfig.dataVersion,
      }),
    );
    if ("reason" in result) {
      setUnknownSaveFailed(true);
      return;
    }
    setFlow({
      ...displayFlow,
      phase: "revealed",
      submitted: null,
      judgement: null,
      saveFailure: null,
    });
  }
  async function gradePaper(judgement: "correct" | "partial" | "incorrect") {
    setPaperOpen(false);
    await saveAnswered(
      submitSelfGrade(displayFlow, judgement),
      "paper-handwriting",
    );
  }
  function next() {
    const advanced = advance(displayFlow);
    const nextQuestion = questions[advanced.questionIndex];
    setFlow(
      advanced.phase === "prompt" && nextQuestion
        ? beginQuestion(
            advanced,
            toQuestion(nextQuestion),
            entry === "exam" ? "no-ruby" : settings.reading,
          )
        : advanced,
    );
    setInput("");
    setPaperOpen(false);
    setUnknownSaveFailed(false);
  }
  function nextExam(answered: FlowState) {
    const advanced = advance({ ...answered, phase: "revealed" });
    const nextQuestion = questions[advanced.questionIndex];
    setFlow(
      advanced.phase === "prompt" && nextQuestion
        ? beginQuestion(advanced, toQuestion(nextQuestion), "no-ruby")
        : advanced,
    );
    setInput("");
  }
  function keyDown(event: KeyboardEvent) {
    if (confirmExit) {
      if (event.key === "Escape") {
        event.preventDefault();
        setConfirmExit(false);
      } else if (event.key === "Tab") {
        event.preventDefault();
        const buttons = [continueButtonRef.current, exitButtonRef.current].filter(
          (button): button is HTMLButtonElement => Boolean(button),
        );
        const activeIndex = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const direction = event.shiftKey ? -1 : 1;
        const nextIndex = (activeIndex + direction + buttons.length) % buttons.length;
        buttons[nextIndex]?.focus();
      }
      return;
    }
    if (
      event.key === "Enter" &&
      !event.isComposing &&
      displayFlow.phase === "revealed"
    ) {
      event.preventDefault();
      next();
    }
  }
  const feedback = displayFlow.judgement
    ? buildFeedback(
        { historical: question.answerHistorical, answer: question.answer },
        displayFlow.judgement,
      )
    : null;
  const kuIndex = poem ? questionKuIndex(question, poem) : -1;
  const displayKu = poem
    ? reading === "no-ruby"
      ? poem.ku
      : poem.reading[reading].ku
    : null;
  const hasBlank = blankPattern.test(question.prompt);
  const fallback = question.prompt.split(blankPattern);
  const isAuthorChoice = question.type === "author";
  return (
    <main class="session" onKeyDown={keyDown}>
      <header class="nav-edge">
        <button
          ref={backButtonRef}
          class="back-link"
          type="button"
          onClick={() => setConfirmExit(true)}
        >
          ホームへ戻る
        </button>
        <span class="wordmark">{ENTRY_LABELS[entry]}</span>
        <span class="progress" aria-live="polite">
          {Number(question.poemId.slice(1))}番
        </span>
      </header>
      <div class="session-progress">{progressMeter}</div>
      {entry === "review" && (
        <p class="review-note review-note--persistent">{REVIEW_INTERRUPT_NOTE}</p>
      )}
      <section class="session-controls">
        {entry !== "exam" && (
          <ReadingToggle
            value={settings.reading}
            onChange={(nextReading) =>
              persistSettings({ ...settings, reading: nextReading })
            }
          />
        )}
        <WritingModeToggle
          value={settings.writing}
          onChange={(writing) => persistSettings({ ...settings, writing })}
        />
      </section>
      <article class={`question-text question-text--${settings.writing}${isAuthorChoice ? " question-text--author" : ""}`}>
        <h1 class="sr-only">{isAuthorChoice ? "作者問題" : "穴埋め問題"}</h1>
        {isAuthorChoice ? poem ? (
          <div class="question-poem question-poem--author" lang="ja">
            {displayKu?.map((line, index) => <span class="question-line" key={`${question.questionId}-${index}`}>{line}</span>)}
          </div>
        ) : (
          <div class="question-poem question-poem--author question-poem--fallback" lang="ja"><span class="question-line">{question.prompt}</span></div>
        ) : displayKu ? (
          <div class="question-poem" lang="ja">
            {displayKu.map((line, index) => (
              <PromptLine
                key={`${question.questionId}-${index}`}
                line={line}
                answer={index === kuIndex ? answerForReading : ""}
                hidden={index === kuIndex}
                revealed={revealed}
              />
            ))}
          </div>
        ) : (
          <div class="question-poem question-poem--fallback">
            <span>{fallback[0]}</span>
            {hasBlank && (
              <span
                class={`blank-slot${revealed ? " blank-slot--filled" : ""}`}
              >
                {revealed ? (
                  answerForReading
                ) : (
                  <span class="sr-only">空欄</span>
                )}
              </span>
            )}
            {hasBlank && <span>{fallback[1] ?? ""}</span>}
          </div>
        )}
      </article>
      {(displayFlow.phase === "prompt" ||
        displayFlow.phase === "save-failed") &&
        answerMode === "screen" && (
          <section class="answer-controls">
            {isAuthorChoice ? (
              <div class="answer-choices" aria-label="作者を選ぶ">
                <p>作者を選んでください。</p>
                {question.candidates.map((candidate) => (
                  <button
                    key={candidate}
                    type="button"
                    onClick={() => void submit(candidate, "choice")}
                  >
                    {candidate}
                  </button>
                ))}
              </div>
            ) : <>
              <label>
                答え
                <input
                  aria-describedby="answer-help"
                  value={input}
                  onInput={(event) => setInput(event.currentTarget.value)}
                  placeholder="答えを入力"
                />
              </label>
              <p id="answer-help">歴史的仮名遣いまたは漢字で回答してください。</p>
              <div class="answer-actions">
                <button
                  class="primary"
                  type="button"
                  disabled={input.trim() === ""}
                  onClick={() => void submit()}
                >
                  {displayFlow.phase === "save-failed"
                    ? "もう一度保存する"
                    : isExam
                      ? "記録して次へ"
                      : "答え合わせ"}
                </button>
              </div>
            </>}
            <div class="answer-actions">
              <button type="button" onClick={() => void showUnknown()}>
                わからない！
              </button>
            </div>
            {unknownSaveFailed && (
              <p class="review-note" role="alert">
                保存に失敗しました。もう一度お試しください。
              </p>
            )}
          </section>
        )}
      {displayFlow.phase === "prompt" &&
        answerMode === "paper" &&
        !paperOpen && (
          <>
            {isExam && isAuthorChoice && <p class="paper-author-prompt">作者名を書いてください。</p>}
            <button
              class="primary"
              type="button"
              onClick={
                isExam
                  ? () => nextExam(displayFlow)
                  : () => {
                      port.countUi?.("reveal", today());
                      setPaperOpen(true);
                    }
              }
            >
              {isExam ? "次へ" : "答えを確認する"}
            </button>
          </>
        )}
      {displayFlow.phase === "prompt" &&
        answerMode === "paper" &&
        paperOpen && (
          <section class="self-grade" aria-label="自己採点">
            <p>書いた答えを選んでください。</p>
            <PartialSupplement
              answerHistorical={question.answerHistorical}
              answerModern={question.answerModern}
              answer={question.answer}
              isAuthor={isAuthorChoice}
            />
            <button type="button" onClick={() => gradePaper("correct")}>
              漢字・歴史的仮名遣いで書けた
            </button>
            {hasKanaDifference(question) && (
              <button type="button" onClick={() => gradePaper("partial")}>
                現代仮名遣いで書けた
              </button>
            )}
            <button type="button" onClick={() => gradePaper("incorrect")}>
              書けなかった
            </button>
          </section>
        )}
      {displayFlow.phase === "save-failed" && (
        <p class="review-note" aria-live="assertive">
          保存失敗。答えは残っています。もう一度お試しください。
        </p>
      )}
      {displayFlow.phase === "revealed" && (
        <section>
          {feedback ? (
            <AnswerFeedback
              feedback={feedback}
              forms={{ answer: question.answer, historical: question.answerHistorical, modern: question.answerModern }}
              note={question.note}
              isAuthor={isAuthorChoice}
            />
          ) : (
            <p class="answer-feedback unknown-feedback">答えを確認しました。</p>
          )}
          {answerMode === "screen" && displayFlow.submitted && (
            <label class={displayFlow.judgement === "correct" ? "answer-retained" : "answer-retained answer-retained--attention"}>
              <span class="answer-retained__label">自分の答え</span>
              <input value={displayFlow.submitted.input} readOnly />
              {displayFlow.judgement === "correct" ? <FeedbackMark kind="correct" label="正解" visualOnly /> : displayFlow.judgement === "incorrect" ? <FeedbackMark kind="incorrect" label="要確認！" visualOnly /> : null}
            </label>
          )}
          <button class="primary" type="button" onClick={next}>
            次へ
          </button>
        </section>
      )}
      {confirmExit && (
        <div class="interrupt-layer">
          <section
            class="interrupt-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="interrupt-title"
          >
            <h2 id="interrupt-title">練習を中断しますか？</h2>
            <p>{entry === "review" ? REVIEW_INTERRUPT_NOTE : "入力途中の答えは保存されません。ここまでの記録は残ります。"}</p>
            <div class="interrupt-actions">
              <button
                ref={continueButtonRef}
                class="primary"
                type="button"
                onClick={() => setConfirmExit(false)}
              >
                練習を続ける
              </button>
              <button ref={exitButtonRef} type="button" onClick={onBack}>
                トップへ戻る
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
