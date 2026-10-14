import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAnswer, lemmaAnswerCandidates, quizMasteryStage, buildHintMask, QUIZ_MODE } from '../../conj/conj-quiz-engine.mjs';

const grade=(lemma:string, historicalKana:string, answer:string, kanjiAllowed=true)=>
  evaluateAnswer({quizMode:QUIZ_MODE.LEMMA, example:{},expectedLemma:lemma,
    historicalKana, selectedLemma:answer, kanjiAllowed}).correct;

test('terminal form: full kanji spelling and historical hiragana are both accepted',()=>{
  assert.equal(grade('恋ふ','こふ','恋ふ'),true);
  assert.equal(grade('恋ふ','こふ','こふ'),true);
  assert.equal(grade('思ふ','おもふ','おもふ'),true);
  assert.equal(grade('思ふ','おもふ','思ふ'),true);
  assert.equal(grade('鳴く','なく','なく'),true);
  assert.equal(grade('鳴く','なく','鳴く'),true);
  assert.equal(grade('思ふ','おもふ','おもう'),false,'modernized kana does not replace historical kana');
  assert.equal(grade('恋ふ','こふ','恋'),false,'a truncated kanji stem is not a terminal form');
});

test('terminal form: 来 and 寝 are kana-only when the stem has no visible ending',()=>{
  assert.deepEqual(lemmaAnswerCandidates({lemma:'来（く）',historicalKana:'く',kanjiAllowed:false}),['く']);
  assert.deepEqual(lemmaAnswerCandidates({lemma:'寝（ぬ）',historicalKana:'ぬ',kanjiAllowed:false}),['ぬ']);
  assert.equal(grade('来（く）','く','く',false),true);
  assert.equal(grade('来（く）','く','来',false),false);
  assert.equal(grade('寝（ぬ）','ぬ','ぬ',false),true);
  assert.equal(grade('寝（ぬ）','ぬ','寝',false),false);
});

test('terminal form: surrounding whitespace is harmless but incomplete inputs fail',()=>{
  assert.equal(grade('恋ふ','こふ','　こふ　'),true);
  assert.equal(grade('寝（ぬ）','ぬ',' ぬ ',false),true);
  assert.equal(grade('来（く）','く','',false),false);
});

test('terminal-form stage advancement does not alter classification-mode mastery',()=>{
  const events=Array.from({length:20},(_,i)=>({
    exampleId:'master:lemma:'+i,quizMode:'lemma',partOfSpeech:'動詞',correct:true,maxHintLevel:0
  }));
  assert.equal(quizMasteryStage({events},'動詞','lemma'),3);
  assert.equal(quizMasteryStage({events},'動詞','form'),0);
  assert.equal(quizMasteryStage({events},'動詞','type'),0);
});

test('terminal-form hints never reveal the terminal/concurrent attributive rows until grading',()=>{
  for(const hintLevel of [0,1,2]){
    const mask=buildHintMask({quizMode:QUIZ_MODE.LEMMA,hintLevel,
      tableRows:['か','き','く','く','け','け']});
    assert.ok(mask.hiddenIndexes.includes(2),'the terminal row must stay hidden');
    assert.ok(mask.hiddenIndexes.includes(3),'the identical attributive row must stay hidden');
  }
  const graded=buildHintMask({quizMode:QUIZ_MODE.LEMMA,hintLevel:2,answerRevealed:true,
    tableRows:['か','き','く','く','け','け']});
  assert.deepEqual(graded.visibleIndexes,[0,1,2,3,4,5]);
});
