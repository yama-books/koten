import { readFileSync } from "node:fs";
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

test("T-1: 折りたたみは練習と本番の二択だけ", async () => {
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
  ).toEqual(["練習する", "本番のように解く"]);
  node.remove();
});
test("T-2: ホームに二つの説明を出す", async () => {
  const node = root();
  await act(() =>
    render(<Home poems={[poem]} questions={[question()]} />, node),
  );
  await act(() => {
    Array.from(node.querySelectorAll("button"))
      .find((button) => button.textContent === "学習方法を選ぶ")!
      .click();
  });
  expect(node.textContent).toContain("一問一答で確認");
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
  expect(exam.textContent).not.toContain("○ 正解");
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
  expect(learn.textContent).toContain("○ 正解");
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
test("T-11: READMEに新しい二つのモード名と説明がある", () => {
  const readme = readFileSync("README.md", "utf8");
  expect(readme).toContain("練習する（一問一答で確認）");
  expect(readme).toContain("本番のように解く（試験のように解いて採点）");
});
