import type { QuizSession } from "./types";

export interface SessionSummary {
  count: number;
  averageScore: number;
  bestScore: number;
  lastScore: number;
}

/** `sessions` се подредени од најнова кон најстара. */
export function summarizeSessions(sessions: Pick<QuizSession, "score_pct">[]): SessionSummary {
  if (sessions.length === 0) {
    return { count: 0, averageScore: 0, bestScore: 0, lastScore: 0 };
  }
  const scores = sessions.map((s) => s.score_pct);
  return {
    count: scores.length,
    averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    bestScore: Math.max(...scores),
    lastScore: scores[0],
  };
}

/** Процент од вкупниот број картички (неодговорените се бројат како неточни). */
export function scorePct(correct: number, total: number): number {
  return total ? Math.round((correct / total) * 100) : 0;
}
