import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  minPoints,
  parseBrain,
  pointsLabel,
  progressToRow,
  questionState,
  rowToProgress,
  summarizeProgress,
  type QuestionProgressRow,
} from "./brain";

const BRAINS_DIR = path.join(process.cwd(), "brains");
const dirs = readdirSync(BRAINS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

describe("brains/*/brain.json", () => {
  it("има барем еден мозок", () => {
    expect(dirs.length).toBeGreaterThan(0);
  });

  for (const dir of dirs) {
    it(`${dir}: е валиден и id е името на папката`, () => {
      const brain = parseBrain(JSON.parse(readFileSync(path.join(BRAINS_DIR, dir, "brain.json"), "utf8")));
      expect(brain.id).toBe(dir);
      expect(brain.questions.length).toBeGreaterThan(0);
    });
  }
});

const minimal = () => ({
  schema_version: 1,
  id: "test",
  subject: { code: "Т", name: "Тест" },
  updated: "2026-10-16",
  sources: [{ id: "s1", type: "question_bank", title: "База" }],
  assessment: {
    summary: "Тест",
    total: { points: 100, min_percent: 50 },
    parts: [
      {
        id: "test",
        name: "Тест",
        points: 100,
        min_percent: 50,
        summary: "Еден тест",
        facts: [{ label: "Каде", value: "онлајн" }],
        steps: [{ title: "Пријава", when: "до рокот" }],
        rules: [],
        from_students: [{ text: "Лесно е", sources: ["s1"] }],
        sources: ["s1"],
      },
    ],
    confirmed: false,
    sources: ["s1"],
  },
  overview: { summary: "Накратко", focus: [], exam_patterns: [], professor_said: [], pitfalls: [], rumors: [], gaps: [] },
  staff: [],
  topics: [{ id: "t1", title: "Тема", importance: 3, summary: "За", key_points: ["а"], sources: ["s1"] }],
  questions: [{ id: "q1", topic: "t1", question: "?", options: ["да", "не"], answer: [1, 0], explanation: "зошто", sources: ["s1"] }],
});

describe("parseBrain", () => {
  it("прифаќа минимален мозок и ги подредува одговорите", () => {
    expect(parseBrain(minimal()).questions[0].answer).toEqual([0, 1]);
  });

  it("ја кажува патеката до грешката", () => {
    const b = minimal();
    b.questions[0].answer = [5];
    expect(() => parseBrain(b)).toThrow(/questions\[0\]\.answer\[0\]/);
  });

  it("одбива непознат извор и непозната тема", () => {
    const a = minimal();
    a.questions[0].sources = ["nema"];
    expect(() => parseBrain(a)).toThrow(/непознат извор „nema“/);
    const b = minimal();
    b.questions[0].topic = "nema";
    expect(() => parseBrain(b)).toThrow(/непозната тема/);
  });

  it("одбива ознаки што се повторуваат", () => {
    const b = minimal();
    b.questions.push({ ...b.questions[0] });
    expect(() => parseBrain(b)).toThrow(/„q1“ се повторува/);
  });
});

const row = (over: Partial<QuestionProgressRow>): QuestionProgressRow => ({
  question_id: "q1",
  in_wrong: false,
  flagged: false,
  mastery_streak: 0,
  completed_streak: 0,
  tainted: false,
  wrong_strikes: 0,
  redemption: 0,
  ...over,
});

describe("поени", () => {
  it("минимум поени за дел", () => {
    expect(minPoints(70, 30)).toBe(21);
    expect(minPoints(30, 50)).toBe(15);
    expect(minPoints(null, 50)).toBeNull();
  });
  it("поен / поени", () => {
    expect(pointsLabel(21)).toBe("21 поен");
    expect(pointsLabel(11)).toBe("11 поени");
    expect(pointsLabel(15)).toBe("15 поени");
  });
});

describe("напредок", () => {
  const p = (over: Partial<QuestionProgressRow>) => rowToProgress(row(over), "q1", "test");

  it("состојба на прашање", () => {
    expect(questionState(undefined)).toBe("new");
    expect(questionState(p({ mastery_streak: 1 }))).toBe("learning");
    expect(questionState(p({ mastery_streak: 2 }))).toBe("mastered");
    expect(questionState(p({ completed_streak: 2 }))).toBe("completed");
    expect(questionState(p({ in_wrong: true }))).toBe("wrong");
    expect(questionState(p({ tainted: true }))).toBe("wrong");
  });

  it("ред ↔ напредок без загуба", () => {
    const r = row({ in_wrong: true, wrong_strikes: 2, flagged: true });
    expect(progressToRow(rowToProgress(r, "q1", "test"), "q1")).toEqual(r);
  });

  it("збир по сет, состојба и тема", () => {
    const brain = parseBrain(minimal());
    const s = summarizeProgress(brain, [row({ mastery_streak: 2, flagged: true })]);
    expect(s.sets).toMatchObject({ total: 1, main: 0, mastered: 1, completed: 0, flagged: 1, wrong_set: 0 });
    expect(s.states.mastered).toBe(1);
    expect(s.done).toBe(1);
    expect(s.byTopic.t1).toEqual({ total: 1, done: 1 });
  });
});
