type Poem = any;
type Review = { authors: any[]; blanks: any[] };

function unique(values: string[]) {
  return [...new Set(values)];
}

function answerSet(answer: string, historical: string, modern: string, aliases: string[] = []) {
  const acceptedAnswers = unique([answer, ...aliases, historical]);
  return { acceptedAnswers, partialAnswers: unique([modern]).filter((value) => !acceptedAnswers.includes(value)) };
}

function metadata(entry: any | undefined) {
  return {
    reviewStatus: entry?.status === 'approved' ? 'human-confirmed' : entry?.status === 'rejected' ? 'rejected' : 'review',
    confirmationMode: entry?.confirmationMode ?? 'individual',
    confirmedBy: entry?.confirmedBy ?? null,
    confirmedOn: entry?.confirmedOn ?? null,
    proposedBy: entry?.proposedBy ?? 'human',
    batchEvidenceRef: entry?.batchEvidenceRef ?? null,
  };
}

function distractors(poems: Poem[], poem: Poem) {
  return poems
    .filter((candidate) => candidate.author.canonical !== poem.author.canonical)
    .sort((left, right) => Math.abs(left.cardNo - poem.cardNo) - Math.abs(right.cardNo - poem.cardNo) || left.cardNo - right.cardNo)
    .map((candidate) => candidate.author.canonical)
    .filter((candidate, index, values) => values.indexOf(candidate) === index)
    .slice(0, 4);
}

export function generateQuestions(poems: Poem[], review: Review) {
  const blanks = poems.flatMap((poem) => poem.ku.map((answer: string, index: number) => {
    const entry = review.blanks.find((item) => item.cardNo === poem.cardNo && item.ku === index + 1);
    return {
      questionId: `${poem.poemId}-blank-ku${index + 1}`, poemId: poem.poemId, skill: 'text', type: 'blank', blankUnit: 'ku',
      prompt: poem.ku.map((value: string, kuIndex: number) => kuIndex === index ? '＿＿＿' : value).join(''), answer,
      answerHistorical: poem.reading.historical.ku[index], answerModern: poem.reading.modern.ku[index],
      ...answerSet(answer, poem.reading.historical.ku[index], poem.reading.modern.ku[index]),
      candidates: [], normalization: 'kana', sourceRef: poem.sourceRef, ...metadata(entry),
    };
  }));
  const authors = poems.flatMap((poem) => {
    const entry = review.authors.find((item) => item.cardNo === poem.cardNo);
    const base = { poemId: poem.poemId, skill: 'author', type: 'author', blankUnit: null, prompt: poem.text, answerHistorical: poem.reading.historical.author, answerModern: poem.reading.modern.author, sourceRef: poem.sourceRef, ...metadata(entry) };
    const wrong = distractors(poems, poem);
    const candidates = [poem.author.canonical, ...wrong].sort((left, right) => poems.find((candidate) => candidate.author.canonical === left)!.cardNo - poems.find((candidate) => candidate.author.canonical === right)!.cardNo);
    const free = { ...base, questionId: `${poem.poemId}-author-free`, answer: poem.author.canonical, ...answerSet(poem.author.canonical, poem.reading.historical.author, poem.reading.modern.author, poem.author.aliases), candidates: [], normalization: 'kana' };
    if (wrong.length < 4) return [free];
    return [
      { ...base, questionId: `${poem.poemId}-author-choice`, answer: poem.author.canonical, acceptedAnswers: [poem.author.canonical], partialAnswers: [], candidates, normalization: 'exact' },
      { ...base, questionId: `${poem.poemId}-author-kana`, answer: poem.reading.historical.author, ...answerSet(poem.reading.historical.author, poem.reading.historical.author, poem.reading.modern.author), candidates, normalization: 'kana' },
      free,
    ];
  });
  return { blankCandidates: blanks.length, authorCandidates: authors.length, questionsBlank: blanks.filter((question) => question.reviewStatus === 'human-confirmed'), questionsAuthor: authors.filter((question) => question.reviewStatus === 'human-confirmed') };
}
