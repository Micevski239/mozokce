import { describe, expect, it } from "vitest";
import { emptyProgress } from "./progress";
import { buildExplanation, choiceLabel, formatCorrectChoices, progressStatus } from "./text";
import type { Card, DisplayCard } from "./types";

function dc(over: Partial<Card> = {}, choices = ["Прво", "Второ", "Трето"], correct = [1]): DisplayCard {
  const card: Card = {
    id: "c",
    deck_id: "d",
    question: "Што е ова?",
    choices,
    correct,
    type: "single",
    difficulty: null,
    explanation: "",
    source: null,
    aliases: [],
    position: 0,
    ...over,
  };
  return { card, choices, correct };
}

describe("formatCorrectChoices", () => {
  it("користи букви според измешаниот редослед", () => {
    expect(formatCorrectChoices(dc({}, ["x", "y", "z"], [0, 2]))).toEqual(["a) x", "c) z"]);
    expect(choiceLabel(26)).toBe("27");
  });
});

describe("buildExplanation", () => {
  it("ги дели деловите Зошто / За испит од еден ред", () => {
    const e = buildExplanation(dc({ explanation: "Зошто: Затоа што X. Уште нешто. За испит: Запомни Y." }));
    expect(e).toEqual({ why: "Затоа што X. Уште нешто.", exam: "Запомни Y." });
  });

  it("работи и со нов ред пред За испит", () => {
    const e = buildExplanation(dc({ explanation: "Зошто: A.\nЗа испит: B." }));
    expect(e).toEqual({ why: "A.", exam: "B." });
  });

  it("без За испит: првата реченица е зошто, остатокот е за испит", () => {
    const e = buildExplanation(dc({ explanation: "Прва реченица. Втора реченица." }));
    expect(e).toEqual({ why: "Прва реченица.", exam: "Втора реченица." });
  });

  it("генерира објаснување кога нема", () => {
    const e = buildExplanation(dc({ question: "Точно или неточно: X", source: "discord" }));
    expect(e.why).toBe("Точен одговор е: b) Второ. Ова тврдење така е наведено во Discord прашањата.");
  });

  it("редослед прашања", () => {
    const e = buildExplanation(dc({ question: "Подреди ги чекорите" }));
    expect(e.why.startsWith("Точниот редослед е: b) Второ.")).toBe(true);
  });
});

describe("progressStatus", () => {
  const p = emptyProgress({ id: "c", deck_id: "d" });
  it("main", () => {
    expect(progressStatus("main", p, null)).toBe("Streak за Совладани: 0/2. Уште 2 точни до Совладани.");
    expect(progressStatus("main", { ...p, mastery_streak: 1 }, null)).toBe(
      "Streak за Совладани: 1/2. Уште 1 точен до Совладани.",
    );
    expect(progressStatus("main", { ...p, mastery_streak: 2 }, true)).toBe(
      "Streak за Совладани: 2/2. Оди во Совладани.",
    );
    expect(progressStatus("main", p, false)).toContain("Погрешен одговор");
  });
  it("missed нема статус", () => {
    expect(progressStatus("missed", p, null)).toBe("");
  });
});
