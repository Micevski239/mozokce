import { cardsForMode, restoreOrder, shuffleChoices, shuffled, type Rng } from "./deck";
import type { Card, DeckMode, DisplayCard, Progress, ProgressMap, ResumeState } from "./types";

/** Одговор даден во тековната сесија; `before` овозможува „Промени одговор“. */
export interface Answer {
  selected: number[];
  isCorrect: boolean;
  before: Progress;
}

/** Една сесија во квизот: кои картички, по кој редослед и што е одговорено. */
export interface Run {
  mode: DeckMode;
  items: DisplayCard[];
  index: number;
  results: Record<string, boolean>;
  answers: Record<string, Answer>;
  /** Колку картички се скриени од главниот сет (совладани/готови/tainted). */
  hidden: number;
  /** Картичките за режимот „Пропуштени“ (за „Почни одново“). */
  missed: Card[];
}

export function buildRun(
  mode: DeckMode,
  cards: Card[],
  progress: ProgressMap,
  opts: { shuffle: boolean; resume?: ResumeState | null; missed?: Card[]; rng?: Rng },
): Run {
  const rng = opts.rng ?? Math.random;
  const list = mode === "missed" ? (opts.missed ?? []) : cardsForMode(cards, progress, mode);
  const hidden = mode === "main" ? cards.length - list.length : 0;

  let ordered = list;
  let index = 0;
  let results: Record<string, boolean> = {};
  if (mode === "main" && opts.resume) {
    const restored = restoreOrder(list, opts.resume);
    ordered = restored.cards;
    index = restored.index;
    results = restored.results;
  } else if (opts.shuffle) {
    ordered = shuffled(list, rng);
  }

  return {
    mode,
    items: ordered.map((c) => shuffleChoices(c, rng)),
    index: Math.min(index, Math.max(0, ordered.length - 1)),
    results,
    answers: {},
    hidden,
    missed: mode === "missed" ? list : [],
  };
}

export function resumeStateOf(run: Run): ResumeState {
  return {
    order: run.items.map((i) => i.card.id),
    current: run.items[run.index]?.card.id ?? null,
    results: run.results,
  };
}

export function sameSelection(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((x) => set.has(x));
}

export interface RunScore {
  correct: number;
  answered: number;
  total: number;
  missed: DisplayCard[];
}

export function scoreRun(run: Run): RunScore {
  let correct = 0;
  let answered = 0;
  const missed: DisplayCard[] = [];
  for (const item of run.items) {
    const r = run.results[item.card.id];
    if (r === undefined) continue;
    answered++;
    if (r) correct++;
    else missed.push(item);
  }
  return { correct, answered, total: run.items.length, missed };
}
