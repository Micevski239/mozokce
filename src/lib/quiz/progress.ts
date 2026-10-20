import type { Card, DeckMode, Progress, ProgressMap } from "./types";

export const MASTERED_THRESHOLD = 2;
export const COMPLETED_THRESHOLD = 2;
export const TAINTED_THRESHOLD = 3;
export const REDEMPTION_THRESHOLD = 2;

export function emptyProgress(card: Pick<Card, "id" | "deck_id">): Progress {
  return {
    card_id: card.id,
    deck_id: card.deck_id,
    in_wrong: false,
    flagged: false,
    mastery_streak: 0,
    completed_streak: 0,
    tainted: false,
    wrong_strikes: 0,
    redemption: 0,
  };
}

export function progressFor(card: Pick<Card, "id" | "deck_id">, map: ProgressMap): Progress {
  return map[card.id] ?? emptyProgress(card);
}

export const isMastered = (p: Progress) => p.mastery_streak >= MASTERED_THRESHOLD;
export const isCompleted = (p: Progress) => p.completed_streak >= COMPLETED_THRESHOLD;

/**
 * Ефект од еден одговор врз напредокот. Се применува веднаш по одговорот
 * (како во старата desktop апликација), па крајот на сесијата само ја запишува сесијата.
 *
 * Погрешен одговор (во секој режим):
 *  - ако картичката имала streak кон Совладани, само streak-от се ресетира;
 *    инаку оди во Погрешни;
 *  - се брои strike; на 3 strikes картичката станува tainted
 *    (скриена од главниот сет додека не се искупи во Погрешни);
 *  - излегува од Совладани, а во режимите Совладани/Готови и од Готови.
 *
 * Точен одговор:
 *  - main: +1 streak кон Совладани (освен ако е tainted);
 *  - mastered: +1 кон Готови; кога ќе стане Готова, излегува од Совладани;
 *  - wrong_set: се враќа во главниот сет; tainted картичка мора да се
 *    погоди 2 пати (redemption) пред да се врати и да се исчистат strikes.
 */
export function applyAnswer(prev: Progress, mode: DeckMode, isCorrect: boolean): Progress {
  const p: Progress = { ...prev };

  if (!isCorrect) {
    if (p.mastery_streak < 1) p.in_wrong = true;
    p.redemption = 0;
    p.wrong_strikes += 1;
    if (p.wrong_strikes >= TAINTED_THRESHOLD) p.tainted = true;
    p.mastery_streak = 0;
    if (mode === "mastered" || mode === "completed") p.completed_streak = 0;
    return p;
  }

  switch (mode) {
    case "main":
      if (!p.tainted) p.mastery_streak += 1;
      break;
    case "mastered":
      p.completed_streak += 1;
      if (isCompleted(p)) p.mastery_streak = 0;
      break;
    case "wrong_set":
      if (p.tainted) {
        p.redemption += 1;
        if (p.redemption >= REDEMPTION_THRESHOLD) {
          p.in_wrong = false;
          p.tainted = false;
          p.wrong_strikes = 0;
          p.redemption = 0;
        }
      } else {
        p.in_wrong = false;
      }
      break;
    default:
      break;
  }
  return p;
}

/** „Готови → Совладани“: враќа готова картичка назад во Совладани. */
export function completedToMastered(p: Progress): Progress {
  return {
    ...p,
    mastery_streak: Math.max(MASTERED_THRESHOLD, p.completed_streak),
    completed_streak: 0,
  };
}

/** „Ресетирај совладани“: сите совладани и готови се враќаат во главниот сет. */
export function resetMastery(p: Progress): Progress {
  return { ...p, mastery_streak: 0, completed_streak: 0 };
}

/** Дали редот носи некаква информација (празните редови не се чуваат). */
export function isEmptyProgress(p: Progress): boolean {
  return (
    !p.in_wrong &&
    !p.flagged &&
    !p.tainted &&
    p.mastery_streak === 0 &&
    p.completed_streak === 0 &&
    p.wrong_strikes === 0 &&
    p.redemption === 0
  );
}
