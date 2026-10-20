import { describe, expect, it } from "vitest";
import { cardsForMode, deckCounts, restoreOrder, shuffleChoices } from "./deck";
import { emptyProgress } from "./progress";
import type { Card, Progress, ProgressMap } from "./types";

function card(id: string, position: number, over: Partial<Card> = {}): Card {
  return {
    id,
    deck_id: "d1",
    question: `Прашање ${id}`,
    choices: ["A", "B", "C", "D"],
    correct: [1],
    type: "single",
    difficulty: null,
    explanation: "",
    source: null,
    aliases: [],
    position,
    ...over,
  };
}

function prog(id: string, over: Partial<Progress>): Progress {
  return { ...emptyProgress({ id, deck_id: "d1" }), ...over };
}

const cards = [card("a", 0), card("b", 1), card("c", 2), card("d", 3), card("e", 4)];
const progress: ProgressMap = {
  b: prog("b", { mastery_streak: 2 }),
  c: prog("c", { completed_streak: 2, in_wrong: true }),
  d: prog("d", { tainted: true, in_wrong: true }),
  e: prog("e", { flagged: true, mastery_streak: 1 }),
};

describe("cardsForMode", () => {
  it("main ги крие совладаните, готовите и tainted", () => {
    expect(cardsForMode(cards, progress, "main").map((c) => c.id)).toEqual(["a", "e"]);
  });
  it("останатите режими", () => {
    const ids = (m: Parameters<typeof cardsForMode>[2]) => cardsForMode(cards, progress, m).map((c) => c.id);
    expect(ids("wrong_set")).toEqual(["c", "d"]);
    expect(ids("mastered")).toEqual(["b"]);
    expect(ids("completed")).toEqual(["c"]);
    expect(ids("flagged")).toEqual(["e"]);
  });
  it("го почитува редоследот по position", () => {
    const shuffledInput = [cards[4], cards[0]];
    expect(cardsForMode(shuffledInput, {}, "main").map((c) => c.id)).toEqual(["a", "e"]);
  });
});

describe("deckCounts", () => {
  it("брои по режим", () => {
    expect(deckCounts(cards, progress)).toEqual({
      total: 5,
      main: 2,
      wrong_set: 2,
      flagged: 1,
      mastered: 1,
      completed: 1,
      tainted: 1,
    });
  });
});

describe("shuffleChoices", () => {
  it("точниот одговор го следи својот текст", () => {
    for (let i = 0; i < 20; i++) {
      const dc = shuffleChoices(card("x", 0, { choices: ["A", "B", "C", "D"], correct: [1, 3], type: "multiple" }));
      expect(dc.correct.map((idx) => dc.choices[idx]).sort()).toEqual(["B", "D"]);
      expect([...dc.choices].sort()).toEqual(["A", "B", "C", "D"]);
    }
  });
  it("игнорира невалидни индекси", () => {
    const dc = shuffleChoices(card("x", 0, { correct: [7] }));
    expect(dc.correct).toEqual([]);
  });
});

describe("restoreOrder", () => {
  it("го враќа зачуваниот редослед и ги додава новите на крај", () => {
    const r = restoreOrder(cards, { order: ["c", "a", "zzz"], current: "a", results: { c: true, zzz: false } });
    expect(r.cards.map((c) => c.id)).toEqual(["c", "a", "b", "d", "e"]);
    expect(r.index).toBe(1);
    expect(r.results).toEqual({ c: true });
  });
  it("непознат current = почеток", () => {
    expect(restoreOrder(cards, { order: [], current: "nope", results: {} }).index).toBe(0);
  });
});
