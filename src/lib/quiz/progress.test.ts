import { describe, expect, it } from "vitest";
import {
  applyAnswer,
  completedToMastered,
  emptyProgress,
  isCompleted,
  isEmptyProgress,
  isMastered,
  resetMastery,
} from "./progress";
import type { Progress } from "./types";

const base = (over: Partial<Progress> = {}): Progress => ({
  ...emptyProgress({ id: "c1", deck_id: "d1" }),
  ...over,
});

describe("applyAnswer: погрешен одговор", () => {
  it("нова картичка оди во Погрешни и добива strike", () => {
    const p = applyAnswer(base(), "main", false);
    expect(p.in_wrong).toBe(true);
    expect(p.wrong_strikes).toBe(1);
    expect(p.tainted).toBe(false);
  });

  it("картичка со streak само го губи streak-от, не оди во Погрешни", () => {
    const p = applyAnswer(base({ mastery_streak: 1 }), "main", false);
    expect(p.in_wrong).toBe(false);
    expect(p.mastery_streak).toBe(0);
  });

  it("трет strike ја прави картичката tainted", () => {
    const p = applyAnswer(base({ wrong_strikes: 2 }), "main", false);
    expect(p.wrong_strikes).toBe(3);
    expect(p.tainted).toBe(true);
  });

  it("го ресетира redemption", () => {
    const p = applyAnswer(base({ tainted: true, redemption: 1, in_wrong: true }), "wrong_set", false);
    expect(p.redemption).toBe(0);
  });

  it("во Совладани ја враќа картичката во главниот сет", () => {
    const p = applyAnswer(base({ mastery_streak: 2, completed_streak: 1 }), "mastered", false);
    expect(isMastered(p)).toBe(false);
    expect(p.completed_streak).toBe(0);
  });

  it("во Готови ја трга од Готови", () => {
    const p = applyAnswer(base({ completed_streak: 2 }), "completed", false);
    expect(isCompleted(p)).toBe(false);
    expect(p.in_wrong).toBe(true);
  });
});

describe("applyAnswer: точен одговор", () => {
  it("main: два точни по ред = Совладана", () => {
    let p = applyAnswer(base(), "main", true);
    expect(p.mastery_streak).toBe(1);
    expect(isMastered(p)).toBe(false);
    p = applyAnswer(p, "main", true);
    expect(isMastered(p)).toBe(true);
  });

  it("main: tainted картичка не добива streak", () => {
    const p = applyAnswer(base({ tainted: true }), "main", true);
    expect(p.mastery_streak).toBe(0);
  });

  it("main: не ја вади од Погрешни", () => {
    const p = applyAnswer(base({ in_wrong: true }), "main", true);
    expect(p.in_wrong).toBe(true);
  });

  it("mastered: два точни = Готова и излегува од Совладани", () => {
    let p = base({ mastery_streak: 2 });
    p = applyAnswer(p, "mastered", true);
    expect(p.completed_streak).toBe(1);
    expect(isMastered(p)).toBe(true);
    p = applyAnswer(p, "mastered", true);
    expect(isCompleted(p)).toBe(true);
    expect(p.mastery_streak).toBe(0);
  });

  it("wrong_set: обична картичка се враќа во главниот сет", () => {
    const p = applyAnswer(base({ in_wrong: true, wrong_strikes: 1 }), "wrong_set", true);
    expect(p.in_wrong).toBe(false);
    expect(p.wrong_strikes).toBe(1);
  });

  it("wrong_set: tainted картичка се искупува по 2 точни", () => {
    let p = base({ in_wrong: true, tainted: true, wrong_strikes: 3 });
    p = applyAnswer(p, "wrong_set", true);
    expect(p.in_wrong).toBe(true);
    expect(p.tainted).toBe(true);
    expect(p.redemption).toBe(1);
    p = applyAnswer(p, "wrong_set", true);
    expect(p).toMatchObject({ in_wrong: false, tainted: false, wrong_strikes: 0, redemption: 0 });
  });

  it("flagged/completed/missed: точен одговор не менува ништо", () => {
    const start = base({ flagged: true, mastery_streak: 1, completed_streak: 2 });
    for (const mode of ["flagged", "completed", "missed"] as const) {
      expect(applyAnswer(start, mode, true)).toEqual(start);
    }
  });

  it("не го менува влезниот објект", () => {
    const start = base();
    applyAnswer(start, "main", true);
    expect(start.mastery_streak).toBe(0);
  });
});

describe("алатки", () => {
  it("completedToMastered ја враќа во Совладани", () => {
    const p = completedToMastered(base({ completed_streak: 3 }));
    expect(p.mastery_streak).toBe(3);
    expect(p.completed_streak).toBe(0);
    expect(isMastered(p)).toBe(true);
  });

  it("resetMastery ги нулира двата streak-а", () => {
    const p = resetMastery(base({ mastery_streak: 2, completed_streak: 2, in_wrong: true }));
    expect(p).toMatchObject({ mastery_streak: 0, completed_streak: 0, in_wrong: true });
  });

  it("isEmptyProgress", () => {
    expect(isEmptyProgress(base())).toBe(true);
    expect(isEmptyProgress(base({ flagged: true }))).toBe(false);
  });
});
