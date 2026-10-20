import { isCompleted, isMastered, progressFor } from "./progress";
import type { Card, DeckMode, DisplayCard, ProgressMap, ResumeState } from "./types";

export const MODE_LABELS: Record<DeckMode, string> = {
  main: "Главен сет",
  missed: "Пропуштени",
  wrong_set: "Погрешни",
  mastered: "Совладани",
  completed: "Готови",
  flagged: "Означени",
};

export const EMPTY_MESSAGES: Record<DeckMode, string> = {
  main: "Главниот сет е празен. Сите прашања се во Совладани, Готови или Tainted.",
  missed: "Нема пропуштени прашања од последната сесија.",
  wrong_set: "Погрешните се празни.",
  mastered: "Совладаните се празни. Прашање станува совладано по 2 точни одговори по ред во Главен сет.",
  completed: "Готовите се празни. Совладано прашање станува готово по уште 2 точни одговори по ред во Совладани.",
  flagged: "Означените се празни.",
};

export type Rng = () => number;

export function shuffled<T>(items: T[], rng: Rng = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Ги меша изборите на картичката и ги преместува индексите на точните одговори. */
export function shuffleChoices(card: Card, rng: Rng = Math.random): DisplayCard {
  const indexed = shuffled(
    card.choices.map((choice, idx) => ({ choice, idx })),
    rng,
  );
  const correctSet = new Set(card.correct.filter((i) => i >= 0 && i < card.choices.length));
  return {
    card,
    choices: indexed.map((x) => x.choice),
    correct: indexed.flatMap((x, newIdx) => (correctSet.has(x.idx) ? [newIdx] : [])),
  };
}

export interface DeckCounts {
  total: number;
  main: number;
  wrong_set: number;
  flagged: number;
  mastered: number;
  completed: number;
  tainted: number;
}

type CardRef = Pick<Card, "id" | "deck_id">;

function inMode(card: CardRef, progress: ProgressMap, mode: DeckMode): boolean {
  const p = progressFor(card, progress);
  switch (mode) {
    case "main":
      return !isMastered(p) && !isCompleted(p) && !p.tainted;
    case "wrong_set":
      return p.in_wrong;
    case "flagged":
      return p.flagged;
    case "mastered":
      return isMastered(p) && !isCompleted(p);
    case "completed":
      return isCompleted(p);
    case "missed":
      return false;
  }
}

/** Картичките за даден режим, по редоследот во банката. */
export function cardsForMode(cards: Card[], progress: ProgressMap, mode: DeckMode): Card[] {
  return [...cards]
    .sort((a, b) => a.position - b.position)
    .filter((c) => inMode(c, progress, mode));
}

export function deckCounts(cards: CardRef[], progress: ProgressMap): DeckCounts {
  const counts: DeckCounts = {
    total: cards.length,
    main: 0,
    wrong_set: 0,
    flagged: 0,
    mastered: 0,
    completed: 0,
    tainted: 0,
  };
  for (const card of cards) {
    const p = progressFor(card, progress);
    if (inMode(card, progress, "main")) counts.main++;
    if (p.in_wrong) counts.wrong_set++;
    if (p.flagged) counts.flagged++;
    if (inMode(card, progress, "mastered")) counts.mastered++;
    if (isCompleted(p)) counts.completed++;
    if (p.tainted) counts.tainted++;
  }
  return counts;
}

/**
 * Го враќа редоследот од зачувана незавршена сесија: прво зачуваниот редослед
 * (само картичките што сè уште се во сетот), па новите картички на крај.
 */
export function restoreOrder(
  cards: Card[],
  state: ResumeState,
): { cards: Card[]; index: number; results: Record<string, boolean> } {
  const byId = new Map(cards.map((c) => [c.id, c]));
  const ordered: Card[] = [];
  const seen = new Set<string>();
  for (const id of state.order) {
    const card = byId.get(id);
    if (card && !seen.has(id)) {
      ordered.push(card);
      seen.add(id);
    }
  }
  for (const card of cards) {
    if (!seen.has(card.id)) ordered.push(card);
  }
  const results: Record<string, boolean> = {};
  for (const [id, ok] of Object.entries(state.results)) {
    if (byId.has(id)) results[id] = ok;
  }
  const idx = state.current ? ordered.findIndex((c) => c.id === state.current) : -1;
  return { cards: ordered, index: Math.max(0, idx), results };
}
