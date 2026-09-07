import { readFileSync } from "node:fs";
import ts from "typescript";
import { render } from "preact";
import { act } from "preact/test-utils";
import { expect, test } from "vitest";
import { createMemoryPort } from "../../packages/hyakunin/src/domain/ports.ts";
import { Home } from "../../packages/hyakunin/src/ui/screens/Home.tsx";
import { RangePicker } from "../../packages/hyakunin/src/ui/screens/RangePicker.tsx";
import { Session } from "../../packages/hyakunin/src/ui/screens/Session.tsx";

const settings = {
  key: "user" as const,
  reading: "no-ruby" as const,
  writing: "vertical" as const,
  order: "number" as const,
  soundEnabled: false,
  noticeConfirmed: true,
};
const poem = {
  cardNo: 1,
  ku: ["あ", "い", "う", "え", "お"],
  author: { canonical: "作者" },
  reading: {
    status: "confirmed",
    historical: { ku: ["あ", "い", "う", "え", "お"], author: "さくしゃ" },
    modern: { ku: ["あ", "い", "う", "え", "お"], author: "さくしゃ" },
  },
} as never;
const question = (id = "p001-ku1") => ({
  questionId: id,
  poemId: "p001",
  skill: "text" as const,
  type: "blank" as const,
  blankUnit: "word" as const,
  prompt: "＿",
  answer: "あ",
  answerHistorical: "あ",
  answerModern: "あ",
  acceptedAnswers: ["あ"],
  partialAnswers: [],
  candidates: [],
  normalization: "kana" as const,
  note: null,
  sourceRef: "fixture",
  reviewStatus: "human-confirmed" as const,
  confirmationMode: "individual" as const,
  confirmedBy: "tester",
  confirmedOn: "2026-09-01",
  proposedBy: "tester",
  batchEvidenceRef: null,
});
function root() {
  const node = document.createElement("div");
  document.body.append(node);
  return node;
}
async function answer(node: HTMLElement, value = "あ") {
  const input = node.querySelector("input[placeholder]") as HTMLInputElement;
  await act(() => {
    input.value = value;
    input.dispatchEvent(new InputEvent("input", { bubbles: true }));
  });
  await act(async () => {
    (node.querySelector("button.primary") as HTMLButtonElement).click();
    await Promise.resolve();
  });
}

test("T-1: 折りたたみは歌本文・作者・本番の三択である", async () => {
  const node = root();
  await act(() =>
    render(<Home poems={[poem]} questions={[question()]} />, node),
  );
  await act(() => {
    Array.from(node.querySelectorAll("button"))
      .find((button) => button.textContent === "学習方法を選ぶ")!
      .click();
  });
  expect(
    Array.from(node.querySelectorAll(".practice-choice button")).map(
      (button) => button.textContent,
    ),
  ).toEqual(["歌本文", "作者", "本番"]);
  node.remove();
});
test("T-2: ホームに三つの説明を出す", async () => {
  const node = root();
  await act(() =>
    render(<Home poems={[poem]} questions={[question()]} />, node),
  );
  await act(() => {
    Array.from(node.querySelectorAll("button"))
      .find((button) => button.textContent === "学習方法を選ぶ")!
      .click();
  });
  expect(node.textContent).toContain("穴埋めで確認");
  expect(node.textContent).toContain("歌と作者を結びつける");
  expect(node.textContent).toContain("試験のように解いて採点");
  node.remove();
});
test("T-3: 廃止した読み名を画面ソースから除く", () => {
  const files = ["Home.tsx", "RangePicker.tsx", "Session.tsx"];
  const sources = files.map((file) =>
    readFileSync(`packages/hyakunin/src/ui/screens/${file}`, "utf8"),
  );
  expect(sources).not.toHaveLength(0);
  expect(sources.join("\n")).not.toContain("読みを確認しながら穴埋め");
  expect(sources.join("\n")).not.toContain("読みを隠して穴埋め");
});
test("T-4: 紙は本番でだけ選べる", async () => {
  const learn = root();
  await act(() =>
    render(
      <RangePicker
        entry="learn"
        range={{ from: 1, to: 1 }}
        order="number"
        onBack={() => {}}
        onStart={() => {}}
      />,
      learn,
    ),
  );
  expect(learn.textContent).not.toContain("紙に書く");
  learn.remove();
  const exam = root();
  await act(() =>
    render(
      <RangePicker
        entry="exam"
        range={{ from: 1, to: 1 }}
        order="number"
        onBack={() => {}}
        onStart={() => {}}
      />,
      exam,
    ),
  );
  expect(exam.textContent).toContain("紙に書く");
  exam.remove();
});
test("T-5: 本番は答えた直後に正誤を出さず練習は出す", async () => {
  const exam = root();
  await act(() =>
    render(
      <Session
        entry="exam"
        questions={[question()]}
        poems={[poem]}
        sessionId="e"
        port={createMemoryPort()}
        settings={settings}
        onSettings={() => {}}
        onComplete={() => {}}
      />,
      exam,
    ),
  );
  await answer(exam);
  expect(exam.querySelector('.answer-feedback')).toBeNull();
  expect(exam.textContent).toContain("採点する");
  exam.remove();
  const learn = root();
  await act(() =>
    render(
      <Session
        questions={[question()]}
        poems={[poem]}
        sessionId="l"
        port={createMemoryPort()}
        settings={settings}
        onSettings={() => {}}
        onComplete={() => {}}
      />,
      learn,
    ),
  );
  await answer(learn);
  expect(learn.textContent).toContain("正解");
  learn.remove();
});
test("T-6: 本番の完了局面は問題数と同じ採点行を出す", async () => {
  const node = root();
  const qs = [question("one"), question("two")];
  await act(() =>
    render(
      <Session
        entry="exam"
        questions={qs}
        poems={[poem]}
        sessionId="e"
        port={createMemoryPort()}
        settings={settings}
        onSettings={() => {}}
        onComplete={() => {}}
      />,
      node,
    ),
  );
  await answer(node);
  await answer(node);
  expect(node.querySelectorAll(".grade-list > li")).toHaveLength(2);
  node.remove();
});
test("T-7: 画面本番の採点行に自分の答えと正答を出す", async () => {
  const node = root();
  await act(() =>
    render(
      <Session
        entry="exam"
        questions={[question()]}
        poems={[poem]}
        sessionId="e"
        port={createMemoryPort()}
        settings={settings}
        onSettings={() => {}}
        onComplete={() => {}}
      />,
      node,
    ),
  );
  await answer(node);
  expect(node.textContent).toContain("自分の答え: あ");
  expect(node.textContent).toContain("正答: あ");
  node.remove();
});
test("T-8: 紙の全行を採点するまで結果へ進めない", async () => {
  const node = root();
  await act(() =>
    render(
      <Session
        entry="exam"
        answerMode="paper"
        questions={[question()]}
        poems={[poem]}
        sessionId="e"
        port={createMemoryPort()}
        settings={settings}
        onSettings={() => {}}
        onComplete={() => {}}
      />,
      node,
    ),
  );
  await act(() => {
    Array.from(node.querySelectorAll("button"))
      .find((button) => button.textContent === "次へ")!
      .click();
  });
  const result = Array.from(node.querySelectorAll("button")).find(
    (button) => button.textContent === "結果へ",
  ) as HTMLButtonElement;
  expect(result.disabled).toBe(true);
  await act(() => {
    Array.from(node.querySelectorAll(".grade-choice button"))[0].click();
  });
  expect(result.disabled).toBe(false);
  node.remove();
});
test("T-9: 本番は確定まで保存せず確定後に問題数を保存する", async () => {
  const port = createMemoryPort();
  const node = root();
  await act(() =>
    render(
      <Session
        entry="exam"
        questions={[question()]}
        poems={[poem]}
        sessionId="e"
        port={port}
        settings={settings}
        onSettings={() => {}}
        onComplete={() => {}}
      />,
      node,
    ),
  );
  await answer(node);
  expect(port.events).toHaveLength(0);
  await act(async () => {
    Array.from(node.querySelectorAll("button"))
      .find((button) => button.textContent === "結果へ")!
      .click();
    await Promise.resolve();
  });
  expect(port.events).toHaveLength(1);
  node.remove();
});
test("T-10: 作者確認は穴埋めの折りたたみ外から開ける", async () => {
  const node = root();
  await act(() =>
    render(<Home poems={[poem]} questions={[question()]} />, node),
  );
  expect(
    Array.from(node.querySelectorAll(".practice-choices button")).map(
      (button) => button.textContent,
    ),
  ).not.toContain("作者名を確認する");
  await act(() => {
    Array.from(node.querySelectorAll("button"))
      .find((button) => button.textContent === "作者名を確認する")!
      .click();
  });
  expect(node.textContent).toContain("作者名を見る");
  node.remove();
});
test("T-11: READMEに新しい三つのモード名と説明がある", () => {
  const readme = readFileSync("README.md", "utf8");
  expect(readme).toContain("歌本文（穴埋めで確認）");
  expect(readme).toContain("作者（歌と作者を結びつける）");
  expect(readme).toContain("本番（試験のように解いて採点）");
});

test("F-1: 本番の画面入力と紙の採点前に中断時の注意書きを出す", async () => {
  for (const answerMode of ["screen", "paper"] as const) {
    const node = root();
    await act(() => render(<Session entry="exam" answerMode={answerMode} questions={[question()]} poems={[poem]} sessionId={`f1-${answerMode}`} port={createMemoryPort()} settings={settings} onSettings={() => {}} onComplete={() => {}} />, node));
    if (answerMode === "screen") await answer(node);
    else await act(() => { Array.from(node.querySelectorAll("button")).find((button) => button.textContent === "次へ")!.click(); });
    expect(node.querySelector(".grade-list")).not.toBeNull();
    expect(node.textContent).toContain("採点が確定するまで習熟度には反映されません。途中で閉じた場合は記録されません。");
    node.remove();
  }
});

test("F-2: FlowPhaseは五つの文字列リテラルだけ", () => {
  const source = ts.createSourceFile("flow.ts", readFileSync("packages/hyakunin/src/domain/flow.ts", "utf8"), ts.ScriptTarget.Latest, true);
  const declarations = source.statements.filter((statement): statement is ts.TypeAliasDeclaration => ts.isTypeAliasDeclaration(statement) && statement.name.text === "FlowPhase");
  expect(declarations).toHaveLength(1);
  const members = declarations[0].type;
  expect(ts.isUnionTypeNode(members)).toBe(true);
  if (!ts.isUnionTypeNode(members)) return;
  expect(members.types).toHaveLength(5);
  const values = members.types.map((member) => {
    expect(ts.isLiteralTypeNode(member) && ts.isStringLiteral(member.literal)).toBe(true);
    return ts.isLiteralTypeNode(member) && ts.isStringLiteral(member.literal) ? member.literal.text : "";
  });
  expect(new Set(values)).toEqual(new Set(["prompt", "answered", "revealed", "save-failed", "complete"]));
});

test("F-3: 紙の採点一覧は問題ごとの歌番号と正答を結び付けて出す", async () => {
  const node = root();
  const secondPoem = { ...poem, cardNo: 2, ku: ["か", "き", "く", "け", "こ"] } as never;
  const questions = [question("p001-ku1"), { ...question("p002-ku1"), poemId: "p002", answer: "か", answerHistorical: "か", answerModern: "か", acceptedAnswers: ["か"] }];
  await act(() => render(<Session entry="exam" answerMode="paper" questions={questions} poems={[poem, secondPoem]} sessionId="f3" port={createMemoryPort()} settings={settings} onSettings={() => {}} onComplete={() => {}} />, node));
  for (let index = 0; index < questions.length; index += 1) await act(() => { Array.from(node.querySelectorAll("button")).find((button) => button.textContent === "次へ")!.click(); });
  const rows = Array.from(node.querySelectorAll(".grade-list > li"));
  expect(questions.length).toBeGreaterThan(0);
  expect(rows).toHaveLength(questions.length);
  expect(rows.map((row) => row.textContent)).toEqual(expect.arrayContaining([expect.stringContaining("1番"), expect.stringContaining("正答: あ"), expect.stringContaining("2番"), expect.stringContaining("正答: か")]));
  expect(rows[0].textContent).toContain("1番");
  expect(rows[0].textContent).toContain("正答: あ");
  expect(rows[1].textContent).toContain("2番");
  expect(rows[1].textContent).toContain("正答: か");
  node.remove();
});

test("F-4: 本番の採点一覧は実入力から○・△・×を行ごとに出す", async () => {
  const node = root();
  const secondPoem = { ...poem, cardNo: 2 } as never;
  const thirdPoem = { ...poem, cardNo: 3 } as never;
  const questions = [question("p001-ku1"), { ...question("p002-ku1"), poemId: "p002", answer: "う", answerHistorical: "ゑ", answerModern: "え", acceptedAnswers: ["う", "ゑ"], partialAnswers: ["え"] }, { ...question("p003-ku1"), poemId: "p003", answer: "お", answerHistorical: "お", answerModern: "お", acceptedAnswers: ["お"] }];
  await act(() => render(<Session entry="exam" questions={questions} poems={[poem, secondPoem, thirdPoem]} sessionId="f4" port={createMemoryPort()} settings={settings} onSettings={() => {}} onComplete={() => {}} />, node));
  await answer(node, "あ");
  await answer(node, "え");
  await answer(node, "ちがう");
  const rows = Array.from(node.querySelectorAll(".grade-list > li"));
  expect(rows).toHaveLength(3);
  // 2026-09-07 依頼者指示：誤答は「要確認（誤答）」、閲覧は「要確認（わからなかった）」。理由だけを括弧で分ける。
  expect(rows.map((row) => row.querySelector('.grade-mark')?.getAttribute("aria-label"))).toEqual(["正解", "△", "要確認（誤答）"]);
  expect(rows.map((row) => row.textContent)).toEqual(expect.arrayContaining([expect.stringContaining("正解"), expect.stringContaining("△"), expect.stringContaining("要確認（誤答）")]));
  node.remove();
});

// 2026-09-07 依頼者指示：本番の採点一覧で「答えを確認」をやめ、閲覧も誤答も同じ ✓要確認 にする。
// **学習者から見れば、答えを見た問も間違えた問も「もう一度見る歌」である。** 理由だけを括弧で分ける。
test("F-5: 採点一覧は閲覧と誤答を同じ印にし、理由だけを括弧で分ける", async () => {
  const node = root();
  const secondPoem = { ...poem, cardNo: 2 } as never;
  const questions = [question("p001-ku1"), { ...question("p002-ku1"), poemId: "p002" }];
  await act(() => render(<Session entry="exam" questions={questions} poems={[poem, secondPoem]} sessionId="f5" port={createMemoryPort()} settings={settings} onSettings={() => {}} onComplete={() => {}} />, node));
  // 1問目は「わからない！」（閲覧）、2問目は誤答。
  await act(async () => { Array.from(node.querySelectorAll("button")).find((button) => button.textContent?.trim() === "わからない！")!.click(); await Promise.resolve(); });
  await answer(node, "ちがう");
  const rows = Array.from(node.querySelectorAll(".grade-list > li"));
  expect(rows).toHaveLength(2);
  const marks = rows.map((row) => row.querySelector(".grade-mark")!);
  expect(marks.map((mark) => mark.getAttribute("aria-label"))).toEqual(["要確認（わからなかった）", "要確認（誤答）"]);
  expect(marks.map((mark) => mark.textContent)).toEqual(["要確認（わからなかった）", "要確認（誤答）"]);
  // 「答えを確認」は操作に見える。印の文言としては使わない。
  expect(node.textContent).not.toContain("答えを確認");
  // 判定そのものは変えていない。閲覧の行は viewed のままである。
  expect(marks.map((mark) => mark.className)).toEqual(["grade-mark grade-mark--viewed", "grade-mark grade-mark--incorrect"]);
  // 印は両方とも ✓ の画像を持つ。
  expect(rows.every((row) => row.querySelector('img[src*="needs-review-check"]'))).toBe(true);
  node.remove();
});
