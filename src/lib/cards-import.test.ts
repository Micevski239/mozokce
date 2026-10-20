import { describe, expect, it } from "vitest";
import { normalizeCard, parseCards } from "./cards-import";

const valid = {
  question: " Што е X? ",
  choices: ["a", "b", "c"],
  correct: [2],
  type: "single",
  difficulty: "hard",
  explanation: "Зошто: ... За испит: ...",
};

describe("normalizeCard", () => {
  it("прифаќа валидна картичка", () => {
    expect(normalizeCard(valid)).toMatchObject({ question: "Што е X?", correct: [2], type: "single", difficulty: "hard" });
  });
  it("го заклучува типот од бројот на точни", () => {
    expect(normalizeCard({ ...valid, type: undefined, correct: [0, 2] })).toMatchObject({ type: "multiple" });
  });
  it("одбива невалидни индекси и single со повеќе точни", () => {
    expect(normalizeCard({ ...valid, correct: [3] })).toContain("надвор");
    expect(normalizeCard({ ...valid, correct: [0, 1] })).toContain("single");
    expect(normalizeCard({ ...valid, choices: ["само еден"] })).toContain("2 одговори");
  });
  it("непозната тежина = null", () => {
    expect(normalizeCard({ ...valid, difficulty: "super" })).toMatchObject({ difficulty: null });
  });
});

describe("parseCards", () => {
  it("ги прескокнува дупликатите и постоечките прашања", () => {
    const r = parseCards([valid, valid, { ...valid, question: "Ново" }, { ...valid, question: "Старо" }], ["Старо"]);
    expect(r.cards.map((c) => c.question)).toEqual(["Што е X?", "Ново"]);
    expect(r.duplicates).toBe(2);
    expect(r.errors).toEqual([]);
  });
  it("пријавува грешки по картичка", () => {
    const r = parseCards([valid, { question: "" }]);
    expect(r.errors).toEqual(["Картичка 2: нема прашање"]);
  });
  it("одбива што не е низа", () => {
    expect(parseCards({}).errors[0]).toContain("низа");
  });
});
