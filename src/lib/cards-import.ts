import type { CardType, Difficulty } from "./quiz/types";

/** Картичка подготвена за внесување во базата (без id и deck_id). */
export interface NewCard {
  question: string;
  choices: string[];
  correct: number[];
  type: CardType;
  difficulty: Difficulty | null;
  explanation: string;
  source: string | null;
  aliases: string[];
}

const DIFFICULTIES = new Set(["easy", "medium", "hard"]);

/** Валидира една картичка во форматот од cards.json / base_card_prompt.md. */
export function normalizeCard(raw: unknown): NewCard | string {
  if (!raw || typeof raw !== "object") return "не е објект";
  const r = raw as Record<string, unknown>;

  const question = typeof r.question === "string" ? r.question.trim() : "";
  if (!question) return "нема прашање";

  if (!Array.isArray(r.choices) || r.choices.length < 2) return "мора да има најмалку 2 одговори";
  const choices = r.choices.map((c) => String(c).trim());
  if (choices.some((c) => !c)) return "има празен одговор";

  if (!Array.isArray(r.correct) || r.correct.length === 0) return "нема точен одговор (correct)";
  const correct = [...new Set(r.correct.map(Number))].sort((a, b) => a - b);
  if (correct.some((i) => !Number.isInteger(i) || i < 0 || i >= choices.length)) {
    return "correct содржи индекс надвор од одговорите (индексите почнуваат од 0)";
  }

  let type: CardType = correct.length > 1 ? "multiple" : "single";
  if (r.type === "multiple") type = "multiple";
  if (r.type === "single" && correct.length > 1) return "type е single, а има повеќе точни одговори";

  const difficulty = typeof r.difficulty === "string" && DIFFICULTIES.has(r.difficulty) ? (r.difficulty as Difficulty) : null;
  const explanation = typeof r.explanation === "string" ? r.explanation.trim() : "";
  const source = typeof r.source === "string" && r.source.trim() ? r.source.trim() : null;
  const aliases = Array.isArray(r.aliases) ? r.aliases.map((a) => String(a).trim()).filter(Boolean) : [];

  return { question, choices, correct, type, difficulty, explanation, source, aliases };
}

export interface ParseResult {
  cards: NewCard[];
  errors: string[];
  duplicates: number;
}

/**
 * Парсира JSON низа картички. Ги прескокнува дупликатите (по текст на прашање),
 * вклучително и прашањата што веќе постојат во декот.
 */
export function parseCards(raw: unknown, existingQuestions: Iterable<string> = []): ParseResult {
  if (!Array.isArray(raw)) return { cards: [], errors: ["JSON-от мора да е низа од картички: [ {...}, {...} ]"], duplicates: 0 };
  const seen = new Set(existingQuestions);
  const cards: NewCard[] = [];
  const errors: string[] = [];
  let duplicates = 0;
  raw.forEach((item, i) => {
    const result = normalizeCard(item);
    if (typeof result === "string") {
      errors.push(`Картичка ${i + 1}: ${result}`);
      return;
    }
    if (seen.has(result.question)) {
      duplicates++;
      return;
    }
    seen.add(result.question);
    cards.push(result);
  });
  return { cards, errors, duplicates };
}
