// conj-quiz-engine.test.mjs
import assert from "node:assert/strict";
import {
  QUIZ_MODE, CHOICE_SCOPE, ROW_MODE, SUPPORT_LEVEL,
  shortTypeLabel, splitVerbType, buildTypeChoices, evaluateAnswer,
  buildHintMask, evidenceWeight, isPublicQuizEligible
} from "./conj-quiz-engine.mjs";

assert.equal(shortTypeLabel("カ行上二段活用"), "上二");
assert.equal(shortTypeLabel("ク活用"), "ク");
assert.deepEqual(splitVerbType("カ行上二段活用"), {
  row:"カ", family:"上二", rowRequired:true
});

const master=[
  {conjugationType:"カ行四段活用",partOfSpeech:"動詞",quizLabel:"四"},
  {conjugationType:"カ行上二段活用",partOfSpeech:"動詞",quizLabel:"上二"},
  {conjugationType:"カ行下二段活用",partOfSpeech:"動詞",quizLabel:"下二"},
  {conjugationType:"ク活用",partOfSpeech:"形容詞",quizLabel:"ク"},
  {conjugationType:"シク活用",partOfSpeech:"形容詞",quizLabel:"シク"},
];
const ex={
  exampleId:"x",partOfSpeech:"動詞",conjugationType:"カ行上二段活用",
  form:"連用形",formQuizEligible:true,typeQuizEligible:true,
  publicEnabled:true,humanApprovalStatus:"approved",reviewStatus:"human-confirmed",
  bucket:"standard",quotationStatus:"approved",finalComplianceStatus:"approved",releaseQaStatus:"approved"
};

const all=buildTypeChoices({example:ex,masterEntries:master,scope:CHOICE_SCOPE.ALL,rng:()=>0.5});
assert.ok(all.some(x=>x.canonical==="カ行上二段活用"));
assert.ok(all.some(x=>x.canonical==="ク活用"));

const eval1=evaluateAnswer({
  quizMode:QUIZ_MODE.TYPE,example:ex,selectedType:"カ行上二段活用",
  selectedRow:"カ",rowMode:ROW_MODE.SELECT
});
assert.equal(eval1.correct,true);
assert.equal(eval1.typeCorrect,true);
assert.equal(eval1.rowCorrect,true);

const eval2=evaluateAnswer({
  quizMode:QUIZ_MODE.TYPE,example:ex,selectedType:"カ行上二段活用",
  selectedRow:"ガ",rowMode:ROW_MODE.SELECT
});
assert.equal(eval2.correct,false);
assert.equal(eval2.typeCorrect,true);
assert.equal(eval2.rowCorrect,false);

const mask=buildHintMask({
  quizMode:QUIZ_MODE.FORM,hintLevel:SUPPORT_LEVEL.PARTIAL,
  example:ex,tableRows:["a","b","c","d","e","f"]
});
assert.ok(mask.visibleIndexes.length>0);
assert.ok(!mask.visibleIndexes.includes(1)); // 正答「連用形」そのものはH1で隠す

assert.equal(evidenceWeight({correct:true,maxHintLevel:0}),1);
assert.equal(evidenceWeight({correct:true,maxHintLevel:1}),0.8);
assert.equal(evidenceWeight({correct:true,maxHintLevel:2}),0.6);
assert.equal(evidenceWeight({correct:false,maxHintLevel:0}),0);

assert.equal(isPublicQuizEligible(ex,QUIZ_MODE.TYPE),true);
assert.equal(isPublicQuizEligible({...ex,publicEnabled:false},QUIZ_MODE.TYPE),false);
assert.equal(isPublicQuizEligible({...ex,humanApprovalStatus:"pending"},QUIZ_MODE.TYPE),false);

console.log("conj-quiz-engine: all tests passed");
