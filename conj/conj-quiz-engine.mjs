// conj-quiz-engine.mjs
// 活用判別モードの独立ロジック。
// 現行 conj の DOM/CSS には依存しない。既存 renderer / storage と adapter で接続する。

export const QUIZ_MODE = Object.freeze({
  FORM: "form",
  TYPE: "type",
});

export const CHOICE_SCOPE = Object.freeze({
  NEAR: "near",
  PART_OF_SPEECH: "part_of_speech",
  CROSS_POS: "cross_pos",
  ALL: "all",
});

export const SUPPORT_LEVEL = Object.freeze({
  NONE: 0,
  PARTIAL: 1,
  FULL: 2,
});

export const ROW_MODE = Object.freeze({
  OMITTED: "omitted",
  SELECT: "select",
  INPUT: "input",
});

export const FORMS = Object.freeze([
  "未然形",
  "連用形",
  "終止形",
  "連体形",
  "已然形",
  "命令形",
]);

const DEFAULT_ATTENTION_WEIGHT = 0.65;

const VARIANT_LABELS = new Map([
  ["四段", "四"],
  ["四段活用", "四"],
  ["上二段", "上二"],
  ["上二段活用", "上二"],
  ["下二段", "下二"],
  ["下二段活用", "下二"],
  ["上一段", "上一"],
  ["上一段活用", "上一"],
  ["下一段", "下一"],
  ["下一段活用", "下一"],
  ["カ行変格活用", "カ変"],
  ["サ行変格活用", "サ変"],
  ["ナ行変格活用", "ナ変"],
  ["ラ行変格活用", "ラ変"],
  ["ク活用", "ク"],
  ["シク活用", "シク"],
  ["ナリ活用", "ナリ"],
  ["タリ活用", "タリ"],
  ["特殊型", "特殊"],
  ["無変化型", "無変"],
  ["四段型", "四"],
  ["下二段型", "下二"],
  ["サ変型", "サ変"],
  ["ナ変型", "ナ変"],
  ["ラ変型", "ラ変"],
  ["ラ変型（伝聞・推定）", "伝聞ラ変"],
  ["形容詞（ク活用）型", "ク型"],
  ["形容詞（シク活用）型", "シク型"],
  ["形容動詞（ナリ活用）型", "ナリ型"],
  ["形容動詞（タリ活用）型", "タリ型"],
  ["形容動詞型", "形動型"],
  ["形容詞型", "形容詞型"],
]);

// 助動詞の活用型は、括弧の注記を外した名前でひとつの選択肢にまとめる。
const AUX_FAMILIES = new Map([
  ["ラ変型（伝聞・推定）", "ラ変型"],
  ["形容詞（ク活用）型", "形容詞型"],
  ["形容詞（シク活用）型", "形容詞型"],
  ["形容動詞（ナリ活用）型", "形容動詞型"],
  ["形容動詞（タリ活用）型", "形容動詞型"],
]);
export function auxTypeFamily(canonical) {
  const value = String(canonical || "").trim();
  return AUX_FAMILIES.get(value) ?? value;
}

export function canonicalTypeLabel(entryOrType) {
  if (!entryOrType) return "";
  if (typeof entryOrType === "string") return entryOrType;
  return (
    entryOrType.conjugationType ??
    entryOrType.type ??
    entryOrType.name ??
    ""
  );
}

export function splitVerbType(canonical) {
  const value = String(canonical || "").trim();
  // カ行上二段活用 / ガ行四段活用 など
  const m = value.match(/^([ア-ン])行(四段|上二段|下二段|上一段|下一段)活用$/);
  if (m) {
    return {
      row: m[1],
      family: VARIANT_LABELS.get(m[2]) ?? m[2],
      rowRequired: true,
    };
  }

  // カ行変格活用 等
  const h = value.match(/^([カサナラ])行変格活用$/);
  if (h) {
    const family = `${h[1]}変`;
    return { row: null, family, rowRequired: false };
  }

  return { row: null, family: shortTypeLabel(value), rowRequired: false };
}

export function shortTypeLabel(entryOrType) {
  if (entryOrType && typeof entryOrType === "object" && entryOrType.quizLabel) {
    return String(entryOrType.quizLabel);
  }
  const value = canonicalTypeLabel(entryOrType).trim();
  if (!value) return "";

  if (VARIANT_LABELS.has(value)) return VARIANT_LABELS.get(value);

  const verb = value.match(/^([ア-ン])行(四段|上二段|下二段|上一段|下一段)活用$/);
  if (verb) return VARIANT_LABELS.get(verb[2]) ?? verb[2];

  // master側で未知の型が増えた場合も、情報を落とさず表示する。
  return value
    .replace(/活用$/, "")
    .replace(/段型$/, "")
    .replace(/型$/, "型");
}

export function rowForType(entryOrType) {
  const canonical = canonicalTypeLabel(entryOrType);
  const split = splitVerbType(canonical);
  return split.row;
}

export function familyForType(entryOrType) {
  const canonical = canonicalTypeLabel(entryOrType);
  const split = splitVerbType(canonical);
  return split.family;
}

export function requiresRow(entryOrType) {
  const canonical = canonicalTypeLabel(entryOrType);
  const split = splitVerbType(canonical);
  return split.rowRequired;
}

function normalizePartOfSpeech(value) {
  const v = String(value || "").trim();
  const aliases = {
    "verb": "動詞",
    "adjective": "形容詞",
    "adjectival_noun": "形容動詞",
    "adjectivalVerb": "形容動詞",
    "adjv": "形容動詞",
    "adj": "形容詞",
    "aux": "助動詞",
    "auxiliary": "助動詞",
  };
  return aliases[v] ?? v;
}

export function isPublicQuizEligible(example, quizMode) {
  if (!example) return false;
  // Fail closed: AI review and human approval never substitute for quotation/release gates.
  if (example.publicEnabled !== true) return false;
  if (example.humanApprovalStatus !== "approved") return false;
  if (example.quotationStatus !== "approved" || example.finalComplianceStatus !== "approved" || example.releaseQaStatus !== "approved") return false;
  if (!["standard", "attention"].includes(example.bucket ?? example.classification)) return false;
  if (quizMode === QUIZ_MODE.FORM && example.formQuizEligible !== true) return false;
  if (quizMode === QUIZ_MODE.TYPE && example.typeQuizEligible !== true) return false;
  if (quizMode === QUIZ_MODE.FORM && !FORMS.includes(example.form)) return false;
  if (quizMode === QUIZ_MODE.TYPE && !example.conjugationType) return false;
  return true;
}

export function buildTypeCatalog(masterEntries) {
  const rows = [];
  const seenCanonical = new Set();

  for (const raw of masterEntries || []) {
    const canonical = canonicalTypeLabel(raw);
    if (!canonical || seenCanonical.has(canonical)) continue;
    seenCanonical.add(canonical);

    const pos = normalizePartOfSpeech(raw.partOfSpeech ?? raw.pos);
    const split = splitVerbType(canonical);

    rows.push({
      canonical,
      label: shortTypeLabel(raw),
      partOfSpeech: pos,
      row: raw.row ?? split.row,
      family: raw.family ?? split.family,
      rowRequired:
        typeof raw.rowRequired === "boolean"
          ? raw.rowRequired
          : split.rowRequired,
      proximityGroup:
        raw.proximityGroup ??
        `${pos || "unknown"}:${raw.family ?? split.family ?? shortTypeLabel(raw)}`,
    });
  }

  return rows;
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const k = keyFn(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function stableShuffle(items, rng = Math.random) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 選択肢は並べ替えず、文法書の配列順に固定する。
// 用言は動詞→形容詞→形容動詞、助動詞は動詞型→形容詞型→形容動詞型→特殊型の順。
const TYPE_ORDER = [
  "動詞:四", "動詞:上一", "動詞:上二", "動詞:下一", "動詞:下二",
  "動詞:カ変", "動詞:サ変", "動詞:ナ変", "動詞:ラ変",
  "形容詞:ク活用", "形容詞:シク活用",
  "形容動詞:ナリ活用", "形容動詞:タリ活用",
  "助動詞:四段型", "助動詞:下二段型", "助動詞:サ変型", "助動詞:ナ変型",
  "助動詞:ラ変型", "助動詞:形容詞型", "助動詞:形容動詞型",
  "助動詞:特殊型", "助動詞:無変化型",
];
const ROW_ORDER = "アカガサザタダナハバパマヤラワ";

function typeOrderIndex(choice) {
  const key = choice.partOfSpeech + ":" + (choice.partOfSpeech === "動詞" ? choice.family
    : choice.partOfSpeech === "助動詞" ? auxTypeFamily(choice.canonical) : choice.canonical);
  const i = TYPE_ORDER.indexOf(key);
  return i < 0 ? TYPE_ORDER.length : i;
}

function sortTypeChoices(choices) {
  return [...choices].sort((a, b) =>
    typeOrderIndex(a) - typeOrderIndex(b) || String(a.canonical).localeCompare(String(b.canonical), "ja"));
}

const VERB_FORMAL_FAMILIES = {四:'四段活用',上二:'上二段活用',下二:'下二段活用',上一:'上一段活用',下一:'下一段活用'};
export function formalTypeLabel(choice) {
  if(!choice)return '';
  if(choice.partOfSpeech==='助動詞')return auxTypeFamily(choice.canonical);
  return choice.partOfSpeech==='動詞' && choice.rowRequired
    ? VERB_FORMAL_FAMILIES[choice.family] ?? choice.canonical
    : choice.canonical;
}

// Keep mastery local to the requested task and auxiliary/predicate domain.
// Recent independent retrieval controls fading; hints and wrong answers do
// not count as evidence for removing support.
export function quizMasteryStage(history, partOfSpeech, quizMode='type') {
  const auxiliary=normalizePartOfSpeech(partOfSpeech)==='助動詞';
  const historyForDomain=(history?.events || []).filter(e=>e.quizMode===quizMode &&
    (normalizePartOfSpeech(e.partOfSpeech)==='助動詞')===auxiliary);
  const passes=(count,minIndependent,maxWrong,minSamples)=>{
    const recent=historyForDomain.slice(-count);
    return recent.length>=minSamples &&
      recent.filter(e=>e.correct===true && Number(e.maxHintLevel)===0).length>=minIndependent &&
      recent.filter(e=>e.correct!==true).length<=maxWrong;
  };
  if(passes(20,16,2,18))return 3;
  if(passes(12,9,1,10))return 2;
  if(passes(8,3,1,5))return 1;
  return 0;
}
export function shouldUseShortTypeLabels(history, partOfSpeech) {
  return quizMasteryStage(history,partOfSpeech,'type')>=2;
}
export function scopeForMasteryStage(stage) {
  return [CHOICE_SCOPE.NEAR,CHOICE_SCOPE.PART_OF_SPEECH,CHOICE_SCOPE.CROSS_POS,CHOICE_SCOPE.ALL][Math.max(0,Math.min(3,Number(stage)||0))];
}

export function buildTypeChoices({ example, masterEntries, scope = CHOICE_SCOPE.NEAR, nearCount = 4, rng = Math.random }) {
  if (!example?.conjugationType) return [];
  const catalog = buildTypeCatalog(masterEntries);
  const pos = normalizePartOfSpeech(example.partOfSpeech);
  const correctEntry = catalog.find(x => x.canonical === example.conjugationType && x.partOfSpeech === pos);
  if (!correctEntry) return []; // Never invent a type absent from the current master.
  // Ordinary verbs share one type card; all official row-specific values remain attached.
  // Auxiliary types sharing a family without the bracketed note (ラ変型・形容詞型・形容動詞型) share one card too.
  const groupKey = x => x.partOfSpeech + ':' + (x.partOfSpeech === '動詞' && x.rowRequired ? x.family
    : x.partOfSpeech === '助動詞' ? auxTypeFamily(x.canonical) : x.canonical);
  const groups = new Map();
  for (const entry of catalog) {
    const id = groupKey(entry);
    const auxLabel = entry.partOfSpeech === '助動詞' ? { label: shortTypeLabel(auxTypeFamily(entry.canonical)) } : {};
    if (!groups.has(id)) groups.set(id, { ...entry, ...auxLabel, id, canonicals: [] });
    groups.get(id).canonicals.push(entry.canonical);
  }
  const correct = { ...groups.get(groupKey(correctEntry)), canonical: correctEntry.canonical };
  // Auxiliary conjugation types form their own list. Predicate types never
  // borrow auxiliary cards, even at the broadest choice scope.
  const inDomain=x => (x.partOfSpeech === '助動詞') === (pos === '助動詞');
  const domain=[...groups.values()].filter(inDomain);
  const samePos = domain.filter(x => x.partOfSpeech === pos && x.id !== correct.id);
  const rank = x => {
    const entries = catalog.filter(e => x.canonicals.includes(e.canonical));
    if (entries.some(e => e.row && e.row === correctEntry.row)) return 0;
    if (x.proximityGroup === correctEntry.proximityGroup) return 1;
    return 2;
  };
  const near = stableShuffle(samePos, rng).sort((a,b) => rank(a)-rank(b));
  const others = stableShuffle(domain.filter(x => x.partOfSpeech !== pos), rng);
  const auxiliary=pos==='助動詞';
  let pool;
  if (scope === CHOICE_SCOPE.ALL) pool = [correct, ...samePos, ...others];
  else if (scope === CHOICE_SCOPE.CROSS_POS) pool = auxiliary ? [correct,...near.slice(0,8)] : [correct, ...samePos, ...others.slice(0,2)];
  else if (scope === CHOICE_SCOPE.PART_OF_SPEECH) pool = auxiliary ? [correct,...near.slice(0,5)] : [correct, ...samePos];
  else pool = [correct, ...near.slice(0, Math.max(1, nearCount-1))];
  // A part of speech represented by only one type (currently adjectival
  // nouns) needs one outside distractor; a one-button quiz cannot assess it.
  const sparseFallback=pool.length===1 && others.length>0;
  if(sparseFallback)pool.push(others[0]);
  const counts = new Map();
  pool.forEach(x => counts.set(x.label, (counts.get(x.label) || 0) + 1));
  return sortTypeChoices(pool.map(x => ({ ...x,
    formalLabel:formalTypeLabel(x),
    displayLabel: counts.get(x.label) > 1 || sparseFallback ? x.label + '・' + x.partOfSpeech : x.label,
    isCorrect: x.id === correct.id,
  })));
}

export function buildFormChoices() {
  return FORMS.map((form) => ({
    canonical: form,
    label: form.replace(/形$/, ""),
    displayLabel: form.replace(/形$/, ""),
    isCorrect: false,
  }));
}

export function buildRowChoices(masterEntries, typeChoice) {
  if (!typeChoice || !typeChoice.rowRequired) return [];
  const family = typeChoice.family;
  const rows = buildTypeCatalog(masterEntries)
    .filter((x) => x.family === family && x.row)
    .map((x) => x.row);
  const rank = (row) => (ROW_ORDER.includes(row) ? ROW_ORDER.indexOf(row) : ROW_ORDER.length);
  return [...new Set(rows)]
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b, "ja"))
    .map((row) => ({ canonical: row, label: row }));
}

export function evaluateAnswer({
  quizMode,
  example,
  selectedType,
  selectedForm,
  selectedRow,
  rowMode = ROW_MODE.OMITTED,
}) {
  if (quizMode === QUIZ_MODE.FORM) {
    const correct = selectedForm === example.form;
    return {
      correct,
      formCorrect: correct,
      typeCorrect: null,
      rowCorrect: null,
    };
  }

  const expected = splitVerbType(example.conjugationType);
  const chosen = splitVerbType(selectedType);
  const auxiliary = normalizePartOfSpeech(example.partOfSpeech) === "助動詞";
  const typeCorrect = selectedType === example.conjugationType ||
    (auxiliary && auxTypeFamily(selectedType) === auxTypeFamily(example.conjugationType)) ||
    (normalizePartOfSpeech(example.partOfSpeech) === "動詞" && expected.rowRequired && chosen.rowRequired && expected.family === chosen.family);
  const requiredRow = rowForType(example.conjugationType);

  if (rowMode === ROW_MODE.OMITTED || !requiredRow) {
    return {
      correct: typeCorrect,
      formCorrect: null,
      typeCorrect,
      rowCorrect: null,
    };
  }

  const rowCorrect =
    String(selectedRow || "").trim().normalize("NFKC").replace(/行$/, "").replace(/[ぁ-ゖ]/g, c => String.fromCharCode(c.charCodeAt(0)+0x60)) === String(requiredRow || "").trim();

  return {
    correct: typeCorrect && rowCorrect,
    formCorrect: null,
    typeCorrect,
    rowCorrect,
  };
}

export function buildHintMask({
  quizMode,
  hintLevel,
  example,
  tableRows,
  hintProfile,
  masteryStage=0,
}) {
  const rows = Array.isArray(tableRows) ? tableRows : [];
  const visible = new Set();

  if (hintLevel >= SUPPORT_LEVEL.FULL) {
    rows.forEach((_, i) => visible.add(i));
    return { visibleIndexes: [...visible], hiddenIndexes: [] };
  }

  if (hintLevel <= SUPPORT_LEVEL.NONE) {
    return {
      visibleIndexes: [],
      hiddenIndexes: rows.map((_, i) => i),
    };
  }

  // H1: the same rows are shown for every answer at a given mastery stage.
  // Support becomes sparser only after independent answers have accumulated.
  if (quizMode === QUIZ_MODE.FORM) {
    const fixed=masteryStage>=2?[0,2]:masteryStage>=1?[0,2,4]:[0,2,3,4];
    fixed.filter(i => i < rows.length).forEach(i => visible.add(i));
  } else {
    const profileIndexes = hintProfile?.rowIndexes;
    if (Array.isArray(profileIndexes) && profileIndexes.length) {
      profileIndexes.slice(0, masteryStage>=2?1:masteryStage>=1?2:3).forEach((i) => {
        if (i >= 0 && i < rows.length) visible.add(i);
      });
    } else {
      // master側にhintProfileがない場合は、値が存在する先頭3行を暫定表示。
      rows
        .map((row, i) => ({ row, i }))
        .filter(({ row }) => {
          const value = typeof row === "string" ? row : row?.value;
          return value && value !== "○";
        })
        .slice(0, masteryStage>=2?1:masteryStage>=1?2:3)
        .forEach(({ i }) => visible.add(i));
    }
  }

  return {
    visibleIndexes: [...visible].sort((a, b) => a - b),
    hiddenIndexes: rows
      .map((_, i) => i)
      .filter((i) => !visible.has(i)),
  };
}

export function initialSupportFor({
  mastery = 0,
  difficulty = 3,
}) {
  // 暫定ヒューリスティック。閾値は実使用後に調整する。
  if (mastery >= 0.75 && difficulty <= 5) return SUPPORT_LEVEL.NONE;
  if (mastery >= 0.45) return SUPPORT_LEVEL.PARTIAL;
  return SUPPORT_LEVEL.FULL;
}

export function evidenceWeight({ correct, maxHintLevel }) {
  if (!correct) return 0;
  if (maxHintLevel <= SUPPORT_LEVEL.NONE) return 1.0;
  if (maxHintLevel === SUPPORT_LEVEL.PARTIAL) return 0.8;
  return 0.6;
}

export function buildLearningEvent({
  example,
  quizMode,
  choiceScope,
  rowMode,
  initialSupportLevel,
  maxHintLevel,
  hintCount,
  selectedAnswer,
  selectedRow,
  evaluation,
  responseTimeMs,
  answeredAt = new Date().toISOString(),
}) {
  return {
    exampleId: example.exampleId,
    quizMode,
    partOfSpeech: example.partOfSpeech,
    conjugationType: example.conjugationType,
    form: example.form,
    questionDifficulty: example.difficulty ?? null,
    initialSupportLevel,
    choiceScope,
    rowMode,
    selectedAnswer,
    selectedRow: selectedRow ?? null,
    correct: Boolean(evaluation?.correct),
    formCorrect: evaluation?.formCorrect ?? null,
    typeCorrect: evaluation?.typeCorrect ?? null,
    rowCorrect: evaluation?.rowCorrect ?? null,
    hintCount,
    maxHintLevel,
    partialTableViewed: maxHintLevel >= SUPPORT_LEVEL.PARTIAL,
    fullTableViewed: maxHintLevel >= SUPPORT_LEVEL.FULL,
    responseTimeMs,
    standardOrAttention: example.bucket ?? example.standardOrAttention ?? "standard",
    masteryEvidenceWeight: evidenceWeight({
      correct: Boolean(evaluation?.correct),
      maxHintLevel,
    }),
    answeredAt,
  };
}

export function pickQuestion(
  examples,
  {
    quizMode,
    partOfSpeech = null,
    attentionWeight = DEFAULT_ATTENTION_WEIGHT,
    lastExampleId = null,
    rng = Math.random,
  }
) {
  let pool = (examples || []).filter((e) => isPublicQuizEligible(e, quizMode));
  if (partOfSpeech) {
    pool = pool.filter(
      (e) => normalizePartOfSpeech(e.partOfSpeech) === normalizePartOfSpeech(partOfSpeech)
    );
  }
  if (!pool.length) return null;

  const weighted = pool.map((example) => ({
    example,
    weight:
      (example.bucket ?? example.standardOrAttention) === "attention"
        ? Math.min(1, Math.max(0, Number.isFinite(attentionWeight) ? attentionWeight : DEFAULT_ATTENTION_WEIGHT))
        : 1,
  }));

  const total = weighted.reduce((s, x) => s + x.weight, 0);
  let r = rng() * total;
  for (const item of weighted) {
    r -= item.weight;
    if (r <= 0) {
      // Keep the bucket probability from the full bank, then avoid an immediate
      // repeat within that bucket where alternatives exist.
      if (item.example.exampleId === lastExampleId) {
        const bucket = item.example.bucket ?? item.example.standardOrAttention;
        const others = pool.filter(e => e.exampleId !== lastExampleId && (e.bucket ?? e.standardOrAttention) === bucket);
        if (others.length) return others[Math.min(others.length-1, Math.floor(rng()*others.length))];
      }
      return item.example;
    }
  }
  return weighted[weighted.length - 1].example;
}

export function createQuizState({
  example,
  quizMode,
  choiceScope = CHOICE_SCOPE.NEAR,
  rowMode = ROW_MODE.OMITTED,
  supportLevel = SUPPORT_LEVEL.FULL,
}) {
  return {
    example,
    quizMode,
    choiceScope,
    rowMode,
    initialSupportLevel: supportLevel,
    hintLevel: supportLevel,
    maxHintLevel: supportLevel,
    hintCount: 0,
    selectedAnswer: null,
    selectedRow: null,
    answered: false,
    evaluation: null,
    startedAt: performanceNow(),
  };
}

export function requestNextHint(state) {
  if (!state || state.answered) return state;
  const next = Math.min(SUPPORT_LEVEL.FULL, (state.hintLevel ?? 0) + 1);
  if (next === state.hintLevel) return state;
  return {
    ...state,
    hintLevel: next,
    maxHintLevel: Math.max(state.maxHintLevel ?? 0, next),
    hintCount: (state.hintCount ?? 0) + 1,
  };
}

function performanceNow() {
  if (typeof performance !== "undefined" && performance.now) return performance.now();
  return Date.now();
}
