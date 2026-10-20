export type CardType = "single" | "multiple";
export type Difficulty = "easy" | "medium" | "hard";

export type DeckMode =
  | "main"
  | "missed"
  | "wrong_set"
  | "mastered"
  | "completed"
  | "flagged";

export interface Card {
  id: string;
  deck_id: string;
  question: string;
  choices: string[];
  correct: number[];
  type: CardType;
  difficulty: Difficulty | null;
  explanation: string;
  source: string | null;
  aliases: string[];
  position: number;
}

/** Личен напредок за една картичка (ред во card_progress). */
export interface Progress {
  card_id: string;
  deck_id: string;
  in_wrong: boolean;
  flagged: boolean;
  mastery_streak: number;
  completed_streak: number;
  tainted: boolean;
  wrong_strikes: number;
  redemption: number;
}

export type ProgressMap = Record<string, Progress>;

/** Картичка подготвена за прикажување: изборите се измешани, `correct` е пресметан наново. */
export interface DisplayCard {
  card: Card;
  choices: string[];
  correct: number[];
}

export interface QuizSession {
  id: number;
  deck_id: string;
  mode: DeckMode;
  score_pct: number;
  correct: number;
  total: number;
  missed_questions: string[];
  created_at: string;
}

/** Незавршена сесија во главниот сет. */
export interface ResumeState {
  order: string[];
  current: string | null;
  results: Record<string, boolean>;
}
