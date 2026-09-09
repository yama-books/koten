import test from 'node:test';
import assert from 'node:assert/strict';
import { computeMastery } from '../../../packages/shared/src/domain/mastery/compute.ts';
import { poemMastery } from '../../../packages/shared/src/domain/mastery/poem.ts';
import type { Event } from '../../../packages/shared/src/domain/event.ts';
import { planQuestions } from '../../../packages/hyakunin/src/domain/entry.ts';
import type { PublishedQuestion } from '../../../packages/hyakunin/src/data/question-schema.ts';
import { event } from './fixtures.ts';

/*
 * 100% への到達可能性そのものを釘付けにする（所見 FINDING_AUTHOR_MASTERY_CEILING.md）。
 *
 * **この試験は planQuestions を通してしか答えない。** 方式を直接書くと、出題経路が
 * 選択式しか返さなくなっても緑のままになる——静かに 93 で止まっていたのは、
 * まさに「到達可能性を見る試験が1本も無い」ためだった。
 */

const AUTHOR_VARIANTS = ['choice', 'kana', 'free'] as const;

function authorQuestion(variant: (typeof AUTHOR_VARIANTS)[number]): PublishedQuestion {
  return {
    questionId: `p001-author-${variant}`, poemId: 'p001', skill: 'author', type: 'author', blankUnit: null,
    prompt: '問題', answer: '作者A', answerHistorical: 'さくしゃА', answerModern: 'さくしゃA',
    acceptedAnswers: ['作者A'], partialAnswers: [],
    // free だけ候補が空である。出題画面はこれを見て自由入力へ切り替える。
    candidates: variant === 'free' ? [] : ['作者A', '作者B', '作者C', '作者D'],
    normalization: variant === 'choice' ? 'exact' : 'kana', sourceRef: 'source',
    reviewStatus: 'human-confirmed', confirmationMode: 'individual', confirmedBy: 'reviewer',
    confirmedOn: '2026-09-01', proposedBy: 'human', batchEvidenceRef: null,
  };
}

const ledger = AUTHOR_VARIANTS.map(authorQuestion);

/** 出題画面と同じ判定。候補があれば選択式、無ければ自由入力として記録される。 */
function methodFor(question: PublishedQuestion) {
  return question.candidates.length > 0 ? 'choice' as const : 'free-input' as const;
}

/**
 * 作者問題に正答し続ける学習者を回す。**毎回 planQuestions に何を出すか訊く。**
 * 出題経路が上位方式へ上げなければ、ここで得られる方式は永久に選択式のままになる。
 */
function practiseAuthor(rounds: number): Event[] {
  const events: Event[] = [];
  for (let round = 0; round < rounds; round += 1) {
    const { scores } = computeMastery(events);
    const [asked] = planQuestions('author', ledger, [1], 'seed', 'number', true, scores);
    assert.ok(asked, `${round + 1}回目に作者問題が1問も出なかった`);
    const method = methodFor(asked);
    events.push(event({
      eventId: `author-${String(round + 1).padStart(3, '0')}`,
      itemKey: 'p001:author', questionId: `${asked.questionId}-r${round + 1}`,
      sessionId: `session-${round + 1}`, method, effectiveMethod: method, outcome: 'correct',
      localDate: `2026-09-${String((round % 28) + 1).padStart(2, '0')}`,
    }));
  }
  return events;
}

test('到達可能性: 作者に正答し続けると習熟度は100へ届く', () => {
  const { scores } = computeMastery(practiseAuthor(40));
  assert.equal(scores['p001:author'], 100);
});

test('到達可能性: 作者は選択式の上限65で止まらず、自由入力へ上がる', () => {
  // 65 に達するまでは選択式しか出ない。達したあとに自由入力が出ることを、両方向で見る。
  const belowCap = computeMastery(practiseAuthor(13)).scores['p001:author'];
  assert.equal(belowCap, 65, '13回の選択式正答で上限に達しているはず');
  const [atCap] = planQuestions('author', ledger, [1], 'seed', 'number', true, { 'p001:author': 65 });
  assert.equal(atCap?.questionId, 'p001-author-free');
  const [belowCapAsked] = planQuestions('author', ledger, [1], 'seed', 'number', true, { 'p001:author': 64 });
  assert.equal(belowCapAsked?.questionId, 'p001-author-choice');
});

test('到達可能性: 本文と作者がともに100なら歌全体も100になる', () => {
  const textEvents = Array.from({ length: 20 }, (_, index) => event({
    eventId: `text-${String(index + 1).padStart(3, '0')}`, itemKey: 'p001:text',
    questionId: `p001-blank-ku1-r${index + 1}`, sessionId: `text-session-${index + 1}`,
    localDate: `2026-08-${String((index % 28) + 1).padStart(2, '0')}`,
  }));
  const events = [...textEvents, ...practiseAuthor(40)];
  const { scores } = computeMastery(events);
  assert.equal(scores['p001:text'], 100);
  assert.equal(poemMastery('p001', events, scores).score, 100);
});
