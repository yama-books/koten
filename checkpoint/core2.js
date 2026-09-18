const AUX_FAMILIES = [
  {
    lemma:"べし",
    tier:1,
    forms:["べから","べかり","べく","べし","べき","べかる","べけれ"],
    examples:["行くべし：終止形だけでなく他の活用形も同じ語として確認","すべけれども：「べけれ」をどこまで一語と見るか確認"],
    candidates:["助動詞「べし」の活用形","形容詞など別の活用語の一部","別の語の一部"],
    ref:"「助動詞 べし：活用・接続・意味」"
  },
  {
    lemma:"けり",
    tier:2,
    forms:["けら","けり","ける","けれ"],
    examples:["咲きけり／咲きける花／咲きけれど：同じ助動詞の活用形か比べる"],
    candidates:["過去・詠嘆の助動詞「けり」の活用形","形容詞など別の活用語の一部","別の語の一部"],
    ref:"「助動詞 けり：活用・接続」"
  },
  {
    lemma:"たり",
    tier:2,
    forms:["たら","たり","たる","たれ"],
    examples:["咲きたり／咲きたる花／咲きたれど：接続を比べる"],
    candidates:["完了・存続の助動詞「たり」の活用形","断定の助動詞「たり」","形容動詞タリ活用の一部","別の語の一部"],
    ref:"「たり」の識別・活用"
  },
  {
    lemma:"む",
    tier:1,
    forms:["む"],
    examples:["行かむ：直前が未然形か確認","死なむ：「な」までが前の語ではないか確認"],
    candidates:["推量・意志などの助動詞「む」","前の活用語の一部＋助動詞「む」","別の語の一部"],
    ref:"「助動詞 む：接続・意味」"
  },
  {
    lemma:"らむ",
    tier:1,
    forms:["らむ"],
    examples:["何を思ふらむ：一語の助動詞か確認","～ら＋む：前の活用語と切れる可能性も確認"],
    candidates:["現在推量などの助動詞「らむ」","「ら」＋助動詞「む」","別の語の一部"],
    ref:"「らむ」の識別"
  },
  {
    lemma:"じ",
    tier:1,
    forms:["じ"],
    examples:["行くまじ、ではなく「行かじ」のように接続も見る"],
    candidates:["打消推量・打消意志などの助動詞「じ」","別の語の一部"],
    ref:"「助動詞 じ」"
  },
  {
    lemma:"まし",
    tier:1,
    forms:["ましか","まし"],
    examples:["あらましかば：前後の「ば」などとの関係を見る"],
    candidates:["反実仮想などに関わる助動詞「まし」の活用形","別の語の一部"],
    ref:"「助動詞 まし」"
  }
];

const AUX_RULES = AUX_FAMILIES.flatMap(fam =>
  fam.forms.map(form => ({
    type:"grammar",
    pattern:form,
    tierOverride:fam.tier,
    lemma:fam.lemma,
    hint1:`「${form}」は助動詞「${fam.lemma}」の活用形候補です。ただし、形だけで確定せず前後を確認しましょう。`,
    hint2:`「${fam.lemma}」の活用表と接続を参照し、この位置で成立するか自分で確かめてみましょう。`,
    examples:fam.examples,
    candidates:fam.candidates,
    ref:fam.ref
  }))
);

const VOCAB_ENTRIES = [
  {surface:"なでふ", lemma:"なでふ", tier:1, note:"現代語の形から意味を推測しにくい語です。"},
  {surface:"いかさま", lemma:"いかさま", tier:1, note:"現代語と同じ感覚だけで読まず、古語辞典で確認したい語です。"},
  {surface:"きと", lemma:"きと", tier:1, note:"短い副詞ですが、文脈上の意味を辞書で確認する価値があります。"},
  {surface:"不便", lemma:"不便なり", tier:1, note:"現代語の「不便」と同じ意味とは限りません。"},
  {surface:"向後", lemma:"向後", tier:1, note:"文脈上の時間関係を確認したい語です。"},
  {surface:"例のごとく", lemma:"例の・ごとし", tier:2, note:"「例の」と「ごとく」をそれぞれ古語として確認できます。"},
  {surface:"例の", lemma:"例の", tier:2, note:"現代語の「例」と同じ感覚だけで処理せず、用法を確認してみましょう。"},
  {surface:"ごとく", lemma:"ごとし", tier:2, note:"比況の表現として、何と何を比べているか確認してみましょう。"},
  {surface:"やうある", lemma:"やう", tier:2, note:"この「やう」が何を表しているか辞書で確認してみましょう。"},
  {surface:"かかる", lemma:"かかり", tier:2, note:"連体詞的に使われる古典語として確認してみましょう。"},
  {surface:"いかが", lemma:"いかが", tier:2, note:"疑問・反語など、文脈で働きを確認したい語です。"},
  {surface:"いづく", lemma:"いづく", tier:2, note:"疑問語として意味と用法を確認してみましょう。"},
  {surface:"やすく", lemma:"やすし", tier:2, note:"活用した形から見出し語（終止形）を考え、辞書を引いてみましょう。"},
  {surface:"悪しく", lemma:"悪し", tier:2, note:"活用した形から見出し語（終止形）を考え、辞書を引いてみましょう。"},
  {surface:"あらはせ", lemma:"あらはす", tier:2, note:"活用形を見出し語に戻して辞書で確認してみましょう。"},
  {surface:"案のごとく", lemma:"案のごとく", tier:2, note:"まとまりとして意味を確認したい表現です。"},
  {surface:"わざ", lemma:"わざ", tier:2, note:"この文脈で何を指すかを確認してみましょう。"},
  {surface:"日ごと", lemma:"日ごと", tier:4, note:"基本語ですが、細かく確認する設定では表示します。"},
  {surface:"しばし", lemma:"しばし", tier:4, note:"基本的な副詞なので、通常は省略してもよい語です。"},
  {surface:"もし", lemma:"もし", tier:4, note:"基本的な副詞なので、細かく確認する場合だけ表示します。"},
  {surface:"たちまち", lemma:"たちまち", tier:4, note:"基本的な副詞なので、細かく確認する場合だけ表示します。"},
  {surface:"いよいよ", lemma:"いよいよ", tier:4, note:"基本的な副詞なので、細かく確認する場合だけ表示します。"}
];

const VOCAB_HEADWORD_META = {
  "なでふ":{"candidates":["なでふ"],"basis":"surface_same","confidence":"medium"},
  "いかさま":{"candidates":["いかさま"],"basis":"surface_same","confidence":"high"},
  "きと":{"candidates":["きと"],"basis":"surface_same","confidence":"high"},
  "不便":{"candidates":["不便なり"],"basis":"manual_restore","confidence":"medium"},
  "向後":{"candidates":["向後"],"basis":"surface_same","confidence":"high"},
  "例のごとく":{"candidates":["例の","ごとし"],"basis":"phrase_split","confidence":"medium"},
  "例の":{"candidates":["例の"],"basis":"surface_same","confidence":"medium"},
  "ごとく":{"candidates":["ごとし"],"basis":"inflection_restore","confidence":"high"},
  "やうある":{"candidates":["やう"],"basis":"phrase_focus","confidence":"medium"},
  "かかる":{"candidates":["かかり"],"basis":"manual_restore","confidence":"medium"},
  "いかが":{"candidates":["いかが"],"basis":"surface_same","confidence":"high"},
  "いづく":{"candidates":["いづく"],"basis":"surface_same","confidence":"high"},
  "やすく":{"candidates":["やすし"],"basis":"inflection_restore","confidence":"high"},
  "悪しく":{"candidates":["悪し"],"basis":"inflection_restore","confidence":"high"},
  "あらはせ":{"candidates":["あらはす"],"basis":"inflection_restore","confidence":"high"},
  "案のごとく":{"candidates":["案","ごとし"],"basis":"phrase_split","confidence":"medium"},
  "わざ":{"candidates":["わざ"],"basis":"surface_same","confidence":"high"},
  "日ごと":{"candidates":["日ごと"],"basis":"surface_same","confidence":"high"},
  "しばし":{"candidates":["しばし"],"basis":"surface_same","confidence":"high"},
  "もし":{"candidates":["もし"],"basis":"surface_same","confidence":"high"},
  "たちまち":{"candidates":["たちまち"],"basis":"surface_same","confidence":"high"},
  "いよいよ":{"candidates":["いよいよ"],"basis":"surface_same","confidence":"high"}
};

const VOCAB_RULES = VOCAB_ENTRIES.map(v => {
  const meta=VOCAB_HEADWORD_META[v.surface] || {candidates:v.lemma?[v.lemma]:[],basis:"unverified",confidence:"low"};
  return {
    type:"vocab",
    pattern:v.surface,
    tierOverride:v.tier,
    lemma:v.lemma,
    headwordCandidates:meta.candidates||[],
    headwordBasis:meta.basis,
    headwordConfidence:meta.confidence,
    headwordVerified:false,
    hint1:`語彙「${v.surface}」を確認してみましょう。`,
    hint2:"古語辞典で見出し語を探し、文脈に合う語義を確認します。",
    examples:[],
    candidates:[],
    ref:"古語辞典"
  };
});

