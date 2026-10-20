import { COMPLETED_THRESHOLD, MASTERED_THRESHOLD } from "./progress";
import type { DeckMode, DisplayCard, Progress } from "./types";

const LETTERS = "abcdefghijklmnopqrstuvwxyz";

export function choiceLabel(idx: number): string {
  return idx < LETTERS.length ? LETTERS[idx] : String(idx + 1);
}

export function formatCorrectChoices(dc: DisplayCard): string[] {
  return dc.correct
    .filter((i) => i >= 0 && i < dc.choices.length)
    .map((i) => `${choiceLabel(i)}) ${dc.choices[i]}`);
}

export const SOURCE_META: Record<string, { label: string; color: string }> = {
  presentation_ai: { label: "AI · презентации", color: "#12A594" },
  pdf_questions: { label: "PDF прашања", color: "#F76B15" },
  notebook_lm: { label: "Notebook LM", color: "#7C5CFF" },
  discord: { label: "Discord", color: "#5865F2" },
};

function sourceReference(source: string | null): string {
  switch (source) {
    case "discord":
      return "Discord прашањата";
    case "notebook_lm":
      return "Notebook LM прашањата";
    case "pdf_questions":
      return "PDF прашањата";
    case "presentation_ai":
      return "материјалот од презентациите";
    default:
      return "материјалот";
  }
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Објаснување во два дела: „Зошто“ и „За испит“. */
export interface Explanation {
  why: string;
  exam: string;
}

export function buildExplanation(dc: DisplayCard): Explanation {
  const raw = dc.card.explanation.trim();
  if (raw) {
    const text = raw.replace(/\s+/g, " ");
    const examIdx = text.indexOf("За испит:");
    if (examIdx >= 0) {
      return {
        why: text.slice(0, examIdx).replace(/^Зошто:\s*/, "").trim(),
        exam: text.slice(examIdx + "За испит:".length).trim(),
      };
    }
    const sentences = splitSentences(text.replace(/^Зошто:\s*/, ""));
    return { why: sentences[0] ?? text, exam: sentences.slice(1).join(" ") };
  }

  // Картичка без објаснување: кратко генерирано објаснување според типот на прашањето.
  const q = dc.card.question.toLowerCase();
  const correct = formatCorrectChoices(dc).join("; ") || "Нема означен точен одговор.";
  const src = sourceReference(dc.card.source);
  let prefix = "Точен одговор е";
  if (q.includes("редослед") || q.includes("секвенца") || q.includes("подреди")) {
    prefix = "Точниот редослед е";
  } else if (dc.card.type === "multiple") {
    prefix = "Точни одговори се";
  }
  let reason = `Ова е точниот избор според ${src}.`;
  if (q.includes("точно или неточно")) reason = `Ова тврдење така е наведено во ${src}.`;
  else if (q.includes("што претставува")) reason = `Ова е дефиницијата или описот што се совпаѓа со ${src}.`;
  else if (q.includes("кои тврдења") || q.includes("што е точно"))
    reason = `Само овие тврдења се совпаѓаат со условите и поимите од ${src}.`;
  else if (q.includes("кога")) reason = `Ова е условот што е наведен или директно следи од ${src}.`;
  return { why: `${prefix}: ${correct}. ${reason}`, exam: "" };
}

function correctWord(n: number): string {
  return n === 1 ? "1 точен" : `${n} точни`;
}

/** Реченица под прашањето што покажува каде е картичката во системот на совладување. */
export function progressStatus(
  mode: DeckMode,
  p: Progress,
  answerResult: boolean | null,
): string {
  switch (mode) {
    case "main": {
      if (answerResult === false) {
        return `Streak за Совладани: 0/${MASTERED_THRESHOLD}. Погрешен одговор, уште ${correctWord(MASTERED_THRESHOLD)} до Совладани.`;
      }
      if (p.tainted) {
        return "Tainted прашање: точните одговори тука не се бројат. Искупи ја во Погрешни.";
      }
      const s = Math.min(p.mastery_streak, MASTERED_THRESHOLD);
      if (s >= MASTERED_THRESHOLD) return `Streak за Совладани: ${s}/${MASTERED_THRESHOLD}. Оди во Совладани.`;
      return `Streak за Совладани: ${s}/${MASTERED_THRESHOLD}. Уште ${correctWord(MASTERED_THRESHOLD - s)} до Совладани.`;
    }
    case "mastered": {
      if (answerResult === false) {
        return `Готови: 0/${COMPLETED_THRESHOLD}. Погрешен одговор, прашањето се враќа во Главен сет.`;
      }
      const s = Math.min(p.completed_streak, COMPLETED_THRESHOLD);
      if (s >= COMPLETED_THRESHOLD) return `Готови: ${s}/${COMPLETED_THRESHOLD}. Оди во Готови.`;
      return `Готови: ${s}/${COMPLETED_THRESHOLD}. Уште ${correctWord(COMPLETED_THRESHOLD - s)} до Готови. Погрешен одговор ја враќа во Главен сет.`;
    }
    case "completed":
      return "Ова прашање е во Готови. Користи „Готови → Совладани“ ако сакаш да го вратиш.";
    case "wrong_set":
      if (p.tainted) {
        return `Tainted: уште ${correctWord(Math.max(0, 2 - p.redemption))} во Погрешни за да се врати во Главен сет.`;
      }
      return "Ова прашање е во Погрешни. Точен одговор го враќа во Главен сет.";
    case "flagged":
      return "Означено прашање. Точните одговори тука не го менуваат streak-от.";
    case "missed":
      return "";
  }
}
