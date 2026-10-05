// conj-quiz-engine.test.mjs
import assert from "node:assert/strict";
import {
  QUIZ_MODE, CHOICE_SCOPE, ROW_MODE, SUPPORT_LEVEL,
  shortTypeLabel, splitVerbType, buildTypeChoices, buildFormChoices, buildRowChoices, evaluateAnswer,
  buildHintMask, evidenceWeight, isPublicQuizEligible, formalTypeLabel
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
// 選択肢はランダムにせず、動詞→形容詞→形容動詞の文法書順に固定する。
const orderMaster=[...master,
  {conjugationType:"ナリ活用",partOfSpeech:"形容動詞"},
  {conjugationType:"カ行変格活用",partOfSpeech:"動詞"},
  {conjugationType:"マ行上一段活用",partOfSpeech:"動詞"},
];
for(const rng of [()=>0,()=>0.99]){
  const ordered=buildTypeChoices({example:ex,masterEntries:orderMaster,scope:CHOICE_SCOPE.ALL,rng});
  assert.deepEqual(ordered.map(x=>x.family),["四","上一","上二","下二","カ変","ク","シク","ナリ"]);
}
const auxMaster=["特殊型","形容詞（ク活用）型","ラ変型","四段型","無変化型","形容動詞（ナリ活用）型","下二段型"]
  .map(t=>({conjugationType:t,partOfSpeech:"助動詞"}));
const auxOrdered=buildTypeChoices({example:{...ex,partOfSpeech:"助動詞",conjugationType:"特殊型"},masterEntries:auxMaster,scope:CHOICE_SCOPE.ALL,rng:()=>0});
assert.deepEqual(auxOrdered.map(x=>x.canonical),["四段型","下二段型","ラ変型","形容詞（ク活用）型","形容動詞（ナリ活用）型","特殊型","無変化型"]);
// 助動詞は括弧の注記を外した名前で1枚にまとめ、まとめた型のどれが正答でも正解にする。
const auxMergeMaster=["ラ変型","ラ変型（伝聞・推定）","形容詞（ク活用）型","形容詞（シク活用）型","形容動詞（ナリ活用）型","形容動詞（タリ活用）型","特殊型"]
  .map(t=>({conjugationType:t,partOfSpeech:"助動詞"}));
const shiku={...ex,partOfSpeech:"助動詞",conjugationType:"形容詞（シク活用）型"};
const auxMerged=buildTypeChoices({example:shiku,masterEntries:auxMergeMaster,scope:CHOICE_SCOPE.ALL,rng:()=>0});
assert.deepEqual(auxMerged.map(x=>formalTypeLabel(x)),["ラ変型","形容詞型","形容動詞型","特殊型"]);
const adjType=auxMerged.find(x=>x.isCorrect);
assert.equal(adjType.canonical,"形容詞（シク活用）型");
assert.deepEqual(adjType.canonicals,["形容詞（ク活用）型","形容詞（シク活用）型"]);
assert.equal(evaluateAnswer({quizMode:QUIZ_MODE.TYPE,example:shiku,selectedType:"形容詞（ク活用）型"}).correct,true);
assert.equal(evaluateAnswer({quizMode:QUIZ_MODE.TYPE,example:{...shiku,conjugationType:"ラ変型（伝聞・推定）"},selectedType:"ラ変型"}).correct,true);
assert.equal(evaluateAnswer({quizMode:QUIZ_MODE.TYPE,example:shiku,selectedType:"ラ変型"}).correct,false);
assert.deepEqual(buildFormChoices().map(x=>x.canonical),["未然形","連用形","終止形","連体形","已然形","命令形"]);
assert.deepEqual(buildRowChoices([{conjugationType:"ラ行四段活用",partOfSpeech:"動詞"},{conjugationType:"カ行四段活用",partOfSpeech:"動詞"},{conjugationType:"ハ行四段活用",partOfSpeech:"動詞"}],{rowRequired:true,family:"四"}).map(x=>x.canonical),["カ","ハ","ラ"]);

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
